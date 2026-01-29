from typing import Any, Dict

from rest_framework import serializers

from apps.channels.models import Channel


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
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ChannelCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ["name", "provider", "external_id", "is_active"]

    def create(self, validated_data: Dict[str, Any]) -> Channel:
        request = self.context["request"]
        workspace = request.workspace
        return Channel.objects.create(workspace=workspace, **validated_data)
