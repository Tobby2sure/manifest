"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Upload a profile avatar to Supabase Storage and update profiles.avatar_url.
 * Accepts FormData with a single "file" field.
 */
export async function uploadAvatar(formData: FormData): Promise<{ url: string }> {
  const userId = await getSessionUserId();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("No file provided");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Image too large — max 2 MB");
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Unsupported image type — use JPEG, PNG, WebP, or GIF");
  }

  const ext = file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
    ? "webp"
    : file.type === "image/gif"
    ? "gif"
    : "jpg";

  // Use timestamp in path to bypass CDN caching of old avatar
  const path = `${userId}/${Date.now()}.${ext}`;
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // Update the profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

  // Clean up older avatars for this user (keep only the latest)
  const { data: existing } = await supabase.storage.from("avatars").list(userId);
  if (existing) {
    const toDelete = existing
      .map((f) => `${userId}/${f.name}`)
      .filter((p) => p !== path);
    if (toDelete.length > 0) {
      await supabase.storage.from("avatars").remove(toDelete);
    }
  }

  revalidatePath("/settings");
  revalidatePath(`/profile/${userId}`);

  return { url: publicUrl };
}

/**
 * Remove the profile avatar (sets avatar_url to null, deletes stored files).
 */
export async function removeAvatar(): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  // Delete all files in the user's folder
  const { data: existing } = await supabase.storage.from("avatars").list(userId);
  if (existing && existing.length > 0) {
    const paths = existing.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from("avatars").remove(paths);
  }

  await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  revalidatePath("/settings");
  revalidatePath(`/profile/${userId}`);
}
