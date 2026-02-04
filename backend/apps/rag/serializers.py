from rest_framework import serializers

from .models import KnowledgeChunk, KnowledgeDocument


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeDocument
        fields = [
            "id",
            "workspace",
            "filename",
            "file_type",
            "file_size",
            "file",
            "status",
            "chunks_count",
            "error_message",
            "created_at",
            "indexed_at",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "status",
            "chunks_count",
            "error_message",
            "created_at",
            "indexed_at",
        ]


class PlaygroundQuerySerializer(serializers.Serializer):
    question = serializers.CharField(min_length=1, max_length=4000)
    top_k = serializers.IntegerField(min_value=1, max_value=20, default=5)
