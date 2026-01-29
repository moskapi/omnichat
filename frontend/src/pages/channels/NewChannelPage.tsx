import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Loader2, Shield, Zap } from 'lucide-react';
import { ChannelProvider } from '@/types/api';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

type WizardStep = 1 | 2 | 3;



interface ChannelFormData {
  name: string;
  provider: ChannelProvider | null;
  riskAccepted: boolean;
  credentials: {
    // Official
    token?: string;
    phone_number_id?: string;
    webhook_verify_token?: string;
    // Evolution
    base_url?: string;
    instance_id?: string;
    api_key?: string;
  };
}

export default function NewChannelPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ChannelFormData>({
    name: '',
    provider: null,
    riskAccepted: false,
    credentials: {},
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const steps = [
    { number: 1, title: 'Nome' },
    { number: 2, title: 'Provider' },
    { number: 3, title: 'Credenciais' },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length >= 3;
      case 2:
        return formData.provider !== null && (formData.provider === 'whatsapp_official' || formData.riskAccepted);
      case 3:
        if (formData.provider === 'whatsapp_official') {
          return (
            !!formData.credentials.token &&
            !!formData.credentials.phone_number_id &&
            !!formData.credentials.webhook_verify_token
          );
        } else {
          // Evolution: por enquanto não exige credenciais (QR em breve)
          return true;
        }
      default:
        return false;
    }
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    // Map provider to correct backend values
    let providerValue = formData.provider;
    if (providerValue === 'evolution') {
      providerValue = 'evolution';
    } else if (providerValue === 'whatsapp_official') {
      providerValue = 'whatsapp_official';
    }

    // Determine external_id based on provider
    let external_id: string | undefined;
    if (providerValue === 'whatsapp_official') {
      external_id = formData.credentials.phone_number_id || undefined;
    } else if (providerValue === 'evolution') {
      external_id = formData.credentials.instance_id || undefined;
    }

    const payload: Record<string, any> = {
      name: formData.name.trim(),
      provider: providerValue,
      is_active: true,
    };
    if (external_id) {
      payload.external_id = external_id;
    }

    try {
      await api.post('/channels/', payload);
      navigate('/channels');
    } catch (err: any) {
      // Try to get best possible error message
      setErrorMessage(
        err?.message ||
        (typeof err === 'string' ? err : 'Ocorreu um erro ao criar o canal.')
      );
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/channels')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Canais
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Novo Canal WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Configure um novo canal para receber e enviar mensagens
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                currentStep >= step.number
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > step.number ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                'ml-2 text-sm font-medium',
                currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-12 h-0.5 mx-4',
                  currentStep > step.number ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6 animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao criar canal</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Name */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-name">Nome do Canal</Label>
                <Input
                  id="channel-name"
                  placeholder="Ex: WhatsApp Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Escolha um nome que identifique facilmente este canal
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Provider */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <RadioGroup
                value={formData.provider || ''}
                onValueChange={(value) => setFormData({ ...formData, provider: value as ChannelProvider, riskAccepted: false })}
              >
                <div className="grid gap-4">
                  {/* Official Option */}
                  <label
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                      formData.provider === 'whatsapp_official'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value="whatsapp_official" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="font-semibold">WhatsApp Oficial</span>
                        <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        API oficial do WhatsApp Business. Mais estável, seguro e sem risco de bloqueio.
                      </p>
                    </div>
                  </label>

                  {/* Evolution Option */}
                  <label
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                      formData.provider === 'evolution'
                        ? 'border-warning bg-warning/5'
                        : 'border-border hover:border-warning/50'
                    )}
                  >
                    <RadioGroupItem value="evolution" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-warning" />
                        <span className="font-semibold">Evolution API</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Solução não-oficial baseada em WhatsApp Web. Mais flexível, mas com riscos.
                      </p>
                    </div>
                  </label>
                </div>
              </RadioGroup>

              {/* Risk Warning */}
              {formData.provider === 'evolution' && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção: Risco de Bloqueio</AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="mb-3">
                      O uso de providers não-oficiais pode resultar em <strong>bloqueio permanente</strong> da 
                      sua conta WhatsApp. Isso inclui:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm mb-4">
                      <li>Suspensão temporária ou permanente do número</li>
                      <li>Perda de acesso a conversas e contatos</li>
                      <li>Violação dos Termos de Serviço do WhatsApp</li>
                    </ul>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="risk-accepted"
                        checked={formData.riskAccepted}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, riskAccepted: checked as boolean })
                        }
                      />
                      <label htmlFor="risk-accepted" className="text-sm font-medium cursor-pointer">
                        Eu entendo os riscos e assumo total responsabilidade
                      </label>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Credentials */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {formData.provider === 'whatsapp_official' ? (
                <>
                  <div>
                    <Label htmlFor="token">Access Token</Label>
                    <Input
                      id="token"
                      type="password"
                      placeholder="EAAxxxxxx..."
                      value={formData.credentials.token || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, token: e.target.value },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone_number_id">Phone Number ID</Label>
                    <Input
                      id="phone_number_id"
                      placeholder="123456789012345"
                      value={formData.credentials.phone_number_id || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, phone_number_id: e.target.value },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook_verify_token">Webhook Verify Token</Label>
                    <Input
                      id="webhook_verify_token"
                      placeholder="seu_token_verificacao"
                      value={formData.credentials.webhook_verify_token || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, webhook_verify_token: e.target.value },
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertTitle>Conexão via QR Code (em breve)</AlertTitle>
                  <AlertDescription>
                    Por enquanto, o canal Evolution será criado como <b>pendente</b>. Assim que a integração
                    estiver ativa no backend, você poderá conectar escaneando um QR Code aqui.
                  </AlertDescription>
                </Alert>
              )
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {currentStep < 3 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={!canProceed() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Salvar Canal
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
