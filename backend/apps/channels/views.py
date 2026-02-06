import re
import time

from apps.channels.models import Channel, WorkspaceProvider
from apps.channels.serializers import (ChannelCreateSerializer,
                                       ChannelSerializer)
from apps.providers.evolution.client import (EvolutionClient,
                                             EvolutionClientError)
from apps.tenants.mixins import WorkspaceRequiredMixin
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


def normalize_phone_br(raw: str) -> str:
    digits = re.sub(r"\D+", "", raw or "")
    digits = digits.lstrip("0")

    # Se vier sem 55, assume BR e prefixa.
    if digits and not digits.startswith("55"):
        digits = "55" + digits

    # BR: 55 + 2 DDD + 8/9 número => 12 ou 13 dígitos
    if not (digits.startswith("55") and len(digits) in (12, 13)):
        raise ValueError(
            "Telefone inválido. Use DDD + número (ex: 16 99159-2095).")

    return digits


def extract_pairing_code(payload):
    """Tenta achar pairing code em formatos variados."""
    if not isinstance(payload, dict):
        return None

    def pick(d):
        if not isinstance(d, dict):
            return None
        return d.get("pairingCode") or d.get("pairing_code") or d.get("code")

    code = pick(payload)
    if code:
        return code

    for key in ("response", "data", "result", "instance"):
        code = pick(payload.get(key))
        if code:
            return code

    return None


def extract_qr_data_url(payload):
    """
    Evolution pode devolver QR em formatos diferentes:
      - payload["qrcode"]["base64"] (às vezes já vem com data:image/png;base64,...)
      - payload["base64"]
      - payload["code"] (em alguns builds isso NÃO é base64: vem tipo "2@...,1@...")
    Queremos devolver:
      - qr_base64 (somente base64)
      - qr_data_url (data:image/png;base64,...)
    """
    import re

    if not isinstance(payload, dict):
        return None, None

    # coletar candidatos em ordem de prioridade (mais confiável primeiro)
    candidates = []

    qrcode = payload.get("qrcode")
    if isinstance(qrcode, dict):
        b64 = qrcode.get("base64")
        if b64:
            candidates.append(b64)

    if payload.get("base64"):
        candidates.append(payload.get("base64"))

    # code é o mais suspeito (às vezes NÃO é base64)
    if payload.get("code"):
        candidates.append(payload.get("code"))

    def normalize(v: str):
        if not isinstance(v, str):
            return None, None
        v = v.strip()
        if not v:
            return None, None

        # já é data url
        if v.startswith("data:image"):
            # extrai base64 se for possível
            if "base64," in v:
                return v.split("base64,", 1)[1].strip(), v
            return None, v

        # se tiver caracteres típicos de "code" (2@..., vírgulas, @), NÃO é base64
        if ("@" in v) or ("," in v):
            return None, None

        # valida aparência de base64 (bem permissivo, mas barra coisas bizarras)
        if not re.fullmatch(r"[A-Za-z0-9+/=\s]+", v):
            return None, None

        b64 = v.replace("\n", "").replace("\r", "").strip()
        if len(b64) < 50:
            return None, None

        return b64, f"data:image/png;base64,{b64}"

    for c in candidates:
        b64, url = normalize(c)
        if b64 or url:
            return b64, url

    return None, None


class ChannelViewSet(WorkspaceRequiredMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def _get_or_create_workspace_evolution(self, workspace):
        wp, _ = WorkspaceProvider.objects.get_or_create(
            workspace=workspace,
            provider=WorkspaceProvider.Provider.EVOLUTION,
            defaults={
                # Dentro do docker, o backend fala com o service "evolution:8080"
                "base_url": getattr(settings, "EVOLUTION_BASE_URL", None) or "http://evolution:8080",
                "api_key": getattr(settings, "EVOLUTION_API_KEY", None) or "dev_key",
                "status": WorkspaceProvider.Status.READY,
            },
        )

        if wp.status != WorkspaceProvider.Status.READY:
            wp.status = WorkspaceProvider.Status.READY
            wp.save(update_fields=["status", "updated_at"])

        return wp

    def _client_for_workspace(self, workspace) -> EvolutionClient:
        wp = self._get_or_create_workspace_evolution(workspace)
        return EvolutionClient(base_url=wp.base_url, api_key=wp.api_key)

    def _ensure_instance_name(self, request, channel: Channel):
        # ✅ INSTÂNCIA POR CANAL:
        # external_id = "wsp-<workspace_id>__ch-<channel_id>"
        if not channel.external_id:
            channel.external_id = f"wsp-{request.workspace.id}__ch-{channel.id}"
            channel.save(update_fields=["external_id"])
        return channel.external_id

    # ---------- DRF basics ----------

    def get_queryset(self):
        qs = Channel.objects.filter(
            workspace=self.request.workspace).order_by("-created_at")

        provider = self.request.query_params.get("provider")
        if provider:
            qs = qs.filter(provider=provider)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            normalized = is_active.strip().lower()
            if normalized in {"true", "1", "t", "yes", "y"}:
                qs = qs.filter(is_active=True)
            elif normalized in {"false", "0", "f", "no", "n"}:
                qs = qs.filter(is_active=False)

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return ChannelCreateSerializer
        return ChannelSerializer

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # Se existir um canal soft-deletado com o mesmo nome no workspace,
        # "revive" ele em vez de explodir com UniqueConstraint.
        existing = Channel.objects.filter(
            workspace=request.workspace, name=ser.validated_data.get("name")
        ).first()

        if existing and existing.is_deleted:
            existing.deleted_at = None
            existing.provider = ser.validated_data.get("provider")
            # Evolution: external_id será definido só quando conectar
            if existing.provider == Channel.Provider.EVOLUTION:
                existing.external_id = None
                existing.is_active = False
            else:
                existing.is_active = True
            existing.save()
            return Response(ChannelSerializer(existing).data, status=status.HTTP_200_OK)

        try:
            channel = ser.save()
        except IntegrityError as e:
            msg = str(e).lower()
            if "uniq_channel_name_per_workspace" in msg or "channels_channel_workspace_id_name" in msg:
                return Response(
                    {"detail": "Já existe um canal com esse nome neste workspace."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"detail": "Erro de integridade ao criar canal.",
                    "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)

    # ---------- Evolution connect/status ----------

    @action(detail=True, methods=["post"], url_path="evolution/connect")
    def evolution_connect(self, request, pk=None):
        """
        Fluxo (robusto para Baileys/QR):
          1) cria instância (tolerante a already exists)
          2) tenta pairing_code se prefer_pairing=true e number existir
          3) tenta gerar QR por GET /instance/connect/{instance} (sem number)
             - alguns builds retornam {"count":0} por alguns segundos -> fazemos retry até qr_timeout_s
          4) se não veio QR, tenta pairing_code como fallback (se number existir)
        """
        channel = self.get_object()

        if channel.provider != Channel.Provider.EVOLUTION:
            return Response({"detail": "Channel provider is not evolution."}, status=status.HTTP_400_BAD_REQUEST)

        client = self._client_for_workspace(request.workspace)
        instance_name = self._ensure_instance_name(request, channel)

        phone_raw = request.data.get(
            "phone_number") or request.data.get("number") or ""
        prefer_pairing = bool(request.data.get("prefer_pairing"))
        timeout_s = int(request.data.get("qr_timeout_s") or 45)

        number = None
        if phone_raw:
            try:
                number = normalize_phone_br(phone_raw)
            except ValueError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # 1) cria instância
        create_payload = None
        try:
            create_payload = client.create_instance(instance_name)
        except EvolutionClientError as e:
            msg = str(e).lower()
            if "already" in msg and "exist" in msg:
                create_payload = {"warning": "instance already exists"}
            else:
                return Response(
                    {"detail": "Falha ao criar instância na Evolution.",
                        "instance": instance_name, "error": str(e)},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        # 1.5) settings (best-effort)
        settings_payload = None
        try:
            settings_payload = client.set_settings(
                instance_name,
                {
                    "preferQr": True,
                    "preferPairingCode": False,  # Baileys em alguns builds não retorna code
                    "linkingMode": "qr",
                    "pairing": False,
                    "qrcode": True,
                    "mode": "qr",
                },
            )
        except EvolutionClientError:
            settings_payload = {"warning": "set_settings failed (best-effort)"}

        # 2) pairing preferencial (se pedido)
        pairing_payload = None
        pairing_code = None
        if prefer_pairing and number:
            try:
                pairing_payload = client.connect_pairing_code(
                    instance_name, number=number)
                pairing_code = extract_pairing_code(pairing_payload)
            except EvolutionClientError:
                pairing_payload = {
                    "warning": "pairing connect failed (ignored)"}

            if pairing_code:
                return Response(
                    {
                        "channel_id": str(channel.id),
                        "instance": instance_name,
                        "connection_mode": "pairing",
                        "pairing_code": pairing_code,
                        "raw": {"create": create_payload, "settings": settings_payload, "pairing": pairing_payload},
                    },
                    status=status.HTTP_200_OK,
                )

        # 3) QR FLOW: retry até timeout_s
        last_qr_payload = None
        qr_base64 = None
        qr_data_url = None

        t0 = time.time()
        while time.time() - t0 < timeout_s:
            try:
                last_qr_payload = client._request(
                    "GET", f"/instance/connect/{instance_name}")
            except EvolutionClientError as e:
                return Response(
                    {
                        "detail": "Falha ao gerar QR Code na Evolution.",
                        "channel_id": str(channel.id),
                        "instance": instance_name,
                        "error": str(e),
                        "raw": {"create": create_payload, "settings": settings_payload, "pairing": pairing_payload},
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            qr_base64, qr_data_url = extract_qr_data_url(last_qr_payload)

            if qr_base64 or qr_data_url:
                break

            # fallback extra: se algum webhook seu salvar no cache
            cached = cache.get(f"evo:qr:{instance_name}")
            if cached:
                qr_base64 = cached
                qr_data_url = f"data:image/png;base64,{cached}"
                break

            time.sleep(2)

        # 4) se ainda não veio QR, tenta pairing (se tiver number)
        if not qr_base64 and not qr_data_url and number:
            try:
                pairing_payload2 = client.connect_pairing_code(
                    instance_name, number=number)
                pairing_code2 = extract_pairing_code(pairing_payload2)
                if pairing_code2:
                    return Response(
                        {
                            "channel_id": str(channel.id),
                            "instance": instance_name,
                            "connection_mode": "pairing",
                            "pairing_code": pairing_code2,
                            "raw": {
                                "create": create_payload,
                                "settings": settings_payload,
                                "pairing_fallback": pairing_payload2,
                                "connect": last_qr_payload,
                            },
                        },
                        status=status.HTTP_200_OK,
                    )
            except EvolutionClientError:
                pass

        # Mesmo sem QR, devolve 200 (frontend pode re-chamar /connect/).
        return Response(
            {
                "channel_id": str(channel.id),
                "instance": instance_name,
                "connection_mode": "qr",
                "qr_base64": qr_base64,
                "qr_data_url": qr_data_url,
                "raw": {
                    "create": create_payload,
                    "settings": settings_payload,
                    "pairing": pairing_payload,
                    "connect": last_qr_payload,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="evolution/status")
    def evolution_status(self, request, pk=None):
        channel = self.get_object()

        if channel.provider != Channel.Provider.EVOLUTION or not channel.external_id:
            return Response({"detail": "Evolution not initialized for this channel."}, status=status.HTTP_400_BAD_REQUEST)

        client = self._client_for_workspace(request.workspace)
        st = client.get_status(channel.external_id)

        def pick_state(obj):
            if not isinstance(obj, dict):
                return ""
            return (
                obj.get("state")
                or obj.get("status")
                or (obj.get("instance") or {}).get("state")
                or (obj.get("instance") or {}).get("status")
                or ""
            )

        state = (pick_state(st) or "").lower()
        connected = state in {"open", "connected", "online"}

        if connected and not channel.is_active:
            channel.is_active = True
            channel.save(update_fields=["is_active"])

        return Response(
            {
                "channel_id": str(channel.id),
                "instance": channel.external_id,
                "state": state,
                "status": st,
                "is_active": channel.is_active,
            }
        )

    @action(detail=False, methods=["get"], url_path="workspace/evolution")
    def workspace_evolution_status(self, request):
        wp = self._get_or_create_workspace_evolution(request.workspace)
        return Response(
            {
                "provider": wp.provider,
                "status": wp.status,
                "base_url": wp.base_url,
                "ready_at": wp.ready_at,
                "last_error": wp.last_error,
            }
        )

    # ---------- Remove / Hard delete ----------

    def destroy(self, request, *args, **kwargs):
        """Soft remove do canal. Se for Evolution, tenta logout best-effort."""
        channel = self.get_object()

        if channel.provider == Channel.Provider.EVOLUTION and channel.external_id:
            try:
                client = self._client_for_workspace(request.workspace)
                client.logout_instance(channel.external_id)
            except Exception:
                pass

        channel.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="hard-delete")
    def hard_delete(self, request, pk=None):
        """Logout + delete da instância na Evolution; depois remove do DB."""
        channel = self.get_object()

        if channel.provider != Channel.Provider.EVOLUTION or not channel.external_id:
            channel.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        client = self._client_for_workspace(request.workspace)
        instance_name = channel.external_id

        with transaction.atomic():
            logout_payload = None
            try:
                logout_payload = client.logout_instance(instance_name)
            except Exception as e:
                logout_payload = {"warning": "logout failed", "error": str(e)}

            try:
                delete_payload = client.delete_instance(instance_name)
            except EvolutionClientError as e:
                return Response(
                    {
                        "detail": "Falha ao deletar instância na Evolution.",
                        "instance": instance_name,
                        "error": str(e),
                        "raw": {"logout": logout_payload},
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            channel.delete()
            return Response(
                {"ok": True, "instance": instance_name, "raw": {
                    "logout": logout_payload, "delete": delete_payload}},
                status=status.HTTP_200_OK,
            )
