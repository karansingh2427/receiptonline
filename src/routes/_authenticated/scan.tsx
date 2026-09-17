import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { extractReceipt, saveReceipt } from "@/lib/receipts.functions";
import { uploadReceiptImage, signedImageUrl } from "@/lib/upload";
import { CATEGORIES, PAYMENT_METHODS, toInputDate } from "@/lib/format";
import { ReceiptForm, type ReceiptFormValues } from "@/components/receipt-form";
import type { ExtractedReceipt } from "@/lib/receipts.types";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a receipt — Renovi" },
      { name: "description", content: "Photograph a receipt and read the details automatically." },
    ],
  }),
  component: ScanPage,
});

type Phase = "capture" | "extracting" | "review" | "saving";

function ScanPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const extractFn = useServerFn(extractReceipt);
  const saveFn = useServerFn(saveReceipt);

  const [phase, setPhase] = useState<Phase>("capture");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedReceipt | null>(null);

  async function handleCapture(file: File) {
    setPhase("extracting");
    try {
      const path = await uploadReceiptImage(file, user.id);
      setImagePath(path);
      const url = await signedImageUrl(path);
      setImageUrl(url);
      const result = await extractFn({ data: { imagePath: path } });
      setExtracted(result);
      setPhase("review");
      toast.success("Receipt read", { description: "Check the details and save." });
    } catch (err) {
      console.error(err);
      setPhase("capture");
      toast.error("Couldn't read the receipt", {
        description: (err as Error).message?.slice(0, 120) || "Please try another photo.",
      });
    }
  }

  async function handleSave(values: ReceiptFormValues) {
    setPhase("saving");
    try {
      await saveFn({
        data: {
          ...values,
          image_path: imagePath,
          source: "scan",
          raw_extraction: extracted ?? undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast.success("Receipt saved");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setPhase("review");
      toast.error("Save failed", { description: (err as Error).message });
    }
  }

  if (phase === "capture") {
    return (
      <div className="min-h-screen bg-paper">
        <BackHeader title="Scan receipt" />
        <div className="mx-auto max-w-2xl px-5 py-6">
          <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/25 bg-panel text-center transition active:scale-[0.99]">
            <span className="text-5xl">📸</span>
            <span className="mt-4 text-[16px] font-semibold text-ink">Take a photo of the receipt</span>
            <span className="mt-1 text-[12px] text-ink-soft">The merchant, date and total are read for you.</span>
            <CaptureInput onFile={handleCapture} />
          </label>
          <p className="mt-4 text-center text-[12px] text-ink-soft">
            Cash or eBay Kleinanzeigen? You can adjust the amount and payment method after the scan.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "extracting") {
    return (
      <div className="min-h-screen bg-paper">
        <BackHeader title="Scanning…" />
        <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-16">
          {imageUrl && (
            <img src={imageUrl} alt="Receipt" className="w-full max-w-xs rounded-xl opacity-70 ring-1 ring-line" />
          )}
          <div className="mt-8 flex items-center gap-3">
            <Spinner />
            <span className="text-[14px] font-semibold text-ink">Reading receipt…</span>
          </div>
          <p className="mt-2 text-[12px] text-ink-soft">Detecting store, date, total and payment method.</p>
        </div>
      </div>
    );
  }

  // review / saving
  const initial = toFormValues(extracted);
  return (
    <div className="min-h-screen bg-paper">
      <BackHeader title={phase === "saving" ? "Saving…" : "Review receipt"} />
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="mb-4 rounded-xl bg-panel px-4 py-3 text-[12px] text-ink-soft ring-1 ring-line">
          Check the scanned details below, fix anything if needed, then save.
        </div>
        <ReceiptForm
          key={imagePath ?? "scan"}
          initial={initial}
          imageUrl={imageUrl}
          submitting={phase === "saving"}
          submitLabel="Save receipt"
          onSubmit={handleSave}
        />
      </div>
    </div>
  );
}

function CaptureInput({ onFile }: { onFile: (f: File) => void }) {
  return (
    <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = "";
      }}
      className="sr-only"
    />
  );
}

function BackHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-4">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="grid size-9 place-items-center rounded-full bg-panel text-ink ring-1 ring-line active:scale-95"
        aria-label="Back"
      >
        ‹
      </button>
      <span className="font-display text-[16px] font-semibold tracking-tight text-ink">{title}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block size-5 animate-spin rounded-full border-2 border-ink/20 border-t-brand" />
  );
}

function toFormValues(e: ExtractedReceipt | null): ReceiptFormValues {
  const today = new Date().toISOString().slice(0, 10);
  const fallbackDate = e?.purchase_date ? toInputDate(e.purchase_date) || today : today;
  const payment = e && PAYMENT_METHODS.includes(e.payment_method as never) ? e.payment_method : "card";
  const category = e && (CATEGORIES as readonly string[]).includes(e.category) ? e.category : "Other";
  return {
    merchant: e?.merchant ?? "",
    purchase_date: fallbackDate,
    total_amount: e?.total_amount ?? 0,
    currency: e?.currency ?? "EUR",
    payment_method: payment,
    category,
    notes: e?.notes ?? "",
    source: "scan",
    raw_extraction: e ?? undefined,
  };
}
