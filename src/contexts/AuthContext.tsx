import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/auth';
import { Workspace } from '@/types/api';
import { getAuthToken, getTenantId, setTenantId, getStoredUser, clearAllAuth } from '@/lib/api';

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
    setTenantId(workspace.id);
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
    const storedTenantId = getTenantId();

    if (token && storedUser) {
      setUser(storedUser);
      // Note: workspaces and current workspace would be fetched from API
      // For now, we just set the tenant ID if it exists
      if (storedTenantId) {
        // The actual workspace data would come from an API call
        setCurrentWorkspaceState({
          id: storedTenantId,
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
