from django.urls import path

from .views import (KnowledgeListCreateView, KnowledgeReindexView,
                    PlaygroundAskView)

urlpatterns = [
    path("knowledge/", KnowledgeListCreateView.as_view(), name="rag-knowledge"),
    path("knowledge/<uuid:pk>/reindex/",
         KnowledgeReindexView.as_view(), name="rag-knowledge-reindex"),
    path("playground/ask/", PlaygroundAskView.as_view(), name="rag-playground-ask"),
]
