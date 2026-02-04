# backend/apps/rag/urls.py

from django.urls import path

from .views import (KnowledgeDetailView, KnowledgeListCreateView,
                    KnowledgeReindexView, PlaygroundAskView)

urlpatterns = [
    path("knowledge/", KnowledgeListCreateView.as_view(), name="rag-knowledge"),
    path("knowledge/<uuid:pk>/reindex/",
         KnowledgeReindexView.as_view(), name="rag-knowledge-reindex"),
    path("knowledge/<uuid:pk>/", KnowledgeDetailView.as_view(),
         name="rag-knowledge-detail"),
    path("playground/ask/", PlaygroundAskView.as_view(), name="rag-playground-ask"),
]
