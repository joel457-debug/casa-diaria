import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Phone, Save, LogOut, Camera } from "lucide-react";
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
import { Avatar } from "@/components/brand";
import { userProfileQuery, upsertUserProfile, uploadMedia, myProQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil · Casa Diária" },
      { name: "description", content: "Edite seu perfil de usuário na Casa Diária." },
      { property: "og:title", content: "Meu perfil · Casa Diária" },
    ],
  }),
  component: PerfilPage,
});

const schema = z.object({
  full_name: z.string().min(2, "Digite seu nome completo"),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function PerfilPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: profile } = useQuery({
    ...userProfileQuery(user?.id ?? ""),
    enabled: !!user,
  });

  const { data: pro } = useQuery({
    ...myProQuery(user?.id ?? ""),
    enabled: !!user,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      full_name: profile?.full_name ?? (user?.user_metadata?.["full_name"] as string | undefined) ?? "",
      phone: profile?.phone ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!user) return;
    await upsertUserProfile({
      id: user.id,
      full_name: values.full_name || undefined,
      phone: values.phone || undefined,
    });
    qc.invalidateQueries({ queryKey: ["user-profile"] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadMedia(user.id, file);
      await upsertUserProfile({ id: user.id, avatar_url: url });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["my-pro"] });
      qc.invalidateQueries({ queryKey: ["pros"] });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading)
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-10 space-y-4">
          <div className="h-24 rounded-3xl bg-muted animate-pulse" />
          <div className="h-48 rounded-3xl bg-muted animate-pulse" />
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-semibold flex items-center gap-2">
          <User className="h-7 w-7 text-primary" /> Meu perfil
        </h1>

        {!user ? (
          <div className="rounded-3xl border bg-card p-8 text-center space-y-4">
            <User className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Entre para ver seu perfil.</p>
            <Button asChild className="rounded-full">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Avatar card */}
            <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar
                    src={profile?.avatar_url ?? null}
                    name={profile?.full_name ?? user.email ?? "U"}
                    className="h-20 w-20 text-xl"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition"
                    aria-label="Mudar foto"
                  >
                    {uploadingAvatar ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {profile?.full_name ?? (user.user_metadata?.["full_name"] as string | undefined) ?? "Usuário"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Professional quick access */}
            {pro ? (
              <div className="rounded-3xl border border-primary/20 bg-primary-soft/40 p-5 flex items-center justify-between shadow-[var(--shadow-card)]">
                <div>
                  <h3 className="font-semibold text-primary-deep">Painel do Profissional</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Gerencie seus serviços, portfólio e pedidos</p>
                </div>
                <Button asChild className="rounded-full shadow-sm" size="sm">
                  <Link to="/painel">Acessar painel</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-primary/30 bg-primary-soft/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[var(--shadow-card)]">
                <div>
                  <h3 className="font-semibold text-primary-deep flex items-center gap-1.5">
                    <span>💼</span> É profissional? Divulgue seu trabalho
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Crie seu perfil profissional para oferecer serviços e receber pedidos de orçamento em Gurupi.
                  </p>
                </div>
                <Button asChild className="rounded-full shadow-sm shrink-0" size="sm">
                  <Link to="/painel">Cadastrar como profissional</Link>
                </Button>
              </div>
            )}

            {/* Edit form */}
            <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="mb-4 font-display text-lg font-semibold">Editar dados</h2>
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
                            <Input id="perfil-name" className="pl-10 rounded-2xl" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="perfil-phone"
                              placeholder="(63) 99999-9999"
                              className="pl-10 rounded-2xl"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    id="perfil-save"
                    className="w-full rounded-full gap-2"
                    disabled={form.formState.isSubmitting}
                  >
                    {saved ? (
                      "✓ Salvo!"
                    ) : form.formState.isSubmitting ? (
                      "Salvando…"
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Salvar alterações
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Danger zone */}
            <div className="rounded-3xl border border-destructive/20 bg-card p-6">
              <h2 className="mb-3 font-display text-lg font-semibold text-destructive">Sair</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Você será desconectado desta conta.
              </p>
              <Button
                id="btn-logout"
                variant="outline"
                className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
