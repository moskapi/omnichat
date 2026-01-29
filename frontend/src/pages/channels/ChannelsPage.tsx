import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, StatusBadge } from '@/components/common';
import { Plus, Radio, MoreVertical, Smartphone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar canais. Tente novamente.'
        );
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
        <Button onClick={() => navigate('/channels/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Canal
        </Button>
      </div>

      {/* Error State */}
      {error ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Radio}
              title="Erro ao carregar canais"
              description={error}
              action={
                <Button onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              }
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
                <Button onClick={() => navigate('/channels/new')}>
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
                        <StatusBadge
                          status={status.type}
                          label={status.label}
                          pulse={isActive}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {channel.external_id || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getProviderLabel(channel.provider)}
                        {' • '}
                        {channel.created_at
                          ? `Criado em ${format(new Date(channel.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
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
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Ver Logs</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Remover</DropdownMenuItem>
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


