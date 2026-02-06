import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

type WizardStep = 1 | 2 | 3;

type ChannelDTO = {
  id: string;
  name: string;
  provider: string;
  is_active?: boolean;
};

type EvolutionConnectDTO = {
  channel_id?: string;
  instance?: string;
  connection_mode?: 'qr' | 'pairing';
  pairing_code?: string | null;
  qr_base64?: string | null;
  qr_data_url?: string | null;
  raw?: any;
};

type EvolutionStatusDTO = {
  channel_id?: string;
  instance?: string;
  state?: string;
  is_active?: boolean;
  status?: any;
};

function pickQrDataUrl(connect: any): string | null {
  if (!connect) return null;

  // Priorize o que o backend já devolve pronto
  const direct =
    connect.qr_data_url ||
    connect.qrDataUrl ||
    connect.qr ||
    connect.qrCode ||
    null;

  if (direct && typeof direct === 'string' && direct.startsWith('data:image')) return direct;

  const candidates = [
    connect.qr_base64,
    connect.qrBase64,
    connect.base64,
    connect?.qrcode?.base64,
    connect?.qr?.base64,
  ].filter(Boolean);

  const v = candidates[0];
  if (!v) return null;

  if (typeof v === 'string' && v.startsWith('data:image')) return v;
  if (typeof v === 'string') return `data:image/png;base64,${v}`;

  return null;
}

function normalizePhoneDigits(raw: string): string {
  return (raw || '').replace(/\D+/g, '');
}

function formatPhoneMaskBR(raw: string): string {
  const digits = normalizePhoneDigits(raw).slice(0, 11); // DDD + 9 dígitos
  const ddd = digits.slice(0, 2);
  const part1 = digits.slice(2, 7);
  const part2 = digits.slice(7, 11);

  if (!digits) return '';
  if (digits.length <= 2) return `(${ddd}`;
  if (digits.length <= 7) return `(${ddd})${part1}`;
  return `(${ddd})${part1}-${part2}`;
}

export default function NewChannelPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const channelsUrl = workspaceId ? `/w/${workspaceId}/channels` : '/workspaces';

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Evolution connect states
  const [createdChannelId, setCreatedChannelId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollFallbackTried, setPollFallbackTried] = useState(false);
  const [lastPhoneDigits, setLastPhoneDigits] = useState<string | null>(null);

  // Pairing / QR
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  const steps = [
    { number: 1, title: 'Nome' },
    { number: 2, title: 'Provider' },
    { number: 3, title: 'Configuração' },
  ];

  const [formData, setFormData] = useState({
    name: '',
    provider: '' as '' | 'evolution' | 'whatsapp_official',
    credentials: {
      token: '',
      phone_number_id: '',
      business_account_id: '',
    },
    options: {
      autoReply: false,
      autoReplyMessage: 'Olá! Em instantes um atendente responderá.',
    },
  });

  const canProceed = useMemo(() => {
    if (currentStep === 1) return formData.name.trim().length >= 2;
    if (currentStep === 2) return !!formData.provider;
    if (currentStep === 3) {
      if (formData.provider === 'whatsapp_official') {
        return (
          !!formData.credentials.token &&
          !!formData.credentials.phone_number_id &&
          !!formData.credentials.business_account_id
        );
      }
      return true;
    }
    return false;
  }, [currentStep, formData]);

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep < 3) setCurrentStep((currentStep + 1) as WizardStep);
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep > 1) setCurrentStep((currentStep - 1) as WizardStep);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    const providerValue = formData.provider;

    if (!providerValue) {
      setErrorMessage('Selecione um provider.');
      setIsSaving(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      provider: providerValue,
    };

    try {
      // 1) cria o channel
      const createdRes = await api.post<ChannelDTO>('/channels/', payload);
      const created = (createdRes as any)?.data ?? createdRes;

      // 2) Evolution: conectar
      if (created?.provider === 'evolution') {
        setCreatedChannelId(created.id);
        setConnecting(true);
        setPairingCode(null);
        setQrSrc(null);
        setPollFallbackTried(false);

        const digits = normalizePhoneDigits(phoneNumber);
        setLastPhoneDigits(digits || null);

        try {
          // conecta (QR)
          const connectRes = await api.post<EvolutionConnectDTO>(
            `/channels/${created.id}/evolution/connect/`,
            {
              phone_number: digits || undefined,
              qr_timeout_s: 45,
              prefer_pairing: false,
            },
            { timeout: 70000 }
          );

          const connect = (connectRes as any)?.data ?? connectRes;

          const pc =
            connect?.pairing_code ??
            connect?.pairingCode ??
            null;

          if (pc) setPairingCode(String(pc));

          const qr = pickQrDataUrl(connect);
          if (qr) setQrSrc(qr);

          // fallback (pairing) se não veio nada
          if (!pc && !qr && digits && !pollFallbackTried) {
            setPollFallbackTried(true);

            const connectRes2 = await api.post<EvolutionConnectDTO>(
              `/channels/${created.id}/evolution/connect/`,
              {
                phone_number: digits,
                qr_timeout_s: 10,
                prefer_pairing: true,
              },
              { timeout: 30000 }
            );

            const connect2 = (connectRes2 as any)?.data ?? connectRes2;

            const pc2 =
              connect2?.pairing_code ??
              connect2?.pairingCode ??
              null;

            if (pc2) setPairingCode(String(pc2));

            const qr2 = pickQrDataUrl(connect2);
            if (qr2) setQrSrc(qr2);

            if (!pc2 && !qr2) {
              setPolling(false);
              setErrorMessage('Não foi possível obter QR nem pareamento por código. Tente novamente.');
              return;
            }
          }

          setConnecting(false);
          setPolling(true);
          return;
        } catch (err: any) {
          setConnecting(false);
          setPolling(false);
          const detail = err?.response?.data?.detail;
          setErrorMessage(detail || err?.message || 'Erro ao conectar com Evolution');
          console.error('EVOLUTION CONNECT ERROR:', err);
          return;
        } finally {
          setConnecting(false);
        }
      }

      // 3) caso oficial
      navigate(channelsUrl, { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMessage(detail || err?.message || 'Erro ao criar canal');
      console.error('CREATE CHANNEL ERROR:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Polling: checa status até conectar e ativar
  useEffect(() => {
    if (!polling || !createdChannelId) return;

    let stopped = false;

    const t = setInterval(async () => {
      if (stopped) return;

      try {
        const stRes = await api.get<EvolutionStatusDTO>(
          `/channels/${createdChannelId}/evolution/status/`
        );
        const st = (stRes as any)?.data ?? stRes;

        if (st?.is_active) {
          stopped = true;
          setPolling(false);
          clearInterval(t);
          navigate(channelsUrl, { replace: true });
        }
      } catch {
        // silencioso
      }
    }, 2000);

    // Se ficar muito tempo sem ativar, tenta UMA vez fallback para pairing (se tiver telefone)
    const timeout = setTimeout(async () => {
      if (stopped) return;

      if (lastPhoneDigits && !pollFallbackTried) {
        try {
          setPollFallbackTried(true);

          const connectRes = await api.post<EvolutionConnectDTO>(
            `/channels/${createdChannelId}/evolution/connect/`,
            {
              phone_number: lastPhoneDigits,
              qr_timeout_s: 10,
              prefer_pairing: true,
            }
          );

          const connect = (connectRes as any)?.data ?? connectRes;

          const pc =
            connect?.pairing_code ??
            connect?.pairingCode ??
            null;

          if (pc) setPairingCode(String(pc));

          const qr = pickQrDataUrl(connect);
          if (qr) setQrSrc(qr);
        } catch {
          // ignora
        }
      }
    }, 60000);

    return () => {
      stopped = true;
      clearInterval(t);
      clearTimeout(timeout);
    };
  }, [polling, createdChannelId, navigate, lastPhoneDigits, pollFallbackTried, channelsUrl]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(channelsUrl)}
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
      <div className="flex justify-between mb-8">
        {steps.map((step) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= step.number
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                }`}
            >
              {step.number}
            </div>
            <span className="ml-2 text-sm font-medium text-foreground">
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {currentStep === 1 && (
            <div>
              <Label htmlFor="name">Nome do Canal</Label>
              <Input
                id="name"
                placeholder="Ex: WhatsApp Principal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Use um nome fácil de identificar para este canal
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <Label>Selecione o Provider</Label>

              <div className="space-y-4 mt-4">
                <div
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${formData.provider === 'evolution'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                    }`}
                  onClick={() => setFormData({ ...formData, provider: 'evolution' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">Evolution API</h3>
                      <p className="text-sm text-muted-foreground">
                        WhatsApp via Baileys (QR ou pareamento)
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${formData.provider === 'evolution'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                        }`}
                    />
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${formData.provider === 'whatsapp_official'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                    }`}
                  onClick={() => setFormData({ ...formData, provider: 'whatsapp_official' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">
                        WhatsApp Official (Cloud API)
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Integração oficial via Meta
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${formData.provider === 'whatsapp_official'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              {formData.provider === 'evolution' && (
                <div>
                  <Label htmlFor="evo-phone">Telefone do WhatsApp</Label>
                  <Input
                    id="evo-phone"
                    placeholder="(16)99159-2095"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneMaskBR(e.target.value))}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Dica: pode digitar com ou sem DDD; o backend normaliza para BR.
                  </p>

                  {connecting && (
                    <p className="text-sm mt-4 text-muted-foreground">
                      Conectando com a Evolution...
                    </p>
                  )}

                  {pairingCode && (
                    <Alert className="mt-4">
                      <AlertTitle>Código de pareamento</AlertTitle>
                      <AlertDescription>
                        Digite este código no WhatsApp para vincular:
                        <div className="mt-2 font-mono text-lg">{pairingCode}</div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {qrSrc && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Escaneie o QR Code no WhatsApp:
                      </p>
                      <div className="border rounded-lg p-3 inline-block bg-white">
                        <img src={qrSrc} alt="QR Code" className="w-64 h-64" />
                      </div>
                    </div>
                  )}

                  {polling && (
                    <p className="text-sm mt-4 text-muted-foreground">
                      Aguardando status (polling)...
                    </p>
                  )}
                </div>
              )}

              {formData.provider === 'whatsapp_official' && (
                <div className="space-y-4">
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
                      placeholder="1234567890"
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
                    <Label htmlFor="business_account_id">Business Account ID</Label>
                    <Input
                      id="business_account_id"
                      placeholder="1234567890"
                      value={formData.credentials.business_account_id || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, business_account_id: e.target.value },
                        })
                      }
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                      checked={formData.options.autoReply}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          options: { ...formData.options, autoReply: !!checked },
                        })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label>Resposta automática</Label>
                      <p className="text-xs text-muted-foreground">
                        Enviar mensagem automática quando o cliente entrar em contato
                      </p>
                    </div>
                  </div>

                  {formData.options.autoReply && (
                    <div>
                      <Label htmlFor="autoReplyMessage">Mensagem</Label>
                      <Input
                        id="autoReplyMessage"
                        value={formData.options.autoReplyMessage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            options: { ...formData.options, autoReplyMessage: e.target.value },
                          })
                        }
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSaving}>
          Voltar
        </Button>

        {currentStep < 3 ? (
          <Button onClick={handleNext} disabled={!canProceed}>
            Próximo
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={!canProceed || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Canal'}
          </Button>
        )}
      </div>
    </div>
  );
}
