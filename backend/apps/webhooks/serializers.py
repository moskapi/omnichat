import hashlib
import json
from rest_framework import serializers


class WebhookEventSerializer(serializers.Serializer):
    provider = serializers.CharField(required=False, allow_blank=True)
    payload = serializers.JSONField()
    headers = serializers.JSONField(required=False)
    idempotency_key = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        provider = attrs.get("provider", "")
        payload = attrs["payload"]
        idempotency_key = attrs.get("idempotency_key")

        if not idempotency_key:
            payload_hash = hashlib.sha256(
                json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest()
            provider_prefix = provider or "unknown"
            attrs["idempotency_key"] = f"{provider_prefix}:{payload_hash}"

        return attrs
