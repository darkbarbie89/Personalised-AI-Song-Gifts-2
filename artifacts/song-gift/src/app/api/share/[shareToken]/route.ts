import { NextRequest, NextResponse } from "next/server";
import { jsonError, configurationError } from "@/lib/server/http";
import { getAdminSupabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shareToken: string }> },
) {
  try {
    const { shareToken } = await context.params;
    const { data: song, error } = await getAdminSupabase()
      .from("songs")
      .select(
        "recipient_name, sender_name, occasion, song_url, alternate_song_url, cover_art_url, status",
      )
      .eq("share_token", shareToken)
      .maybeSingle();
    if (error) return jsonError("This gift could not be loaded.", 500);
    if (!song) return jsonError("This gift link is unavailable.", 404);
    if (!["generating_song", "completed"].includes(song.status)) {
      return jsonError("This gift is not ready to be shared yet.", 404);
    }
    return NextResponse.json({
      recipientName: song.recipient_name,
      senderName: song.sender_name || "Someone who cares about you",
      occasion: song.occasion,
      songUrl: song.song_url,
      alternateSongUrl: song.alternate_song_url,
      coverArtUrl: song.cover_art_url,
      title: `${song.recipient_name} — a song made just for you`,
      status: song.status,
    });
  } catch (error) {
    return configurationError(error) ?? jsonError("This gift could not be loaded.", 500);
  }
}