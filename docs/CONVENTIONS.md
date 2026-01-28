# Omnichat Core — Convenções do Repositório

## Estrutura
- Backend Django fica em: `backend/`
- Projeto Django (settings/urls/asgi/wsgi) fica em: `backend/setup/`
- Apps Django ficam em: `backend/apps/<app_name>/`
- Frontend fica em: `frontend/`

## Convenções de Naming
### Multi-tenant
- Termo oficial do produto: **Workspace**
- Termo técnico (sinônimo interno): Tenant (evitar usar em nomes públicos)
- Model principal: `Workspace`

### IDs
- Padrão recomendado: **UUID** como chave primária para entidades de plataforma.
- Onde aplicar: Workspace, Channel, Conversation, Message, Agent, KnowledgeBase, Document, ApiKey, etc.

## API
- Prefixo oficial: `/api/v1/`
- Padrão de rotas:
  - Coleções: `GET /api/v1/<resource>/`
  - Detalhe: `GET /api/v1/<resource>/{id}/`

## Header de Workspace
- Header oficial para requests autenticadas: `X-Workspace-ID`
- Regras:
  - Obrigatório em todas as rotas multi-tenant (quase todas).
  - Rotas "globais" (ex: login) não exigem esse header.

## Python Imports
- Apps internos são importados via `apps.<app_name>...`
  - Ex: `from apps.tenants.models import Workspace`
- Evitar imports relativos entre apps (ex: `from ..models import ...`) quando cruzar apps.

## Providers
- Interface base fica em: `backend/apps/providers/base/`
- Implementações ficam em:
  - `backend/apps/providers/evolution/`
  - `backend/apps/providers/whatsapp_official/`

## Banco / Migrações
- Nunca commitar `db.sqlite3` em produção (usar apenas para dev local).
- Migrações devem existir para qualquer model novo.
