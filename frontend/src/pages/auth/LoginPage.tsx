import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ApiException } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu email ou usuário'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});


type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await authApi.login({
        email: data.email,
        password: data.password,
      });
      setUser(user);
      navigate("/workspaces");
      
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Erro ao fazer login. Verifique suas credenciais.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 p-4">
      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-primary shadow-lg mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Omnichat</h1>
          <p className="text-sm text-muted-foreground mt-1">Plataforma Omnichannel com IA</p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Entrar na sua conta</CardTitle>
            <CardDescription>
              Digite seu email e senha para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type=""
                  placeholder="seu@email.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  Criar conta
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao continuar, você concorda com nossos{' '}
          <a href="#" className="underline hover:text-foreground">
            Termos de Uso
          </a>{' '}
          e{' '}
          <a href="#" className="underline hover:text-foreground">
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  );
}
