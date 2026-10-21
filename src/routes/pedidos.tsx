import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Phone,
  Clock,
  CircleDot,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Avatar, Stars } from "@/components/brand";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  clientQuotesQuery,
  updateQuoteStatus,
  quoteReviewQuery,
  createReview,
  userProfileQuery,
} from "@/lib/queries";
import { requestStatusLabel, cleanWhatsAppUrl } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos · Casa Diária" },
      { name: "description", content: "Acompanhe seus pedidos de orçamento na Casa Diária." },
      { property: "og:title", content: "Meus pedidos · Casa Diária" },
    ],
  }),
  component: PedidosPage,
});

const statusColor: Record<string, string> = {
  pendente: "bg-status-limited/15 text-amber-700",
  respondido: "bg-blue-100 text-blue-700",
  aceito: "bg-primary-soft text-primary-deep",
  concluido: "bg-primary-soft text-primary-deep",
  cancelado: "bg-destructive/10 text-destructive",
};

const statusIcon: Record<string, React.ReactNode> = {
  pendente: <Clock className="h-3.5 w-3.5" />,
  respondido: <CircleDot className="h-3.5 w-3.5" />,
  aceito: <CheckCircle className="h-3.5 w-3.5" />,
  concluido: <CheckCircle className="h-3.5 w-3.5" />,
  cancelado: <XCircle className="h-3.5 w-3.5" />,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        statusColor[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {statusIcon[status]}
      {requestStatusLabel[status] ?? status}
    </span>
  );
}

function ReviewModal({
  open,
  onClose,
  pedido,
  user,
}: {
  open: boolean;
  onClose: () => void;
  pedido: any;
  user: any;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [quality, setQuality] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [priceTransp, setPriceTransp] = useState(5);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: profile } = useQuery({
    ...userProfileQuery(user?.id ?? ""),
    enabled: !!user,
  });

  async function handleSendReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      const name = profile?.full_name?.trim() || user.user_metadata?.full_name || user.email || "Cliente";
      await createReview({
        professional_id: pedido.professional_id,
        client_id: user.id,
        request_id: pedido.id,
        reviewer_name: name,
        rating,
        comment: comment.trim() || undefined,
        quality,
        punctuality,
        price_transparency: priceTransp,
        would_recommend: wouldRecommend,
      });
      qc.invalidateQueries({ queryKey: ["quote-review", pedido.id] });
      qc.invalidateQueries({ queryKey: ["pro-stats"] });
      qc.invalidateQueries({ queryKey: ["pros"] });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao salvar avaliação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Star className="h-5 w-5 fill-status-limited text-status-limited" />
            Avaliar serviço
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSendReview} className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Como foi sua experiência com <strong>{pedido.professionals?.business_name || pedido.professionals?.name}</strong>?
          </p>
          <div className="flex flex-col items-center gap-2 py-3 bg-muted/40 rounded-2xl p-4">
            <span className="text-sm font-semibold">Nota geral</span>
            <Stars value={rating} onChange={setRating} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Comentário (opcional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva o que achou do atendimento, qualidade e pontualidade…"
              rows={3}
              className="rounded-2xl text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border p-2">
              <span className="text-muted-foreground block mb-1">Qualidade</span>
              <select
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full text-center bg-transparent font-semibold cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} ⭐</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border p-2">
              <span className="text-muted-foreground block mb-1">Pontualidade</span>
              <select
                value={punctuality}
                onChange={(e) => setPunctuality(Number(e.target.value))}
                className="w-full text-center bg-transparent font-semibold cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} ⭐</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border p-2">
              <span className="text-muted-foreground block mb-1">Preço Justo</span>
              <select
                value={priceTransp}
                onChange={(e) => setPriceTransp(Number(e.target.value))}
                className="w-full text-center bg-transparent font-semibold cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} ⭐</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              id="recommend-check"
              type="checkbox"
              checked={wouldRecommend}
              onChange={(e) => setWouldRecommend(e.target.checked)}
              className="rounded h-4 w-4 text-primary"
            />
            <label htmlFor="recommend-check" className="text-xs font-semibold cursor-pointer">
              Recomendo este profissional para outras pessoas
            </label>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 rounded-full" disabled={submitting}>
              {submitting ? "Enviando…" : "Salvar avaliação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PedidoCard({ pedido, user }: { pedido: any; user: any }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const qc = useQueryClient();

  const { data: existingReview } = useQuery(quoteReviewQuery(pedido.id));

  const accept = useMutation({
    mutationFn: () => updateQuoteStatus(pedido.id, "aceito"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-quotes"] }),
  });

  const cancel = useMutation({
    mutationFn: () => updateQuoteStatus(pedido.id, "cancelado"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-quotes"] }),
  });

  const pro = pedido.professionals;

  return (
    <div className="rounded-3xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition"
        onClick={() => setExpanded((v) => !v)}
        id={`pedido-${pedido.id}`}
      >
        <Avatar src={pro?.avatar_url} name={pro?.name ?? "?"} className="h-12 w-12 shrink-0 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">
            {pro?.business_name || pro?.name}
          </p>
          <p className="text-xs text-muted-foreground">{pro?.categories?.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{pedido.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={pedido.status} />
          <span className="text-xs text-muted-foreground">
            {new Date(pedido.created_at).toLocaleDateString("pt-BR")}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground ml-1 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Descrição do pedido
            </p>
            <p className="text-sm">{pedido.description}</p>
          </div>

          {pedido.address && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Endereço
              </p>
              <p className="text-sm">{pedido.address}</p>
            </div>
          )}

          {pedido.preferred_date && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Data preferida
              </p>
              <p className="text-sm">
                {new Date(pedido.preferred_date.includes("T") ? pedido.preferred_date : pedido.preferred_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}

          {pedido.pro_response && (
            <div className="rounded-2xl bg-primary-soft p-3">
              <p className="text-xs font-semibold text-primary-deep mb-1">
                Resposta do profissional
              </p>
              <p className="text-sm">{pedido.pro_response}</p>
              {pedido.quoted_value && (
                <p className="mt-1.5 font-semibold text-primary">
                  Valor: R$ {Number(pedido.quoted_value).toFixed(2).replace(".", ",")}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {pro?.whatsapp && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 gap-1.5"
                asChild
              >
                <a
                  href={cleanWhatsAppUrl(pro.whatsapp, "Olá, tenho interesse no orçamento que solicitei pelo Casa Diária!")}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </Button>
            )}
            {pedido.status === "respondido" && (
              <>
                <Button
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={() => accept.mutate()}
                  disabled={accept.isPending}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Aceitar orçamento
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Recusar
                </Button>
              </>
            )}
            {pedido.status === "aceito" && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar
              </Button>
            )}
            {pedido.status === "concluido" && (
              existingReview ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary-soft px-3 py-1.5 rounded-full">
                  <Star className="h-3.5 w-3.5 fill-status-limited text-status-limited" />
                  Avaliado ({existingReview.rating}★)
                </span>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  onClick={() => setReviewOpen(true)}
                >
                  <Star className="h-3.5 w-3.5 fill-white text-white" />
                  Avaliar serviço
                </Button>
              )
            )}
            <Button size="sm" variant="ghost" asChild className="rounded-full ml-auto text-muted-foreground">
              <Link to="/profissional/$slug" params={{ slug: pro?.slug ?? "" }}>
                Ver perfil
              </Link>
            </Button>
          </div>
        </div>
      )}

      {reviewOpen && (
        <ReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          pedido={pedido}
          user={user}
        />
      )}
    </div>
  );
}


function PedidosPage() {
  const { user, loading } = useAuth();
  const { data: pedidos, isLoading } = useQuery({
    ...clientQuotesQuery(user?.id ?? ""),
    enabled: !!user,
  });

  if (loading || isLoading)
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-semibold flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-primary" /> Meus pedidos
        </h1>

        {!user ? (
          <div className="rounded-3xl border bg-card p-8 text-center space-y-4">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Entre para ver seus pedidos.</p>
            <Button asChild className="rounded-full">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        ) : pedidos?.length === 0 ? (
          <div className="rounded-3xl border bg-card p-8 text-center space-y-4">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <div>
              <h2 className="font-display text-xl font-semibold">Nenhum pedido ainda</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Encontre um profissional e peça seu orçamento!
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link to="/buscar">Buscar profissionais</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos?.map((p) => <PedidoCard key={p.id} pedido={p} user={user} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
