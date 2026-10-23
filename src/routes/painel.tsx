import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LayoutDashboard,
  ClipboardList,
  ImageIcon,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  CircleDot,
  MessageSquare,
  Upload,
  Trash2,
  Save,
  Plus,
  Eye,
  EyeOff,
  Phone,
  Instagram,
  Star,
  Camera,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, Rating, Stars } from "@/components/brand";
import {
  myProQuery,
  myPortfolioQuery,
  proQuotesQuery,
  proStatsQuery,
  proReviewsQuery,
  replyToReview,
  respondToQuote,
  updateQuoteStatus,
  updateProfessional,
  addPortfolioItem,
  deletePortfolioItem,
  uploadMedia,
  categoriesQuery,
  createProfessionalProfile,
} from "@/lib/queries";
import { requestStatusLabel } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel do profissional · Casa Diária" },
      { name: "description", content: "Gerencie seu perfil, portfólio e pedidos no Casa Diária." },
      { property: "og:title", content: "Painel do profissional · Casa Diária" },
    ],
  }),
  component: PainelPage,
});

// ── Status helpers ──────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  pendente: "text-amber-700",
  respondido: "text-blue-700",
  aceito: "text-primary-deep",
  concluido: "text-primary-deep",
  cancelado: "text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-xs font-semibold", statusColor[status] ?? "")}>
      {requestStatusLabel[status] ?? status}
    </span>
  );
}

// ── Pedidos tab ─────────────────────────────────────────────────────────────

function ProPedidosTab({ professionalId }: { professionalId: string }) {
  const qc = useQueryClient();
  const { data: pedidos, isLoading } = useQuery(proQuotesQuery(professionalId));
  const [responding, setResponding] = useState<string | null>(null);
  const [respText, setRespText] = useState("");
  const [respValue, setRespValue] = useState("");

  async function sendResponse(id: string) {
    try {
      await respondToQuote(id, respText, respValue ? Number(respValue) : null);
      qc.invalidateQueries({ queryKey: ["pro-quotes"] });
      setResponding(null);
      setRespText("");
      setRespValue("");
    } catch (err) {
      console.error(err);
    }
  }

  if (isLoading)
    return <div className="h-24 rounded-3xl bg-muted animate-pulse" />;

  if (!pedidos?.length)
    return (
      <div className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
        <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p>Nenhum pedido recebido ainda.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {pedidos.map((p) => (
        <div key={p.id} className="rounded-3xl border bg-card shadow-[var(--shadow-card)] p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{p.client_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <StatusBadge status={p.status} />
          </div>
          <p className="text-sm">{p.description}</p>
          {p.address && <p className="text-xs text-muted-foreground">📍 {p.address}</p>}
          {p.preferred_date && (
            <p className="text-xs text-muted-foreground">
              📅 {new Date(p.preferred_date + "T00:00:00").toLocaleDateString("pt-BR")}
            </p>
          )}

          {/* Already responded */}
          {p.pro_response && (
            <div className="rounded-2xl bg-primary-soft p-3 text-sm">
              <strong className="text-primary-deep">Sua resposta:</strong> {p.pro_response}
              {p.quoted_value && (
                <span className="ml-2 font-semibold text-primary">
                  R$ {Number(p.quoted_value).toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>
          )}

          {/* Response form */}
          {responding === p.id ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={respText}
                onChange={(e) => setRespText(e.target.value)}
                placeholder="Escreva sua resposta ao cliente…"
                className="rounded-2xl text-sm"
                rows={3}
              />
              <Input
                type="number"
                value={respValue}
                onChange={(e) => setRespValue(e.target.value)}
                placeholder="Valor do orçamento (R$) — opcional"
                className="rounded-2xl text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => sendResponse(p.id)}
                  disabled={!respText.trim()}
                >
                  Enviar resposta
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setResponding(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {p.status === "pendente" && (
                <Button
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={() => setResponding(p.id)}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Responder
                </Button>
              )}
              {p.status === "aceito" && (
                <Button
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={async () => {
                    await updateQuoteStatus(p.id, "concluido");
                    qc.invalidateQueries({ queryKey: ["pro-quotes"] });
                  }}
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Marcar como concluído
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Portfolio tab ───────────────────────────────────────────────────────────

function PortfolioTab({ professionalId, userId }: { professionalId: string; userId: string }) {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery(myPortfolioQuery(professionalId));
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(userId, file);
      await addPortfolioItem(professionalId, url, caption);
      qc.invalidateQueries({ queryKey: ["my-portfolio"] });
      setCaption("");
      e.target.value = "";
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    await deletePortfolioItem(id).catch(console.error);
    qc.invalidateQueries({ queryKey: ["my-portfolio"] });
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-3xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Adicionar foto</h3>
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Legenda (opcional)"
          className="rounded-2xl"
        />
        <label
          htmlFor="portfolio-upload"
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-sm font-semibold transition",
            uploading
              ? "border-primary bg-primary-soft text-primary-deep"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary",
          )}
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              Enviando…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Selecionar imagem
            </>
          )}
          <input
            id="portfolio-upload"
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items?.length === 0 ? (
        <div className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Nenhuma foto no portfólio ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items?.map((item) => (
            <div key={item.id} className="group relative aspect-square">
              <img
                src={item.image_url}
                alt={item.caption ?? ""}
                className="h-full w-full rounded-2xl object-cover"
              />
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white line-clamp-2">{item.caption}</p>
                </div>
              )}
              <button
                onClick={() => handleDelete(item.id)}
                aria-label="Excluir foto"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings tab ────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  business_name: z.string().optional(),
  bio: z.string().max(3000).optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  price_type: z.enum(["fixo", "inicial", "hora", "diaria", "consulta"]),
  price_value: z.preprocess(
    (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v)),
    z.number().nullable().optional(),
  ),
  price_notes: z.string().optional(),
  availability: z.enum(["disponivel", "limitada", "indisponivel"]),
  published: z.boolean(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

function SettingsTab({ pro }: { pro: any }) {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema) as any,
    values: {
      business_name: pro.business_name ?? "",
      bio: pro.bio ?? "",
      whatsapp: pro.whatsapp ?? "",
      instagram: pro.instagram ?? "",
      price_type: pro.price_type ?? "consulta",
      price_value: pro.price_value ?? undefined,
      price_notes: pro.price_notes ?? "",
      availability: pro.availability ?? "disponivel",
      published: pro.published ?? true,
    },
  });

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pro) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadMedia(pro.user_id || pro.id, file);
      await updateProfessional(pro.id, { avatar_url: url });
      qc.invalidateQueries({ queryKey: ["my-pro"] });
      qc.invalidateQueries({ queryKey: ["pros"] });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSubmit(values: SettingsValues) {
    await updateProfessional(pro.id, values as any);
    qc.invalidateQueries({ queryKey: ["my-pro"] });
    qc.invalidateQueries({ queryKey: ["pros"] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
        <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
          <h3 className="font-semibold">Identidade</h3>

          <FormField
            control={form.control as any}
            name="business_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do negócio (opcional)</FormLabel>
                <FormControl>
                  <Input className="rounded-2xl" placeholder="Ex: Elétrica Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio / Apresentação</FormLabel>
                <FormControl>
                  <Textarea
                    className="rounded-2xl"
                    rows={4}
                    placeholder="Conte sobre seus serviços, experiência e diferenciais…"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
          <h3 className="font-semibold">Contato</h3>
          <FormField
            control={form.control as any}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> WhatsApp
                </FormLabel>
                <FormControl>
                  <Input className="rounded-2xl" placeholder="(63) 99999-9999" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5" /> Instagram
                </FormLabel>
                <FormControl>
                  <Input className="rounded-2xl" placeholder="@usuario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
          <h3 className="font-semibold">Preço e disponibilidade</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="price_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de preço</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixo">Valor fixo</SelectItem>
                      <SelectItem value="inicial">A partir de…</SelectItem>
                      <SelectItem value="hora">Por hora</SelectItem>
                      <SelectItem value="diaria">Por diária</SelectItem>
                      <SelectItem value="consulta">Sob consulta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="price_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      className="rounded-2xl"
                      placeholder="0,00"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control as any}
            name="price_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observação de preço</FormLabel>
                <FormControl>
                  <Input className="rounded-2xl" placeholder="Ex: inclui mão de obra" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disponibilidade</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="disponivel">🟢 Disponível</SelectItem>
                    <SelectItem value="limitada">🟡 Agenda limitada</SelectItem>
                    <SelectItem value="indisponivel">🔴 Sem horários</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="published"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    id="toggle-published"
                    role="switch"
                    aria-checked={field.value}
                    onClick={() => field.onChange(!field.value)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition",
                      field.value ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full bg-white shadow transition",
                        field.value ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                  <FormLabel className="cursor-pointer">
                    {field.value ? (
                      <span className="flex items-center gap-1.5 text-primary-deep">
                        <Eye className="h-4 w-4" /> Perfil publicado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <EyeOff className="h-4 w-4" /> Perfil oculto
                      </span>
                    )}
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          id="painel-save"
          className="w-full rounded-full gap-2"
          disabled={form.formState.isSubmitting}
        >
          {saved ? "✓ Salvo!" : form.formState.isSubmitting ? "Salvando…" : (
            <><Save className="h-4 w-4" /> Salvar alterações</>
          )}
        </Button>
      </form>
    </Form>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({ pro, pendingCount, avgRating, reviewCount }: {
  pro: any; pendingCount: number; avgRating: number; reviewCount: number;
}) {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Pedidos pendentes", value: pendingCount, icon: <Clock className="h-5 w-5" /> },
          { label: "Avaliação média", value: avgRating ? avgRating.toFixed(1) + " ★" : "—", icon: <Star className="h-5 w-5" /> },
          { label: "Total de avaliações", value: reviewCount, icon: <MessageSquare className="h-5 w-5" /> },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] text-center"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
              {stat.icon}
            </div>
            <p className="font-display text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Profile preview link */}
      <div className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] flex items-center justify-between">
        <div>
          <p className="font-semibold">Ver meu perfil público</p>
          <p className="text-sm text-muted-foreground">Como os clientes te veem</p>
        </div>
        <Button asChild variant="outline" className="rounded-full" size="sm">
          <Link to="/profissional/$slug" params={{ slug: pro.slug }}>
            Visualizar
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ── Reviews tab ─────────────────────────────────────────────────────────────

function ProReviewsTab({ professionalId }: { professionalId: string }) {
  const qc = useQueryClient();
  const { data: reviews, isLoading } = useQuery(proReviewsQuery(professionalId));
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSendReply(reviewId: string) {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await replyToReview(reviewId, replyText.trim());
      qc.invalidateQueries({ queryKey: ["pro-reviews", professionalId] });
      setReplyingId(null);
      setReplyText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <div className="h-24 rounded-3xl bg-muted animate-pulse" />;

  if (!reviews?.length) {
    return (
      <div className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
        <Star className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p>Você ainda não recebeu avaliações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((rev) => (
        <div key={rev.id} className="rounded-3xl border bg-card shadow-[var(--shadow-card)] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{rev.reviewer_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(rev.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Stars value={rev.rating} />
          </div>
          {rev.comment && <p className="text-sm text-foreground/80">{rev.comment}</p>}
          {rev.pro_reply ? (
            <div className="rounded-2xl bg-primary-soft p-3 text-sm">
              <strong className="text-primary-deep text-xs block mb-0.5">Sua resposta:</strong>
              {rev.pro_reply}
            </div>
          ) : replyingId === rev.id ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escreva sua resposta para o cliente…"
                rows={2}
                className="rounded-2xl text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleSendReply(rev.id)}
                  disabled={submitting || !replyText.trim()}
                >
                  {submitting ? "Enviando…" : "Publicar resposta"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    setReplyingId(null);
                    setReplyText("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs gap-1.5"
              onClick={() => {
                setReplyingId(rev.id);
                setReplyText("");
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Responder avaliação
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function RegisterProProfile({ user }: { user: any }) {
  const qc = useQueryClient();
  const { data: categories } = useQuery(categoriesQuery);
  const [name, setName] = useState(
    (user.user_metadata?.["full_name"] as string | undefined) || ""
  );
  const [businessName, setBusinessName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Por favor, informe seu nome.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createProfessionalProfile({
        user_id: user.id,
        name: name.trim(),
        business_name: businessName.trim() || undefined,
        category_id: categoryId || undefined,
        whatsapp: whatsapp.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ["my-pro"] });
      qc.invalidateQueries({ queryKey: ["pros"] });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao cadastrar perfil profissional.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
      <div className="text-center space-y-2 max-w-md mx-auto">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <LayoutDashboard className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl font-bold">Ative seu perfil profissional</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Preencha seus dados de atendimento para começar a receber pedidos de orçamento e aparecer para clientes na Casa Diária.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
        <div>
          <label className="text-xs font-semibold block mb-1.5">
            Seu Nome Completo <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Carlos Silva"
            className="rounded-2xl"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">
            Nome do Negócio / Nome Fantasia (opcional)
          </label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex: Carlos Faz Tudo"
            className="rounded-2xl"
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">
            Categoria Principal de Atuação
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-11 px-3 rounded-2xl border bg-background text-sm"
          >
            <option value="">Selecione uma categoria...</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">
            WhatsApp para Contato
          </label>
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(63) 99999-9999"
            className="rounded-2xl"
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">
            Apresentação dos seus serviços (opcional)
          </label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Conte um pouco sobre suas especialidades, experiência e diferenciais…"
            className="rounded-2xl resize-none"
            rows={3}
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-full h-11 font-semibold text-white shadow-md bg-primary hover:bg-primary/95"
        >
          {loading ? "Cadastrando…" : "Concluir cadastro e ativar painel"}
        </Button>
      </form>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

function PainelPage() {
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const [uploadingHeaderAvatar, setUploadingHeaderAvatar] = useState(false);

  const { data: pro, isLoading: proLoading } = useQuery({
    ...myProQuery(user?.id ?? ""),
    enabled: !!user,
  });
  const { data: pedidos } = useQuery({
    ...proQuotesQuery(pro?.id ?? ""),
    enabled: !!pro?.id,
  });
  const { data: stats } = useQuery({
    ...proStatsQuery(pro?.id ?? ""),
    enabled: !!pro?.id,
  });

  const pendingCount = pedidos?.filter((p) => p.status === "pendente").length ?? 0;
  const avgRating = stats?.avg ?? 0;
  const reviewCount = stats?.count ?? 0;

  async function handleHeaderAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pro) return;
    setUploadingHeaderAvatar(true);
    try {
      const url = await uploadMedia(pro.user_id || pro.id, file);
      await updateProfessional(pro.id, { avatar_url: url });
      qc.invalidateQueries({ queryKey: ["my-pro"] });
      qc.invalidateQueries({ queryKey: ["pros"] });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingHeaderAvatar(false);
    }
  }

  if (loading || proLoading)
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
        <div className="mb-6 flex items-center gap-4">
          {pro && (
            <div className="relative shrink-0">
              <Avatar src={pro.avatar_url} name={pro.name} className="h-16 w-16 text-lg" />
              <label
                htmlFor="pro-avatar-input"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition"
                aria-label="Mudar foto do perfil profissional"
              >
                {uploadingHeaderAvatar ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
                <input
                  id="pro-avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeaderAvatarChange}
                />
              </label>
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              Painel do profissional
            </h1>
            <p className="text-sm text-muted-foreground">
              {pro?.business_name || pro?.name || user?.email}
            </p>
          </div>
        </div>

        {!user ? (
          <div className="rounded-3xl border bg-card p-8 text-center space-y-4">
            <LayoutDashboard className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="font-display text-xl font-semibold">Painel do Profissional</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Entre ou crie sua conta para acessar seu painel e receber solicitações de clientes em Gurupi-TO.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild className="rounded-full px-6 w-full sm:w-auto">
                <Link to="/auth" search={{ redirect: "/painel", tab: "signup" }}>
                  Criar conta de profissional
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6 w-full sm:w-auto">
                <Link to="/auth" search={{ redirect: "/painel", tab: "login" }}>
                  Já tenho conta (Entrar)
                </Link>
              </Button>
            </div>
          </div>
        ) : !pro ? (
          <RegisterProProfile user={user} />
        ) : (
          <Tabs defaultValue="overview" id="painel-tabs">
            <TabsList className="w-full rounded-2xl mb-6 grid grid-cols-5">
              <TabsTrigger value="overview" className="rounded-xl text-xs" id="tab-overview">
                <LayoutDashboard className="h-4 w-4 mr-1 hidden sm:block" /> Visão geral
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="rounded-xl text-xs relative" id="tab-pedidos">
                <ClipboardList className="h-4 w-4 mr-1 hidden sm:block" /> Pedidos
                {pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="rounded-xl text-xs" id="tab-portfolio">
                <ImageIcon className="h-4 w-4 mr-1 hidden sm:block" /> Portfólio
              </TabsTrigger>
              <TabsTrigger value="avaliacoes" className="rounded-xl text-xs" id="tab-avaliacoes">
                <Star className="h-4 w-4 mr-1 hidden sm:block" /> Avaliações
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl text-xs" id="tab-settings">
                <Settings className="h-4 w-4 mr-1 hidden sm:block" /> Config.
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab
                pro={pro}
                pendingCount={pendingCount}
                avgRating={avgRating}
                reviewCount={reviewCount}
              />
            </TabsContent>
            <TabsContent value="pedidos">
              <ProPedidosTab professionalId={pro.id} />
            </TabsContent>
            <TabsContent value="portfolio">
              <PortfolioTab professionalId={pro.id} userId={user.id} />
            </TabsContent>
            <TabsContent value="avaliacoes">
              <ProReviewsTab professionalId={pro.id} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab pro={pro} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
