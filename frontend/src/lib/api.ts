import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '@/config';

// =========================
// Storage helpers (AUTH)
// =========================
export function getAuthToken(): string | null {
  return localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
}

export function setAuthToken(token: string) {
  localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, token);
}

export function getWorkspaceId(): string | null {
  return localStorage.getItem(config.STORAGE_KEYS.WORKSPACE_ID);
}

export function setWorkspaceId(workspaceId: string) {
  localStorage.setItem(config.STORAGE_KEYS.WORKSPACE_ID, workspaceId);
}

export function getStoredUser<T = any>(): T | null {
  const raw = localStorage.getItem(config.STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser<T = any>(user: T) {
  localStorage.setItem(config.STORAGE_KEYS.USER, JSON.stringify(user));
}

export function clearAllAuth() {
  localStorage.removeItem(config.STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(config.STORAGE_KEYS.WORKSPACE_ID);
  localStorage.removeItem(config.STORAGE_KEYS.USER);
}

// =========================
// ApiException (preserva dados do axios)
// =========================
export class ApiException extends Error {
  status?: number;
  data?: any;

  // NOVO: mantém o erro original e a response do axios (se existir)
  original?: any;
  response?: any;

  constructor(message: string, status?: number, data?: any, original?: any, response?: any) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.data = data;
    this.original = original;
    this.response = response;
  }
}

// =========================
// Axios client
// =========================
const apiClient: AxiosInstance = axios.create({
  baseURL: `${config.API_BASE_URL}${config.API_VERSION}`,
  timeout: 20000,
});

apiClient.interceptors.request.use((request) => {
  const token = getAuthToken();
  const workspaceId = getWorkspaceId();

  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }

  if (workspaceId) {
    request.headers['X-Workspace-ID'] = workspaceId;
  }

  return request;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // erro com response (backend respondeu, ex: 400/401/404/500/502)
    if (error?.response) {
      const status = error.response.status;
      const data = error.response.data;

      const message =
        data?.detail ||
        data?.error ||
        data?.message ||
        'Erro ao comunicar com o servidor';

      // Importante: preserva response e erro original
      throw new ApiException(message, status, data, error, error.response);
    }

    // erro sem response (rede, timeout, CORS, servidor off)
    const message =
      error?.message?.includes?.('timeout')
        ? 'Tempo de resposta excedido (timeout)'
        : 'Erro de rede ou servidor indisponível';

    throw new ApiException(message, undefined, undefined, error, undefined);
  }
);

// =========================
// Typed API wrappers
// =========================
async function get<T>(url: string, configReq?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get<T>(url, configReq);
  return res.data;
}

async function post<T>(url: string, data?: any, configReq?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.post<T>(url, data, configReq);
  return res.data;
}

async function patch<T>(url: string, data?: any, configReq?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.patch<T>(url, data, configReq);
  return res.data;
}

async function del<T>(url: string, configReq?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.delete<T>(url, configReq);

  // DRF costuma retornar 204 sem body
  if (res.status === 204) return undefined as T;

  return res.data;
}


// =========================
// Export principal
// =========================
export const api = {
  get,
  post,
  patch,
  delete: del,
};
