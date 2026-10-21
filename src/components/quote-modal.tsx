import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare, X, Calendar, MapPin, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

const schema = z.object({
  description: z.string().min(20, "Descreva o serviço com pelo menos 20 caracteres."),
  address: z.string().optional(),
  preferred_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface QuoteModalProps {
  open: boolean;
  onClose: () => void;
  professionalId: string;
  professionalName: string;
}

export function QuoteModal({
  open,
  onClose,
  professionalId,
  professionalName,
}: QuoteModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    ...userProfileQuery(user?.id ?? ""),
    enabled: !!user,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: "", address: "", preferred_date: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setLoading(true);
    try {
      const clientName = profile?.full_name?.trim() || user.user_metadata?.full_name || user.email || "Cliente";
      await createQuoteRequest({
        professional_id: professionalId,
        client_id: user.id,
        client_name: clientName,
        description: values.description,
        address: values.address || undefined,
        preferred_date: values.preferred_date || undefined,
      });
      setSent(true);
      qc.invalidateQueries({ queryKey: ["client-quotes"] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSent(false);
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <MessageSquare className="h-5 w-5 text-primary" />
            Pedir orçamento
          </DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4 text-center py-4">
            <p className="text-muted-foreground">
              Você precisa estar logado para pedir um orçamento.
            </p>
            <Button asChild className="rounded-full w-full">
              <Link to="/auth">Entrar / Criar conta</Link>
            </Button>
          </div>
        ) : sent ? (
          <div className="space-y-4 text-center py-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
              <Send className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Pedido enviado!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {professionalName} receberá seu pedido e entrará em contato em breve.
                Você pode acompanhar em <strong>Pedidos</strong>.
              </p>
            </div>
            <Button onClick={handleClose} className="rounded-full w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enviando para <strong>{professionalName}</strong>
              </p>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descreva o serviço *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Preciso instalar 3 tomadas na sala e verificar o quadro elétrico…"
                        className="min-h-[100px] rounded-2xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Endereço (opcional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Rua, bairro ou referência"
                        className="rounded-2xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Data preferida (opcional)
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="rounded-2xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 rounded-full" disabled={loading}>
                  {loading ? "Enviando…" : "Enviar pedido"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
