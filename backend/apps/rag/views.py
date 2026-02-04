from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import KnowledgeDocument
from .serializers import (KnowledgeDocumentSerializer,
                          KnowledgeDocumentUploadSerializer,
                          PlaygroundQuerySerializer)
from .services import answer_with_context, index_document, search_chunks


def get_workspace_id(request):
    # você já usa header de workspace no projeto:
    # X-Workspace-ID ou X-Tenant-ID (ajuste aqui conforme seu padrão)
    wid = request.headers.get(
        "X-Workspace-ID") or request.headers.get("X-Tenant-ID")
    return wid


class KnowledgeListCreateView(APIView):
    def get(self, request):
        wid = get_workspace_id(request)
        qs = KnowledgeDocument.objects.all().order_by("-created_at")
        if wid:
            qs = qs.filter(workspace_id=wid)
        return Response(KnowledgeDocumentSerializer(qs, many=True).data)

    def post(self, request):
        wid = get_workspace_id(request)
        ser = KnowledgeDocumentUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        f = ser.validated_data["file"]

        doc = KnowledgeDocument.objects.create(
            workspace_id=wid or None,
            filename=f.name,
            file_type=(getattr(f, "content_type", "") or ""),
            file_size=getattr(f, "size", 0) or 0,
            file=f,
            status=KnowledgeDocument.STATUS_PROCESSING,
        )

        # indexa síncrono (Playground pronto hoje). Depois você joga no Celery.
        doc = index_document(doc)

        return Response(KnowledgeDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class KnowledgeReindexView(APIView):
    def post(self, request, pk):
        wid = get_workspace_id(request)
        try:
            doc = KnowledgeDocument.objects.get(pk=pk)
        except KnowledgeDocument.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        if wid and str(doc.workspace_id) != str(wid):
            return Response({"detail": "Forbidden"}, status=403)

        doc = index_document(doc)
        return Response(KnowledgeDocumentSerializer(doc).data)


class PlaygroundAskView(APIView):
    def post(self, request):
        wid = get_workspace_id(request)
        ser = PlaygroundQuerySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        question = ser.validated_data["question"]
        top_k = ser.validated_data["top_k"]

        sources = search_chunks(wid, question, top_k=top_k)
        contexts = [s["chunk"] for s in sources]

        answer, tokens_used, cost_usd = answer_with_context(question, contexts)

        return Response({
            "answer": answer,
            "sources": sources,
            "tokens_used": tokens_used,
            "cost_usd": cost_usd,
        })
