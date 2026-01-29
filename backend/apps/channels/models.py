import uuid

from django.db import models


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
