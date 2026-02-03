from typing import Any, Dict

from apps.channels.models import Channel
from rest_framework import serializers


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = [
            "id",
            "name",
            "provider",
            "external_id",
            "is_active",
            "created_at",
            "deleted_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at"]


class ChannelCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        # ✅ incluir id no response (e outros campos úteis)
        fields = [
            "id",
            "name",
            "provider",
            "external_id",
            "is_active",
            "created_at",
            "deleted_at",
            "updated_at",
        ]
        read_only_fields = ["id", "external_id",
                            "is_active", "created_at", "updated_at", "deleted_at"]

    def create(self, validated_data):
        request = self.context["request"]
        workspace = request.workspace

        provider = validated_data["provider"]

        if provider == Channel.Provider.EVOLUTION:
            validated_data["external_id"] = None
            validated_data["is_active"] = False
        else:
            validated_data["is_active"] = True

        return Channel.objects.create(workspace=workspace, **validated_data)
