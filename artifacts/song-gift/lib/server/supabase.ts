import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export const AUTH_COOKIE = "songgift_access";
const STORAGE_BUCKET = "song-assets";
export const LYRIC_VIDEO_BUCKET = "singagift-lyric-videos";

export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getRequestUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const { data, error } = await getAdminSupabase().auth.getUser(token);
  if (error && (error.status === 0 || !error.status || error.status >= 500)) {
    throw new Error("Supabase connection is unavailable.");
  }
  return error ? null : data.user;
}

export function publicStorageUrl(path: string) {
  const { data } = getAdminSupabase().storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPublicFile(
  path: string,
  contents: Buffer | Uint8Array,
  contentType: string,
) {
  const { error } = await getAdminSupabase()
    .storage.from(STORAGE_BUCKET)
    .upload(path, contents, { contentType, upsert: true });

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  return publicStorageUrl(path);
}