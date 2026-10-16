import { NextRequest, NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/server/schemas";
import { jsonError, configurationError } from "@/lib/server/http";
import { getAdminSupabase, getRequestUser } from "@/lib/server/supabase";
import { createStripeCheckoutSession, getRemainingCredits } from "@/lib/server/stripe";
import { ensureCoverArt } from "@/lib/server/songs";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return jsonError("Sign in to create a song gift.", 401);

    const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Please complete all song details before continuing.", 400);
    if (!user.email) return jsonError("Your account needs a verified email to purchase a song.", 400);

    const input = parsed.data;
    // Fail before creating media or checkout sessions if the account's order data is unavailable.
    const creditsBefore = await getRemainingCredits(user.id);
    const supabase = getAdminSupabase();
    let orderId: string | null = null;

    if (input.useCredit) {
      const { data, error } = await supabase.rpc("claim_song_credit", {
        p_user_id: user.id,
      });
      if (error) {
        return jsonError("Song credits are unavailable. Check the Supabase setup and try again.", 503);
      }
      if (!data) return jsonError("There are no unused song credits on this account.", 402);
      orderId = data as string;
    }

    const { data: song, error: insertError } = await supabase
      .from("songs")
      .insert({
        order_id: orderId,
        user_id: user.id,
        recipient_name: input.recipientName,
        sender_name: (user.user_metadata?.full_name as string | undefined) ?? user.email.split("@")[0],
        relationship: input.relationship,
        occasion: input.occasion,
        story: input.story,
        mood: input.mood,
        genre: input.genre,
        status: "draft",
      })
      .select("*")
      .single();
    if (insertError || !song) {
      if (orderId) await supabase.rpc("restore_song_credit", { p_order_id: orderId });
      return jsonError("Your song draft could not be saved.", 500);
    }

    try {
      await ensureCoverArt(song);
    } catch {
      await supabase.from("songs").delete().eq("id", song.id);
      if (orderId) await supabase.rpc("restore_song_credit", { p_order_id: orderId });
      return jsonError("Song storage is not ready. Run the Supabase setup script, then try again.", 503);
    }

    let checkoutUrl: string | null = null;
    if (!input.useCredit) {
      try {
        const checkout = await createStripeCheckoutSession({
          songId: song.id,
          userId: user.id,
          email: user.email,
          packageKey: input.package,
          request,
        });
        checkoutUrl = checkout.url;
      } catch {
        await supabase.from("songs").delete().eq("id", song.id);
        return jsonError("Checkout could not be started. Please try again.", 502);
      }
    }

    const creditsRemaining = Math.max(0, creditsBefore - (input.useCredit ? 1 : 0));
    return NextResponse.json({ songId: song.id, checkoutUrl, creditsRemaining });
  } catch (error) {
    return configurationError(error) ?? jsonError("Could not start your song gift.", 500);
  }
}