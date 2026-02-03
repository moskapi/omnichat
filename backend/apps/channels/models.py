import uuid

from django.db import models
from django.utils import timezone


class Channel(models.Model):
    class Provider(models.TextChoices):
        WHATSAPP_OFFICIAL = "whatsapp_official", "whatsapp_official"
        EVOLUTION = "evolution", "evolution"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "tenants.Workspace",
        on_delete=models.CASCADE,
        related_name="channels",
    )

    name = models.CharField(max_length=120, db_index=True)

    provider = models.CharField(
        max_length=50,
        choices=Provider.choices,
        db_index=True,
    )

    # pode ser None se ainda não conectou/pareou
    external_id = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        db_index=True,
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    deleted_at = models.DateTimeField(null=True, blank=True)

    def soft_delete(self):
        if self.deleted_at is None:
            self.deleted_at = timezone.now()

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # Nome do canal único dentro do workspace
            models.UniqueConstraint(
                fields=["workspace", "name"],
                name="uniq_channel_name_per_workspace",
            ),
            # Evita duplicar o mesmo canal (provider + external_id) dentro do workspace
            # Só aplica quando external_id não é nulo
            models.UniqueConstraint(
                fields=["workspace", "provider", "external_id"],
                name="uniq_channel_external_per_workspace",
                condition=models.Q(external_id__isnull=False),
            ),
        ]

    def __str__(self) -> str:
        return self.name


class WorkspaceProvider(models.Model):
    class Provider(models.TextChoices):
        EVOLUTION = "evolution", "evolution"

    class Status(models.TextChoices):
        READY = "ready", "ready"
        PROVISIONING = "provisioning", "provisioning"
        ERROR = "error", "error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "tenants.Workspace",
        on_delete=models.CASCADE,
        related_name="workspace_providers",
    )
    provider = models.CharField(
        max_length=50, choices=Provider.choices, db_index=True)

    status = models.CharField(
        max_length=32, choices=Status.choices, default=Status.PROVISIONING, db_index=True
    )

    # Evolution endpoint do workspace (na Fly vai ser a URL pública desse workspace)
    base_url = models.URLField(blank=True, null=True)
    api_key = models.CharField(max_length=255, blank=True, null=True)

    last_error = models.TextField(blank=True, null=True)
    ready_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "provider"],
                name="uniq_workspace_provider_per_workspace",
            )
        ]

    def mark_ready(self):
        self.status = self.Status.READY
        self.ready_at = timezone.now()
        self.last_error = None
