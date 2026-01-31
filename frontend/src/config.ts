export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  API_VERSION: import.meta.env.VITE_API_VERSION || '/api/v1',

  STORAGE_KEYS: {
    AUTH_TOKEN: 'omnichat_auth_token',
    WORKSPACE_ID: 'omnichat_workspace_id',
    USER: 'omnichat_user',
  },
} as const;

export default config;
