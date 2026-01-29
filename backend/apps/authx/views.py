from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    SignupSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

User = get_user_model()


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = SignupSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(
            {"id": user.id, "email": getattr(user, "email", None) or getattr(user, "username", "")},
            status=status.HTTP_201_CREATED,
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = PasswordResetRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data["email"].lower().strip()

        # não vaza se existe ou não (boa prática)
        user = User.objects.filter(email__iexact=email).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # URL do frontend (dev)
            frontend_base = getattr(settings, "FRONTEND_RESET_URL_BASE", "http://localhost:8080/reset-password")
            reset_link = f"{frontend_base}?uid={uid}&token={token}"

            subject = "Omnichat - Redefinição de senha"
            message = f"Use este link para redefinir sua senha:\n\n{reset_link}\n\nSe você não pediu isso, ignore."

            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@omnichat.local"),
                recipient_list=[email],
                fail_silently=True,
            )

        return Response({"ok": True}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = PasswordResetConfirmSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        uid = s.validated_data["uid"]
        token = s.validated_data["token"]
        new_password = s.validated_data["new_password"]

        try:
            user_id = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=user_id)
        except Exception:
            return Response({"detail": "Token inválido."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Token inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"ok": True}, status=status.HTTP_200_OK)
