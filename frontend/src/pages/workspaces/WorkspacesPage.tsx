import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Building2, Plus, Check, Loader2 } from 'lucide-react';
import { PageLoading, EmptyState } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { Workspace } from '@/types/api';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

// Mock workspaces for demonstration
// const mockWorkspaces: Workspace[] = [
//   {
//     id: 'ws-1',
//     name: 'Minha Empresa',
//     slug: 'minha-empresa',
//     role: 'owner',
//     created_at: '2024-01-15T10:00:00Z',
//   },
//   {
//     id: 'ws-2',
//     name: 'Projeto Cliente',
//     slug: 'projeto-cliente',
//     role: 'admin',
//     created_at: '2024-02-20T14:30:00Z',
//   },
// ];


export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setCurrentWorkspace, setWorkspaces: setAuthWorkspaces } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await api.get<Workspace[]>('/tenants/workspaces/');
        setWorkspaces(data);
        setAuthWorkspaces(data);
      } catch (error) {
        console.error('Error loading workspaces:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspaces();
  }, [setAuthWorkspaces]);

  const handleSelectWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    navigate('/inbox');
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      const created = await api.post<Workspace>('/tenants/workspaces/', {
        name: newWorkspaceName.trim(),
      });

      const next = [created, ...workspaces];
      setWorkspaces(next);
      setAuthWorkspaces(next);

      setNewWorkspaceName('');
      setDialogOpen(false);

      // ✅ seleciona e salva workspace_id no localStorage (via AuthContext)
      setCurrentWorkspace(created);
      navigate('/inbox');
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };


  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 p-4">
      <div className="w-full max-w-2xl animate-fade-up">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Selecione um Workspace</h1>
          <p className="text-muted-foreground">
            Escolha o workspace que deseja acessar ou crie um novo
          </p>
        </div>

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={Building2}
                title="Nenhum workspace encontrado"
                description="Crie seu primeiro workspace para começar a usar o Omnichat"
                action={
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Workspace
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card">
                      <DialogHeader>
                        <DialogTitle>Criar novo workspace</DialogTitle>
                        <DialogDescription>
                          Dê um nome ao seu workspace. Você poderá convidar membros depois.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="workspace-name">Nome do Workspace</Label>
                        <Input
                          id="workspace-name"
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          placeholder="Ex: Minha Empresa"
                          className="mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateWorkspace} disabled={isCreating || !newWorkspaceName.trim()}>
                          {isCreating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            'Criar Workspace'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {workspaces.map((workspace) => (
                <Card
                  key={workspace.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-card-hover hover:border-primary/30',
                    'group'
                  )}
                  onClick={() => handleSelectWorkspace(workspace)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{workspace.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {workspace.role === 'owner' ? 'Proprietário' : workspace.role === 'admin' ? 'Administrador' : 'Membro'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground hidden sm:inline">
                        Selecionar
                      </span>
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar novo workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Criar novo workspace</DialogTitle>
                  <DialogDescription>
                    Dê um nome ao seu workspace. Você poderá convidar membros depois.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="workspace-name-2">Nome do Workspace</Label>
                  <Input
                    id="workspace-name-2"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Ex: Minha Empresa"
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateWorkspace} disabled={isCreating || !newWorkspaceName.trim()}>
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Workspace'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
