from apps.tenants.workspace import resolve_workspace


class WorkspaceRequiredMixin:
    def initial(self, request, *args, **kwargs):
        # 1) autentica primeiro (popula request.user)
        self.perform_authentication(request)

        # 2) resolve workspace a partir do header (agora com user autenticado)
        request.workspace = resolve_workspace(request)

        # 3) agora sim roda permissões e throttling
        self.check_permissions(request)
        self.check_throttles(request)
