import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export type ProFilters = {
  q?: string | undefined;
  categoria?: string | undefined;
  disp?: string | undefined;
  nota?: number | undefined;
};

const proSelect = "*, categories(name, slug)";

export async function fetchStats() {
  const { data } = await supabase.from("professional_stats").select("*");
  const map = new Map<string, { avg: number; count: number }>();
  (data ?? []).forEach((s) =>
    map.set(s.professional_id!, { avg: Number(s.avg_rating ?? 0), count: s.review_count ?? 0 }),
  );
  return map;
}

export const prosQuery = (f: ProFilters) =>
  queryOptions({
    queryKey: ["pros", f],
    queryFn: async () => {
      let q = supabase.from("professionals").select(proSelect).eq("published", true);
      if (f.disp) q = q.eq("availability", f.disp as "disponivel");
      const [{ data, error }, stats] = await Promise.all([q, fetchStats()]);
      if (error) throw error;
      let rows = (data ?? []).map((p) => ({
        ...p,
        avg: stats.get(p.id)?.avg ?? 0,
        count: stats.get(p.id)?.count ?? 0,
      }));
      if (f.categoria) rows = rows.filter((p) => p.categories?.slug === f.categoria);
      if (f.nota) rows = rows.filter((p) => p.avg >= f.nota!);
      if (f.q) {
        const t = f.q.toLowerCase();
        rows = rows.filter((p) =>
          [p.name, p.business_name, p.bio, p.categories?.name, ...p.specialties, ...p.regions]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(t)),
        );
      }
      const order = { disponivel: 0, limitada: 1, indisponivel: 2 } as const;
      rows.sort((a, b) => order[a.availability] - order[b.availability] || b.avg - a.avg);
      return rows;
    },
  });

export type ProRow = Awaited<
  ReturnType<NonNullable<ReturnType<typeof prosQuery>["queryFn"]>>
>[number];

export const proQuery = (slug: string) =>
  queryOptions({
    queryKey: ["pro", slug],
    queryFn: async () => {
      const { data: pro, error } = await supabase
        .from("professionals")
        .select(proSelect)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!pro) return null;

      // Fetch secondary data — treat each failure as empty to avoid crashing the page
      const [portfolio, reviews, days] = await Promise.all([
        Promise.resolve(
          supabase
            .from("portfolio_items")
            .select("*")
            .eq("professional_id", pro.id)
            .order("created_at", { ascending: false }),
        )
          .then(({ data }) => data ?? [])
          .catch(() => []),
        Promise.resolve(
          supabase
            .from("reviews")
            .select("*")
            .eq("professional_id", pro.id)
            .order("created_at", { ascending: false }),
        )
          .then(({ data }) => data ?? [])
          .catch(() => []),
        Promise.resolve(
          supabase
            .from("availability_days")
            .select("*")
            .eq("professional_id", pro.id)
            .gte("day", new Date().toISOString().slice(0, 10)),
        )
          .then(({ data }) => data ?? [])
          .catch(() => []),
      ]);

      return { pro, portfolio, reviews, days };
    },
  });

export async function uploadMedia(userId: string, file: File) {
  const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2) throw e2;
  return data.signedUrl;
}

// ── Favorites ──────────────────────────────────────────────────────────────

export const favoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("professional_id")
        .eq("user_id", userId);
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.professional_id));
    },
  });

export const favoriteProsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["favorite-pros", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: favs, error: e1 } = await supabase
        .from("favorites")
        .select("professional_id")
        .eq("user_id", userId);
      if (e1) throw e1;
      if (!favs || favs.length === 0) return [];
      const ids = favs.map((f) => f.professional_id);
      const [{ data, error }, stats] = await Promise.all([
        supabase.from("professionals").select(proSelect).in("id", ids).eq("published", true),
        fetchStats(),
      ]);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        avg: stats.get(p.id)?.avg ?? 0,
        count: stats.get(p.id)?.count ?? 0,
      }));
    },
  });

export async function toggleFavorite(userId: string, professionalId: string, isFav: boolean) {
  if (isFav) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("professional_id", professionalId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, professional_id: professionalId });
    if (error) throw error;
  }
}

// ── Quote requests ─────────────────────────────────────────────────────────

export const clientQuotesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["client-quotes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select(
          "*, professionals(name, business_name, slug, avatar_url, whatsapp, categories(name))",
        )
        .eq("client_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const proQuotesQuery = (professionalId: string) =>
  queryOptions({
    queryKey: ["pro-quotes", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .eq("professional_id", professionalId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const conversationRequestsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["conversation-requests", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [clientResult, professionalResult] = await Promise.all([
        supabase
          .from("quote_requests")
          .select("*, professionals(id, user_id, name, business_name, avatar_url)")
          .eq("client_id", userId),
        supabase.from("professionals").select("id").eq("user_id", userId),
      ]);
      if (clientResult.error) throw clientResult.error;
      if (professionalResult.error) throw professionalResult.error;

      const professionalIds = (professionalResult.data ?? []).map((pro) => pro.id);
      const professionalRequests =
        professionalIds.length > 0
          ? await supabase
              .from("quote_requests")
              .select("*, professionals(id, user_id, name, business_name, avatar_url)")
              .in("professional_id", professionalIds)
          : { data: [], error: null };
      if (professionalRequests.error) throw professionalRequests.error;

      const requests = new Map(
        [...(clientResult.data ?? []), ...(professionalRequests.data ?? [])].map((request) => [
          request.id,
          request,
        ]),
      );
      return [...requests.values()].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

export const requestMessagesQuery = (requestId: string) =>
  queryOptions({
    queryKey: ["request-messages", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export async function sendRequestMessage(
  requestId: string,
  senderId: string,
  body: string,
  location?: { latitude: number; longitude: number; accuracyMeters: number | null },
) {
  const { error } = await supabase.from("messages").insert({
    request_id: requestId,
    sender_id: senderId,
    body: body.trim(),
    ...(location
      ? {
          location_latitude: location.latitude,
          location_longitude: location.longitude,
          location_accuracy_meters: location.accuracyMeters,
        }
      : {}),
  });
  if (error) throw error;
}

export async function createQuoteRequest(payload: {
  professional_id: string;
  client_id?: string | null | undefined;
  client_name: string;
  description: string;
  address?: string | undefined;
  preferred_date?: string | undefined;
  client_phone?: string | undefined;
}) {
  const { error } = await supabase.from("quote_requests").insert(payload as any);
  if (error) throw error;
}

export async function respondToQuote(
  id: string,
  pro_response: string,
  quoted_value: number | null,
) {
  const { error } = await supabase
    .from("quote_requests")
    .update({ pro_response, quoted_value, status: "respondido" })
    .eq("id", id);
  if (error) throw error;
}

export async function updateQuoteStatus(id: string, status: "aceito" | "cancelado" | "concluido") {
  const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

// ── User Profile ───────────────────────────────────────────────────────────

export const userProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["user-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export async function upsertUserProfile(profile: {
  id: string;
  full_name?: string | undefined;
  phone?: string | undefined;
  avatar_url?: string | undefined;
}) {
  const { error } = await supabase.from("profiles").upsert(profile as any, { onConflict: "id" });
  if (error) throw error;

  // Also sync avatar_url and name to professionals if the user is a registered professional
  const proUpdates: Record<string, any> = {};
  if (profile.avatar_url) proUpdates["avatar_url"] = profile.avatar_url;
  if (profile.full_name) proUpdates["name"] = profile.full_name;

  if (Object.keys(proUpdates).length > 0) {
    try {
      await supabase
        .from("professionals")
        .update(proUpdates as any)
        .eq("user_id", profile.id);
    } catch {
      // ignore
    }
  }
}

// ── Professional panel & Stats ─────────────────────────────────────────────

export const proStatsQuery = (professionalId: string) =>
  queryOptions({
    queryKey: ["pro-stats", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_stats")
        .select("*")
        .eq("professional_id", professionalId)
        .maybeSingle();
      if (error) throw error;
      return {
        avg: Number(data?.avg_rating ?? 0),
        count: Number(data?.review_count ?? 0),
      };
    },
  });

export const proReviewsQuery = (professionalId: string) =>
  queryOptions({
    queryKey: ["pro-reviews", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("professional_id", professionalId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const myProQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-pro", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select(proSelect)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const myPortfolioQuery = (professionalId: string) =>
  queryOptions({
    queryKey: ["my-portfolio", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("professional_id", professionalId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export async function createProfessionalProfile(payload: {
  user_id: string;
  name: string;
  business_name?: string | undefined;
  category_id?: string | undefined;
  whatsapp?: string | undefined;
  city?: string | undefined;
  bio?: string | undefined;
}) {
  const baseSlug = slugify(payload.business_name || payload.name || "profissional");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const slug = `${baseSlug}-${randomSuffix}`;

  const { data, error } = await supabase
    .from("professionals")
    .insert({
      user_id: payload.user_id,
      name: payload.name,
      business_name: payload.business_name || payload.name,
      slug,
      category_id: payload.category_id || null,
      whatsapp: payload.whatsapp || null,
      city: payload.city || "Gurupi - TO",
      bio: payload.bio || null,
      availability: "disponivel",
      price_type: "consulta",
      published: true,
      specialties: [],
      regions: ["Gurupi"],
      verified: false,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfessional(
  id: string,
  payload: Partial<{
    bio: string;
    business_name: string;
    price_type: string;
    price_value: number | null;
    price_notes: string;
    availability: string;
    regions: string[];
    specialties: string[];
    whatsapp: string;
    instagram: string;
    avatar_url: string;
    published: boolean;
  }>,
) {
  const { error } = await supabase
    .from("professionals")
    .update(payload as any)
    .eq("id", id);
  if (error) throw error;
}

export async function addPortfolioItem(professionalId: string, imageUrl: string, caption: string) {
  const { error } = await supabase
    .from("portfolio_items")
    .insert({ professional_id: professionalId, image_url: imageUrl, caption });
  if (error) throw error;
}

export async function deletePortfolioItem(id: string) {
  const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
  if (error) throw error;
}

// ── Reviews ────────────────────────────────────────────────────────────────

export const quoteReviewQuery = (requestId: string) =>
  queryOptions({
    queryKey: ["quote-review", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("request_id", requestId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export async function createReview(payload: {
  professional_id: string;
  client_id: string;
  reviewer_name: string;
  request_id?: string | undefined;
  rating: number;
  comment?: string | undefined;
  quality?: number | undefined;
  punctuality?: number | undefined;
  price_transparency?: number | undefined;
  would_recommend?: boolean | undefined;
}) {
  const { error } = await supabase.from("reviews").insert(payload as any);
  if (error) throw error;
}

export async function replyToReview(reviewId: string, pro_reply: string) {
  const { error } = await supabase.from("reviews").update({ pro_reply }).eq("id", reviewId);
  if (error) throw error;
}
