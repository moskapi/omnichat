

📌 Omnichat — Project State (Snapshot Técnico)
1) Visão Geral do Produto

Omnichat é uma plataforma SaaS omnichannel (WhatsApp + IA + RAG), multi-tenant, API-first.

Objetivo:

Transformar canais (ex: WhatsApp) em agentes especialistas via RAG + LLM.

Oferecer API para desenvolvedores e empresas.

Suportar multi-tenant (Workspaces).

Ter rastreabilidade, idempotência, audit e billing.

Stack:

Backend: Django + DRF

Frontend: React + TypeScript (Lovable)

Arquitetura: API-first, multi-tenant, modular por apps.

2) Estrutura do Backend (Django)
Projeto Django
backend/
  setup/        # projeto Django (settings, urls, asgi, wsgi)
  apps/          # apps modulares

Apps existentes
apps/
  core/
  tenants/
  authx/
  channels/
  conversations/
  messages/
  agents/
  rag/
  webhooks/
  audit/
  providers/
    base/
    evolution/
    whatsapp_official/

INSTALLED_APPS

rest_framework

apps.core

apps.tenants

apps.authx

apps.channels

apps.webhooks

apps.conversations

apps.messages

apps.agents

apps.rag

apps.audit

3) Convenções de Plataforma
Estrutura

Backend: backend/

Projeto Django: backend/setup/

Apps: backend/apps/<app>/

API prefixo: /api/v1/

Multi-tenant

Termo oficial: Workspace

Header padrão: X-Workspace-ID

PK padrão: UUID

Imports

Padrão: from apps.<app>.models import ...

4) API Router
setup/api/urls.py

Todos os apps são expostos em:

/api/v1/
  tenants/
  auth/
  channels/
  webhooks/
  conversations/
  messages/
  agents/
  rag/
  audit/

5) Pipeline Oficial (Webhook → Resposta)

Documento: docs/PIPELINE.md

Resumo:

Webhook inbox

Validação

Idempotência

Normalização

Resolução Workspace/Channel

Persistência (Contact/Conversation/Message IN)

Seleção Agent

RAG retrieval

Execução LLM

Persistência Message OUT

Envio provider

Usage + Audit + Trace

6) Webhooks (Primeiro Core Real da Plataforma)
Endpoint canônico
POST /api/v1/webhooks/inbox/

Implementação atual (DRF)
Model

apps.webhooks.models.WebhookEvent

Campos:

id (UUID, PK)

created_at (datetime)

provider (string)

idempotency_key (string, indexed)

raw_payload (JSON)

raw_headers (JSON)

normalized (JSON, opcional)

Serializer

WebhookEventSerializer

Responsabilidades:

validar payload

gerar idempotency_key se não fornecido

normalizar entrada básica

View

WebhookInboxView (APIView)

Lógica:

valida request via serializer

aplica idempotência:

se idempotency_key já existe → retorna {ok: true, idempotent: true}

senão → cria WebhookEvent e retorna {ok: true, idempotent: false}

URLs

apps.webhooks.urls

path("inbox/", WebhookInboxView.as_view(), name="webhooks-inbox")

Admin

WebhookEvent registrado no Django Admin.

Tests

Testes DRF:

cria evento

garante idempotência

7) Estado Atual do Código
Implementado ✅

Arquitetura modular por apps

API versionada (/api/v1)

Pipeline documentado

Webhook inbox real

Persistência de eventos

Idempotência

Testes

Convenções do repo (docs/CONVENTIONS.md)

Snapshot de arquitetura (docs/PIPELINE.md)

Ainda não implementado ❌

(Core da plataforma)

Multi-tenant real (tenants)

Workspace

Membership

ApiKey

Middleware de resolução de Workspace

Channels

Channel model

Binding com provider (WhatsApp)

Credenciais

Conversations / Messages

Contact

Conversation

Message

Relação com Channel + Workspace

Agents

Agent

AgentVersion

AgentRun

RAG

KnowledgeBase

Document

Chunk

Embeddings

Usage / Billing

UsageRecord

Quotas

Planos

8) Decisões Arquiteturais Importantes

DRF como camada API padrão.

UUID como PK para entidades de plataforma.

WebhookEvent como “entrada canônica” do sistema.

Idempotência obrigatória em webhooks.

Multi-tenant baseado em Workspace (não Tenant).

Pipeline orientado a eventos.

Providers desacoplados (interface base).

9) Roadmap Técnico (ordem correta)
Fase 5 — Core Platform

Workspace (multi-tenant real) ← próximo passo

ApiKey + Auth de Workspace

Channel + Provider binding

Contact / Conversation / Message

Agent layer

RAG layer

Usage / Billing

10) Próximo passo imediato

👉 Implementar Workspace, Membership e ApiKey em apps.tenants.

Objetivo:

Criar base multi-tenant real.

Permitir que qualquer request pertença a um Workspace.

Preparar API para SaaS e monetização.