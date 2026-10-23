import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, User, Home, Check } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/brand";

function translateAuthError(msg: string): string {
  if (!msg) return "";
  const lower = msg.toLowerCase();

  // Senhas fracas / conhecidas (Supabase password leak / easy to guess)
  if (
    lower.includes("weak and easy to guess") ||
    lower.includes("known to be weak") ||
    lower.includes("easy to guess") ||
    lower.includes("too weak") ||
    lower.includes("pwned")
  ) {
    return "Esta senha é muito comum ou fácil de adivinhar. Por favor, escolha uma senha mais segura.";
  }

  // Senha inválida ou curta
  if (
    lower.includes("password should be at least") ||
    lower.includes("at least 6 characters") ||
    lower.includes("at least 7 characters")
  ) {
    return "A senha deve ter no mínimo 7 caracteres.";
  }
  if (lower.includes("signup requires a valid password") || lower.includes("requires a valid password")) {
    return "Por favor, informe uma senha válida.";
  }

  // Credenciais
  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  // E-mail já cadastrado
  if (
    lower.includes("user already registered") ||
    lower.includes("already registered") ||
    lower.includes("already exists")
  ) {
    return "Este e-mail já está cadastrado. Tente entrar na sua conta.";
  }

  // Confirmação de e-mail
  if (lower.includes("email not confirmed")) {
    return "Por favor, confirme seu e-mail antes de entrar.";
  }

  // E-mail inválido
  if (
    lower.includes("valid email") ||
    lower.includes("invalid email") ||
    lower.includes("email address is invalid") ||
    lower.includes("unable to validate email")
  ) {
    return "Por favor, informe um endereço de e-mail válido.";
  }

  // Limite de tentativas
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("over email rate limit")
  ) {
    return "Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes e tente novamente.";
  }

  // Erro de rede/conexão
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network error") ||
    lower.includes("timeout")
  ) {
    return "Erro de conexão com o servidor. Verifique sua internet e tente novamente.";
  }

  // Se a mensagem ainda estiver em inglês, traduzir amigavelmente
  if (lower.includes("password") || lower.includes("choose a different") || lower.includes("error")) {
    return "Senha considerada insegura ou dados inválidos. Por favor, tente com outra senha.";
  }

  return msg;
}

type AuthSearch = {
  redirect?: string | undefined;
  tab?: "login" | "signup" | undefined;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    tab: search["tab"] === "signup" ? "signup" : search["tab"] === "login" ? "login" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar · Casa Diária" },
      { name: "description", content: "Entre ou crie sua conta na Casa Diária, serviços locais em Gurupi-TO." },
      { property: "og:title", content: "Entrar · Casa Diária" },
    ],
  }),
  component: AuthPage,
});

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: "No mínimo 7 caracteres",
    test: (pwd: string) => pwd.length >= 7,
  },
  {
    id: "uppercase",
    label: "Pelo menos 1 letra maiúscula",
    test: (pwd: string) => /[A-Z]/.test(pwd),
  },
  {
    id: "number",
    label: "Pelo menos 1 número",
    test: (pwd: string) => /[0-9]/.test(pwd),
  },
];

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .regex(EMAIL_REGEX, "Digite um e-mail válido (ex: seu@email.com)"),
  password: z.string().min(1, "Digite sua senha"),
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Digite seu nome completo"),
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .regex(EMAIL_REGEX, "Digite um e-mail válido (ex: seu@email.com)"),
  password: z
    .string()
    .min(7, "A senha deve ter no mínimo 7 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos 1 letra maiúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos 1 número"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (error) setError("");
  }, [form.watch("email"), form.watch("password")]);

  async function onSubmit(values: LoginValues) {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim().toLowerCase(),
      password: values.password,
    });
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
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10 rounded-2xl"
                    {...field}
                  />
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
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const passwordValue = form.watch("password") || "";
  const emailValue = form.watch("email") || "";

  useEffect(() => {
    if (error) setError("");
  }, [passwordValue, emailValue]);

  async function onSubmit(values: SignupValues) {
    setError("");
    const cleanEmail = values.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("Por favor, insira um e-mail válido (ex: seu@email.com).");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: values.password,
      options: { data: { full_name: values.full_name.trim() } },
    });
    if (error) {
      setError(translateAuthError(error.message));
    } else {
      if (data.user) {
        await upsertUserProfile({ id: data.user.id, full_name: values.full_name.trim() }).catch(() => { });
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
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10 rounded-2xl"
                    {...field}
                  />
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
                    placeholder="mínimo 7 caracteres"
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

        {/* Requisitos da senha */}
        <div className="rounded-2xl bg-muted/60 p-3 space-y-1.5 border border-border/40 text-xs">
          <p className="font-medium text-foreground text-[11px] uppercase tracking-wider">
            Requisitos da senha:
          </p>
          <ul className="space-y-1 pt-0.5">
            {PASSWORD_REQUIREMENTS.map((req) => {
              const isMet = req.test(passwordValue);
              return (
                <li
                  key={req.id}
                  className={`flex items-center gap-2 transition-colors duration-150 ${isMet ? "text-primary font-medium" : "text-muted-foreground"
                    }`}
                >
                  {isMet ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 stroke-[2.5]" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-1 mr-1" />
                  )}
                  <span>{req.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

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
  const { user, loading } = useAuth();
  const search = Route.useSearch();
  const redirectTarget = search.redirect || "/";
  const isProSignup = search.redirect === "/painel";
  const initialTab = search.tab || (isProSignup ? "signup" : "login");
  const [tab, setTab] = useState<string>(initialTab);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirectTarget as any });
    }
  }, [user, loading, navigate, redirectTarget]);

  const handleSuccess = () => navigate({ to: redirectTarget as any });

  return (
    <div className="min-h-screen bg-hero flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo className="scale-125 origin-center" />
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-card shadow-[var(--shadow-card)] p-6">
          {isProSignup && (
            <div className="mb-5 rounded-2xl bg-primary-soft/80 p-3.5 border border-primary/20 text-center">
              <p className="text-xs font-bold text-primary-deep flex items-center justify-center gap-1.5">
                <span>💼</span> Cadastro de Profissional
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Crie sua conta ou faça login para ativar seu perfil profissional.
              </p>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full rounded-2xl mb-6" id="auth-tabs">
              <TabsTrigger value="login" className="flex-1 rounded-xl" id="tab-login">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 rounded-xl" id="tab-signup">
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm onSuccess={handleSuccess} />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm onSuccess={handleSuccess} />
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
