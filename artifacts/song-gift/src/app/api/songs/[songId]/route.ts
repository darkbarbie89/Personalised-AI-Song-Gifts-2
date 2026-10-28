import { NextRequest, NextResponse } from "next/server";
import { configurationError, jsonError } from "@/lib/server/http";
import { refreshSongFromApiframe } from "@/lib/server/apiframe";
import { getAdminSupabase, getRequestUser } from "@/lib/server/supabase";
import { serializeSong } from "@/lib/server/songs";
import { findStoredLyricVideo, lyricVideoContentType } from "@/lib/server/lyric-video-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ songId: string }> },
) {
  try {
    const user = await getRequestUser(request);
    if (!user) return jsonError("Sign in to view this song.", 401);
    const { songId } = await context.params;
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .eq("id", songId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return jsonError("The song could not be loaded.", 500);
    if (!data) return jsonError("Song not found.", 404);

    const refreshed = await refreshSongFromApiframe(data);
    const storedVideo = refreshed.status === "completed" ? await findStoredLyricVideo(refreshed.id) : null;
    const lyricVideoUrl = storedVideo && lyricVideoContentType(storedVideo)
      ? new URL(`/api/songs/${refreshed.id}/lyric-video`, request.nextUrl.origin).toString()
      : null;
    return NextResponse.json({ ...serializeSong(refreshed), lyricVideoUrl });
  } catch (error) {
    return configurationError(error) ?? jsonError("The song status could not be refreshed.", 502);
  }
}