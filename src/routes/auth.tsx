import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, User, Home } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { upsertUserProfile } from "@/lib/queries";
import { Logo } from "@/components/brand";

function translateAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (msg.includes("Email not confirmed")) return "Por favor, confirme seu e-mail antes de entrar.";
  if (msg.includes("Password should be at least")) return "A senha deve ter no mínimo 6 caracteres.";
  return msg;
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Casa Diária" },
      { name: "description", content: "Entre ou crie sua conta na Casa Diária, serviços locais em Gurupi-TO." },
      { property: "og:title", content: "Entrar · Casa Diária" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, "Digite seu nome completo"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setError("");
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) setError(translateAuthError(error.message));
    else onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="login-email" placeholder="seu@email.com" className="pl-10 rounded-2xl" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 rounded-2xl"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" id="login-submit" className="w-full rounded-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Form>
  );
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const form = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupValues) {
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.full_name } },
    });
    if (error) {
      setError(translateAuthError(error.message));
    } else {
      if (data.user) {
        await upsertUserProfile({ id: data.user.id, full_name: values.full_name }).catch(() => {});
      }
      if (data.session) {
        onSuccess();
      } else {
        setDone(true);
      }
    }
  }

  if (done)
    return (
      <div className="text-center space-y-3 py-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-display text-lg font-semibold">Confirme seu e-mail</h3>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta.
        </p>
        <Button onClick={onSuccess} className="w-full rounded-full" variant="outline">
          Voltar ao início
        </Button>
      </div>
    );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="signup-name" placeholder="Seu nome" className="pl-10 rounded-2xl" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="signup-email" placeholder="seu@email.com" className="pl-10 rounded-2xl" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPwd ? "text" : "password"}
                    placeholder="mínimo 6 caracteres"
                    className="pl-10 pr-10 rounded-2xl"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" id="signup-submit" className="w-full rounded-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>
    </Form>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const goHome = () => navigate({ to: "/" });

  return (
    <div className="min-h-screen bg-hero flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo className="scale-125 origin-center" />
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-card shadow-[var(--shadow-card)] p-6">
          <Tabs defaultValue="login">
            <TabsList className="w-full rounded-2xl mb-6" id="auth-tabs">
              <TabsTrigger value="login" className="flex-1 rounded-xl" id="tab-login">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 rounded-xl" id="tab-signup">
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm onSuccess={goHome} />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm onSuccess={goHome} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Back */}
        <div className="mt-6 text-center">
          <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10 rounded-full">
            <Link to="/">
              <Home className="h-4 w-4 mr-1.5" />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
