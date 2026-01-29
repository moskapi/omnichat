import config from '@/config';

// ==============================
// Types
// ==============================
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ==============================
// Custom API Exception
// ==============================
export class ApiException extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
  }
}

// ==============================
// Auth / Workspace Storage
// ==============================
export function getAuthToken(): string | null {
  return localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(config.STORAGE_KEYS.AUTH_TOKEN);
}

// 🔑 WORKSPACE (multi-tenant real)
export function getWorkspaceId(): string | null {
  return localStorage.getItem(config.STORAGE_KEYS.WORKSPACE_ID);
}

export function setWorkspaceId(workspaceId: string): void {
  localStorage.setItem(config.STORAGE_KEYS.WORKSPACE_ID, workspaceId);
}

export function clearWorkspaceId(): void {
  localStorage.removeItem(config.STORAGE_KEYS.WORKSPACE_ID);
}

// ==============================
// User Storage
// ==============================
export function getStoredUser<T>(): T | null {
  const user = localStorage.getItem(config.STORAGE_KEYS.USER);
  return user ? JSON.parse(user) : null;
}

export function setStoredUser<T>(user: T): void {
  localStorage.setItem(config.STORAGE_KEYS.USER, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(config.STORAGE_KEYS.USER);
}

// ==============================
// Clear all auth data
// ==============================
export function clearAllAuth(): void {
  clearAuthToken();
  clearWorkspaceId();
  clearStoredUser();
}

// ==============================
// HTTP Client
// ==============================
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.API_BASE_URL}${config.API_VERSION}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Authorization
  const token = getAuthToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Workspace (OBRIGATÓRIO no backend)
  const workspaceId = getWorkspaceId();
  if (workspaceId) {
    (headers as Record<string, string>)['X-Workspace-ID'] = workspaceId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorMessage = 'Erro na requisição';
    let errorCode: string | undefined;

    if (isJson) {
      try {
        const errorData = await response.json();
        errorMessage =
          errorData.detail ||
          errorData.message ||
          errorData.error ||
          errorMessage;
        errorCode = errorData.code;
      } catch {
        // ignore
      }
    }

    if (response.status === 401) {
      clearAllAuth();
      window.location.href = '/login';
    }

    throw new ApiException(errorMessage, response.status, errorCode);
  }

  if (!isJson) {
    return {} as T;
  }

  return response.json();
}

// ==============================
// API helpers
// ==============================
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
