import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Phone,
  Instagram,
  Star,
  MapPin,
  BadgeCheck,
  Heart,
  Share2,
  ChevronLeft,
  ImageIcon,
  ThumbsUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvailabilityBadge, Avatar, Rating, Stars } from "@/components/brand";
import { QuoteModal } from "@/components/quote-modal";
import { Button } from "@/components/ui/button";
import { proQuery, favoritesQuery, toggleFavorite } from "@/lib/queries";
import { formatPrice, cleanWhatsAppUrl } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profissional/$slug")({
  head: () => ({
    meta: [
      { title: "Profissional · Casa Diária" },
      { name: "description", content: "Perfil completo de profissional na Casa Diária — portfólio, avaliações reais e orçamento pelo WhatsApp." },
      { property: "og:title", content: "Profissional · Casa Diária" },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery(proQuery(slug));
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: favSet } = useQuery({
    ...favoritesQuery(user?.id ?? ""),
    enabled: !!user,
  });

  const navigate = useNavigate();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const pro = data?.pro;
  const isFav = favSet?.has(pro?.id ?? "") ?? false;

  async function handleFav() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!pro) return;
    setToggling(true);
    await toggleFavorite(user.id, pro.id, isFav).catch(console.error);
    qc.invalidateQueries({ queryKey: ["favorites"] });
    qc.invalidateQueries({ queryKey: ["favorite-pros"] });
    setToggling(false);
  }

  function handleWhatsApp() {
    if (!pro?.whatsapp) return;
    const msg = `Olá, vi seu perfil no Casa Diária e gostaria de um orçamento! 🏠`;
    const url = cleanWhatsAppUrl(pro.whatsapp, msg);
    if (url) window.open(url, "_blank");
  }

  if (isLoading)
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      </AppShell>
    );

  if (!pro)
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-semibold">Profissional não encontrado</h1>
          <Button asChild variant="outline" className="mt-6 rounded-full">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </AppShell>
    );

  const stats = data!;
  const avgRating =
    stats.reviews.length > 0
      ? stats.reviews.reduce((a, r) => a + r.rating, 0) / stats.reviews.length
      : 0;

  return (
    <AppShell>
      {/* Back */}
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <Link
          to="/buscar"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-16 space-y-6">
        {/* Header card */}
        <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-start gap-4">
            <Avatar src={pro.avatar_url} name={pro.name} className="h-24 w-24 shrink-0 text-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-semibold leading-tight">
                  {pro.business_name || pro.name}
                </h1>
                {pro.verified && (
                  <BadgeCheck className="h-5 w-5 text-primary shrink-0" aria-label="Verificado" />
                )}
              </div>
              <p className="text-muted-foreground">{pro.categories?.name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <AvailabilityBadge status={pro.availability} />
                <Rating avg={avgRating} count={stats.reviews.length} />
              </div>
              {pro.city && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {pro.regions.slice(0, 3).join(", ") || pro.city}
                </p>
              )}
            </div>
            {/* Actions top right */}
            <div className="flex gap-2 shrink-0">
              <button
                id="btn-favorite"
                onClick={handleFav}
                disabled={toggling}
                aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-110",
                  isFav ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
              </button>
            </div>
          </div>

          {/* Price */}
          <p className="text-lg font-semibold text-primary">
            {formatPrice(pro.price_type, pro.price_value)}
          </p>
          {pro.price_notes && (
            <p className="text-sm text-muted-foreground">{pro.price_notes}</p>
          )}

          {/* Specialties */}
          {pro.specialties.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pro.specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-deep"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {pro.bio && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {pro.bio}
            </p>
          )}

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              id="btn-orcamento"
              onClick={() => setQuoteOpen(true)}
              className="flex-1 rounded-full gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Pedir orçamento
            </Button>
            {pro.whatsapp && (
              <Button
                id="btn-whatsapp"
                onClick={handleWhatsApp}
                variant="outline"
                className="flex-1 rounded-full gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
              >
                <Phone className="h-4 w-4" />
                WhatsApp
              </Button>
            )}
            {pro.instagram && (
              <Button
                asChild
                variant="outline"
                className="rounded-full gap-2 border-muted"
              >
                <a
                  href={`https://instagram.com/${pro.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Portfolio */}
        {stats.portfolio.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" /> Portfólio
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.portfolio.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setLightbox(item.image_url)}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-muted"
                >
                  <img
                    src={item.image_url}
                    alt={item.caption ?? "Foto do trabalho"}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  {item.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <p className="text-xs text-white line-clamp-2">{item.caption}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        {stats.reviews.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 fill-status-limited text-status-limited" /> Avaliações
              <span className="ml-auto text-base font-normal text-muted-foreground">
                {avgRating.toFixed(1)} de {stats.reviews.length}{" "}
                {stats.reviews.length === 1 ? "avaliação" : "avaliações"}
              </span>
            </h2>
            <div className="space-y-3">
              {stats.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{rev.reviewer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Stars value={rev.rating} />
                  </div>
                  {rev.comment && (
                    <p className="text-sm text-foreground/80 whitespace-pre-line">{rev.comment}</p>
                  )}
                  {/* Sub-ratings */}
                  {(rev.quality || rev.punctuality || rev.price_transparency) && (
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {rev.quality && (
                        <span>Qualidade: <strong>{rev.quality}/5</strong></span>
                      )}
                      {rev.punctuality && (
                        <span>Pontualidade: <strong>{rev.punctuality}/5</strong></span>
                      )}
                      {rev.price_transparency && (
                        <span>Preço/Qualidade: <strong>{rev.price_transparency}/5</strong></span>
                      )}
                    </div>
                  )}
                  {rev.would_recommend && (
                    <p className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <ThumbsUp className="h-3 w-3" /> Recomenda
                    </p>
                  )}
                  {/* Pro reply */}
                  {rev.pro_reply && (
                    <div className="ml-4 rounded-2xl bg-primary-soft p-3">
                      <p className="text-xs font-semibold text-primary-deep mb-1">
                        Resposta do profissional
                      </p>
                      <p className="text-sm text-foreground/80">{rev.pro_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* No portfolio / reviews placeholder */}
        {stats.portfolio.length === 0 && stats.reviews.length === 0 && (
          <div className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
            <p className="text-sm">Este profissional ainda não tem portfólio ou avaliações.</p>
            <p className="text-sm mt-1">Seja o primeiro a contratar e avaliar!</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Foto ampliada"
            className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quote modal */}
      {pro && (
        <QuoteModal
          open={quoteOpen}
          onClose={() => setQuoteOpen(false)}
          professionalId={pro.id}
          professionalName={pro.business_name || pro.name}
        />
      )}
    </AppShell>
  );
}
