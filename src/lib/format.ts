// Shared client-safe helpers: money + date formatting, categories, payment labels.

export const CATEGORIES = [
  "Furniture",
  "Materials",
  "Hardware",
  "Appliances",
  "Lighting",
  "Second-hand",
  "Tools",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PAYMENT_METHODS = ["card", "cash", "transfer", "paypal"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function paymentLabel(m: string): string {
  switch (m) {
    case "card":
      return "Card";
    case "cash":
      return "Cash";
    case "transfer":
      return "Transfer";
    case "paypal":
      return "PayPal";
    default:
      return m;
  }
}

/** Format a euro amount the German way: 1234.5 -> "1.234,50 €" */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

/** Format a compact euro amount for chips: 1234.5 -> "1.234,50 €" (same, but no symbol spacing quirks) */
export function formatEuroCompact(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0) + "\u00A0€";
}

export function formatDate(iso: string): string {
  // iso may be a date 'yyyy-mm-dd' or full timestamp
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function toInputDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthKey(iso: string): string {
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "0000-00";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
