import { NextRequest, NextResponse } from "next/server";
import { songLyricsSchema } from "@/lib/server/schemas";
import { configurationError, jsonError } from "@/lib/server/http";
import { getAdminSupabase, getRequestUser } from "@/lib/server/supabase";
import { serializeSong } from "@/lib/server/songs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ songId: string }> },
) {
  try {
    const user = await getRequestUser(request);
    if (!user) return jsonError("Sign in to approve lyrics.", 401);
    const { songId } = await context.params;
    const parsed = songLyricsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Lyrics must be between 20 and 5,000 characters.", 400);

    const supabase = getAdminSupabase();
    const { data: existing, error: lookupError } = await supabase
      .from("songs")
      .select("id, order_id, status")
      .eq("id", songId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) return jsonError("The song could not be loaded.", 500);
    if (!existing) return jsonError("Song not found.", 404);
    if (!existing.order_id) return jsonError("Complete checkout before approving lyrics.", 402);
    if (["generating_lyrics", "generating_song", "completed"].includes(existing.status)) {
      return jsonError("These lyrics are locked while the song is being made or is completed.", 409);
    }

    const { data, error } = await supabase
      .from("songs")
      .update({
        lyrics: parsed.data.lyrics,
        lyrics_approved: true,
        status: "lyrics_ready",
      })
      .eq("id", songId)
      .eq("user_id", user.id)
      .eq("status", existing.status)
      .select("*")
      .maybeSingle();
    if (error) return jsonError("Lyrics could not be saved.", 500);
    if (!data) return jsonError("The song changed while saving. Refresh the studio before approving again.", 409);
    return NextResponse.json(serializeSong(data));
  } catch (error) {
    return configurationError(error) ?? jsonError("Lyrics could not be saved.", 500);
  }
}