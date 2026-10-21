import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { availabilityLabel, type Availability } from "@/lib/format";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <path d="M16 2 3 13v15a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V13L16 2Z" className="fill-primary" />
        <path d="M16 10a5 5 0 0 0-5 5c0 4 5 9 5 9s5-5 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" className="fill-accent" />
      </svg>
      <span className="font-display text-xl font-semibold lowercase text-primary-deep">casa diária</span>
    </Link>
  );
}

const dotColor: Record<Availability, string> = {
  disponivel: "bg-status-available",
  limitada: "bg-status-limited",
  indisponivel: "bg-status-busy",
};

export function AvailabilityBadge({ status }: { status: Availability }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
      <span className={cn("h-2 w-2 rounded-full", dotColor[status])} />
      {availabilityLabel[status]}
    </span>
  );
}

export function AvailabilityDot({ status, className }: { status: Availability; className?: string }) {
  return <span className={cn("inline-block h-3 w-3 rounded-full", dotColor[status], className)} />;
}

export function Rating({ avg, count }: { avg: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="h-4 w-4 fill-status-limited text-status-limited" />
      <strong>{count ? avg.toFixed(1) : "Novo"}</strong>
      {count > 0 && <span className="text-muted-foreground">({count})</span>}
    </span>
  );
}

export function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} estrelas`}
        >
          <Star className={cn("h-5 w-5", n <= value ? "fill-status-limited text-status-limited" : "text-border")} />
        </button>
      ))}
    </div>
  );
}

export function Avatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  if (src) return <img src={src} alt={name || "Avatar"} className={cn("rounded-2xl object-cover", className)} />;
  const safeName = (name ?? "").trim() || "U";
  const initials = safeName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={cn("flex items-center justify-center rounded-2xl bg-primary-soft font-display font-semibold text-primary-deep", className)}>
      {initials || "U"}
    </div>
  );
}

