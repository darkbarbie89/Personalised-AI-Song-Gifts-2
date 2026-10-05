import { NextRequest, NextResponse } from "next/server";
import { completeCheckoutSchema } from "@/lib/server/schemas";
import { configurationError, jsonError } from "@/lib/server/http";
import { getRequestUser } from "@/lib/server/supabase";
import { completePaidSession, retrieveStripeSession } from "@/lib/server/stripe";
import { ensureCoverArt } from "@/lib/server/songs";
import { serializeSong } from "@/lib/server/songs";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return jsonError("Sign in to finish your checkout.", 401);

    const parsed = completeCheckoutSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("A valid Stripe session ID is required.", 400);

    const session = await retrieveStripeSession(parsed.data.sessionId);
    if (session.metadata?.user_id !== user.id) {
      return jsonError("That checkout session does not belong to this account.", 403);
    }
    const row = await completePaidSession(session);
    await ensureCoverArt(row);
    return NextResponse.json(serializeSong(row));
  } catch (error) {
    if (error instanceof Error && error.message === "Payment has not been completed.") {
      return jsonError(error.message, 409);
    }
    return configurationError(error) ?? jsonError("The payment could not be verified yet.", 502);
  }
}