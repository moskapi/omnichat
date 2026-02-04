import os
import re
from io import BytesIO

import requests
from django.utils import timezone
from pgvector.django import CosineDistance
from pypdf import PdfReader

from .models import KnowledgeChunk, KnowledgeDocument

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")


def _headers():
    return {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }


def extract_text_from_upload(uploaded_file, content_type: str) -> str:
    """
    Extrai texto de PDF ou TXT.
    Remove NULs para não quebrar inserts no Postgres.
    """
    uploaded_file.seek(0)
    data = uploaded_file.read()

    # PDF
    if content_type and "pdf" in content_type.lower():
        reader = PdfReader(BytesIO(data))
        pages = []
        for p in reader.pages:
            try:
                pages.append(p.extract_text() or "")
            except Exception:
                pass
        return ("\n".join(pages)).replace("\x00", "").strip()

    # TXT / fallback
    return data.decode("utf-8", errors="ignore").replace("\x00", "").strip()


def chunk_text(text: str, max_chars: int = 900, overlap: int = 120, max_chunks: int = 200) -> list[str]:
    text = re.sub(r"\s+", " ", (text or "")).strip()
    if not text:
        return []

    chunks: list[str] = []
    i = 0
    while i < len(text) and len(chunks) < max_chunks:
        end = min(len(text), i + max_chars)
        chunk = text[i:end].strip()
        if chunk:
            chunks.append(chunk)

        if end == len(text):
            break

        i = max(0, end - overlap)

    return chunks


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY não configurada.")

    payload = {"model": OPENAI_EMBED_MODEL, "input": texts}
    r = requests.post(
        f"{OPENAI_BASE_URL}/embeddings",
        headers=_headers(),
        json=payload,
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    return [item["embedding"] for item in data["data"]]


def answer_with_context(question: str, contexts: list[str]) -> tuple[str, int, float]:
    context_block = "\n\n".join(
        [f"[{i+1}] {c}" for i, c in enumerate(contexts)])

    payload = {
        "model": OPENAI_CHAT_MODEL,
        "input": [
            {
                "role": "system",
                "content": (
                    "Você é um assistente do Omnichat. Responda em PT-BR. "
                    "Use o CONTEXTO fornecido quando for relevante. "
                    "Se não houver base no contexto, diga que não encontrou nos documentos."
                ),
            },
            {
                "role": "user",
                "content": f"PERGUNTA:\n{question}\n\nCONTEXTO:\n{context_block}",
            },
        ],
    }

    r = requests.post(
        f"{OPENAI_BASE_URL}/responses",
        headers=_headers(),
        json=payload,
        timeout=90,
    )
    r.raise_for_status()
    out = r.json()

    text_parts = []
    for item in out.get("output", []):
        for c in item.get("content", []):
            if c.get("type") == "output_text":
                text_parts.append(c.get("text", ""))

    answer = "\n".join([t for t in text_parts if t]).strip()

    usage = out.get("usage", {}) or {}
    tokens = int(usage.get("total_tokens") or 0)

    return answer or "Não consegui gerar resposta.", tokens, 0.0


def index_document(doc: KnowledgeDocument) -> KnowledgeDocument:
    doc.status = KnowledgeDocument.STATUS_PROCESSING
    doc.error_message = None
    doc.save(update_fields=["status", "error_message"])

    try:
        if not doc.file:
            raise ValueError("Documento sem arquivo.")

        raw = extract_text_from_upload(doc.file, doc.file_type)
        chunks = chunk_text(raw)

        # limpa chunks antigos
        KnowledgeChunk.objects.filter(document=doc).delete()

        embeddings = embed_texts(chunks) if chunks else []

        bulk = [
            KnowledgeChunk(document=doc, chunk_index=i,
                           content=content, embedding=emb)
            for i, (content, emb) in enumerate(zip(chunks, embeddings))
        ]

        if bulk:
            KnowledgeChunk.objects.bulk_create(bulk)

        doc.status = KnowledgeDocument.STATUS_INDEXED
        doc.chunks_count = len(bulk)
        doc.indexed_at = timezone.now()
        doc.save(update_fields=["status", "chunks_count", "indexed_at"])
        return doc

    except Exception as e:
        doc.status = KnowledgeDocument.STATUS_ERROR
        doc.error_message = str(e)
        doc.save(update_fields=["status", "error_message"])
        return doc


def search_chunks(workspace_id, question: str, top_k: int = 5):
    q_emb = embed_texts([question])[0]

    qs = KnowledgeChunk.objects.select_related("document").all()
    if workspace_id:
        qs = qs.filter(document__workspace_id=workspace_id)

    qs = qs.annotate(distance=CosineDistance(
        "embedding", q_emb)).order_by("distance")[:top_k]

    results = []
    for ch in qs:
        score = float(1.0 - (ch.distance or 0.0))
        results.append(
            {
                "document_id": str(ch.document_id),
                "filename": ch.document.filename,
                "chunk": ch.content,
                "score": score,
            }
        )
    return results
