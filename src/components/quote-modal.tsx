import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MessageSquare,
  Calendar,
  MapPin,
  Send,
  CheckCircle2,
  FileText,
  User,
  Phone,
  Sparkles,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createQuoteRequest, userProfileQuery } from "@/lib/queries";
import { cleanWhatsAppUrl } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

const schema = z.object({
  client_name: z.string().min(2, "Informe seu nome"),
  client_phone: z.string().optional(),
  description: z.string().min(10, "Descreva o serviço com pelo menos 10 caracteres."),
  address: z.string().optional(),
  preferred_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface QuoteModalProps {
  open: boolean;
  onClose: () => void;
  professionalId: string;
  professionalName: string;
  professionalCategory?: string | undefined;
  professionalAvatar?: string | null | undefined;
  professionalPhone?: string | undefined;
}

export function QuoteModal({
  open,
  onClose,
  professionalId,
  professionalName,
  professionalCategory,
  professionalAvatar,
  professionalPhone,
}: QuoteModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    ...userProfileQuery(user?.id ?? ""),
    enabled: !!user,
  });

  const defaultName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.["full_name"] as string | undefined) ||
    "";
  const defaultPhone = profile?.phone || "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      client_name: defaultName,
      client_phone: defaultPhone,
      description: "",
      address: "",
      preferred_date: "",
    },
  });

  function saveLocalPedido(pedido: any) {
    try {
      const existing = JSON.parse(localStorage.getItem("cd_recent_pedidos") || "[]");
      const updated = [pedido, ...existing.filter((p: any) => p.id !== pedido.id)];
      localStorage.setItem("cd_recent_pedidos", JSON.stringify(updated.slice(0, 30)));
    } catch {
      // ignore localStorage errors
    }
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const clientName = values.client_name.trim() || defaultName || "Cliente";

    const pedidoRecord = {
      id: "local_" + Date.now(),
      professional_id: professionalId,
      client_id: user?.id ?? "guest",
      client_name: clientName,
      description: values.description,
      address: values.address || "",
      preferred_date: values.preferred_date || "",
      client_phone: values.client_phone || "",
      status: "pendente",
      created_at: new Date().toISOString(),
      professionals: {
        id: professionalId,
        name: professionalName,
        business_name: professionalName,
        avatar_url: professionalAvatar ?? null,
        whatsapp: professionalPhone ?? null,
        categories: { name: professionalCategory ?? "Serviço Residencial" },
      },
    };

    saveLocalPedido(pedidoRecord);

    try {
      if (user) {
        await createQuoteRequest({
          professional_id: professionalId,
          client_id: user.id,
          client_name: clientName,
          description: values.description,
          address: values.address || undefined,
          preferred_date: values.preferred_date || undefined,
          client_phone: values.client_phone || undefined,
        });
        qc.invalidateQueries({ queryKey: ["client-quotes"] });
      }
    } catch (err) {
      console.warn("Erro ao salvar no banco, mantido localmente:", err);
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  function handleClose() {
    setSent(false);
    form.reset();
    onClose();
  }

  function handleDirectWhatsApp() {
    if (!professionalPhone) return;
    const desc = form.getValues("description");
    const name = form.getValues("client_name");
    const date = form.getValues("preferred_date");
    const addr = form.getValues("address");

    let text = `Olá, ${professionalName}! Vi seu perfil no Casa Diária e gostaria de um orçamento:\n\n`;
    if (desc) text += `📌 *Serviço:* ${desc}\n`;
    if (name) text += `👤 *Nome:* ${name}\n`;
    if (date) text += `📅 *Data prevista:* ${date}\n`;
    if (addr) text += `📍 *Local:* ${addr}\n`;

    const url = cleanWhatsAppUrl(professionalPhone, text);
    if (url) window.open(url, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden shadow-2xl border-0">
        {/* Header stripe with gradient */}
        <div className="bg-hero px-6 pt-6 pb-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white font-bold text-xl">
              <MessageSquare className="h-5 w-5 text-primary-soft" />
              Pedir Orçamento
            </DialogTitle>
          </DialogHeader>

          {/* Professional summary card */}
          <div className="mt-4 flex items-center gap-3.5 rounded-2xl bg-white/15 backdrop-blur-md px-4 py-3 border border-white/20">
            {professionalAvatar ? (
              <img
                src={professionalAvatar}
                alt={professionalName}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white/60 shadow-sm"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-deep text-white font-bold text-lg ring-2 ring-white/60 shadow-sm">
                {professionalName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-white leading-tight truncate text-base">
                {professionalName}
              </p>
              {professionalCategory && (
                <span className="inline-flex items-center gap-1 mt-0.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white font-medium">
                  <Sparkles className="h-3 w-3" /> {professionalCategory}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 bg-card">
          {sent ? (
            /* Success state */
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
                <CheckCircle2 className="h-9 w-9 text-primary animate-in zoom-in-75 duration-300" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-2xl font-display text-foreground">
                  Pedido enviado com sucesso! 🎉
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Sua solicitação foi registrada para{" "}
                  <strong className="text-foreground">{professionalName}</strong>. Você pode
                  acompanhar todos os detalhes na página do serviço contratado.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                {professionalPhone && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDirectWhatsApp}
                    className="flex-1 rounded-full border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 gap-2 h-11"
                  >
                    <Phone className="h-4 w-4" />
                    Falar no WhatsApp
                  </Button>
                )}
                <Button asChild className="flex-1 rounded-full gap-2 h-11 bg-primary hover:bg-primary/95 shadow-md">
                  <Link to="/pedidos" onClick={handleClose}>
                    <FileText className="h-4 w-4" />
                    Ver serviço contratado
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Form */
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Contact fields if not logged in or name missing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="client_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-xs font-semibold">
                          <User className="h-3.5 w-3.5 text-primary" />
                          Seu Nome <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: João da Silva"
                            className="rounded-2xl h-10 text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-xs font-semibold">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                          Seu WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(00) 00000-0000"
                            className="rounded-2xl h-10 text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-semibold">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        O que você precisa que seja feito? <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Preciso instalar 3 tomadas na sala, trocar o chuveiro elétrico e verificar o disjuntor principal…"
                          className="min-h-[105px] rounded-2xl resize-none text-sm leading-relaxed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-[11px] text-muted-foreground">
                        {field.value?.length ?? 0}/10 caracteres mínimos
                      </p>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-xs font-semibold">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          Local / Bairro <span className="text-muted-foreground font-normal">(opcional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Centro, Rua das Flores"
                            className="rounded-2xl h-10 text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Preferred Date */}
                  <FormField
                    control={form.control}
                    name="preferred_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-xs font-semibold">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          Data preferida <span className="text-muted-foreground font-normal">(opcional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="date" className="rounded-2xl h-10 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {professionalPhone && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDirectWhatsApp}
                      className="rounded-full border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 gap-1.5 h-11 sm:w-auto"
                      title="Enviar dados diretamente pelo WhatsApp"
                    >
                      <Phone className="h-4 w-4" />
                      Pedir pelo WhatsApp
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="flex-1 rounded-full gap-2 h-11 bg-primary hover:bg-primary/95 text-white font-semibold shadow-md"
                    disabled={loading}
                  >
                    <Send className="h-4 w-4" />
                    {loading ? "Enviando…" : "Confirmar e Enviar Pedido"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
