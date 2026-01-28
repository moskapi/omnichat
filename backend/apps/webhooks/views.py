from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WebhookEvent
from .serializers import WebhookEventSerializer


class WebhookInboxView(APIView):
    """
    Inbox canônico para receber webhooks de providers.
    (Assinatura/validação por provider entra depois.)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = WebhookEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data.get("provider", "")
        payload = serializer.validated_data["payload"]

        # Se o client mandou headers, usamos. Senão, capturamos do request.
        raw_headers = serializer.validated_data.get("headers") or dict(request.headers)

        idempotency_key = serializer.validated_data["idempotency_key"]

        # Idempotência: se já existir, responde 200 e não duplica evento
        if WebhookEvent.objects.filter(idempotency_key=idempotency_key).exists():
            return Response({"ok": True, "idempotent": True})

        WebhookEvent.objects.create(
            provider=provider,
            idempotency_key=idempotency_key,
            raw_payload=payload,
            raw_headers=raw_headers,
        )

        return Response({"ok": True, "idempotent": False})
