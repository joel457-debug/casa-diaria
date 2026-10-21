import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, Star, Users, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProCard } from "@/components/pro-card";
import { prosQuery, categoriesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Casa Diária · Serviços locais em Gurupi" },
      { name: "description", content: "Encontre eletricistas, jardineiros, faz-tudo e mais profissionais avaliados em Gurupi - TO." },
      { property: "og:title", content: "Casa Diária · Serviços locais em Gurupi" },
      { property: "og:description", content: "Profissionais locais avaliados, com disponibilidade e WhatsApp." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: pros } = useQuery(prosQuery({}));
  const { data: categories } = useQuery(categoriesQuery);

  // Destaque: top 4 profissionais disponíveis
  const featured = pros?.filter((p) => p.availability === "disponivel").slice(0, 4);

  return (
    <AppShell>
      {/* Hero */}
      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2">
          <div className="text-primary-foreground">
            <h1 className="text-4xl font-semibold md:text-5xl leading-tight">
              Precisou? <br className="hidden md:block" />
              Casa Diária resolve.
            </h1>
            <p className="mt-3 opacity-90 text-lg">
              Profissionais verificados em Gurupi&nbsp;- TO, com avaliações reais e WhatsApp.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-primary-deep hover:bg-white/90 gap-2 shadow-lg"
              >
                <Link to="/buscar">
                  <Search className="h-4 w-4" /> Buscar profissionais
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 text-white hover:bg-white/10 gap-2"
              >
                <Link to="/auth">Sou profissional</Link>
              </Button>
            </div>
          </div>
          <img
            src={hero}
            alt="Profissional instalando prateleira"
            width={1600}
            height={1008}
            className="rounded-3xl shadow-2xl"
          />
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
            {[
              { icon: <Users className="h-4 w-4 text-primary" />, label: `${pros?.length ?? "…"} profissionais` },
              { icon: <CheckCircle className="h-4 w-4 text-primary" />, label: `${pros?.filter((p) => p.verified).length ?? "…"} verificados` },
              { icon: <Star className="h-4 w-4 text-status-limited fill-status-limited" />, label: "Avaliações reais" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 font-semibold text-foreground/80">
                {s.icon}
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">O que você precisa?</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to="/buscar"
                search={{ categoria: cat.slug } as any}
                className="group flex flex-col items-center gap-2 rounded-3xl border bg-card p-4 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-sm font-semibold group-hover:text-primary transition">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured professionals */}
      <section className="mx-auto max-w-6xl px-4 py-2 pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Profissionais disponíveis</h2>
          <Button asChild variant="ghost" className="rounded-full gap-1.5 text-primary hover:text-primary">
            <Link to="/buscar">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {!pros ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : featured?.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center text-muted-foreground">
            <p>Nenhum profissional disponível no momento.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {featured?.map((p) => <ProCard key={p.id} pro={p} />)}
          </div>
        )}

        {/* CTA for professionals */}
        <div className="mt-10 rounded-3xl bg-hero p-8 text-center text-primary-foreground">
          <h2 className="font-display text-2xl font-semibold">
            É profissional? Divulgue seu trabalho!
          </h2>
          <p className="mt-2 opacity-90">
            Crie sua vitrine gratuita e receba pedidos de orçamento de clientes em Gurupi-TO.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-5 rounded-full bg-white text-primary-deep hover:bg-white/90 shadow-lg"
          >
            <Link to="/auth">Criar meu perfil</Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
