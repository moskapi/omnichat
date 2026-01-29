import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common';
import { MessageSquare, AlertCircle, Mail, ArrowLeft } from 'lucide-react';
import authApi from '@/lib/auth';
import { ApiException } from "@/lib/api";


const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.requestPasswordReset(data.email);
      
      setSubmittedEmail(data.email);
      setEmailSent(true);
    } catch (err) {
      if (err instanceof ApiException) {
        // Even if email doesn't exist, show success for security
        setSubmittedEmail(data.email);
        setEmailSent(true);
      } else {
        setError('Erro ao enviar email. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verifique seu email</CardTitle>
            <CardDescription className="space-y-2">
              <p>
                Se existe uma conta associada a <strong>{submittedEmail}</strong>, 
                você receberá um email com instruções para redefinir sua senha.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Não recebeu o email? Verifique sua pasta de spam ou tente novamente.
              </p>
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setEmailSent(false)}
            >
              Tentar outro email
            </Button>
            <Link to="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
          <CardDescription>
            Informe seu email e enviaremos instruções para redefinir sua senha
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" /> : 'Enviar instruções'}
            </Button>
            <Link to="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para login
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
