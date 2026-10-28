import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { configurationError, jsonError } from "@/lib/server/http";
import { findStoredLyricVideo, lyricVideoContentType, LYRIC_VIDEO_PATH } from "@/lib/server/lyric-video-storage";
import { getAdminSupabase, getRequestUser, LYRIC_VIDEO_BUCKET } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const shareTokenSchema = z.string().uuid();

export async function GET(request: NextRequest, context: { params: Promise<{ songId: string }> }) {
  try {
    const user = await getRequestUser(request);
    const { songId } = await context.params;
    const shareToken = request.nextUrl.searchParams.get("shareToken");
    if (!user && !shareToken) return jsonError("Sign in to view this lyric video.", 401);
    if (shareToken && !shareTokenSchema.safeParse(shareToken).success) return jsonError("This gift link is unavailable.", 404);

    let query = getAdminSupabase().from("songs").select("id,status")
      .eq("id", songId);
    query = shareToken ? query.eq("share_token", shareToken) : query.eq("user_id", user!.id);
    const { data: song, error } = await query.maybeSingle();
    if (error) return jsonError("The song could not be checked.", 500);
    if (!song || song.status !== "completed") return jsonError("This lyric video is unavailable.", 404);

    const video = await findStoredLyricVideo(songId);
    if (!video) return jsonError("No saved lyric video is available yet.", 404);
    const mimeType = lyricVideoContentType(video);
    if (!mimeType) return jsonError("The saved lyric video has an unsupported format.", 415);

    const extension = mimeType === "video/mp4" ? "mp4" : "webm";
    const download = request.nextUrl.searchParams.get("download") === "1"
      ? { download: `singagift-lyric-video.${extension}` }
      : undefined;
    const { data, error: signError } = await getAdminSupabase().storage
      .from(LYRIC_VIDEO_BUCKET)
      .createSignedUrl(LYRIC_VIDEO_PATH(songId), 60 * 60, download);
    if (signError || !data?.signedUrl) return jsonError("The saved lyric video could not be opened.", 502);

    return NextResponse.redirect(data.signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return configurationError(error) ?? jsonError("The lyric video could not be opened.", 502);
  }
}
