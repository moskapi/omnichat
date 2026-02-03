import { api, setAuthToken, setStoredUser, clearAllAuth } from "./api";

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenPairResponse {
  access: string;
  refresh: string;
  user?: {
    id: string | number;
    email: string;
    name?: string;
  };
}

const REFRESH_KEY = "OMNICHAT_REFRESH_TOKEN";

function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}
function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_KEY);
}

// Auth API functions
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    // AGORA o backend espera {email, password}
    const tokens = await api.post<TokenPairResponse>("/auth/token/", {
      email: credentials.email,
      password: credentials.password,
    });

    setAuthToken(tokens.access);
    setRefreshToken(tokens.refresh);

    const user: User = tokens.user
      ? {
        id: String(tokens.user.id),
        email: tokens.user.email,
        name: tokens.user.name ?? tokens.user.email,
        created_at: new Date().toISOString(),
      }
      : {
        id: "me",
        email: credentials.email,
        name: credentials.email,
        created_at: new Date().toISOString(),
      };

    setStoredUser(user);
    return user;
  },

  signup: async ({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name?: string;
  }): Promise<User> => {
    await api.post("/auth/signup/", { email, password, name });
    return {
      id: "me",
      email,
      name: name ?? email,
      created_at: new Date().toISOString(),
    };
  },

  requestPasswordReset: async (email: string): Promise<{ ok: true }> => {
    await api.post("/auth/password-reset/", { email });
    return { ok: true };
  },

  confirmPasswordReset: async ({
    uid,
    token,
    newPassword,
  }: {
    uid: string;
    token: string;
    newPassword: string;
  }): Promise<{ ok: true }> => {
    await api.post("/auth/password-reset/confirm/", {
      uid,
      token,
      new_password: newPassword,
    });
    return { ok: true };
  },

  refreshAccessToken: async (): Promise<string> => {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("Missing refresh token");

    const data = await api.post<{ access: string }>("/auth/token/refresh/", { refresh });
    setAuthToken(data.access);
    return data.access;
  },

  logout: async (): Promise<void> => {
    clearAllAuth();
    clearRefreshToken();
  },
};

export default authApi;
