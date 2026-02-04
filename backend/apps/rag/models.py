from django.db import models
from django.utils import timezone
from pgvector.django import VectorField


class KnowledgeDocument(models.Model):
    STATUS_PROCESSING = "processing"
    STATUS_INDEXED = "indexed"
    STATUS_ERROR = "error"
    STATUS_CHOICES = [
        (STATUS_PROCESSING, "Processing"),
        (STATUS_INDEXED, "Indexed"),
        (STATUS_ERROR, "Error"),
    ]

    # Por enquanto UUID (compatível com seu header X-Workspace-ID)
    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)

    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=30, blank=True, default="")
    file_size = models.PositiveIntegerField(default=0)

    file = models.FileField(upload_to="knowledge/", null=True, blank=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PROCESSING)
    chunks_count = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    indexed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.filename} ({self.status})"


class KnowledgeChunk(models.Model):
    document = models.ForeignKey(
        KnowledgeDocument, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.PositiveIntegerField(default=0)
    content = models.TextField()

    # text-embedding-3-small = 1536 dims
    embedding = VectorField(dimensions=1536, null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=["document", "chunk_index"]),
        ]

    def __str__(self):
        return f"{self.document_id}#{self.chunk_index}"
