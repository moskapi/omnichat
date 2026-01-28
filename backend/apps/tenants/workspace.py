import uuid

from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.tenants.models import Membership, Workspace


WORKSPACE_HEADER = "X-Workspace-ID"


def resolve_workspace(request):
    workspace_id = request.headers.get(WORKSPACE_HEADER)
    if not workspace_id:
        raise ValidationError({"detail": "X-Workspace-ID header é obrigatório."})

    try:
        workspace_uuid = uuid.UUID(workspace_id)
    except ValueError as exc:
        raise NotFound("Workspace não encontrado.") from exc

    try:
        workspace = Workspace.objects.get(id=workspace_uuid)
    except Workspace.DoesNotExist as exc:
        raise NotFound("Workspace não encontrado.") from exc

    user = request.user
    if not user or not user.is_authenticated:
        raise PermissionDenied("Usuário sem acesso ao workspace.")

    if not Membership.objects.filter(workspace=workspace, user=user).exists():
        raise PermissionDenied("Usuário sem acesso ao workspace.")

    return workspace
