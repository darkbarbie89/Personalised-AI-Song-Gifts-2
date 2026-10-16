import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { completePaidSession } from "@/lib/server/stripe";
import { ensureCoverArt } from "@/lib/server/songs";
import { configurationError, jsonError } from "@/lib/server/http";

export const maxDuration = 120;

function validStripeSignature(rawBody: string, header: string, secret: string) {
  const values = header.split(",").map((part) => part.split("=", 2));
  const timestamp = values.find(([key]) => key === "t")?.[1];
  const signatures = values.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest();

  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const provided = Buffer.from(signature, "hex");
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return jsonError("Stripe webhook verification is not configured.", 503);
    if (!signature) return jsonError("Missing Stripe signature.", 400);

    const rawBody = await request.text();
    if (!validStripeSignature(rawBody, signature, secret)) {
      return jsonError("Invalid Stripe webhook signature.", 400);
    }
    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    const supportedEvents = new Set([
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ]);
    if (event.type && supportedEvents.has(event.type)) {
      const session = event.data?.object;
      if (session?.payment_status === "paid") {
        const paidSong = await completePaidSession(session as never);
        await ensureCoverArt(paidSong);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return configurationError(error) ?? jsonError("Stripe event could not be processed.", 500);
  }
}