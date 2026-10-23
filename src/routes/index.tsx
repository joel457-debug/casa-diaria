import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, Star, Users, CheckCircle, Briefcase } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProCard } from "@/components/pro-card";
import { prosQuery, categoriesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";
import catEletrica from "@/assets/cat_eletrica.jpg";
import catHidraulica from "@/assets/cat_hidraulica.jpg";
import catJardinagem from "@/assets/cat_jardinagem.jpg";
import catLimpeza from "@/assets/cat_limpeza.jpg";
import catPintura from "@/assets/cat_pintura.jpg";
import catMoveis from "@/assets/cat_moveis.jpg";

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

const DB_SETUP_ERROR_CODE = "PGRST205";

function DbSetupBanner() {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-center gap-3 text-sm">
      <span className="text-2xl">⚠️</span>
      <div className="text-center sm:text-left">
        <span className="font-bold text-amber-800">Banco de dados não configurado. </span>
        <span className="text-amber-700">
          Execute o arquivo{" "}
          <code className="bg-amber-100 rounded px-1 font-mono text-xs">supabase/schema.sql</code>
          {" "}no{" "}
          <a
            href="https://supabase.com/dashboard/project/wnjevjbzgqiqtootttfo/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold text-amber-900 hover:text-amber-700"
          >
            SQL Editor do Supabase
          </a>
          {" "}para ativar o site.
        </span>
      </div>
    </div>
  );
}

function Index() {
  const { data: pros, error: prosError } = useQuery(prosQuery({}));
  const { data: categories, error: catError } = useQuery(categoriesQuery);

  // Detecta se o banco ainda não foi configurado (tabelas não existem)
  const dbNotSetup =
    (prosError as any)?.code === DB_SETUP_ERROR_CODE ||
    (catError as any)?.code === DB_SETUP_ERROR_CODE;

  // Destaque: top 4 profissionais disponíveis
  const featured = pros?.filter((p) => p.availability === "disponivel").slice(0, 4);

  return (
    <AppShell>
      {dbNotSetup && <DbSetupBanner />}
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
                className="rounded-full bg-white/20 hover:bg-white text-white hover:text-primary-deep border-2 border-white/80 hover:border-white font-bold backdrop-blur-md shadow-md hover:shadow-xl transition-all duration-200 px-6 gap-2"
              >
                <Link to="/painel" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span>Sou profissional</span>
                </Link>
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
      {categories && categories.length > 0 && (() => {
        // Map slugs to imported photos (fallback to gradient color if no photo)
        const photos: Record<string, string> = {
          eletrica:   catEletrica,
          hidraulica: catHidraulica,
          jardinagem: catJardinagem,
          limpeza:    catLimpeza,
          pintura:    catPintura,
          moveis:     catMoveis,
        };
        // Fallback accent colors for categories without photos
        const accentColor: Record<string, string> = {
          "faz-tudo": "bg-teal-700",
          outro:      "bg-slate-600",
        };

        return (
          <section className="mx-auto max-w-6xl px-4 py-12">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Categorias</p>
                <h2 className="text-3xl font-bold">O que você precisa?</h2>
              </div>
              <Link
                to="/buscar"
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {categories.map((cat) => {
                const photo = photos[cat.slug];
                const accent = accentColor[cat.slug] ?? "bg-primary";
                return (
                  <Link
                    key={cat.slug}
                    to="/buscar"
                    search={{ categoria: cat.slug } as any}
                    className="group relative overflow-hidden rounded-3xl shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    style={{ minHeight: "180px" }}
                  >
                    {/* Background: photo or solid color */}
                    {photo ? (
                      <img
                        src={photo}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className={`absolute inset-0 ${accent}`} />
                    )}

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />

                    {/* Content */}
                    <div className="relative flex h-full flex-col justify-end p-4" style={{ minHeight: "180px" }}>
                      {/* Name + CTA at bottom */}
                      <div>
                        <p className="font-bold text-white text-base leading-tight drop-shadow">{cat.name}</p>
                        <p className="mt-0.5 text-xs text-white/80 flex items-center gap-1">
                          Ver profissionais
                          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}


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

        {!pros && !prosError ? (
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
            <Link to="/painel">Criar meu perfil</Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
