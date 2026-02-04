import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, StatusBadge } from '@/components/common';
import { Plus, Radio, MoreVertical, Smartphone, Trash2, Unplug } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';

type ApiChannel = {
  id: string;
  name: string;
  provider: string;
  external_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const statusConfig = {
  ativo: { label: 'Ativo', type: 'success' as const },
  inativo: { label: 'Inativo', type: 'default' as const },
};

function getProviderLabel(provider?: string) {
  switch (provider) {
    case 'whatsapp_official':
      return 'WhatsApp Oficial';
    case 'evolution':
      return 'Evolution';
    default:
      return provider || '—';
  }
}

type DeleteMode = 'soft' | 'hard';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ApiChannel | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('soft');
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const base = workspaceId ? `/w/${workspaceId}` : '';

  function removeFromList(channelId: string) {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
  }

  async function refreshChannel() {
    const data = await api.get<ApiChannel[]>('/channels/');
    setChannels(data);
  }

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    api
      .get<ApiChannel[]>('/channels/')
      .then((data) => {
        if (!mounted) return;
        setChannels(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar canais. Tente novamente.');
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function openDeleteDialog(channel: ApiChannel, mode: DeleteMode) {
    setSelected(channel);
    setDeleteMode(mode);
    setDialogOpen(true);
  }

  async function handleDisconnect(channel: ApiChannel) {
    try {
      setBusy(true);
      await api.post(`/channels/${channel.id}/disconnect/`, {});
      await refreshChannel();
    } catch (e: any) {
      alert(e?.message || 'Falha ao desconectar. Veja o console/logs do backend.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!selected) return;

    try {
      setBusy(true);

      if (deleteMode === 'soft') {
        await api.delete(`/channels/${selected.id}/`);
        removeFromList(selected.id);
      } else {
        await api.post(`/channels/${selected.id}/hard-delete/`, {});
        removeFromList(selected.id);
      }

      setDialogOpen(false);
      setSelected(null);
    } catch (e: any) {
      const rawMsg =
        e?.response?.data?.detail ||
        e?.message ||
        'Erro ao remover canal.';

      alert(rawMsg);
    } finally {
      setBusy(false);
    }
  }

  async function softDeleteChannel(channelId: string) {
    await api.delete<void>(`/channels/${channelId}/`);
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
  }

  async function disconnectChannel(channelId: string) {
    await api.post(`/channels/${channelId}/disconnect/`);
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, is_active: false } : c))
    );
  }

  async function hardDeleteChannel(channelId: string) {
    await api.post<void>(`/channels/${channelId}/hard-delete/`);
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Canais</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas integrações com WhatsApp
          </p>
        </div>
        <Button onClick={() => navigate(`${base}/channels/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Canal
        </Button>
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === 'soft' ? 'Remover canal?' : 'Remover completamente?'}
            </AlertDialogTitle>

            <AlertDialogDescription asChild>
              {selected ? (
                <div className="space-y-2">
                  <div className="mt-2">
                    <strong>{selected.name}</strong>
                    <div className="text-xs text-muted-foreground">
                      {getProviderLabel(selected.provider)} • {selected.external_id || '—'}
                    </div>
                  </div>

                  {deleteMode === 'soft' ? (
                    <p className="mt-3">
                      Isso fará um <strong>soft delete</strong> (o canal some da lista, mas fica
                      marcado como deletado no banco).
                      {selected.is_active ? (
                        <span className="block mt-2 text-destructive">
                          Este canal está conectado. O backend bloqueia soft delete (409).
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-3">
                      Isso fará <strong>hard delete</strong>: tenta apagar a instância na Evolution e
                      remove o canal do banco. Use quando quiser “limpar tudo”.
                    </p>
                  )}
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={busy || (deleteMode === 'soft' && !!selected?.is_active)}
            >
              {busy ? 'Processando...' : deleteMode === 'soft' ? 'Remover' : 'Remover definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error State */}
      {error ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Radio}
              title="Erro ao carregar canais"
              description={error}
              action={<Button onClick={() => window.location.reload()}>Tentar Novamente</Button>}
            />
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Radio}
              title="Carregando canais..."
              description="Aguarde enquanto carregamos seus canais do WhatsApp."
            />
          </CardContent>
        </Card>
      ) : channels.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Radio}
              title="Nenhum canal configurado"
              description="Conecte seu primeiro canal WhatsApp para começar a receber mensagens"
              action={
                <Button onClick={() => navigate(`${base}/channels/new`)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Canal
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel) => {
            const isActive = channel.is_active;
            const status = isActive ? statusConfig.ativo : statusConfig.inativo;

            return (
              <Card key={channel.id} className="hover:shadow-card-hover transition-shadow">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-whatsapp/10">
                      <Smartphone className="w-6 h-6 text-whatsapp" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{channel.name}</h3>
                        <StatusBadge status={status.type} label={status.label} pulse={isActive} />
                      </div>

                      <p className="text-sm text-muted-foreground">{channel.external_id || '—'}</p>

                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getProviderLabel(channel.provider)}
                        {' • '}
                        {channel.created_at
                          ? `Criado em ${format(
                            new Date(channel.created_at),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => navigate(`${base}/channels/${channel.id}/edit`)}>
                          Editar
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => navigate(`${base}/channels/${channel.id}/logs`)}>
                          Ver Logs
                        </DropdownMenuItem>

                        {channel.provider === 'evolution' && channel.external_id ? (
                          <DropdownMenuItem
                            onClick={() => handleDisconnect(channel)}
                            disabled={busy || !channel.is_active}
                          >
                            <Unplug className="w-4 h-4 mr-2" />
                            Desconectar
                          </DropdownMenuItem>
                        ) : null}

                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={async () => {
                            try {
                              await softDeleteChannel(channel.id);
                            } catch (err: any) {
                              const status = err?.status;

                              if (status === 409) {
                                const wantDisconnect = window.confirm(
                                  "Esse canal está conectado.\n\nOK = Desconectar e remover (soft)\nCancelar = Vou escolher hard-delete na próxima tela"
                                );

                                if (wantDisconnect) {
                                  await disconnectChannel(channel.id);
                                  await softDeleteChannel(channel.id);
                                  return;
                                }

                                const wantHard = window.confirm(
                                  "Deseja HARD DELETE?\nIsso remove o canal do banco e tenta deletar a instância na Evolution."
                                );
                                if (wantHard) {
                                  await hardDeleteChannel(channel.id);
                                }

                                return;
                              }

                              alert(err?.message || "Erro ao remover canal.");
                            }
                          }}
                        >
                          Remover
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => openDeleteDialog(channel, 'hard')}
                          disabled={busy}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover completamente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
