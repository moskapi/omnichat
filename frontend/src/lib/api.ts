import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '@/config';
import { getRuntimeWorkspaceId } from '@/lib/workspaceRuntime';

// =========================
// Storage helpers (AUTH فقط)
// =========================
export function getAuthToken(): string | null {
  return localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
}

export function setAuthToken(token: string) {
  localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, token);
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
  localStorage.removeItem(config.STORAGE_KEYS.USER);
}

// =========================
// ApiException
// =========================
export class ApiException extends Error {
  status?: number;
  data?: any;
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

apiClient.interceptors.request.use(
  (request) => {
    const token = getAuthToken();
    const workspaceId = getRuntimeWorkspaceId();

    if (!request.headers) {
      request.headers = new axios.AxiosHeaders();
    } else if (typeof (request.headers as any).set !== 'function') {
      request.headers = new axios.AxiosHeaders(request.headers as any);
    }

    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }

    // ✅ workspace SEM localStorage: vem da rota /w/:workspaceId/*
    if (workspaceId) {
      request.headers.set('X-Workspace-ID', workspaceId);
    }

    return request;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response) {
      const status = error.response.status;
      const data = error.response.data;

      // 401: limpa auth e vai pro login
      if (status === 401) {
        try {
          clearAllAuth();
          localStorage.removeItem('OMNICHAT_REFRESH_TOKEN');
        } catch { }

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      const message =
        data?.detail ||
        data?.error ||
        data?.message ||
        'Erro ao comunicar com o servidor';

      throw new ApiException(message, status, data, error, error.response);
    }

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
  if (res.status === 204) return undefined as T;
  return res.data;
}

export const api = {
  get,
  post,
  patch,
  delete: del,
};
