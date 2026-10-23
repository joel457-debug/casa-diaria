import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
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
      { title: "Serviços Contratados & Pedidos · Casa Diária" },
      {
        name: "description",
        content: "Acompanhe seus pedidos de orçamento e serviços contratados na Casa Diária.",
      },
      { property: "og:title", content: "Serviços Contratados · Casa Diária" },
    ],
  }),
  component: PedidosPage,
});

const statusColor: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-300",
  respondido: "bg-blue-100 text-blue-800 border-blue-300",
  aceito: "bg-emerald-100 text-emerald-800 border-emerald-300",
  concluido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-red-50 text-red-700 border-red-200",
};

const statusIcon: Record<string, React.ReactNode> = {
  pendente: <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />,
  respondido: <CircleDot className="h-3.5 w-3.5 text-blue-600" />,
  aceito: <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />,
  concluido: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  cancelado: <XCircle className="h-3.5 w-3.5 text-red-600" />,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border shadow-xs",
        statusColor[status] ?? "bg-muted text-muted-foreground border-border",
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
      const name =
        profile?.full_name?.trim() ||
        (user.user_metadata?.["full_name"] as string | undefined) ||
        user.email ||
        "Cliente";
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
            Avaliar serviço realizado
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSendReview} className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Como foi sua experiência com{" "}
            <strong>{pedido.professionals?.business_name || pedido.professionals?.name}</strong>?
          </p>
          <div className="flex flex-col items-center gap-2 py-3 bg-muted/40 rounded-2xl p-4">
            <span className="text-sm font-semibold">Nota geral</span>
            <Stars value={rating} onChange={setRating} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Comentário (opcional)
            </label>
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
                  <option key={n} value={n}>
                    {n} ⭐
                  </option>
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
                  <option key={n} value={n}>
                    {n} ⭐
                  </option>
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
                  <option key={n} value={n}>
                    {n} ⭐
                  </option>
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
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={onClose}
            >
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

function PedidoCard({
  pedido,
  user,
  onStatusChange,
}: {
  pedido: any;
  user: any;
  onStatusChange?: (id: string, newStatus: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const qc = useQueryClient();

  const isLocal = String(pedido.id).startsWith("local_");

  const { data: existingReview } = useQuery({
    ...quoteReviewQuery(pedido.id),
    enabled: !isLocal && !!pedido.id,
  });

  const accept = useMutation({
    mutationFn: async () => {
      if (isLocal) {
        onStatusChange?.(pedido.id, "aceito");
        return;
      }
      return updateQuoteStatus(pedido.id, "aceito");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-quotes"] });
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (isLocal) {
        onStatusChange?.(pedido.id, "cancelado");
        return;
      }
      return updateQuoteStatus(pedido.id, "cancelado");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-quotes"] });
    },
  });

  const markComplete = useMutation({
    mutationFn: async () => {
      if (isLocal) {
        onStatusChange?.(pedido.id, "concluido");
        return;
      }
      return updateQuoteStatus(pedido.id, "concluido");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-quotes"] });
    },
  });

  const pro = pedido.professionals;

  return (
    <div className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition overflow-hidden">
      {/* Header top bar */}
      <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-5 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <FileText className="h-4 w-4 text-primary" />
          <span>Pedido #{String(pedido.id).slice(-6)}</span>
          <span className="text-muted-foreground/40">•</span>
          <span>{new Date(pedido.created_at).toLocaleDateString("pt-BR")}</span>
        </div>
        <StatusBadge status={pedido.status} />
      </div>

      <div className="p-5 space-y-4">
        {/* Professional summary banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30 border">
          <div className="flex items-center gap-3.5">
            <Avatar
              src={pro?.avatar_url}
              name={pro?.name ?? "P"}
              className="h-14 w-14 shrink-0 text-base ring-2 ring-primary/20"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-base text-foreground">
                  {pro?.business_name || pro?.name || "Profissional"}
                </p>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-semibold text-primary">
                {pro?.categories?.name ?? "Especialista Residencial"}
              </p>
              {pedido.client_name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Solicitante: <strong>{pedido.client_name}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isLocal && user && (
              <Button size="sm" variant="outline" asChild className="rounded-full gap-1.5 text-xs h-9">
                <Link to="/mensagens" search={{ pedido: pedido.id }}>
                  <MessageSquare className="h-3.5 w-3.5" /> Mensagens
                </Link>
              </Button>
            )}
            {pro?.whatsapp && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 gap-1.5 text-xs font-semibold h-9"
                asChild
              >
                <a
                  href={cleanWhatsAppUrl(
                    pro.whatsapp,
                    `Olá! Estou falando sobre o pedido de serviço feito no Casa Diária (#${String(pedido.id).slice(-4)}).`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone className="h-3.5 w-3.5" /> Falar no WhatsApp
                </a>
              </Button>
            )}
            {pro?.slug && (
              <Button size="sm" variant="ghost" asChild className="rounded-full text-xs h-9">
                <Link to="/profissional/$slug" params={{ slug: pro.slug }}>
                  Ver perfil
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Contract details / O que vai ser contratado */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-primary-soft/30 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-deep flex items-center gap-1.5 mb-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              O que vai ser contratado / Serviço solicitado:
            </p>
            <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-line">
              {pedido.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {pedido.preferred_date && (
              <div className="flex items-center gap-2.5 rounded-xl border p-3 bg-card">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground block">Data prevista:</span>
                  <span className="font-semibold text-foreground truncate">
                    {new Date(
                      pedido.preferred_date.includes("T")
                        ? pedido.preferred_date
                        : pedido.preferred_date + "T00:00:00",
                    ).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            )}

            {pedido.address && (
              <div className="flex items-center gap-2.5 rounded-xl border p-3 bg-card">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground block">Local / Endereço:</span>
                  <span className="font-semibold text-foreground truncate">{pedido.address}</span>
                </div>
              </div>
            )}
          </div>

          {pedido.pro_response && (
            <div className="rounded-2xl bg-blue-50/80 border border-blue-200 p-4">
              <p className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 text-blue-600" />
                Resposta e Proposta do Profissional:
              </p>
              <p className="text-sm text-blue-950">{pedido.pro_response}</p>
              {pedido.quoted_value && (
                <div className="mt-2.5 flex items-center gap-2 text-base font-bold text-blue-900">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Valor proposto: R$ {Number(pedido.quoted_value).toFixed(2).replace(".", ",")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline representation */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
            <div
              className={cn(
                "py-1.5 px-2 rounded-xl transition",
                pedido.status === "pendente"
                  ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
                  : "bg-muted text-foreground/80",
              )}
            >
              1. Enviado
            </div>
            <div
              className={cn(
                "py-1.5 px-2 rounded-xl transition",
                pedido.status === "respondido"
                  ? "bg-blue-100 text-blue-800 ring-2 ring-blue-400"
                  : pedido.status === "aceito" || pedido.status === "concluido"
                    ? "bg-primary-soft text-primary-deep font-bold"
                    : "bg-muted text-muted-foreground",
              )}
            >
              2. Proposta
            </div>
            <div
              className={cn(
                "py-1.5 px-2 rounded-xl transition",
                pedido.status === "aceito"
                  ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400 font-bold"
                  : pedido.status === "concluido"
                    ? "bg-primary-soft text-primary-deep"
                    : "bg-muted text-muted-foreground",
              )}
            >
              3. Contratado
            </div>
            <div
              className={cn(
                "py-1.5 px-2 rounded-xl transition",
                pedido.status === "concluido"
                  ? "bg-emerald-500 text-white font-bold ring-2 ring-emerald-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              4. Concluído
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          {pedido.status === "respondido" && (
            <>
              <Button
                size="sm"
                className="rounded-full gap-1.5 bg-primary hover:bg-primary/95 text-white"
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Aceitar proposta e contratar
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
            <>
              <Button
                size="sm"
                className="rounded-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => markComplete.mutate()}
                disabled={markComplete.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Marcar serviço como concluído
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5 text-xs text-muted-foreground"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar contratação
              </Button>
            </>
          )}

          {pedido.status === "concluido" &&
            (existingReview ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary-soft px-3.5 py-1.5 rounded-full">
                <Star className="h-3.5 w-3.5 fill-status-limited text-status-limited" />
                Avaliado ({existingReview.rating}★)
              </span>
            ) : (
              <Button
                size="sm"
                className="rounded-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-sm font-semibold"
                onClick={() => setReviewOpen(true)}
              >
                <Star className="h-3.5 w-3.5 fill-white text-white" />
                Avaliar serviço realizado
              </Button>
            ))}

          {pedido.status === "pendente" && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 ml-auto"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              Cancelar pedido
            </Button>
          )}
        </div>
      </div>

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
  const [filter, setFilter] = useState<"todos" | "pendentes" | "contratados" | "concluidos">("todos");
  const [localPedidos, setLocalPedidos] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cd_recent_pedidos") || "[]");
    } catch {
      return [];
    }
  });

  const { data: remotePedidos, isLoading } = useQuery({
    ...clientQuotesQuery(user?.id ?? ""),
    enabled: !!user,
  });

  // Merge remote and local orders
  const allPedidos = useMemo(() => {
    const list = [...(remotePedidos || [])];
    const remoteIds = new Set(list.map((p) => p.id));
    for (const lp of localPedidos) {
      if (!remoteIds.has(lp.id)) {
        list.push(lp);
      }
    }
    return list;
  }, [remotePedidos, localPedidos]);

  function handleStatusChange(id: string, newStatus: string) {
    setLocalPedidos((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p));
      localStorage.setItem("cd_recent_pedidos", JSON.stringify(updated));
      return updated;
    });
  }

  const filteredPedidos = useMemo(() => {
    if (filter === "pendentes") {
      return allPedidos.filter((p) => p.status === "pendente" || p.status === "respondido");
    }
    if (filter === "contratados") {
      return allPedidos.filter((p) => p.status === "aceito");
    }
    if (filter === "concluidos") {
      return allPedidos.filter((p) => p.status === "concluido");
    }
    return allPedidos;
  }, [allPedidos, filter]);

  if (loading || (isLoading && !localPedidos.length)) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Page title and subtitle */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">
                Serviços Contratados & Pedidos
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Acompanhe o que você solicitou, detalhes do contrato e status de execução.
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          {allPedidos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              <button
                onClick={() => setFilter("todos")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer",
                  filter === "todos"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                Todos ({allPedidos.length})
              </button>
              <button
                onClick={() => setFilter("pendentes")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer",
                  filter === "pendentes"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                Aguardando / Proposta (
                {
                  allPedidos.filter((p) => p.status === "pendente" || p.status === "respondido")
                    .length
                }
                )
              </button>
              <button
                onClick={() => setFilter("contratados")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer",
                  filter === "contratados"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                Contratados em Andamento ({allPedidos.filter((p) => p.status === "aceito").length})
              </button>
              <button
                onClick={() => setFilter("concluidos")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer",
                  filter === "concluidos"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                Concluídos ({allPedidos.filter((p) => p.status === "concluido").length})
              </button>
            </div>
          )}
        </div>

        {/* Empty state */}
        {allPedidos.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
              <ClipboardList className="h-8 w-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="font-display text-xl font-bold">Nenhum serviço contratado ainda</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Você ainda não solicitou nenhum orçamento. Encontre o profissional ideal para sua
                casa e envie um pedido gratuito em poucos cliques!
              </p>
            </div>
            <div className="pt-2">
              <Button asChild className="rounded-full gap-2 px-6 h-11">
                <Link to="/buscar">
                  Buscar profissionais <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPedidos.map((pedido) => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                user={user}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
