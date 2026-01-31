from apps.channels.models import Channel
from apps.channels.serializers import (ChannelCreateSerializer,
                                       ChannelSerializer)
from apps.providers.evolution.client import EvolutionClient
from apps.tenants.mixins import WorkspaceRequiredMixin
from apps.tenants.permissions import IsWorkspaceMember
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


class ChannelViewSet(WorkspaceRequiredMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    # permission_classes = [IsAuthenticated, IsWorkspaceMember] #Implementar permissões de workspace member

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def list(self, request, *args, **kwargs):
        print("=== DEBUG /channels list ===")
        print("Authorization:", request.headers.get("Authorization"))
        print("X-Workspace-ID:", request.headers.get("X-Workspace-ID"))
        print("request.workspace:", getattr(request, "workspace", None))
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        channel = serializer.save()
        # ✅ retorna o serializer completo (inclui id)
        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = Channel.objects.filter(workspace=self.request.workspace).order_by(
            "-created_at"
        )
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

        # instanceName único por canal (multi-tenant seguro)
        if not channel.external_id:
            channel.external_id = f"ch-{channel.id}"
            channel.save(update_fields=["external_id"])

        client = EvolutionClient()

        # tenta criar a instância; se já existir, seguimos
        try:
            client.create_instance(channel.external_id)
        except Exception:
            pass

        qr = client.get_qr(channel.external_id)

        return Response(
            {
                "channel_id": str(channel.id),
                "instance": channel.external_id,
                "qr": qr,
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

        client = EvolutionClient()
        st = client.get_status(channel.external_id)

        state = (st.get("state") or st.get("status") or "").lower()
        connected = state in {"open", "connected", "online"}

        if connected and not channel.is_active:
            channel.is_active = True
            channel.save(update_fields=["is_active"])

        return Response(
            {
                "channel_id": str(channel.id),
                "instance": channel.external_id,
                "status": st,
                "is_active": channel.is_active,
            }
        )
