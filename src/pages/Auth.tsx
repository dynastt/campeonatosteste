import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  if (authLoading) return <div className="min-h-screen bg-gradient-hero flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Preencha todos os campos'); return; }
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message);
      } else {
        if (password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); setSubmitting(false); return; }
        const { error } = await signUp(email, password);
        if (error) toast.error(error.message);
        else toast.success('Conta criada! Verifique seu email para confirmar.');
      }
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-gradient-card border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg glow-primary">
              <Trophy className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">{isLogin ? 'Entrar' : 'Criar Conta'}</CardTitle>
          <CardDescription>{isLogin ? 'Acesse seus campeonatos' : 'Crie sua conta para gerenciar campeonatos'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="h-11" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" className="h-11" />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>
          {isLogin && (
            <div className="mt-3 text-center">
              <button type="button" onClick={() => setForgotPassword(true)} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                Esqueci minha senha
              </button>
            </div>
          )}
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          </div>

          {/* Forgot Password Dialog */}
          {forgotPassword && (
            <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <p className="text-sm font-medium">Recuperar senha</p>
              <Input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-10"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForgotPassword(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-primary hover:opacity-90"
                  disabled={submitting}
                  onClick={async () => {
                    if (!resetEmail) { toast.error('Digite seu email'); return; }
                    setSubmitting(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) toast.error(error.message);
                      else {
                        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
                        setForgotPassword(false);
                      }
                    } finally { setSubmitting(false); }
                  }}
                >
                  {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Enviar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
