import config from '@/config';

// Types for API responses
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Custom error class for API errors
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

// Get stored auth token
export function getAuthToken(): string | null {
  return localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
}

// Set auth token
export function setAuthToken(token: string): void {
  localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, token);
}

// Clear auth token
export function clearAuthToken(): void {
  localStorage.removeItem(config.STORAGE_KEYS.AUTH_TOKEN);
}

// Get current tenant ID
export function getTenantId(): string | null {
  return localStorage.getItem(config.STORAGE_KEYS.TENANT_ID);
}

// Set current tenant ID
export function setTenantId(tenantId: string): void {
  localStorage.setItem(config.STORAGE_KEYS.TENANT_ID, tenantId);
}

// Clear tenant ID
export function clearTenantId(): void {
  localStorage.removeItem(config.STORAGE_KEYS.TENANT_ID);
}

// Get stored user data
export function getStoredUser<T>(): T | null {
  const user = localStorage.getItem(config.STORAGE_KEYS.USER);
  return user ? JSON.parse(user) : null;
}

// Set user data
export function setStoredUser<T>(user: T): void {
  localStorage.setItem(config.STORAGE_KEYS.USER, JSON.stringify(user));
}

// Clear user data
export function clearStoredUser(): void {
  localStorage.removeItem(config.STORAGE_KEYS.USER);
}

// Clear all auth data
export function clearAllAuth(): void {
  clearAuthToken();
  clearTenantId();
  clearStoredUser();
}

// HTTP Client with automatic auth headers
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.API_BASE_URL}${config.API_VERSION}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Add tenant ID if available
  const tenantId = getTenantId();
  if (tenantId) {
    (headers as Record<string, string>)["X-Workspace-ID"] = tenantId;

  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorCode: string | undefined;

    if (isJson) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorCode = errorData.code;
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Handle specific status codes
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

// API client with typed methods
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
