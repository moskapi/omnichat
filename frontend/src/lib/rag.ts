import { api } from "@/lib/api";
import type { KnowledgeDocument } from "@/types/api";

export type PlaygroundSource = {
    document_id: string;
    filename: string;
    chunk: string;
    score: number;
};

export type PlaygroundResponse = {
    answer: string;
    sources: PlaygroundSource[];
    tokens_used: number;
    cost_usd: number;
};

export async function listKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
    return api.get<KnowledgeDocument[]>("/rag/knowledge/");
}

export async function uploadKnowledgeDocument(file: File): Promise<KnowledgeDocument> {
    const form = new FormData();
    form.append("file", file);

    return api.post<KnowledgeDocument>("/rag/knowledge/", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
}

export async function reindexKnowledgeDocument(id: string): Promise<KnowledgeDocument> {
    return api.post<KnowledgeDocument>(`/rag/knowledge/${id}/reindex/`);
}

export async function askPlayground(question: string, top_k = 5): Promise<PlaygroundResponse> {
    return api.post<PlaygroundResponse>("/rag/playground/ask/", { question, top_k });
}

export async function deleteKnowledgeDocument(id: string): Promise<void> {
    await api.delete(`/rag/knowledge/${id}/`);
}
