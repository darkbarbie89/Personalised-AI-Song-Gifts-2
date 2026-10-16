import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { configurationError, jsonError } from "@/lib/server/http";
import { getAdminSupabase, getRequestUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const querySchema = z.object({
  songId: z.string().uuid(),
  asset: z.enum(["audio", "cover"]),
});

export async function GET(request: NextRequest, context: { params: Promise<{ songId: string }> }) {
  try {
    const user = await getRequestUser(request);
    if (!user) return jsonError("Sign in to create a lyric video.", 401);
    const params = await context.params;
    const parsed = querySchema.safeParse({
      songId: params.songId,
      asset: request.nextUrl.searchParams.get("asset"),
    });
    if (!parsed.success) return jsonError("Choose a valid song and video asset.", 400);
    const { songId, asset } = parsed.data;
    const { data: song, error } = await getAdminSupabase()
      .from("songs")
      .select("id,status,song_url,cover_art_url")
      .eq("id", songId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return jsonError("The song could not be loaded.", 500);
    if (!song) return jsonError("Song not found.", 404);
    if (song.status !== "completed") return jsonError("Wait for your song to finish before making its video.", 409);
    const storedUrl = asset === "audio" ? song.song_url : song.cover_art_url;
    if (!storedUrl) return jsonError(`This song has no ${asset} available.`, 404);

    // This is not an open proxy: accept only this song's existing Supabase bucket objects.
    const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!storageBase) throw new Error("Supabase server configuration is missing.");
    const url = new URL(storedUrl);
    const expectedPrefix = `/storage/v1/object/public/song-assets/songs/${songId}/`;
    if (url.protocol !== "https:" || url.origin !== new URL(storageBase).origin ||
        url.username || url.password || !url.pathname.startsWith(expectedPrefix)) {
      return jsonError("This song's media is not in the supported storage location.", 502);
    }
    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(45_000), cache: "no-store", redirect: "error",
    });
    if (!upstream.ok || !upstream.body) return jsonError(`The song ${asset} could not be downloaded. Please try again.`, 502);
    const contentType = upstream.headers.get("content-type")?.split(";")[0].trim() ?? "";
    const allowed = asset === "audio"
      ? ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4"]
      : ["image/svg+xml", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(contentType)) return jsonError("The stored media has an unsupported format.", 502);
    const limit = asset === "audio" ? 50 * 1024 * 1024 : 2 * 1024 * 1024;
    if (Number(upstream.headers.get("content-length") ?? 0) > limit) {
      await upstream.body.cancel();
      return jsonError("This media file exceeds the video export size limit.", 413);
    }
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > limit) {
          await reader.cancel();
          return jsonError("This media file exceeds the video export size limit.", 413);
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    if (!length) return jsonError("The stored media file is empty.", 502);
    return new NextResponse(Buffer.concat(chunks), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return configurationError(error) ?? jsonError("The video assets could not be loaded. Please try again.", 502);
  }
}
