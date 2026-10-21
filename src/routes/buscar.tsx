import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProCard } from "@/components/pro-card";
import { prosQuery, categoriesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BuscarSearch = {
  categoria?: string;
  q?: string;
  disp?: string;
  nota?: number;
};

export const Route = createFileRoute("/buscar")({
  validateSearch: (search: Record<string, unknown>): BuscarSearch => ({
    categoria: typeof search.categoria === "string" ? search.categoria : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    disp: typeof search.disp === "string" ? search.disp : undefined,
    nota: typeof search.nota === "number" ? search.nota : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Buscar serviços · Casa Diária" },
      { name: "description", content: "Encontre eletricistas, diaristas, jardineiros e mais profissionais em Gurupi-TO com avaliações reais." },
      { property: "og:title", content: "Buscar serviços · Casa Diária" },
    ],
  }),
  component: BuscarPage,
});

const DISP_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "disponivel", label: "🟢 Disponível" },
  { value: "limitada", label: "🟡 Limitada" },
  { value: "indisponivel", label: "🔴 Sem horários" },
] as const;

const NOTA_OPTIONS = [
  { value: 0, label: "Qualquer" },
  { value: 4, label: "4+ ⭐" },
  { value: 4.5, label: "4,5+ ⭐" },
] as const;

function BuscarPage() {
  const searchParams = Route.useSearch();
  const [q, setQ] = useState(searchParams.q ?? "");
  const [categoria, setCategoria] = useState(searchParams.categoria ?? "");
  const [disp, setDisp] = useState(searchParams.disp ?? "");
  const [nota, setNota] = useState(searchParams.nota ?? 0);
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState(searchParams.q ?? "");

  // Sync if URL search changes (e.g. clicking categories from navigation)
  useEffect(() => {
    if (searchParams.categoria !== undefined && searchParams.categoria !== categoria) {
      setCategoria(searchParams.categoria);
    }
    if (searchParams.q !== undefined && searchParams.q !== q) {
      setQ(searchParams.q);
    }
  }, [searchParams.categoria, searchParams.q]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: categories } = useQuery(categoriesQuery);
  const { data: pros, isLoading } = useQuery(
    prosQuery({ q: debouncedQ, categoria, disp, nota: nota || undefined }),
  );

  const hasFilters = Boolean(categoria || disp || nota > 0);

  function clearFilters() {
    setCategoria("");
    setDisp("");
    setNota(0);
    setQ("");
  }

  return (
    <AppShell>
      {/* Search header */}
      <div className="sticky top-16 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="buscar-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar profissional, especialidade…"
              className="pl-10 pr-10 rounded-2xl bg-muted border-0 focus-visible:ring-1"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setCategoria("")}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                categoria === ""
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              Todos
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setCategoria(cat.slug === categoria ? "" : cat.slug)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                  categoria === cat.slug
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Filter toggle row */}
          <div className="flex items-center justify-between">
            <button
              id="toggle-filters"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {hasFilters && (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  {[categoria, disp, nota > 0].filter(Boolean).length}
                </span>
              )}
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-destructive transition flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="grid gap-4 sm:grid-cols-2 pb-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Disponibilidade
                </p>
                <div className="flex flex-wrap gap-2">
                  {DISP_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDisp(opt.value)}
                      className={cn(
                        "rounded-full px-3 py-1 text-sm font-semibold transition border",
                        disp === opt.value
                          ? "border-primary bg-primary-soft text-primary-deep"
                          : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Avaliação mínima
                </p>
                <div className="flex flex-wrap gap-2">
                  {NOTA_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setNota(opt.value)}
                      className={cn(
                        "rounded-full px-3 py-1 text-sm font-semibold transition border",
                        nota === opt.value
                          ? "border-primary bg-primary-soft text-primary-deep"
                          : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-4 text-sm text-muted-foreground">
          {isLoading
            ? "Buscando…"
            : `${pros?.length ?? 0} ${
                (pros?.length ?? 0) === 1 ? "profissional encontrado" : "profissionais encontrados"
              }`}
        </p>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pros?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Search className="h-9 w-9 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold">Nenhum profissional encontrado</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Tente ajustar os filtros ou buscar por outro termo.
            </p>
            {hasFilters && (
              <Button onClick={clearFilters} variant="outline" className="mt-4 rounded-full">
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pros?.map((p) => <ProCard key={p.id} pro={p} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}
