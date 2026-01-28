# Omnichat — Pipeline Oficial (Produto Final)

Este documento define o fluxo canônico para entrada e saída de mensagens em qualquer canal (WhatsApp, etc.).
Todo provider e toda feature deve respeitar este pipeline.

## Objetivo
Receber um evento externo (webhook), normalizar, resolver workspace/canal, persistir conversa/mensagens,
executar RAG + Agent, enviar resposta via provider e registrar trace + usage.

---

## Pipeline: Webhook → Resposta

### 1) Entrada (Webhook Inbox)
- Endpoint: `POST /api/v1/webhooks/inbox/`
- Recebe payload bruto do provider (Evolution, WhatsApp Official, etc.)
- Deve suportar headers de assinatura/segurança quando aplicável

### 2) Validação & Segurança
- Validar assinatura quando provider oferecer (ex: HMAC / token)
- Rejeitar payload inválido com 401/403
- Registrar falha de validação (audit)

### 3) Idempotência
- Calcular `idempotency_key` (ex: provider + event_id)
- Se evento já processado: responder 200 e NÃO duplicar nada
- Persistir evento em `WebhookEvent`

### 4) Normalização de Evento
- Converter payload do provider para um formato interno:
  - event_type (ex: message.received)
  - provider
  - provider_event_id
  - channel_external_id / phone_number_id
  - contact_external_id (telefone)
  - message_text / media
  - timestamp
- Persistir `WebhookEvent.normalized`

### 5) Resolução de Workspace e Channel
- Identificar o `Channel` pelo número/identificador externo do provider
- Obter `Workspace` dono do canal
- Se não encontrar: responder 202 (aceito) e registrar para análise (audit)

### 6) Persistência de Estado (Contact/Conversation/Message IN)
- Upsert Contact (telefone / provider ids)
- Upsert Conversation (por channel + contact)
- Criar Message inbound com status "received"

### 7) Seleção de Agent (Routing)
- Determinar qual `Agent` responde:
  - agent fixo por channel (padrão)
  - ou roteamento por regras do workspace (futuro)
- Criar `AgentRun` (estado inicial)

### 8) RAG Retrieval (opcional mas padrão)
- Selecionar KnowledgeBase(s) do workspace/canal/agent
- Executar retrieval e obter context chunks
- Registrar evento de retrieval (trace + usage)

### 9) Execução do Agent Runtime
- Montar prompt com:
  - instruções do agent
  - contexto do RAG
  - histórico curto (últimas mensagens)
  - políticas/regras do workspace
- Executar LLM (BYOK quando configurado)
- Persistir steps do run (trace)

### 10) Persistência da Resposta (Message OUT)
- Criar Message outbound com status "queued"

### 11) Envio via Provider (Outbox)
- Enfileirar envio (async recomendado)
- Provider adapter envia
- Atualizar status outbound (sent/failed) com retries

### 12) Registro de Usage + Audit + Trace
- Registrar eventos cobráveis:
  - message.processed
  - rag.query
  - agent.run
  - provider.send
- Registrar audit e trace (latência, erros, ids)

---

## Notas de Produto Final
- O pipeline deve suportar modo "handoff humano" (futuro).
- O pipeline deve suportar múltiplos providers com interface única.
- Todo processamento deve ser rastreável por `correlation_id` (trace).
