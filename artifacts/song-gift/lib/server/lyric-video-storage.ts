import { getAdminSupabase, LYRIC_VIDEO_BUCKET } from "./supabase";

export const LYRIC_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const LYRIC_VIDEO_PATH = (songId: string) => `songs/${songId}/lyric-video`;

export type LyricVideoMime = "video/mp4" | "video/webm";

type StoredVideo = {
  name: string;
  metadata?: { mimetype?: string; contentType?: string } | null;
};

function isNotFound(error: { statusCode?: string | number } | null) {
  return String(error?.statusCode ?? "") === "404";
}

export async function ensureLyricVideoBucket() {
  const storage = getAdminSupabase().storage;
  const current = await storage.getBucket(LYRIC_VIDEO_BUCKET);
  if (current.data) return;
  if (current.error && !isNotFound(current.error)) {
    throw new Error(`Lyric-video storage could not be checked: ${current.error.message}`);
  }

  const created = await storage.createBucket(LYRIC_VIDEO_BUCKET, {
    public: false,
    fileSizeLimit: LYRIC_VIDEO_MAX_BYTES,
    allowedMimeTypes: ["video/mp4", "video/webm"],
  });
  if (!created.error) return;

  // Another request may have created the bucket at the same time.
  const afterCreate = await storage.getBucket(LYRIC_VIDEO_BUCKET);
  if (afterCreate.data) return;
  throw new Error(`Lyric-video storage could not be prepared: ${created.error.message}`);
}

export async function findStoredLyricVideo(songId: string): Promise<StoredVideo | null> {
  const storage = getAdminSupabase().storage;
  const bucket = await storage.getBucket(LYRIC_VIDEO_BUCKET);
  if (!bucket.data && bucket.error && isNotFound(bucket.error)) return null;
  if (bucket.error) throw new Error(`Lyric-video storage could not be checked: ${bucket.error.message}`);

  const { data, error } = await storage.from(LYRIC_VIDEO_BUCKET).list(`songs/${songId}`, { limit: 10 });
  if (error) throw new Error(`The saved lyric video could not be checked: ${error.message}`);
  return data.find((file) => file.name === "lyric-video") ?? null;
}

export function lyricVideoContentType(file: StoredVideo): LyricVideoMime | null {
  const type = file.metadata?.mimetype ?? file.metadata?.contentType;
  return type === "video/mp4" || type === "video/webm" ? type : null;
}

export function lyricVideoPageUrl(origin: string, songId: string, shareToken: string) {
  const url = new URL(`/api/songs/${songId}/lyric-video`, origin);
  url.searchParams.set("shareToken", shareToken);
  return url.toString();
}
