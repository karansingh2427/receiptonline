import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { saveReceipt } from "@/lib/receipts.functions";
import { uploadReceiptImage, signedImageUrl } from "@/lib/upload";
import { ReceiptForm, type ReceiptFormValues } from "@/components/receipt-form";

export const Route = createFileRoute("/_authenticated/receipts/new")({
  head: () => ({
    meta: [
      { title: "Add a receipt — Renovi" },
      { name: "description", content: "Manually add a cash or electronic receipt." },
    ],
  }),
  component: NewReceiptPage,
});

function NewReceiptPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveReceipt);

  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleUploadFile(file: File) {
    const path = await uploadReceiptImage(file, user.id);
    setImagePath(path);
    setImageUrl(await signedImageUrl(path));
  }

  async function handleSave(values: ReceiptFormValues) {
    setSaving(true);
    try {
      await saveFn({
        data: { ...values, image_path: imagePath, source: "manual" },
      });
      await queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast.success("Receipt added");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setSaving(false);
      toast.error("Save failed", { description: (err as Error).message });
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="grid size-9 place-items-center rounded-full bg-panel text-ink ring-1 ring-line active:scale-95"
          aria-label="Back"
        >
          ‹
        </button>
        <span className="font-display text-[16px] font-semibold tracking-tight text-ink">Add manually</span>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="mb-4 rounded-xl bg-panel px-4 py-3 text-[12px] text-ink-soft ring-1 ring-line">
          For eBay Kleinanzeigen cash buys, enter the amount you paid and choose <span className="font-semibold text-ink">Cash</span>. Add a note of what you bought.
        </div>
        <ReceiptForm
          initial={{
            merchant: "",
            purchase_date: new Date().toISOString().slice(0, 10),
            total_amount: 0,
            currency: "EUR",
            payment_method: "cash",
            category: "Second-hand",
            notes: "",
            source: "manual",
          }}
          imageUrl={imageUrl}
          allowImageUpload={!imagePath}
          onUploadFile={handleUploadFile}
          submitting={saving}
          submitLabel="Save receipt"
          onSubmit={handleSave}
        />
      </div>
    </div>
  );
}
