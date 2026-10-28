import { NextRequest, NextResponse } from "next/server";
import { jsonError, configurationError } from "@/lib/server/http";
import { getAdminSupabase } from "@/lib/server/supabase";
import { refreshSongFromApiframe } from "@/lib/server/apiframe";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shareToken: string }> },
) {
  try {
    const { shareToken } = await context.params;
    if (!z.string().uuid().safeParse(shareToken).success) return jsonError("This gift link is unavailable.", 404);
    const { data: stored, error } = await getAdminSupabase()
      .from("songs")
      .select("*")
      .eq("share_token", shareToken)
      .maybeSingle();
    if (error) return jsonError("This gift could not be loaded.", 500);
    if (!stored) return jsonError("This gift link is unavailable.", 404);
    const song = await refreshSongFromApiframe(stored);
    if (!["generating_song", "completed"].includes(song.status)) {
      return jsonError("This gift is not ready to be shared yet.", 404);
    }
    return NextResponse.json({
      id: song.id,
      recipientName: song.recipient_name,
      senderName: song.sender_name || "Someone who cares about you",
      occasion: song.occasion,
      songUrl: song.song_url,
      alternateSongUrl: song.alternate_song_url,
      coverArtUrl: song.cover_art_url,
      lyrics: song.status === "completed" && typeof song.lyrics === "string" ? song.lyrics : null,
      title: `${song.recipient_name} — a song made just for you`,
      status: song.status,
    });
  } catch (error) {
    return configurationError(error) ?? jsonError("This gift could not be loaded.", 500);
  }
}