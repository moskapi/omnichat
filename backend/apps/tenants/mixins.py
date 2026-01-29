from rest_framework.exceptions import ValidationError, NotFound

from apps.tenants.models import Workspace


class WorkspaceRequiredMixin:
    """
    Garante que X-Workspace-ID exista e injeta request.workspace
    sem quebrar o pipeline do DRF (content negotiation, renderer, etc).
    """

    def initial(self, request, *args, **kwargs):
        # chama o DRF primeiro (isso prepara accepted_renderer, etc)
        super().initial(request, *args, **kwargs)

        workspace_id = request.headers.get("X-Workspace-ID")
        if not workspace_id:
            raise ValidationError({"detail": "X-Workspace-ID header é obrigatório."})

        try:
            workspace = Workspace.objects.get(id=workspace_id)
        except Workspace.DoesNotExist:
            raise NotFound({"detail": "Workspace não encontrado."})

        request.workspace = workspace
