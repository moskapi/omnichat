// Type definitions for the Omnichat API

// Workspace / Tenant
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  role: 'owner' | 'admin' | 'member';
}

// Channel types
export type ChannelProvider = 'whatsapp_official' | 'evolution_api';
export type ChannelStatus = 'connected' | 'pending' | 'error' | 'disconnected';

export interface Channel {
  id: string;
  name: string;
  provider: ChannelProvider;
  status: ChannelStatus;
  phone_number?: string;
  created_at: string;
  last_sync_at?: string;
  error_message?: string;
}

export interface ChannelCredentialsOfficial {
  token: string;
  phone_number_id: string;
  webhook_verify_token: string;
}

export interface ChannelCredentialsEvolution {
  base_url: string;
  instance_id: string;
  api_key: string;
}

export type ChannelCredentials = ChannelCredentialsOfficial | ChannelCredentialsEvolution;

export interface CreateChannelData {
  name: string;
  provider: ChannelProvider;
  credentials: ChannelCredentials;
}

// Conversation / Messages
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';

export interface Contact {
  id: string;
  name?: string;
  phone_number: string;
  avatar_url?: string;
  tags?: string[];
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  media_url?: string;
  status: MessageStatus;
  created_at: string;
  is_ai_generated?: boolean;
}

export interface Conversation {
  id: string;
  channel_id: string;
  contact: Contact;
  last_message?: Message;
  unread_count: number;
  is_ai_enabled: boolean;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

// Agent / AI Settings
export type AgentPolicy = 'always' | 'outside_hours' | 'trigger_only';

export interface AgentSettings {
  enabled: boolean;
  policy: AgentPolicy;
  fallback_message: string;
  business_hours?: {
    start: string;
    end: string;
    timezone: string;
    days: number[];
  };
  trigger_keywords?: string[];
}

// Knowledge Base / RAG
export type DocumentStatus = 'processing' | 'indexed' | 'error';

export interface KnowledgeDocument {
  id: string;
  filename: string;
  file_type: 'pdf' | 'txt' | 'docx' | 'md';
  file_size: number;
  status: DocumentStatus;
  chunks_count?: number;
  error_message?: string;
  created_at: string;
  indexed_at?: string;
}

// Playground
export interface PlaygroundQuery {
  question: string;
}

export interface PlaygroundResponse {
  answer: string;
  sources: Array<{
    document_id: string;
    filename: string;
    chunk: string;
    score: number;
  }>;
  tokens_used?: number;
  cost_usd?: number;
}

// API Keys
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used_at?: string;
  created_at: string;
  is_active: boolean;
}

export interface CreateApiKeyResponse {
  api_key: ApiKey;
  secret_key: string; // Only shown once!
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Common
export interface ApiSuccess {
  success: boolean;
  message?: string;
}
