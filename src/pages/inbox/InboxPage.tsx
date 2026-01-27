import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState, StatusBadge } from '@/components/common';
import { Search, MessageSquare, Bot, MoreVertical } from 'lucide-react';
import { Conversation, Message } from '@/types/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock conversations for demonstration
const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    channel_id: 'ch-1',
    contact: {
      id: 'contact-1',
      name: 'João Silva',
      phone_number: '+5511999887766',
      avatar_url: '',
    },
    last_message: {
      id: 'msg-1',
      conversation_id: 'conv-1',
      direction: 'inbound',
      type: 'text',
      content: 'Olá, gostaria de saber mais sobre os planos disponíveis.',
      status: 'delivered',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    unread_count: 2,
    is_ai_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'conv-2',
    channel_id: 'ch-1',
    contact: {
      id: 'contact-2',
      name: 'Maria Santos',
      phone_number: '+5511988776655',
    },
    last_message: {
      id: 'msg-2',
      conversation_id: 'conv-2',
      direction: 'outbound',
      type: 'text',
      content: 'Perfeito! Seu pedido foi confirmado. ✅',
      status: 'read',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      is_ai_generated: true,
    },
    unread_count: 0,
    is_ai_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'conv-3',
    channel_id: 'ch-1',
    contact: {
      id: 'contact-3',
      name: 'Carlos Oliveira',
      phone_number: '+5521977665544',
    },
    last_message: {
      id: 'msg-3',
      conversation_id: 'conv-3',
      direction: 'inbound',
      type: 'text',
      content: 'Preciso de ajuda com minha assinatura',
      status: 'delivered',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    unread_count: 1,
    is_ai_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function InboxPage() {
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const filteredConversations = conversations.filter((conv) =>
    conv.contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contact.phone_number.includes(searchQuery) ||
    conv.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    navigate(`/inbox/${id}`);
  };

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return phone?.slice(-2) || 'XX';
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {conversations.length} conversas • {conversations.reduce((acc, c) => acc + c.unread_count, 0)} não lidas
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar conversas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma conversa encontrada"
          description={searchQuery ? 'Tente ajustar sua busca' : 'As conversas aparecerão aqui quando seus clientes entrarem em contato'}
        />
      ) : (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                  'hover:bg-muted/50 hover:border-border',
                  selectedId === conversation.id
                    ? 'bg-accent border-primary/30'
                    : 'bg-card border-border/50',
                  conversation.unread_count > 0 && 'border-l-2 border-l-primary'
                )}
              >
                <Avatar className="h-11 w-11 flex-shrink-0">
                  <AvatarImage src={conversation.contact.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(conversation.contact.name, conversation.contact.phone_number)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        'font-medium truncate',
                        conversation.unread_count > 0 ? 'text-foreground' : 'text-foreground/80'
                      )}>
                        {conversation.contact.name || conversation.contact.phone_number}
                      </span>
                      {conversation.is_ai_enabled && (
                        <Bot className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {conversation.last_message && formatTime(conversation.last_message.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      'text-sm truncate',
                      conversation.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {conversation.last_message?.direction === 'outbound' && (
                        <span className="text-muted-foreground">Você: </span>
                      )}
                      {conversation.last_message?.content}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conversation.last_message?.is_ai_generated && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          IA
                        </Badge>
                      )}
                      {conversation.unread_count > 0 && (
                        <Badge className="h-5 min-w-[20px] flex items-center justify-center text-xs px-1.5">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
