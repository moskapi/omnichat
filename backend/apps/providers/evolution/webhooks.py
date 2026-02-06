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
    # alguns formatos: payload.data.base64 / payload.data.qrcode / payload.data.code
    data = payload.get("data") if isinstance(
        payload.get("data"), dict) else payload
    if not isinstance(data, dict):
        return None

    v = data.get("base64") or data.get(
        "qrcode") or data.get("qr") or data.get("code")
    if not isinstance(v, str) or not v:
        return None

    # se vier data-url, corta o prefixo
    if v.startswith("data:image"):
        return v.split(",", 1)[-1]

    return v


@api_view(["POST"])
@permission_classes([AllowAny])
def evolution_webhook(request):
    payload = request.data if isinstance(request.data, dict) else {}

    event = _get_event(payload)
    instance = _get_instance(payload)
    qr_base64 = _get_qr_base64(payload)

    if event == "QRCODE_UPDATED" and instance and qr_base64:
        cache.set(f"evo:qr:{instance}", qr_base64, timeout=60 * 10)  # 10 min
        return Response({"ok": True})

    return Response({"ok": True})
