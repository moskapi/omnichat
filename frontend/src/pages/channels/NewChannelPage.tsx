import { useEffect, useMemo, useState } from 'react';
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

type ChannelDTO = {
  id: string;
  name: string;
  provider: 'evolution' | 'whatsapp_official';
  external_id?: string | null;
  is_active: boolean;
};

type EvolutionConnectDTO = {
  channel_id: string;
  instance: string;

  // Pairing
  pairing_code?: string | null;

  // QR (fallback / compat)
  qr_base64?: string | null;
  qr_data_url?: string | null;

  raw?: any;
  error?: string;
};

type EvolutionStatusDTO = {
  channel_id: string;
  instance: string;
  status: unknown;
  is_active: boolean;
  state?: string;
};

type WizardStep = 1 | 2 | 3;

interface ChannelFormData {
  name: string;
  provider: ChannelProvider | null;
  riskAccepted: boolean;
  credentials: {
    // Official (ainda não estamos salvando isso no backend aqui)
    token?: string;
    phone_number_id?: string;
    webhook_verify_token?: string;

    // Evolution (não precisa credenciais no frontend; vamos pedir só telefone pra pairing)
    base_url?: string;
    instance_id?: string;
    api_key?: string;
  };
}

function pickQrDataUrl(payload: any): string | null {
  if (!payload) return null;

  // novo contrato do backend
  const direct = payload?.qr_data_url;
  if (typeof direct === 'string' && direct.startsWith('data:image')) return direct;

  const b64 = payload?.qr_base64;
  if (typeof b64 === 'string' && b64.length > 20) return `data:image/png;base64,${b64}`;

  // fallback (compat)
  const qr = payload?.qr ?? payload ?? null;
  if (!qr) return null;

  const candidates = [
    qr?.base64,
    qr?.qrcode,
    qr?.qrCode,
    qr?.qr,
    qr?.code,
    qr?.data,
    payload?.base64,
    payload?.qrcode,
  ].filter(Boolean);

  const v = candidates[0];
  if (!v) return null;

  if (typeof v === 'string' && v.startsWith('data:image')) return v;
  if (typeof v === 'string') return `data:image/png;base64,${v}`;

  return null;
}

function normalizePhoneDigits(raw: string): string {
  // frontend: só limpa (backend idealmente valida/normaliza também)
  return (raw || '').replace(/\D+/g, '');
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

  // Evolution connect states
  const [createdChannelId, setCreatedChannelId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [polling, setPolling] = useState(false);

  // Pairing / QR
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [debugRaw, setDebugRaw] = useState<string | null>(null);


  const steps = [
    { number: 1, title: 'Nome' },
    { number: 2, title: 'Provider' },
    { number: 3, title: 'Credenciais' },
  ];

  const isEvolution = formData.provider === 'evolution';
  const isOfficial = formData.provider === 'whatsapp_official';

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length >= 3;
      case 2:
        return formData.provider !== null && (formData.provider === 'whatsapp_official' || formData.riskAccepted);
      case 3:
        if (isOfficial) {
          return (
            !!formData.credentials.token &&
            !!formData.credentials.phone_number_id &&
            !!formData.credentials.webhook_verify_token
          );
        }
        if (isEvolution) {
          // vamos exigir telefone para pairing (mesmo que backend ainda esteja em QR, isso não atrapalha)
          return normalizePhoneDigits(phoneNumber).length >= 10;
        }
        return false;
      default:
        return false;
    }
  }, [currentStep, formData, isOfficial, isEvolution, phoneNumber]);

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


    const providerValue = formData.provider; // 'evolution' | 'whatsapp_official'

    if (!providerValue) {
      setErrorMessage('Selecione um provider.');
      setIsSaving(false);
      return;
    }

    // payload mínimo compatível com ChannelCreateSerializer (name + provider)
    const payload = {
      name: formData.name.trim(),
      provider: providerValue,
    };

    try {
      // 1) cria o channel
      const createdRes = await api.post<ChannelDTO>('/channels/', payload);
      const created = (createdRes as any)?.data ?? createdRes;

      // 2) Evolution: conectar (pairing code preferencial, QR fallback)
      if (created?.provider === 'evolution') {
        setCreatedChannelId(created.id);
        setConnecting(true);
        setPairingCode(null);
        setQrSrc(null);

        try {
          const digits = normalizePhoneDigits(phoneNumber);

          // manda phone_number para pairing code (quando backend suportar)
          const connectRes = await api.post<EvolutionConnectDTO>(
            `/channels/${created.id}/evolution/connect/`,
            digits ? { phone_number: digits } : undefined
          );

          const connect = (connectRes as any)?.data ?? connectRes;

          // Pairing code (novo)
          const pc =
            connect?.pairing_code ??
            connect?.pairingCode ??
            connect?.code ??
            null;

          if (pc) {
            setPairingCode(String(pc));
            setPolling(true);
            setIsSaving(false);
            return; // fica na tela para o usuário digitar o código no WhatsApp
          }

          // Fallback para QR (contrato atual)
          const src = pickQrDataUrl(connect);
          setQrSrc(src);

          if (!src) {
            // Ajuda debugging
            console.log('Evolution connect raw:', connect?.raw ?? connect);
          }

          setPolling(true);
        } finally {
          setConnecting(false);
        }

        // fica na tela pra usuário parear/escanejar
        setIsSaving(false);
        return;
      }

      // 3) caso oficial: navega
      navigate('/channels');
    } catch (err: any) {
      console.log("EVOLUTION CONNECT ERROR:", err);
      console.log("status:", err?.status);
      console.log("data:", err?.data);
      console.log("original axios response:", err?.original?.response);

      setErrorMessage(err?.message || "Erro ao conectar");

      if (err?.data) {
        setDebugRaw(JSON.stringify(err.data, null, 2));
      }
    }
  };

  // Polling: checa status até conectar e ativar
  useEffect(() => {
    if (!polling || !createdChannelId) return;

    const t = setInterval(async () => {
      try {
        const stRes = await api.get<EvolutionStatusDTO>(`/channels/${createdChannelId}/evolution/status/`);
        const st = (stRes as any)?.data ?? stRes;

        if (st?.is_active) {
          setPolling(false);
          clearInterval(t);
          navigate('/channels');
        }
      } catch {
        // silencioso por enquanto
      }
    }, 2000);

    return () => clearInterval(t);
  }, [polling, createdChannelId, navigate]);

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
              {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
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
                onValueChange={(value) =>
                  setFormData({ ...formData, provider: value as ChannelProvider, riskAccepted: false })
                }
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
                      O uso de providers não-oficiais pode resultar em <strong>bloqueio permanente</strong> da sua
                      conta WhatsApp. Isso inclui:
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

          {/* Step 3: Credentials / Pairing / QR */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {isOfficial ? (
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
                <>
                  <Alert>
                    <AlertTitle>Conectar WhatsApp</AlertTitle>
                    <AlertDescription>
                      Informe seu número e clique em <b>Salvar e Conectar</b>. Vamos gerar um <b>código de pareamento</b>.
                      Se o backend ainda não suportar, caímos automaticamente para <b>QR Code</b>.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="evo-phone">Telefone do WhatsApp</Label>
                    <Input
                      id="evo-phone"
                      placeholder="Ex: 16 99159-2095"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Dica: pode digitar com espaço/traço. Nós só usamos os dígitos.
                    </p>
                  </div>

                  {createdChannelId && (
                    <div className="mt-4 rounded-lg border p-4">
                      <h3 className="font-medium">Conectar WhatsApp (Evolution)</h3>

                      {connecting && (
                        <p className="text-sm opacity-70 mt-2">Gerando código/QR…</p>
                      )}

                      {/* Pairing Code */}
                      {pairingCode ? (
                        <div className="mt-4 flex flex-col items-center gap-3">
                          <div className="rounded-md border px-4 py-3 w-full text-center">
                            <p className="text-sm text-muted-foreground">Código de pareamento</p>
                            <p className="text-2xl font-mono tracking-widest mt-1">{pairingCode}</p>
                          </div>
                          <p className="text-sm opacity-70 text-center">
                            No WhatsApp: <br />
                            <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> → <b>Vincular com código</b>
                          </p>
                          {polling && <p className="text-sm">Aguardando conexão…</p>}
                        </div>
                      ) : (
                        <>
                          {/* QR fallback */}
                          {qrSrc ? (
                            <div className="mt-4 flex flex-col items-center gap-3">
                              <img src={qrSrc} alt="QR Code" className="w-64 h-64" />
                              <p className="text-sm opacity-70 text-center">
                                Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo e escaneie.
                              </p>
                              {polling && <p className="text-sm">Aguardando conexão…</p>}
                            </div>
                          ) : (
                            !connecting && (
                              <p className="text-sm opacity-70 mt-2">
                                Ainda não gerou o código/QR. Clique em <b>Salvar e Conectar</b>.
                              </p>
                            )
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isSaving || connecting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {currentStep < 3 ? (
          <Button onClick={handleNext} disabled={!canProceed}>
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={!canProceed || isSaving || connecting}>
            {isSaving || connecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {connecting ? 'Conectando...' : 'Salvando...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {isEvolution ? 'Salvar e Conectar' : 'Salvar Canal'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
