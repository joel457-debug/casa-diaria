export type Availability = "disponivel" | "limitada" | "indisponivel";
export type PriceType = "fixo" | "inicial" | "hora" | "diaria" | "consulta";

export const availabilityLabel: Record<Availability, string> = {
  disponivel: "Disponível",
  limitada: "Agenda limitada",
  indisponivel: "Sem horários",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(type: PriceType, value: number | null | undefined): string {
  if (type === "consulta" || value == null) return "Orçamento sob consulta";
  const v = brl.format(Number(value));
  switch (type) {
    case "fixo":
      return v;
    case "inicial":
      return `A partir de ${v}`;
    case "hora":
      return `${v}/hora`;
    case "diaria":
      return `${v}/diária`;
  }
}

export const requestStatusLabel: Record<string, string> = {
  pendente: "Aguardando resposta",
  respondido: "Orçamento recebido",
  aceito: "Aceito",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function cleanWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const num = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export const BIO_MAX = 3000;

