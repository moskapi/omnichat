import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Send,
  Bot,
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Message, Conversation, Contact } from '@/types/api';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data
const mockContact: Contact = {
  id: 'contact-1',
  name: 'João Silva',
  phone_number: '+5511999887766',
};

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    direction: 'inbound',
    type: 'text',
    content: 'Olá! Gostaria de saber mais sobre os planos disponíveis.',
    status: 'delivered',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    direction: 'outbound',
    type: 'text',
    content: 'Olá João! Claro, temos 3 planos: Starter, Pro e Enterprise. O Starter começa em R$99/mês e inclui até 1000 mensagens.',
    status: 'read',
    created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    is_ai_generated: true,
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    direction: 'inbound',
    type: 'text',
    content: 'Interessante! E o plano Pro, o que inclui?',
    status: 'delivered',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-4',
    conversation_id: 'conv-1',
    direction: 'outbound',
    type: 'text',
    content: 'O plano Pro custa R$299/mês e inclui até 5000 mensagens, integração com IA avançada, e suporte prioritário. Posso te enviar mais detalhes?',
    status: 'delivered',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    is_ai_generated: true,
  },
  {
    id: 'msg-5',
    conversation_id: 'conv-1',
    direction: 'inbound',
    type: 'text',
    content: 'Sim, por favor! E vocês têm teste gratuito?',
    status: 'delivered',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    const message: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: id!,
      direction: 'outbound',
      type: 'text',
      content: newMessage,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 500));
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, status: 'sent' } : m))
    );

    setIsSending(false);

    // Simulate delivery
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, status: 'delivered' } : m))
    );
  };

  const handleAiRespond = async () => {
    setIsAiResponding(true);

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const aiMessage: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: id!,
      direction: 'outbound',
      type: 'text',
      content: 'Sim, oferecemos 14 dias de teste gratuito em todos os planos! Você pode começar agora mesmo sem precisar de cartão de crédito. Quer que eu te envie o link para cadastro?',
      status: 'sent',
      created_at: new Date().toISOString(),
      is_ai_generated: true,
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsAiResponding(false);
  };

  const getMessageStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-info" />;
      default:
        return null;
    }
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ptBR });
  };

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-card border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/inbox')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarImage src={mockContact.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {mockContact.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'XX'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">
            {mockContact.name || mockContact.phone_number}
          </h2>
          <p className="text-sm text-muted-foreground">{mockContact.phone_number}</p>
        </div>

        <Button variant="ghost" size="icon">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.direction === 'outbound' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                  message.direction === 'outbound'
                    ? 'bg-chat-outbound text-foreground animate-slide-in-right'
                    : 'bg-chat-inbound text-foreground animate-slide-in-left',
                  message.direction === 'outbound' ? 'rounded-br-md' : 'rounded-bl-md'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className={cn(
                  'flex items-center gap-1.5 mt-1',
                  message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                )}>
                  {message.is_ai_generated && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      IA
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatMessageTime(message.created_at)}
                  </span>
                  {message.direction === 'outbound' && getMessageStatusIcon(message.status)}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-6 py-4 bg-card border-t border-border">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiRespond}
            disabled={isAiResponding}
            className="flex-shrink-0"
          >
            {isAiResponding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Pensando...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                IA Responder
              </>
            )}
          </Button>

          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
          />

          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
