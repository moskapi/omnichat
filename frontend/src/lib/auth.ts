import { api, setAuthToken, setStoredUser, clearAllAuth } from './api';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// Auth API functions
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    setAuthToken(response.access_token);
    setStoredUser(response.user);
    return response;
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/register', data);
    setAuthToken(response.access_token);
    setStoredUser(response.user);
    return response;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAllAuth();
    }
  },

  me: async (): Promise<User> => {
    return api.get<User>('/auth/me');
  },

  refreshToken: async (): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/refresh');
    setAuthToken(response.access_token);
    return response;
  },
};

export default authApi;
