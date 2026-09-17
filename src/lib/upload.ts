import { supabase } from "@/integrations/supabase/client";

export function extForType(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

/** Upload a receipt photo into the private 'receipts' bucket under the user's folder. */
export async function uploadReceiptImage(file: File, userId: string) {
  const path = `${userId}/${crypto.randomUUID()}.${extForType(file.type)}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}

/** Get a short-lived signed URL for displaying a private receipt image. */
export async function signedImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Delete an object from the private bucket (best-effort cleanup). */
export async function removeReceiptImage(path: string): Promise<void> {
  await supabase.storage.from("receipts").remove([path]);
}
