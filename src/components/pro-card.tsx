import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin } from "lucide-react";
import type { ProRow } from "@/lib/queries";
import { formatPrice } from "@/lib/format";
import { AvailabilityBadge, Avatar, Rating } from "./brand";

export function ProCard({ pro }: { pro: ProRow }) {
  return (
    <Link
      to="/profissional/$slug"
      params={{ slug: pro.slug }}
      className="group flex gap-4 rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary"
    >
      <Avatar src={pro.avatar_url} name={pro.name} className="h-20 w-20 shrink-0 text-xl" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-lg font-semibold">{pro.business_name || pro.name}</h3>
          {pro.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verificado" />}
        </div>
        <p className="text-sm text-muted-foreground">{pro.categories?.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Rating avg={pro.avg} count={pro.count} />
          <AvailabilityBadge status={pro.availability} />
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {pro.regions.slice(0, 2).join(", ") || pro.city}
        </p>
        <p className="text-sm font-semibold text-primary">{formatPrice(pro.price_type, pro.price_value)}</p>
      </div>
    </Link>
  );
}
