from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(required=False, allow_blank=True)

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        email = validated_data["email"].lower().strip()
        password = validated_data["password"]
        name = validated_data.get("name", "").strip()

        # Compatível com User padrão (username) ou custom (email)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "Este email já está em uso."})

        user = User()
        # tenta setar email/username de forma compatível
        if hasattr(user, "email"):
            user.email = email
        if hasattr(user, "username"):
            user.username = email  # simples: username = email

        if hasattr(user, "first_name") and name:
            user.first_name = name

        user.set_password(password)
        user.is_active = True
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_new_password(self, value):
        validate_password(value)
        return value
