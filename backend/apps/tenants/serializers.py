import hashlib
import secrets

from django.db import transaction
from rest_framework import serializers

from apps.tenants.models import ApiKey, Membership, Workspace


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        workspace = Workspace.objects.create(created_by=user, **validated_data)
        if user and user.is_authenticated:
            Membership.objects.create(
                workspace=workspace,
                user=user,
                role=Membership.ROLE_ADMIN,
            )
        return workspace


class MembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = ["id", "workspace", "user", "role", "created_at"]
        read_only_fields = ["id", "workspace", "created_at"]

    def create(self, validated_data):
        request = self.context.get("request")
        workspace = getattr(request, "workspace", None)
        if workspace is None:
            raise serializers.ValidationError("Workspace inválido.")
        return Membership.objects.create(workspace=workspace, **validated_data)


class ApiKeyCreateSerializer(serializers.ModelSerializer):
    secret = serializers.CharField(read_only=True)

    class Meta:
        model = ApiKey
        fields = ["id", "name", "created_at", "secret"]
        read_only_fields = ["id", "created_at", "secret"]

    def create(self, validated_data):
        request = self.context.get("request")
        workspace = getattr(request, "workspace", None)
        if workspace is None:
            raise serializers.ValidationError("Workspace inválido.")
        secret = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(secret.encode("utf-8")).hexdigest()
        api_key = ApiKey.objects.create(
            workspace=workspace,
            key_hash=key_hash,
            **validated_data,
        )
        api_key._secret = secret
        return api_key

    def to_representation(self, instance):
        data = super().to_representation(instance)
        secret = getattr(instance, "_secret", None)
        if secret:
            data["secret"] = secret
        else:
            data.pop("secret", None)
        return data


class ApiKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiKey
        fields = ["id", "name", "created_at"]
        read_only_fields = ["id", "created_at"]
