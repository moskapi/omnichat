import uuid
from django.db import models


class WebhookEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    created_at = models.DateTimeField(auto_now_add=True)

    provider = models.CharField(max_length=255, blank=True, default="")

    idempotency_key = models.CharField(
        max_length=255,
        blank=True,
        default="",
        db_index=True,
    )

    raw_payload = models.JSONField(default=dict)
    raw_headers = models.JSONField(default=dict)

    normalized = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"WebhookEvent(provider={self.provider}, id={self.id})"
