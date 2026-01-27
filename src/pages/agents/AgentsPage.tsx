import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bot, Clock, MessageSquare, Zap, Save, Loader2 } from 'lucide-react';
import { AgentPolicy, AgentSettings } from '@/types/api';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const policyOptions: { value: AgentPolicy; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'always',
    label: 'Responder Sempre',
    description: 'A IA responde automaticamente a todas as mensagens',
    icon: <Zap className="w-4 h-4" />,
  },
  {
    value: 'outside_hours',
    label: 'Fora do Horário',
    description: 'A IA responde apenas fora do horário comercial',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    value: 'trigger_only',
    label: 'Apenas com Gatilho',
    description: 'A IA responde apenas quando detectar palavras-chave',
    icon: <MessageSquare className="w-4 h-4" />,
  },
];

export default function AgentsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>({
    enabled: true,
    policy: 'always',
    fallback_message: 'Obrigado pelo contato! Um de nossos atendentes irá responder em breve.',
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: 'Configurações salvas',
      description: 'As configurações do agente IA foram atualizadas com sucesso.',
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agentes IA</h1>
        <p className="text-sm text-muted-foreground">
          Configure como a IA responde às mensagens dos seus clientes
        </p>
      </div>

      {/* Main Toggle */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-lg transition-colors',
                settings.enabled ? 'bg-primary/10' : 'bg-muted'
              )}
            >
              <Bot
                className={cn(
                  'w-6 h-6 transition-colors',
                  settings.enabled ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Assistente IA</h3>
              <p className="text-sm text-muted-foreground">
                {settings.enabled
                  ? 'A IA está respondendo mensagens automaticamente'
                  : 'A IA está desativada'}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </CardContent>
      </Card>

      {/* Policy Selection */}
      <Card className={cn(!settings.enabled && 'opacity-50 pointer-events-none')}>
        <CardHeader>
          <CardTitle className="text-lg">Política de Resposta</CardTitle>
          <CardDescription>Defina quando a IA deve responder automaticamente</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.policy}
            onValueChange={(value) => setSettings({ ...settings, policy: value as AgentPolicy })}
            className="space-y-3"
          >
            {policyOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                  settings.policy === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <RadioGroupItem value={option.value} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {option.icon}
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Fallback Message */}
      <Card className={cn(!settings.enabled && 'opacity-50 pointer-events-none')}>
        <CardHeader>
          <CardTitle className="text-lg">Mensagem de Fallback</CardTitle>
          <CardDescription>
            Mensagem enviada quando a IA não consegue responder ou precisa de um humano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.fallback_message}
            onChange={(e) => setSettings({ ...settings, fallback_message: e.target.value })}
            placeholder="Digite a mensagem de fallback..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Esta mensagem será enviada automaticamente quando a IA não tiver uma resposta adequada
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
