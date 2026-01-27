import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, StatusBadge } from '@/components/common';
import {
  BookOpen,
  Upload,
  FileText,
  Trash2,
  MoreVertical,
  Loader2,
  File,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KnowledgeDocument, DocumentStatus } from '@/types/api';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

// Mock documents
const mockDocuments: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    filename: 'manual-produto.pdf',
    file_type: 'pdf',
    file_size: 2456789,
    status: 'indexed',
    chunks_count: 45,
    created_at: '2024-01-15T10:00:00Z',
    indexed_at: '2024-01-15T10:05:00Z',
  },
  {
    id: 'doc-2',
    filename: 'faq-atendimento.txt',
    file_type: 'txt',
    file_size: 45678,
    status: 'indexed',
    chunks_count: 12,
    created_at: '2024-02-10T14:30:00Z',
    indexed_at: '2024-02-10T14:31:00Z',
  },
  {
    id: 'doc-3',
    filename: 'politica-troca.pdf',
    file_type: 'pdf',
    file_size: 1234567,
    status: 'processing',
    created_at: new Date().toISOString(),
  },
  {
    id: 'doc-4',
    filename: 'tabela-precos.pdf',
    file_type: 'pdf',
    file_size: 567890,
    status: 'error',
    error_message: 'Não foi possível extrair texto do documento',
    created_at: '2024-03-01T09:00:00Z',
  },
];

const statusConfig: Record<DocumentStatus, { label: string; type: 'success' | 'warning' | 'error' }> = {
  indexed: { label: 'Indexado', type: 'success' },
  processing: { label: 'Processando', type: 'warning' },
  error: { label: 'Erro', type: 'error' },
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(mockDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    // Simulate upload for each file
    for (const file of Array.from(files)) {
      const newDoc: KnowledgeDocument = {
        id: `doc-${Date.now()}`,
        filename: file.name,
        file_type: file.name.split('.').pop() as 'pdf' | 'txt',
        file_size: file.size,
        status: 'processing',
        created_at: new Date().toISOString(),
      };

      setDocuments((prev) => [newDoc, ...prev]);

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === newDoc.id
            ? { ...doc, status: 'indexed', chunks_count: Math.floor(Math.random() * 50) + 10, indexed_at: new Date().toISOString() }
            : doc
        )
      );
    }

    setIsUploading(false);
    toast({
      title: 'Upload concluído',
      description: `${files.length} documento(s) adicionado(s) à base de conhecimento.`,
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    toast({
      title: 'Documento removido',
      description: 'O documento foi removido da base de conhecimento.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os documentos que a IA usa para responder perguntas
          </p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt,.docx,.md"
            multiple
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Documentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {documents.filter((d) => d.status === 'indexed').length}
                </p>
                <p className="text-sm text-muted-foreground">Indexados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-info/10">
                <BookOpen className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {documents.reduce((acc, d) => acc + (d.chunks_count || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Chunks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={BookOpen}
              title="Nenhum documento adicionado"
              description="Faça upload de PDFs, TXTs ou outros documentos para alimentar a base de conhecimento da IA"
              action={
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer Upload
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {documents.map((doc) => {
                const status = statusConfig[doc.status];
                return (
                  <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                        <File className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-foreground">{doc.filename}</span>
                          <StatusBadge
                            status={status.type}
                            label={status.label}
                            pulse={doc.status === 'processing'}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                          {doc.chunks_count && ` • ${doc.chunks_count} chunks`}
                          {doc.indexed_at &&
                            ` • Indexado em ${format(new Date(doc.indexed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`}
                        </p>
                        {doc.error_message && (
                          <p className="text-xs text-destructive mt-1">{doc.error_message}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {doc.status === 'error' && (
                        <Button variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reprocessar
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem>Visualizar</DropdownMenuItem>
                          <DropdownMenuItem>Reprocessar</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
