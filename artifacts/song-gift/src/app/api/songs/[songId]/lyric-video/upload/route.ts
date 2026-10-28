import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { configurationError, jsonError } from "@/lib/server/http";
import { ensureLyricVideoBucket, findStoredLyricVideo, LYRIC_VIDEO_MAX_BYTES, LYRIC_VIDEO_PATH } from "@/lib/server/lyric-video-storage";
import { getAdminSupabase, getRequestUser, LYRIC_VIDEO_BUCKET } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const inputSchema = z.object({
  shareToken: z.string().uuid().optional(),
  mimeType: z.enum(["video/mp4", "video/webm"]),
  size: z.number().int().positive().max(LYRIC_VIDEO_MAX_BYTES),
});

export async function POST(request: NextRequest, context: { params: Promise<{ songId: string }> }) {
  try {
    const user = await getRequestUser(request);
    const { songId } = await context.params;
    const body = await request.json();
    if (typeof body?.size === "number" && body.size > LYRIC_VIDEO_MAX_BYTES) {
      return jsonError("Lyric videos must be 50 MB or smaller to save to the gift page.", 413);
    }
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) return jsonError("Choose a valid lyric video under 50 MB.", 400);
    const { shareToken, mimeType } = parsed.data;
    if (!user && !shareToken) return jsonError("Sign in to save a lyric video.", 401);

    let query = getAdminSupabase().from("songs")
      .select("id,status,lyrics")
      .eq("id", songId);
    query = shareToken ? query.eq("share_token", shareToken) : query.eq("user_id", user!.id);
    const { data: song, error } = await query.maybeSingle();
    if (error) return jsonError("The song could not be checked.", 500);
    if (!song) return jsonError("Song not found.", 404);
    if (song.status !== "completed" || typeof song.lyrics !== "string" || !song.lyrics.trim()) {
      return jsonError("Finish the song and approve its lyrics before saving a video.", 409);
    }

    await ensureLyricVideoBucket();
    const existing = await findStoredLyricVideo(songId);
    if (existing && shareToken) return jsonError("A lyric video is already saved on this gift page. The song owner can replace it from their studio.", 409);

    const path = LYRIC_VIDEO_PATH(songId);
    const { data, error: uploadError } = await getAdminSupabase().storage
      .from(LYRIC_VIDEO_BUCKET)
      .createSignedUploadUrl(path, { upsert: Boolean(existing) });
    if (uploadError || !data) {
      return jsonError(uploadError?.message ?? "A secure upload could not be prepared.", 502);
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      uploadToken: data.token,
      mimeType,
      upsert: Boolean(existing),
      maxBytes: LYRIC_VIDEO_MAX_BYTES,
    });
  } catch (error) {
    return configurationError(error) ?? jsonError("The lyric-video upload could not be prepared.", 502);
  }
}
