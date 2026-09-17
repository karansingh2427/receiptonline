import { queryOptions } from "@tanstack/react-query";
import { listReceipts } from "./receipts.functions";
import type { ReceiptRow } from "./receipts.types";

export const receiptsQueryOptions = queryOptions<ReceiptRow[]>({
  queryKey: ["receipts"],
  queryFn: () => listReceipts(),
});
