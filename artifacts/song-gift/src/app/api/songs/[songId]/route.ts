import { NextRequest, NextResponse } from "next/server";
import { configurationError, jsonError } from "@/lib/server/http";
import { refreshSongFromApiframe } from "@/lib/server/apiframe";
import { getAdminSupabase, getRequestUser } from "@/lib/server/supabase";
import { serializeSong } from "@/lib/server/songs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    return NextResponse.json(serializeSong(refreshed));
  } catch (error) {
    return configurationError(error) ?? jsonError("The song status could not be refreshed.", 502);
  }
}