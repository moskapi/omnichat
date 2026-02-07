import hashlib
import json

from apps.webhooks.models import WebhookEvent
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


def _get_event(payload: dict) -> str:
    return (payload.get("event") or payload.get("type") or "").upper()


def _get_instance(payload: dict) -> str | None:
    if payload.get("instance"):
        return payload.get("instance")
    if payload.get("instanceName"):
        return payload.get("instanceName")
    data = payload.get("data")
    if isinstance(data, dict):
        return data.get("instance") or data.get("instanceName")
    return None


def _get_qr_base64(payload: dict) -> str | None:
    data = payload.get("data") if isinstance(
        payload.get("data"), dict) else payload
    if not isinstance(data, dict):
        return None

    v = data.get("base64") or data.get(
        "qrcode") or data.get("qr") or data.get("code")
    if not isinstance(v, str) or not v:
        return None

    if v.startswith("data:image"):
        return v.split(",", 1)[-1]
    return v


def _stable_hash(payload: dict) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False,
                     separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _model_fields(model_cls) -> set[str]:
    return {f.name for f in model_cls._meta.fields}


def _create_webhook_event(*, provider: str, payload: dict, headers: dict):
    """
    Cria WebhookEvent de forma tolerante a nomes de campos diferentes.
    Requer no mínimo: provider + payload + idempotency_key.
    """
    fields = _model_fields(WebhookEvent)

    idem = _stable_hash(payload)

    # se já existe, não cria outro
    if "idempotency_key" in fields and WebhookEvent.objects.filter(idempotency_key=idem).exists():
        return False

    create_kwargs = {}

    # provider
    if "provider" in fields:
        create_kwargs["provider"] = provider

    # idempotency_key
    if "idempotency_key" in fields:
        create_kwargs["idempotency_key"] = idem

    # payload (tenta vários nomes comuns)
    payload_field = None
    for name in ("raw_payload", "payload", "body", "data"):
        if name in fields:
            payload_field = name
            break
    if payload_field:
        create_kwargs[payload_field] = payload

    # headers (tenta vários nomes comuns)
    headers_field = None
    for name in ("raw_headers", "headers", "request_headers"):
        if name in fields:
            headers_field = name
            break
    if headers_field:
        create_kwargs[headers_field] = headers

    WebhookEvent.objects.create(**create_kwargs)
    return True


@api_view(["POST"])
@permission_classes([AllowAny])
def evolution_webhook(request):
    payload = request.data if isinstance(request.data, dict) else {}

    # 1) Mantém QR cache
    event = _get_event(payload)
    instance = _get_instance(payload)
    qr_base64 = _get_qr_base64(payload)

    if event == "QRCODE_UPDATED" and instance and qr_base64:
        cache.set(f"evo:qr:{instance}", qr_base64, timeout=60 * 10)  # 10 min

    # 2) Salva no inbox
    _create_webhook_event(
        provider="evolution",
        payload=payload,
        headers=dict(request.headers),
    )

    return Response({"ok": True})
