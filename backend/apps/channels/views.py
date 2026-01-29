from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.channels.models import Channel
from apps.channels.serializers import ChannelCreateSerializer, ChannelSerializer
from apps.tenants.mixins import WorkspaceRequiredMixin
from apps.tenants.permissions import IsWorkspaceMember


class ChannelViewSet(WorkspaceRequiredMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsWorkspaceMember]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

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
