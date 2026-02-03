# Omnichat — Checkpoint de Contexto (29/01/2026)

## Estado Atual (confirmado)

### Backend

* Stack: Django + DRF
* Auth:

  * JWT funcionando (`/api/v1/auth/token/`, refresh)
  * CORS configurado para frontend local
* Multi-tenant:

  * Apps: `tenants`
  * Modelos: `Workspace`, `Membership`, `ApiKey`
  * Header obrigatório nas rotas protegidas: **`X-Workspace-ID`**
* Channels:

  * Model `Channel` criado e migrado
  * Campos: `id (UUID)`, `workspace (FK)`, `name`, `provider`, `external_id (nullable)`, `is_active`, `created_at`, `updated_at`
  * Providers válidos: `"evolution" | "whatsapp_official"`
  * Constraints por workspace (nome único; provider+external_id quando existir)
  * Views + serializers + urls já expostos em `/api/v1/channels/channels/`
* Providers:

  * Estrutura criada em `backend/apps/providers/{base,evolution,whatsapp_official}`
  * **Sem implementação ainda** (apenas `__init__.py`)

### Frontend

* Stack: React + TypeScript
* Auth:

  * Login, signup, forgot/reset password funcionando
  * Tokens armazenados e enviados automaticamente
* Multi-tenant:

  * Header do client corrigido para **`X-Workspace-ID`**
* Channels (UI):

  * Listagem conectada ao backend
  * Criação de channel funcionando

## Decisão Importante (QR Code Evolution)

* **Não existe Evolution API rodando ainda**
* Portanto, **não é possível QR real neste momento**
* Decisão correta atual:

  * Criar Channel Evolution como **pendente**

    * `provider = "evolution"`
    * `external_id = null`
    * `is_active = false`
  * Frontend **não deve pedir** Instance ID nem API Key
  * UI deve mostrar: "Conexão via QR Code (em breve)"

## Ajustes Pendentes

### Frontend

* `frontend/src/pages/channels/NewChannelPage.tsx`

  * Remover campos Instance ID / API Key para Evolution
  * Evolution = apenas informativo (QR em breve)
  * Payload de criação: `{ name, provider: 'evolution', is_active: false }`
* Tipos:

  * Garantir `ChannelProvider = 'evolution' | 'whatsapp_official'`

### Backend (opcional agora)

* Criar endpoints stub:

  * `POST /api/v1/channels/channels/{id}/evolution/connect/` → 501
  * `GET /api/v1/channels/channels/{id}/evolution/status/` → 501

