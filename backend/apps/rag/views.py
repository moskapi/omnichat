from apps.tenants.models import Workspace
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import KnowledgeChunk, KnowledgeDocument
from .serializers import KnowledgeDocumentSerializer, PlaygroundQuerySerializer
from .services import answer_with_context, index_document, search_chunks


def get_workspace_id(request):
    # aceita os dois headers (compat com seu projeto)
    return request.headers.get("X-Workspace-ID") or request.headers.get("X-Tenant-ID")


def require_workspace(request) -> Workspace:
    wid = get_workspace_id(request)
    if not wid:
        raise ValidationError({"detail": "X-Workspace-ID required"})

    try:
        ws = Workspace.objects.get(id=wid)
    except Workspace.DoesNotExist:
        raise ValidationError({"detail": "Workspace not found"})

    # TODO (segurança multi-tenant):
    # validar se request.user pertence ao workspace (membership)
    # ex: Workspace.objects.filter(id=wid, memberships__user=request.user).first()

    return ws


class KnowledgeListCreateView(APIView):
    def get(self, request):
        ws = require_workspace(request)
        qs = KnowledgeDocument.objects.filter(
            workspace=ws).order_by("-created_at")
        return Response(KnowledgeDocumentSerializer(qs, many=True).data)

    def post(self, request):
        ws = require_workspace(request)

        f = request.FILES.get("file")
        if not f:
            raise ValidationError({"detail": "file is required"})

        doc = KnowledgeDocument.objects.create(
            workspace=ws,
            filename=f.name,
            file_type=getattr(f, "content_type", "") or "",
            file_size=getattr(f, "size", 0) or 0,
            file=f,
            status=KnowledgeDocument.STATUS_PROCESSING,
        )

        index_document(doc)
        return Response(KnowledgeDocumentSerializer(doc).data, status=201)


class KnowledgeReindexView(APIView):
    def post(self, request, pk):
        ws = require_workspace(request)

        try:
            doc = KnowledgeDocument.objects.get(pk=pk, workspace=ws)
        except KnowledgeDocument.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        doc = index_document(doc)
        return Response(KnowledgeDocumentSerializer(doc).data)


class PlaygroundAskView(APIView):
    def post(self, request):
        ws = require_workspace(request)

        ser = PlaygroundQuerySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        question = ser.validated_data["question"]
        top_k = ser.validated_data["top_k"]

        sources = search_chunks(str(ws.id), question, top_k=top_k)
        contexts = [s["chunk"] for s in sources]

        answer, tokens_used, cost_usd = answer_with_context(question, contexts)

        return Response(
            {
                "answer": answer,
                "sources": sources,
                "tokens_used": tokens_used,
                "cost_usd": cost_usd,
            }
        )


class KnowledgeDetailView(APIView):
    def delete(self, request, pk):
        ws = require_workspace(request)

        try:
            doc = KnowledgeDocument.objects.get(pk=pk, workspace=ws)
        except KnowledgeDocument.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        # apaga chunks (FK CASCADE já faria, mas mantém explícito)
        KnowledgeChunk.objects.filter(document=doc).delete()

        # remove arquivo físico
        if doc.file:
            try:
                doc.file.delete(save=False)
            except Exception:
                pass

        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
