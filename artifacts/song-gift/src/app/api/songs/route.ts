import { NextRequest, NextResponse } from "next/server";
import { configurationError, jsonError } from "@/lib/server/http";
import { getAdminSupabase, getRequestUser } from "@/lib/server/supabase";
import { getRemainingCredits } from "@/lib/server/stripe";
import { serializeSong } from "@/lib/server/songs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return jsonError("Sign in to view your songs.", 401);
    const { data, error } = await getAdminSupabase()
      .from("songs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return jsonError("Your song list could not be loaded.", 500);

    const songs = (data ?? []).map(serializeSong);
    return NextResponse.json({
      songs,
      creditsRemaining: await getRemainingCredits(user.id),
      totalSongs: songs.length,
      completedSongs: songs.filter((song) => song.status === "completed").length,
    });
  } catch (error) {
    return configurationError(error) ?? jsonError("Your song list could not be loaded.", 500);
  }
}