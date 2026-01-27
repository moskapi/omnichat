import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AppTopbar() {
  const { user, currentWorkspace, workspaces, setCurrentWorkspace, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-card border-b border-border">
      {/* Workspace Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 px-3 gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">{currentWorkspace?.name || 'Selecionar Workspace'}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-popover">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.length > 0 ? (
            workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setCurrentWorkspace(ws)}
                className="cursor-pointer"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>{ws.name}</span>
                {ws.id === currentWorkspace?.id && (
                  <span className="ml-auto text-xs text-primary">Ativo</span>
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-muted-foreground">
              Nenhum workspace encontrado
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/workspaces')} className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            Gerenciar Workspaces
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 px-2 gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar_url} alt={user?.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium hidden sm:inline-block">{user?.name || 'Usuário'}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user?.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings/account')} className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            Minha Conta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
