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
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const message =
        data?.detail ||
        data?.message ||
        'Erro ao comunicar com o servidor';

      throw new ApiException(message, status, data);
    }

    throw new ApiException(
      'Erro de rede ou servidor indisponível',
      undefined,
      error
    );
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
  return res.data;
}

export class ApiException extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.data = data;
  }
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
