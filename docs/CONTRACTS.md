Entidades finais (mínimas)

tenants: Workspace, Membership, ApiKey

channels: Channel, ChannelCredential (ou ChannelConfig)

conversations: Conversation, Contact

messages: Message (in/out, status, provider ids)

agents: Agent, AgentVersion, AgentRun

rag: KnowledgeBase, Document, Chunk, Embedding (ou VectorRef)

webhooks: WebhookEvent (raw + normalized + idempotency)

audit: AuditLog, TraceSpan (ou RunStep)

novo: usage/billing: Plan, Subscription, Quota, UsageRecord