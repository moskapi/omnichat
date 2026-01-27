import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, StatusBadge } from '@/components/common';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Plus, Copy, Eye, EyeOff, Loader2, Check, MoreVertical, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApiKey, CreateApiKeyResponse } from '@/types/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

// Mock API keys
const mockApiKeys: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Integração ERP',
    prefix: 'sk_live_abc123',
    last_used_at: '2024-03-15T14:30:00Z',
    created_at: '2024-01-10T10:00:00Z',
    is_active: true,
  },
  {
    id: 'key-2',
    name: 'App Mobile',
    prefix: 'sk_live_xyz789',
    created_at: '2024-02-20T09:15:00Z',
    is_active: true,
  },
  {
    id: 'key-3',
    name: 'Teste Local',
    prefix: 'sk_test_def456',
    created_at: '2024-03-01T16:45:00Z',
    is_active: false,
  },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const generatedKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    const createdKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      prefix: generatedKey.substring(0, 15),
      created_at: new Date().toISOString(),
      is_active: true,
    };

    setApiKeys([createdKey, ...apiKeys]);
    setNewKey(generatedKey);
    setIsCreating(false);
  };

  const handleCopyKey = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewKeyName('');
    setNewKey(null);
    setShowNewKey(false);
  };

  const handleDeactivateKey = (id: string) => {
    setApiKeys((prev) =>
      prev.map((key) => (key.id === id ? { ...key, is_active: false } : key))
    );
    toast({
      title: 'API Key desativada',
      description: 'A chave foi desativada e não poderá mais ser usada.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as chaves de acesso para integração via API
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            {!newKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Criar nova API Key</DialogTitle>
                  <DialogDescription>
                    Dê um nome para identificar esta chave
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="key-name">Nome</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Ex: Integração CRM"
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateKey} disabled={isCreating || !newKeyName.trim()}>
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Key'
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>API Key criada!</DialogTitle>
                  <DialogDescription>
                    Copie sua chave agora. Por segurança, ela não será exibida novamente.
                  </DialogDescription>
                </DialogHeader>
                <Alert className="my-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Guarde esta chave em um local seguro. Você não poderá vê-la novamente.
                  </AlertDescription>
                </Alert>
                <div className="py-2">
                  <Label>Sua API Key</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative flex-1">
                      <Input
                        readOnly
                        value={showNewKey ? newKey : '•'.repeat(40)}
                        className="pr-10 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowNewKey(!showNewKey)}
                      >
                        {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button variant="outline" onClick={handleCopyKey}>
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseDialog}>Entendi</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Key}
              title="Nenhuma API Key"
              description="Crie uma API Key para integrar sua aplicação via REST API"
              action={
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar API Key
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                      <Key className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-foreground">{apiKey.name}</span>
                        <StatusBadge
                          status={apiKey.is_active ? 'success' : 'default'}
                          label={apiKey.is_active ? 'Ativa' : 'Inativa'}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {apiKey.prefix}...
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Criada em {format(new Date(apiKey.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        {apiKey.last_used_at && (
                          <> • Último uso: {format(new Date(apiKey.last_used_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      {apiKey.is_active && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeactivateKey(apiKey.id)}
                        >
                          Desativar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
