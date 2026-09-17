import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CATEGORIES, PAYMENT_METHODS, paymentLabel } from "@/lib/format";

export type ReceiptFormValues = {
  merchant: string;
  purchase_date: string; // yyyy-mm-dd
  total_amount: number;
  currency: string;
  payment_method: string;
  category: string;
  notes: string;
  source: string;
  raw_extraction?: unknown;
  image_path?: string | null;
};

function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/€|\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatAmountInput(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n as number)) return "";
  const s = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return s;
}

export function ReceiptForm({
  initial,
  imageUrl,
  allowImageUpload,
  onUploadFile,
  submitting,
  submitLabel,
  onSubmit,
}: {
  initial: ReceiptFormValues;
  imageUrl?: string | null;
  allowImageUpload?: boolean;
  onUploadFile?: (file: File) => void;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (v: ReceiptFormValues) => void;
}) {
  const [merchant, setMerchant] = useState(initial.merchant);
  const [date, setDate] = useState(initial.purchase_date);
  const [amountText, setAmountText] = useState(formatAmountInput(initial.total_amount));
  const [currency, setCurrency] = useState(initial.currency || "EUR");
  const [payment, setPayment] = useState(initial.payment_method || "card");
  const [category, setCategory] = useState(initial.category || "Other");
  const [notes, setNotes] = useState(initial.notes || "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setMerchant(initial.merchant);
    setDate(initial.purchase_date);
    setAmountText(formatAmountInput(initial.total_amount));
    setCurrency(initial.currency || "EUR");
    setPayment(initial.payment_method || "card");
    setCategory(initial.category || "Other");
    setNotes(initial.notes || "");
  }, [initial]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;
    setUploading(true);
    try {
      await onUploadFile(file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          merchant: merchant.trim() || "Unknown merchant",
          purchase_date: date || new Date().toISOString().slice(0, 10),
          total_amount: parseAmount(amountText),
          currency,
          payment_method: payment,
          category,
          notes: notes.trim(),
          source: initial.source,
          raw_extraction: initial.raw_extraction,
          image_path: initial.image_path ?? null,
        });
      }}
      className="space-y-4"
    >
      {(imageUrl || allowImageUpload) && (
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Receipt photo
          </Label>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Receipt"
              className="w-full rounded-xl ring-1 ring-line object-contain max-h-72 bg-panel"
            />
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink/25 bg-panel px-4 py-8 text-center transition active:scale-[0.99]">
              <span className="text-2xl">📷</span>
              <span className="mt-2 text-[13px] font-semibold text-ink">
                {uploading ? "Uploading…" : "Add a photo"}
              </span>
              <span className="mt-0.5 text-[11px] text-ink-soft">
                Tap to photograph the handwritten bill
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="sr-only"
              />
            </label>
          )}
        </div>
      )}

      <Field label="Merchant / store">
        <Input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="IKEA, Bauhaus, eBay Kleinanzeigen…"
          className="h-11 bg-paper"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Total amount">
          <div className="relative">
            <Input
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="0,00"
              className="num h-11 bg-paper pr-9"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-soft">
              €
            </span>
          </div>
        </Field>
        <Field label="Purchase date">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="num h-11 bg-paper"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Payment">
          <NativeSelect value={payment} onChange={setPayment} options={PAYMENT_METHODS.map((p) => ({ value: p, label: paymentLabel(p) }))} />
        </Field>
        <Field label="Category">
          <NativeSelect value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What was bought — e.g. sofa, paint, screws…"
          className="bg-paper"
        />
      </Field>

      <input type="hidden" value={currency} readOnly />

      <Button type="submit" disabled={submitting} className="h-12 w-full bg-brand text-[15px] font-semibold text-white hover:bg-brand/90">
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-md border border-input bg-paper px-3 pr-8 text-[14px] font-medium text-ink outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">▾</span>
    </div>
  );
}
