// Shared types for receipts (client-safe).
import type { Database } from "@/integrations/supabase/types";

export type ReceiptRow = Database["public"]["Tables"]["receipts"]["Row"];
export type ReceiptInsert = Database["public"]["Tables"]["receipts"]["Insert"];

export type ExtractedReceipt = {
  merchant: string;
  purchase_date: string | null; // ISO yyyy-mm-dd
  total_amount: number | null;
  currency: string;
  payment_method: string; // card|cash|transfer|unknown
  category: string;
  items: { name: string; qty: number | null; price: number | null }[];
  notes: string;
  raw_text: string;
};

export type ReceiptInput = {
  id?: string;
  merchant: string;
  purchase_date: string;
  total_amount: number;
  currency?: string;
  payment_method: string;
  category: string;
  notes?: string | null;
  image_path?: string | null;
  source?: string;
  raw_extraction?: unknown;
};
