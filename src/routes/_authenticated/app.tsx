import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { receiptsQueryOptions } from "@/lib/queries";
import { TopBar } from "@/components/top-bar";
import { exportReceipts } from "@/lib/export";
import { downloadReceiptPhotosZip, type ZipProgress } from "@/lib/photos-zip";
import { toast } from "sonner";

import {
  formatEuro,
  formatEuroCompact,
  formatDate,
  monthKey,
  paymentLabel,
  PAYMENT_METHODS,
} from "@/lib/format";
import type { ReceiptRow } from "@/lib/receipts.types";

export const Route = createFileRoute("/_authenticated/app")({
  loader: ({ context }) => context.queryClient.ensureQueryData(receiptsQueryOptions),
  head: () => ({
    meta: [
      { title: "Your receipts — Renovi" },
      { name: "description", content: "Your renovation receipts, totals per store and per month." },
    ],
  }),
  component: AppPage,
});

type SortKey = "date" | "amount" | "store";

function AppPage() {
  const { data: receipts } = useSuspenseQuery(receiptsQueryOptions);
  const [exporting, setExporting] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const [sort, setSort] = useState<SortKey>("date");


  const sorted = useMemo(() => {
    const arr = [...receipts];
    if (sort === "amount") arr.sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
    else if (sort === "store") arr.sort((a, b) => a.merchant.localeCompare(b.merchant));
    else
      arr.sort(
        (a, b) =>
          (b.purchase_date < a.purchase_date ? -1 : b.purchase_date > a.purchase_date ? 1 : 0) ||
          ("" + b.created_at).localeCompare("" + a.created_at),
      );
    return arr;
  }, [receipts, sort]);

  const grandTotal = receipts.reduce((s, r) => s + Number(r.total_amount), 0);
  const count = receipts.length;

  const byMerchant = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    for (const r of receipts) {
      const e = m.get(r.merchant) ?? { count: 0, total: 0 };
      e.count += 1;
      e.total += Number(r.total_amount);
      m.set(r.merchant, e);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [receipts]);

  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of receipts) {
      const k = monthKey(r.purchase_date);
      m.set(k, (m.get(k) ?? 0) + Number(r.total_amount));
    }
    const entries = [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    let run = 0;
    return entries.map(([k, total]) => {
      run += total;
      return { k, total, running: run };
    });
  }, [receipts]);

  const thisMonth = byMonth[byMonth.length - 1]?.total ?? 0;
  const cashTotal = receipts
    .filter((r) => r.payment_method === "cash")
    .reduce((s, r) => s + Number(r.total_amount), 0);

  async function handleExport() {
    if (!receipts.length) return;
    setExporting(true);
    try {
      exportReceipts(sorted);
    } finally {
      setExporting(false);
    }
  }

  const photoCount = receipts.filter((r) => !!r.image_path).length;

  async function handleExportPhotos() {
    if (!photoCount || zipping) return;
    setZipping(true);
    setZipProgress({ done: 0, total: photoCount });
    try {
      const res = await downloadReceiptPhotosZip(sorted, setZipProgress);
      if (res.failed) {
        toast.warning(`${res.added} of ${res.total} photos downloaded`, {
          description: `${res.failed} could not be fetched. Try again in a moment.`,
        });
      } else {
        toast.success(`${res.added} receipt photos downloaded`, {
          description: "The ZIP also contains index.csv with all receipt details.",
        });
      }
    } catch {
      toast.error("Could not build the ZIP", { description: "Please try again." });
    } finally {
      setZipping(false);
      setZipProgress(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper pb-28">
      <TopBar
        showExport
        onExport={handleExport}
        exporting={exporting}
        {...(photoCount > 0
          ? {
              onExportPhotos: handleExportPhotos,
              photosBusy: zipping,
              photosLabel: zipping
                ? `${zipProgress?.done ?? 0}/${zipProgress?.total ?? photoCount}…`
                : `Photos (${photoCount})`,
            }
          : {})}
      />


      <div className="mx-auto max-w-2xl px-4 pt-5">
        {/* Grand total */}
        <section className="rounded-2xl bg-ink p-5 text-paper">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-paper/60">
            Total renovation spend
          </p>
          <p className="num mt-1 font-display text-[40px] font-bold leading-none tabular-nums">
            {formatEuro(grandTotal)}
          </p>
          <div className="mt-4 flex items-center gap-2 text-[12px] text-paper/70">
            <Badge tone="paper">{count} receipts</Badge>
            <Badge tone="brand">{formatEuro(thisMonth)} this month</Badge>
            {cashTotal > 0 && <Badge tone="cash">{formatEuro(cashTotal)} cash</Badge>}
          </div>
        </section>

        {/* By store */}
        {byMerchant.length > 0 && (
          <section className="mt-5">
            <SectionTitle>By store</SectionTitle>
            <div className="overflow-hidden rounded-2xl bg-panel ring-1 ring-line">
              {byMerchant.map(([name, e], i) => (
                <div
                  key={name}
                  className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
                    <p className="text-[11px] text-ink-soft">{e.count} receipt{e.count > 1 ? "s" : ""}</p>
                  </div>
                  <p className="num ml-3 shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                    {formatEuro(e.total)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* By month with running total */}
        {byMonth.length > 0 && (
          <section className="mt-5">
            <SectionTitle>Running total by month</SectionTitle>
            <div className="overflow-hidden rounded-2xl bg-panel ring-1 ring-line">
              <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                <span>Month</span>
                <span className="text-right">Spent</span>
                <span className="text-right">Running total</span>
              </div>
              {byMonth.map((m) => (
                <div key={m.k} className="grid grid-cols-3 border-t border-line px-4 py-3">
                  <span className="text-[13px] font-medium text-ink">{monthLabel(m.k)}</span>
                  <span className="num text-right text-[13px] tabular-nums text-ink">{formatEuro(m.total)}</span>
                  <span className="num text-right text-[13px] font-semibold tabular-nums text-brand">
                    {formatEuro(m.running)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* List */}
        <section className="mt-5">
          <div className="flex items-center justify-between">
            <SectionTitle className="mb-0">Receipts</SectionTitle>
            <SortPill sort={sort} onChange={setSort} />
          </div>

          {sorted.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="mt-3 space-y-2">
              {sorted.map((r) => (
                <ReceiptRowItem key={r.id} receipt={r} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Floating capture button */}
      <Link
        to="/scan"
        className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-accent/30 transition active:scale-95"
      >
        <span className="text-[18px] leading-none">+</span> Add receipt
      </Link>
    </div>
  );
}

function ReceiptRowItem({ receipt }: { receipt: ReceiptRow }) {
  return (
    <li>
      <Link
        to="/receipts/$id"
        params={{ id: receipt.id }}
        className="flex items-center justify-between rounded-xl bg-panel px-4 py-3 ring-1 ring-line transition active:scale-[0.99]"
      >
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">{receipt.merchant}</p>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-soft">
            <span className="num">{formatDate(receipt.purchase_date)}</span>
            {receipt.image_path && <span aria-hidden>·</span>}
            {receipt.image_path && <span aria-hidden>📷</span>}
            <PaymentChip method={receipt.payment_method} />
          </p>
        </div>
        <p className="num ml-3 shrink-0 text-[15px] font-semibold tabular-nums text-ink">
          {formatEuro(Number(receipt.total_amount))}
        </p>
      </Link>
    </li>
  );
}

function PaymentChip({ method }: { method: string }) {
  const tone = method === "cash" ? "cash" : method === "card" ? "brand" : "neutral";
  return <Badge tone={tone as "cash" | "brand" | "neutral"}>{paymentLabel(method)}</Badge>;
}

function Badge({ tone, children }: { tone: "paper" | "brand" | "cash" | "neutral"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    paper: "bg-paper/10 text-paper",
    brand: "bg-brand/20 text-brand",
    cash: "bg-amber-500/20 text-amber-300",
    neutral: "bg-ink/10 text-ink-soft",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone] ?? tones["neutral"]}`}>
      {children}
    </span>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft ${className ?? ""}`}>
      {children}
    </h2>
  );
}

function SortPill({ sort, onChange }: { sort: SortKey; onChange: (s: SortKey) => void }) {
  const next: Record<SortKey, SortKey> = { date: "amount", amount: "store", store: "date" };
  const label: Record<SortKey, string> = { date: "Newest", amount: "Amount", store: "Store" };
  return (
    <button
      type="button"
      onClick={() => onChange(next[sort])}
      className="rounded-full bg-panel px-3 py-1.5 text-[11px] font-semibold text-ink-soft ring-1 ring-line active:scale-95"
    >
      Sort: {label[sort]}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mt-3 rounded-2xl border-2 border-dashed border-line bg-panel px-5 py-12 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-xl bg-paper text-2xl ring-1 ring-line">🧾</div>
      <p className="mt-3 text-[14px] font-semibold text-ink">No receipts yet</p>
      <p className="mx-auto mt-1 max-w-[16rem] text-[12px] text-ink-soft">
        Tap <span className="font-semibold text-accent">Add receipt</span> to scan your first bill or add a cash purchase.
      </p>
    </div>
  );
}

function monthLabel(key: string): string {
  const parts = key.split("-").map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(d);
}
