import re

from apps.channels.models import Channel, WorkspaceProvider
from apps.channels.serializers import (ChannelCreateSerializer,
                                       ChannelSerializer)
from apps.providers.evolution.client import (EvolutionClient,
                                             EvolutionClientError)
from apps.tenants.mixins import WorkspaceRequiredMixin
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


def normalize_phone_br(raw: str) -> str:
    digits = re.sub(r"\D+", "", raw or "")
    digits = digits.lstrip("0")

    # se vier sem 55, assume BR e prefixa
    if digits and not digits.startswith("55"):
        digits = "55" + digits

    # BR: 55 + 2 DDD + 8/9 número => 12 ou 13 dígitos
    if not (digits.startswith("55") and len(digits) in (12, 13)):
        raise ValueError(
            "Telefone inválido. Use DDD + número (ex: 16 99159-2095).")

    return digits


class ChannelViewSet(WorkspaceRequiredMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def _get_or_create_workspace_evolution(self, workspace):
        wp, _ = WorkspaceProvider.objects.get_or_create(
            workspace=workspace,
            provider=WorkspaceProvider.Provider.EVOLUTION,
            defaults={
                # LOCAL: usa o docker internal DNS
                "base_url": getattr(settings, "EVOLUTION_BASE_URL", None) or "http://evolution:8080",
                "api_key": getattr(settings, "EVOLUTION_API_KEY", None) or "dev_key",
                "status": WorkspaceProvider.Status.READY,
            },
        )

        # LOCAL: se por algum motivo não estiver READY, marca READY
        if wp.status != WorkspaceProvider.Status.READY:
            wp.status = WorkspaceProvider.Status.READY
            wp.save(update_fields=["status", "updated_at"])

        return wp

    def list(self, request, *args, **kwargs):
        # (deixe esse debug só enquanto estiver validando)
        print("=== DEBUG /channels list ===")
        print("Authorization:", request.headers.get("Authorization"))
        print("X-Workspace-ID:", request.headers.get("X-Workspace-ID"))
        print("request.workspace:", getattr(request, "workspace", None))
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        channel = serializer.save()
        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        include_deleted = self.request.query_params.get("include_deleted")
        include_deleted = (include_deleted or "").strip().lower() in {
            "1", "true", "t", "yes", "y"}

        queryset = Channel.objects.filter(workspace=self.request.workspace)

        if not include_deleted:
            queryset = queryset.filter(deleted_at__isnull=True)

        queryset = queryset.order_by("-created_at")

        provider = self.request.query_params.get("provider")
        if provider:
            queryset = queryset.filter(provider=provider)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            normalized = is_active.strip().lower()
            if normalized in {"true", "1", "t", "yes", "y"}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {"false", "0", "f", "no", "n"}:
                queryset = queryset.filter(is_active=False)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return ChannelCreateSerializer
        return ChannelSerializer

    @action(detail=True, methods=["post"], url_path="evolution/connect")
    def evolution_connect(self, request, pk=None):
        channel = self.get_object()

        if channel.provider != Channel.Provider.EVOLUTION:
            return Response(
                {"detail": "Channel provider is not evolution."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # garante workspace evolution "READY"
        wp = self._get_or_create_workspace_evolution(request.workspace)

        # instanceName único por canal
        if not channel.external_id:
            channel.external_id = f"wsp-{request.workspace.id}__ch-{channel.id}"
            channel.save(update_fields=["external_id"])

        client = EvolutionClient(base_url=wp.base_url, api_key=wp.api_key)

        # phone_number é obrigatório (pairing only)
        phone_raw = request.data.get(
            "phone_number") or request.data.get("number")
        if not phone_raw:
            return Response(
                {"detail": "phone_number é obrigatório para conexão via Pairing Code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            number = normalize_phone_br(phone_raw)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # 1) cria instância
        create_payload = None
        try:
            create_payload = client.create_instance(
                channel.external_id, integration="WHATSAPP-BAILEYS")

        except EvolutionClientError as e:
            # permite seguir se a instância já existir
            msg = str(e).lower()
            if "already" in msg and "exist" in msg:
                create_payload = {"warning": "instance already exists"}
            else:
                return Response(
                    {
                        "detail": "Falha ao criar instância na Evolution.",
                        "instance": channel.external_id,
                        "error": str(e),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        # 2) pede pairing code
        try:
            pairing_payload = client.connect_pairing_code(
                channel.external_id, number=number)
        except EvolutionClientError as e:
            return Response(
                {
                    "detail": "Falha ao gerar Pairing Code na Evolution.",
                    "channel_id": str(channel.id),
                    "instance": channel.external_id,
                    "error": str(e),
                    "raw": {"create": create_payload},
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        pairing_code = None
        if isinstance(pairing_payload, dict):
            pairing_code = (
                pairing_payload.get("pairingCode")
                or pairing_payload.get("pairing_code")
                or pairing_payload.get("code")
            )

        # se não veio código, devolve 502 com raw (pra debugar sem adivinhar)
        if not pairing_code:
            return Response(
                {
                    "detail": "Evolution não retornou pairing_code.",
                    "channel_id": str(channel.id),
                    "instance": channel.external_id,
                    "raw": {"create": create_payload, "connect": pairing_payload},
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "channel_id": str(channel.id),
                "instance": channel.external_id,
                "pairing_code": pairing_code,
                "raw": {"create": create_payload, "connect": pairing_payload},
            }
        )

    @action(detail=True, methods=["get"], url_path="evolution/status")
    def evolution_status(self, request, pk=None):
        channel = self.get_object()

        if channel.provider != Channel.Provider.EVOLUTION or not channel.external_id:
            return Response(
                {"detail": "Evolution not initialized for this channel."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wp = self._get_or_create_workspace_evolution(request.workspace)
        client = EvolutionClient(base_url=wp.base_url, api_key=wp.api_key)
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

    def destroy(self, request, *args, **kwargs):
        channel = self.get_object()

        # ✅ bloqueia se estiver conectado
        if channel.is_active:
            return Response(
                {"detail": "Canal está conectado. Desconecte antes ou use hard-delete."},
                status=status.HTTP_409_CONFLICT,
            )

        # ✅ soft delete
        if getattr(channel, "deleted_at", None) is None:
            channel.deleted_at = timezone.now()
            channel.save(update_fields=["deleted_at", "updated_at"])

        if channel.deleted_at:
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="disconnect")
    def disconnect(self, request, pk=None):
        channel = self.get_object()

        if channel.provider != Channel.Provider.EVOLUTION or not channel.external_id:
            return Response({"detail": "Canal não é Evolution ou não inicializado."}, status=400)

        wp = self._get_or_create_workspace_evolution(request.workspace)
        client = EvolutionClient(base_url=wp.base_url, api_key=wp.api_key)

        try:
            client.logout_instance(channel.external_id)
        except Exception as e:
            return Response({"detail": "Falha ao desconectar.", "error": str(e)}, status=502)

        # Atualiza estado local
        if channel.is_active:
            channel.is_active = False
            channel.save(update_fields=["is_active", "updated_at"])

        return Response({"detail": "Desconectado com sucesso."})

    @action(detail=True, methods=["post"], url_path="hard-delete")
    def hard_delete(self, request, pk=None):
        channel = self.get_object()

        # 1) Se for EVOLUTION: tenta derrubar e apagar instância
        if channel.provider == Channel.Provider.EVOLUTION and channel.external_id:
            wp = self._get_or_create_workspace_evolution(request.workspace)
            client = EvolutionClient(base_url=wp.base_url, api_key=wp.api_key)

            # tenta logout (não impede continuar)
            try:
                client.logout_instance(channel.external_id)
            except Exception as e:
                print("WARN hard-delete: logout_instance falhou:", e)

            # delete instance: se falhar, eu BLOQUEIO o hard delete
            # (pra não deixar instância órfã na Evolution)
            try:
                client.delete_instance(channel.external_id)
            except EvolutionClientError as e:
                # ✅ se não existe instância, segue o hard-delete mesmo assim
                if e.status_code == 404:
                    pass
                else:
                    return Response(
                        {
                            "detail": "Falha ao deletar instância na Evolution. Canal não foi removido.",
                            "instance": channel.external_id,
                            "status_code": e.status_code,
                            "error": str(e),
                            "payload": getattr(e, "payload", None),
                        },
                        status=status.HTTP_502_BAD_GATEWAY,

                    )

        # 2) Apaga o channel do banco (hard)
        with transaction.atomic():
            channel.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
