// Server-only helpers: download a stored receipt image and run AI extraction.
// Never import this from client-reachable modules directly; load inside handlers
// via the .functions.ts wrapper, or import from .server.ts in other server code.
import type { ExtractedReceipt } from "./receipts.types";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

/** Download an object from the private 'receipts' bucket as a data URL. */
export async function downloadObjectAsDataUrl(path: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from("receipts").download(path);
  if (error || !data) {
    throw new Error("Could not load receipt image from storage");
  }
  // supabase-js returns a Blob in browsers / a Blob-like in the worker runtime.
  const buf = await (data as Blob).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  const type = (data as Blob).type || "image/jpeg";
  return `data:${type};base64,${base64}`;
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] ?? trimmed : trimmed;
  return JSON.parse(candidate);
}

/** Call the Lovable AI Gateway with a receipt image and return structured fields. */
export async function extractReceiptFromImage(dataUrl: string): Promise<ExtractedReceipt> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("AI key not configured on the server");
  }

  const system =
    "You are a receipt scanner. Read the receipt photo and return ONLY a JSON object with the purchase details. " +
    "Dates must be ISO yyyy-mm-dd. total_amount is a number (the grand total paid). " +
    "payment_method must be one of: card, cash, transfer, unknown. " +
    "category must be the best match of: Furniture, Materials, Hardware, Appliances, Lighting, Second-hand, Tools, Other. " +
    "If a field cannot be determined, use null for numbers/dates and 'unknown' for payment_method.";

  const user =
    "Extract the receipt. Return JSON with keys: merchant (string), purchase_date (string|null), " +
    "total_amount (number|null), currency (string, default EUR), payment_method (string), category (string), " +
    "items (array of {name, qty, price}), notes (short string summary of what was bought), raw_text (key text from the receipt).";

  const body = {
    model: AI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: user },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  const resp = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`AI extraction failed (${resp.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonLoose(content) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const num = (v: unknown): number | null => {
    if (typeof v === "number" && !isNaN(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
      return isNaN(n) ? null : n;
    }
    return null;
  };

  return {
    merchant: String(parsed["merchant"] ?? "").trim() || "Unknown merchant",
    purchase_date: typeof parsed["purchase_date"] === "string" ? parsed["purchase_date"] : null,
    total_amount: num(parsed["total_amount"]),
    currency: String(parsed["currency"] ?? "EUR"),
    payment_method: String(parsed["payment_method"] ?? "unknown"),
    category: String(parsed["category"] ?? "Other"),
    items: Array.isArray(parsed["items"]) ? (parsed["items"] as ExtractedReceipt["items"]) : [],
    notes: String(parsed["notes"] ?? "").trim(),
    raw_text: String(parsed["raw_text"] ?? "").trim(),
  };
}
