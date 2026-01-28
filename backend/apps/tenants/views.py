from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.tenants.mixins import WorkspaceRequiredMixin
from apps.tenants.models import ApiKey, Membership, Workspace
from apps.tenants.permissions import IsWorkspaceAdmin, IsWorkspaceMember
from apps.tenants.serializers import (
    ApiKeyCreateSerializer,
    ApiKeySerializer,
    MembershipSerializer,
    WorkspaceSerializer,
)


class WorkspaceViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(memberships__user=self.request.user).distinct()


class MembershipViewSet(WorkspaceRequiredMixin, viewsets.ModelViewSet):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceMember]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return Membership.objects.filter(workspace=self.request.workspace)

    def get_permissions(self):
        if self.action in {"create", "destroy"}:
            return [IsAuthenticated(), IsWorkspaceAdmin()]
        return [permission() for permission in self.permission_classes]


class ApiKeyViewSet(WorkspaceRequiredMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsWorkspaceMember]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return ApiKey.objects.filter(workspace=self.request.workspace)

    def get_permissions(self):
        if self.action in {"create", "destroy"}:
            return [IsAuthenticated(), IsWorkspaceAdmin()]
        return [permission() for permission in self.permission_classes]

    def get_serializer_class(self):
        if self.action == "create":
            return ApiKeyCreateSerializer
        return ApiKeySerializer
