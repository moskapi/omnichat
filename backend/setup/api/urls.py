# backend/setup/api/urls.py
from django.urls import include, path

urlpatterns = [
    # Cada app vai expor suas rotas internas em apps/<app>/urls.py
    # e aqui a gente inclui tudo no /api/v1/
    path("tenants/", include("apps.tenants.urls")),
    path("auth/", include("apps.authx.urls")),
    path("channels/", include("apps.channels.urls")),
    path("webhooks/", include("apps.webhooks.urls")),
    path("conversations/", include("apps.conversations.urls")),
    path("messages/", include("apps.messages.urls")),
    path("agents/", include("apps.agents.urls")),
    path("rag/", include("apps.rag.urls")),
    path("audit/", include("apps.audit.urls")),
]
