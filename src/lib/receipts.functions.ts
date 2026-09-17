import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { ExtractedReceipt, ReceiptRow } from "./receipts.types";
import { downloadObjectAsDataUrl, extractReceiptFromImage } from "./receipts.server";

export const listReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReceiptRow[]> => {
    const { data, error } = await context.supabase
      .from("receipts")
      .select("*")
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReceiptRow[];
  });

export const getReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }): Promise<ReceiptRow | null> => {
    const { data: row, error } = await context.supabase
      .from("receipts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as ReceiptRow) ?? null;
  });

export const saveReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().optional(),
        merchant: z.string().min(1),
        purchase_date: z.string().min(1),
        total_amount: z.number(),
        currency: z.string().default("EUR"),
        payment_method: z.string(),
        category: z.string(),
        notes: z.string().nullish(),
        image_path: z.string().nullish(),
        source: z.string().default("manual"),
        raw_extraction: z.unknown().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<ReceiptRow> => {
    const { supabase, userId } = context;

    const base: Omit<Database["public"]["Tables"]["receipts"]["Insert"], "user_id"> = {
      merchant: data.merchant,
      purchase_date: data.purchase_date,
      total_amount: Number(data.total_amount.toFixed(2)),
      currency: data.currency,
      payment_method: data.payment_method,
      category: data.category,
      notes: data.notes ?? null,
      image_path: data.image_path ?? null,
      source: data.source,
      raw_extraction: (data.raw_extraction ?? null) as Database["public"]["Tables"]["receipts"]["Row"]["raw_extraction"],
    };

    if (data.id) {
      const { data: row, error } = await supabase
        .from("receipts")
        .update(base)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row as ReceiptRow;
    }

    const { data: row, error } = await supabase
      .from("receipts")
      .insert({ ...base, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as ReceiptRow;
  });

export const deleteReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true; image_path: string | null }> => {
    const { data: row, error } = await context.supabase
      .from("receipts")
      .select("image_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { error: delErr } = await context.supabase
      .from("receipts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (delErr) throw new Error(delErr.message);
    return { ok: true as const, image_path: (row as { image_path?: string | null })?.image_path ?? null };
  });

export const extractReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ imagePath: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<ExtractedReceipt> => {
    const dataUrl = await downloadObjectAsDataUrl(data.imagePath);
    return extractReceiptFromImage(dataUrl);
  });
