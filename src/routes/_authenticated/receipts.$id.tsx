import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteReceipt, saveReceipt } from "@/lib/receipts.functions";
import { getReceipt } from "@/lib/receipts.functions";
import { signedImageUrl, removeReceiptImage } from "@/lib/upload";
import { formatEuro } from "@/lib/format";
import { ReceiptForm, type ReceiptFormValues } from "@/components/receipt-form";
import type { ReceiptRow } from "@/lib/receipts.types";

export const Route = createFileRoute("/_authenticated/receipts/$id")({
  loader: async ({ context, params }) => {
    const row = await getReceipt({ data: { id: params.id } });
    if (!row) throw new Error("Receipt not found");
    return row satisfies ReceiptRow;
  },
  head: () => ({
    meta: [{ title: "Receipt — Renovi" }, { name: "description", content: "View and edit a receipt." }],
  }),
  component: ReceiptDetailPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5 text-center">
      <div>
        <p className="text-[15px] font-semibold text-ink">{(error as Error).message || "Receipt not found"}</p>
        <a href="/app" className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline">
          Back to receipts
        </a>
      </div>
    </div>
  ),
});

function ReceiptDetailPage() {
  const receipt = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveReceipt);
  const deleteFn = useServerFn(deleteReceipt);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!receipt.image_path) return;
    let active = true;
    signedImageUrl(receipt.image_path).then((u) => {
      if (active) setImageUrl(u);
    });
    return () => {
      active = false;
    };
  }, [receipt.image_path]);

  const initial: ReceiptFormValues = {
    merchant: receipt.merchant,
    purchase_date: receipt.purchase_date ?? new Date().toISOString().slice(0, 10),
    total_amount: Number(receipt.total_amount),
    currency: receipt.currency ?? "EUR",
    payment_method: receipt.payment_method,
    category: receipt.category,
    notes: receipt.notes ?? "",
    source: receipt.source,
    raw_extraction: receipt.raw_extraction ?? undefined,
    image_path: receipt.image_path,
  };

  async function handleSave(values: ReceiptFormValues) {
    setSaving(true);
    try {
      await saveFn({ data: { ...values, id: receipt.id } });
      await queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast.success("Receipt updated");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setSaving(false);
      toast.error("Save failed", { description: (err as Error).message });
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this receipt? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await deleteFn({ data: { id: receipt.id } });
      if (res.image_path) await removeReceiptImage(res.image_path).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast.success("Receipt deleted");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setDeleting(false);
      toast.error("Delete failed", { description: (err as Error).message });
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="grid size-9 place-items-center rounded-full bg-panel text-ink ring-1 ring-line active:scale-95"
          aria-label="Back"
        >
          ‹
        </button>
        <span className="font-display text-[16px] font-semibold tracking-tight text-ink">
          {receipt.merchant} · {formatEuro(Number(receipt.total_amount))}
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full px-3 py-2 text-[12px] font-semibold text-red-600 ring-1 ring-red-600/30 active:scale-95 disabled:opacity-50"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6">
        <ReceiptForm
          key={receipt.id}
          initial={initial}
          imageUrl={imageUrl}
          submitting={saving}
          submitLabel="Save changes"
          onSubmit={handleSave}
        />
      </div>
    </div>
  );
}
