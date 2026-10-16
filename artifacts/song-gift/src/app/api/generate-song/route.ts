import { NextRequest, NextResponse } from "next/server";
import { generateSongSchema } from "@/lib/server/schemas";
import { configurationError, jsonError } from "@/lib/server/http";
import { startApiframeGeneration } from "@/lib/server/apiframe";
import { getAdminSupabase, getRequestUser } from "@/lib/server/supabase";
import { serializeSong } from "@/lib/server/songs";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return jsonError("Sign in before generating your song.", 401);

    const parsed = generateSongSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Provide the approved lyrics and song details.", 400);

    const supabase = getAdminSupabase();
    const { data: song, error } = await supabase
      .from("songs")
      .select("*")
      .eq("id", parsed.data.songId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return jsonError("The song could not be loaded.", 500);
    if (!song) return jsonError("Song not found.", 404);
    if (!song.order_id) return jsonError("Complete checkout before generating your song.", 402);
    if (!song.lyrics_approved || !song.lyrics) {
      return jsonError("Review and approve the lyrics before generating audio.", 409);
    }
    if (
      parsed.data.lyrics !== song.lyrics ||
      parsed.data.genre !== song.genre ||
      parsed.data.mood !== song.mood
    ) {
      return jsonError("The approved song details changed. Refresh the studio and try again.", 409);
    }
    if (song.status === "generating_song" || song.status === "completed") {
      return NextResponse.json(serializeSong(song));
    }

    // Only one request may start a paid provider job for this song.
    const { data: claimed, error: claimError } = await supabase.from("songs")
      .update({ status: "generating_song", apiframe_task_id: null })
      .eq("id", song.id).eq("user_id", user.id).eq("status", song.status)
      .select("*").maybeSingle();
    if (claimError) return jsonError("Song generation could not be reserved.", 500);
    if (!claimed) return jsonError("The song is already being updated. Refresh the studio.", 409);
    let taskId: string;
    try {
      taskId = await startApiframeGeneration({
        lyrics: song.lyrics,
        recipientName: song.recipient_name,
        occasion: song.occasion,
        mood: song.mood,
        genre: song.genre,
      });
    } catch (error) {
      await supabase.from("songs").update({ status: "failed" }).eq("id", song.id).eq("status", "generating_song").is("apiframe_task_id", null);
      throw error;
    }
    const { data: updated, error: updateError } = await supabase
      .from("songs")
      .update({
        apiframe_task_id: taskId,
        status: "generating_song",
      })
      .eq("id", song.id)
      .select("*")
      .single();
    if (updateError) return jsonError("Song generation started but its status could not be saved.", 500);
    return NextResponse.json(serializeSong(updated));
  } catch (error) {
    return configurationError(error) ?? jsonError("Song generation could not be started.", 502);
  }
}
