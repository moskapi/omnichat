import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/auth';
import { Workspace } from '@/types/api';
import {
  getAuthToken,
  getWorkspaceId,
  setWorkspaceId,
  getStoredUser,
  clearAllAuth,
} from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setUser: (user: User | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!getAuthToken();

  const setCurrentWorkspace = useCallback((workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    setWorkspaceId(workspace.id);
  }, []);

  const logout = useCallback(() => {
    clearAllAuth();
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspaceState(null);
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getStoredUser<User>();
    const storedWorkspaceId = getWorkspaceId();

    if (token && storedUser) {
      setUser(storedUser);

      // TODO: buscar workspaces reais via API
      // Por enquanto, re-hidrata o workspace pelo ID salvo
      if (storedWorkspaceId) {
        setCurrentWorkspaceState({
          id: storedWorkspaceId,
          name: 'Workspace',
          slug: 'workspace',
          role: 'owner',
          created_at: new Date().toISOString(),
        });
      }
    }

    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        currentWorkspace,
        workspaces,
        setUser,
        setWorkspaces,
        setCurrentWorkspace,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
