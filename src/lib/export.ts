import * as XLSX from "xlsx";
import type { ReceiptRow } from "./receipts.types";
import { formatDate, paymentLabel } from "./format";

export function exportReceipts(receipts: ReceiptRow[]) {
  const rows = receipts.map((r) => ({
    Date: formatDate(r.purchase_date),
    Merchant: r.merchant,
    Category: r.category,
    "Payment method": paymentLabel(r.payment_method),
    Total: Number(r.total_amount),
    Currency: r.currency,
    Source: r.source,
    Notes: r.notes ?? "",
  }));

  const total = receipts.reduce((s, r) => s + Number(r.total_amount), 0);

  const byMerchant = new Map<string, { count: number; total: number }>();
  for (const r of receipts) {
    const e = byMerchant.get(r.merchant) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += Number(r.total_amount);
    byMerchant.set(r.merchant, e);
  }
  const summaryRows = [...byMerchant.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([merchant, e]) => ({
      Merchant: merchant,
      Receipts: e.count,
      Total: e.total,
    }));

  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Date: "", Merchant: "", Category: "", "Payment method": "", Total: 0, Currency: "EUR", Source: "", Notes: "" }]);
  ws["!cols"] = [
    { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 14 },
    { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Receipts");

  const summaryWs = XLSX.utils.json_to_sheet(
    summaryRows.length
      ? [...summaryRows, { Merchant: "GRAND TOTAL", Receipts: receipts.length, Total: total }]
      : [{ Merchant: "GRAND TOTAL", Receipts: 0, Total: 0 }],
  );
  summaryWs["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `renovation-receipts-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
