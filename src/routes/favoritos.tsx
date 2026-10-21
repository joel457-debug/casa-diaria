import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProCard } from "@/components/pro-card";
import { Button } from "@/components/ui/button";
import { favoriteProsQuery, toggleFavorite } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos · Casa Diária" },
      { name: "description", content: "Seus profissionais favoritos na Casa Diária." },
      { property: "og:title", content: "Favoritos · Casa Diária" },
    ],
  }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const { data: pros, isLoading } = useQuery({
    ...favoriteProsQuery(user?.id ?? ""),
    enabled: !!user,
  });

  async function handleRemove(professionalId: string) {
    if (!user) return;
    await toggleFavorite(user.id, professionalId, true).catch(console.error);
    qc.invalidateQueries({ queryKey: ["favorites"] });
    qc.invalidateQueries({ queryKey: ["favorite-pros"] });
  }

  if (loading || isLoading)
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-semibold flex items-center gap-2">
          <Heart className="h-7 w-7 text-primary" /> Favoritos
        </h1>

        {!user ? (
          <div className="rounded-3xl border bg-card p-8 text-center space-y-4">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Entre para ver seus favoritos.</p>
            <Button asChild className="rounded-full">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        ) : pros?.length === 0 ? (
          <div className="rounded-3xl border bg-card p-8 text-center space-y-4">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <div>
              <h2 className="font-display text-xl font-semibold">Nenhum favorito ainda</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Explore profissionais e salve seus favoritos com o ❤️.
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link to="/buscar">Buscar profissionais</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {pros?.map((pro) => (
              <div key={pro.id} className="relative group">
                <ProCard pro={pro} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(pro.id);
                  }}
                  aria-label="Remover dos favoritos"
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition hover:bg-destructive/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
