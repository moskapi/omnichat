import { api, setAuthToken, setStoredUser, clearAllAuth } from "./api";

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

// Por enquanto, vamos usar o campo email como "username" no backend (SimpleJWT padrão).
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenPairResponse {
  access: string;
  refresh: string;
}

const REFRESH_KEY = "OMNICHAT_REFRESH_TOKEN";

function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_KEY);
}

// Auth API functions
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    // SimpleJWT: /auth/token/ espera {username, password}
    const tokens = await api.post<TokenPairResponse>("/auth/token/", {
      username: credentials.email, // (por enquanto mapeia email -> username)
      password: credentials.password,
    });

    setAuthToken(tokens.access);
    setRefreshToken(tokens.refresh);

    // Como o endpoint não retorna user, guardamos um "user mínimo" por enquanto.
    const user: User = {
      id: "me",
      email: credentials.email,
      name: credentials.email,
      created_at: new Date().toISOString(),
    };
    setStoredUser(user);

    return user;
  },

  refreshAccessToken: async (): Promise<string> => {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("Missing refresh token");

    const data = await api.post<{ access: string }>("/auth/token/refresh/", {
      refresh,
    });

    setAuthToken(data.access);
    return data.access;
  },

  logout: async (): Promise<void> => {
    clearAllAuth();
    clearRefreshToken();
  },
};

export default authApi;
