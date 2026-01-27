// API Configuration
// All API endpoints are relative to this base URL

export const config = {
  // API Base URL - should be set via environment variable in production
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.omnichat.example.com',
  
  // Storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'omnichat_auth_token',
    TENANT_ID: 'omnichat_tenant_id',
    USER: 'omnichat_user',
  },
  
  // API version prefix
  API_VERSION: '/v1',
} as const;

export default config;
