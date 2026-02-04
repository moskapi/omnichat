from rest_framework import serializers

from .models import KnowledgeDocument


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeDocument
        fields = [
            "id",
            "filename",
            "file_type",
            "file_size",
            "status",
            "chunks_count",
            "created_at",
            "indexed_at",
            "error_message",
        ]


class KnowledgeDocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


class PlaygroundQuerySerializer(serializers.Serializer):
    question = serializers.CharField()
    top_k = serializers.IntegerField(
        required=False, default=5, min_value=1, max_value=20)
    question = serializers.CharField()
    top_k = serializers.IntegerField(
        required=False, default=5, min_value=1, max_value=20)
