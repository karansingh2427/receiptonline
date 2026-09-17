import JSZip from "jszip";
import type { ReceiptRow } from "./receipts.types";
import { signedImageUrl } from "./upload";
import { paymentLabel } from "./format";

function safe(part: string): string {
  return part
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\-_. ]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "receipt";
}

function extFromPath(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return m?.[1] ? m[1].toLowerCase() : "jpg";
}

export type ZipProgress = { done: number; total: number };

/**
 * Download every receipt photo into a single ZIP, named
 * `2026-03-14_IKEA_129-99.jpg`, plus an index.csv listing all receipts.
 */
export async function downloadReceiptPhotosZip(
  receipts: ReceiptRow[],
  onProgress?: (p: ZipProgress) => void,
): Promise<{ added: number; failed: number; total: number }> {
  const withImages = receipts.filter((r) => !!r.image_path);
  const zip = new JSZip();
  const used = new Set<string>();
  let added = 0;
  let failed = 0;

  onProgress?.({ done: 0, total: withImages.length });

  for (const r of withImages) {
    const path = r.image_path as string;
    try {
      const url = await signedImageUrl(path);
      if (!url) throw new Error("no signed url");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`http ${res.status}`);
      const blob = await res.blob();

      const amount = Number(r.total_amount).toFixed(2).replace(".", "-");
      let name = `${r.purchase_date}_${safe(r.merchant)}_${amount}.${extFromPath(path)}`;
      let i = 2;
      while (used.has(name)) {
        name = `${r.purchase_date}_${safe(r.merchant)}_${amount}_${i}.${extFromPath(path)}`;
        i += 1;
      }
      used.add(name);
      zip.file(name, blob);
      added += 1;
    } catch {
      failed += 1;
    }
    onProgress?.({ done: added + failed, total: withImages.length });
  }

  const csv = [
    ["Date", "Merchant", "Category", "Payment method", "Total (EUR)", "Source", "Photo file", "Notes"]
      .join(";"),
    ...receipts.map((r) =>
      [
        r.purchase_date,
        r.merchant,
        r.category,
        paymentLabel(r.payment_method),
        Number(r.total_amount).toFixed(2).replace(".", ","),
        r.source,
        r.image_path ? "yes" : "no photo",
        (r.notes ?? "").replace(/[\r\n;]+/g, " "),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    ),
  ].join("\r\n");
  zip.file("index.csv", "\uFEFF" + csv);

  const out = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = `renovation-receipt-photos-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return { added, failed, total: withImages.length };
}
