from rest_framework.permissions import BasePermission

from apps.tenants.models import Membership


class IsWorkspaceMember(BasePermission):
    def has_permission(self, request, view):
        workspace = getattr(request, "workspace", None)
        user = request.user
        print("=== DEBUG IsWorkspaceMember ===")
        print("user_id:", getattr(request.user, "id", None))
        print("X-Workspace-ID:", request.headers.get("X-Workspace-ID"))
        print("request.workspace:", getattr(request, "workspace", None))

        if not workspace or not user or not user.is_authenticated:
            return False
        return Membership.objects.filter(workspace=workspace, user=user).exists()


class IsWorkspaceAdmin(BasePermission):
    def has_permission(self, request, view):
        workspace = getattr(request, "workspace", None)
        user = request.user
        if not workspace or not user or not user.is_authenticated:
            return False
        return Membership.objects.filter(
            workspace=workspace,
            user=user,
            role=Membership.ROLE_ADMIN,
        ).exists()
