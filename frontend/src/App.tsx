import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useParams,
  useNavigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout";
import { api } from "@/lib/api";
import { setRuntimeWorkspaceId, clearRuntimeWorkspaceId } from "@/lib/workspaceRuntime";
import { Workspace } from "@/types/api";

// Auth Pages (públicas)
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// Workspaces (PROTEGIDA)
import WorkspacesPage from "@/pages/workspaces/WorkspacesPage";

// App Pages (PROTEGIDAS)
import InboxPage from "@/pages/inbox/InboxPage";
import ConversationPage from "@/pages/inbox/ConversationPage";
import ChannelsPage from "@/pages/channels/ChannelsPage";
import NewChannelPage from "@/pages/channels/NewChannelPage";
import AgentsPage from "@/pages/agents/AgentsPage";
import KnowledgePage from "@/pages/knowledge/KnowledgePage";
import PlaygroundPage from "@/pages/playground/PlaygroundPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import ApiKeysPage from "@/pages/settings/ApiKeysPage";
import AccountPage from "@/pages/settings/AccountPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * ✅ Protege TODAS as rotas privadas (incluindo /workspaces)
 * Se não estiver autenticado -> /login
 */
function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/**
 * ✅ WorkspaceGuard:
 * - valida se :workspaceId pertence ao usuário logado
 * - seta runtime workspace para o header X-Workspace-ID
 */
function WorkspaceGuard() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { setCurrentWorkspace, setWorkspaces } = useAuth();

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      if (!workspaceId) {
        navigate("/workspaces", { replace: true });
        return;
      }

      // runtime para headers (sem localStorage)
      setRuntimeWorkspaceId(workspaceId);

      try {
        const ws = await api.get<Workspace[]>("/tenants/workspaces/");
        if (!mounted) return;

        setWorkspaces(ws);

        const found = ws.find((w) => String(w.id) === String(workspaceId));
        if (!found) {
          clearRuntimeWorkspaceId();
          setCurrentWorkspace(null);
          navigate("/workspaces", { replace: true });
          return;
        }

        setCurrentWorkspace(found);
      } catch {
        clearRuntimeWorkspaceId();
        setCurrentWorkspace(null);
        navigate("/workspaces", { replace: true });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [workspaceId, navigate, setCurrentWorkspace, setWorkspaces]);

  return <Outlet />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ✅ Raiz: SEMPRE vai para login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ✅ Rotas públicas: NÃO redirecionam automaticamente */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ✅ TUDO daqui pra baixo é PROTEGIDO */}
            <Route element={<RequireAuth />}>
              {/* ✅ workspace também é protegido */}
              <Route path="/workspaces" element={<WorkspacesPage />} />

              {/* ✅ rotas por workspace (protegidas + guard) */}
              <Route element={<WorkspaceGuard />}>
                <Route element={<AppLayout />}>
                  <Route path="/w/:workspaceId/inbox" element={<InboxPage />} />
                  <Route path="/w/:workspaceId/inbox/:id" element={<ConversationPage />} />

                  <Route path="/w/:workspaceId/channels" element={<ChannelsPage />} />
                  <Route path="/w/:workspaceId/channels/new" element={<NewChannelPage />} />

                  <Route path="/w/:workspaceId/agents" element={<AgentsPage />} />
                  <Route path="/w/:workspaceId/knowledge" element={<KnowledgePage />} />
                  <Route path="/w/:workspaceId/playground" element={<PlaygroundPage />} />

                  <Route path="/w/:workspaceId/settings" element={<SettingsPage />}>
                    <Route index element={<Navigate to="api-keys" replace />} />
                    <Route path="api-keys" element={<ApiKeysPage />} />
                    <Route path="account" element={<AccountPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
