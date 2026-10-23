import { Link } from "@tanstack/react-router";
import { Heart, Home, ClipboardList, Search, User, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "./brand";
import { Button } from "./ui/button";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/buscar", label: "Buscar", icon: Search },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-primary-soft text-primary-deep" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          {user ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full hidden md:inline-flex">
                <Link to="/painel">Painel</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full h-9 w-9 p-0">
                <Link to="/perfil" aria-label="Meu perfil">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary-deep font-semibold text-sm">
                    {(user.user_metadata?.["full_name"] as string | undefined)?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? "U"}
                  </span>
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 hidden border-t py-8 text-center text-sm text-muted-foreground md:block">
        Casa Diária · Gurupi - TO · Precisou? Casa Diária resolve.
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-card md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary" }}
            activeOptions={{ exact: n.to === "/" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
