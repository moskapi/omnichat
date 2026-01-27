import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, StatusBadge } from '@/components/common';
import { Plus, Radio, MoreVertical, Smartphone, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Channel, ChannelStatus } from '@/types/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock channels
const mockChannels: Channel[] = [
  {
    id: 'ch-1',
    name: 'WhatsApp Principal',
    provider: 'whatsapp_official',
    status: 'connected',
    phone_number: '+55 11 99988-7766',
    created_at: '2024-01-15T10:00:00Z',
    last_sync_at: new Date().toISOString(),
  },
  {
    id: 'ch-2',
    name: 'WhatsApp Suporte',
    provider: 'evolution_api',
    status: 'pending',
    phone_number: '+55 11 98877-6655',
    created_at: '2024-02-20T14:30:00Z',
  },
  {
    id: 'ch-3',
    name: 'WhatsApp Vendas',
    provider: 'whatsapp_official',
    status: 'error',
    phone_number: '+55 21 97766-5544',
    created_at: '2024-03-10T09:15:00Z',
    error_message: 'Token expirado. Por favor, reconecte o canal.',
  },
];

const statusConfig: Record<ChannelStatus, { label: string; type: 'success' | 'warning' | 'error' | 'default' }> = {
  connected: { label: 'Conectado', type: 'success' },
  pending: { label: 'Pendente', type: 'warning' },
  error: { label: 'Erro', type: 'error' },
  disconnected: { label: 'Desconectado', type: 'default' },
};

export default function ChannelsPage() {
  const [channels] = useState<Channel[]>(mockChannels);
  const navigate = useNavigate();

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

      {/* Channels List */}
      {channels.length === 0 ? (
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
            const status = statusConfig[channel.status];
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
                          pulse={channel.status === 'connected'}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{channel.phone_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {channel.provider === 'whatsapp_official' ? 'WhatsApp Oficial' : 'Evolution API'}
                        {channel.last_sync_at && ` • Última sinc: ${format(new Date(channel.last_sync_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`}
                      </p>
                      {channel.error_message && (
                        <p className="text-xs text-destructive mt-1">{channel.error_message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {channel.status === 'error' && (
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reconectar
                      </Button>
                    )}
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
