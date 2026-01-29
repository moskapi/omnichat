import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout";

// Auth Pages
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import WorkspacesPage from "@/pages/workspaces/WorkspacesPage";

// App Pages
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />

            {/* App Routes */}
            <Route element={<AppLayout />}>
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/inbox/:id" element={<ConversationPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/channels/new" element={<NewChannelPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/playground" element={<PlaygroundPage />} />
              <Route path="/settings" element={<SettingsPage />}>
                <Route index element={<Navigate to="/settings/api-keys" replace />} />
                <Route path="api-keys" element={<ApiKeysPage />} />
                <Route path="account" element={<AccountPage />} />
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
