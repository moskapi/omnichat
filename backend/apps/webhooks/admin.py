from django.contrib import admin

from .models import WebhookEvent


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("id", "provider", "idempotency_key", "created_at")
    search_fields = ("id", "provider", "idempotency_key")
    list_filter = ("provider", "created_at")
