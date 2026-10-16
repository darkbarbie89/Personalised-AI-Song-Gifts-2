import { getAdminSupabase } from "./supabase";

export const packages = {
  single: { credits: 1, amount: 999, label: "One song" },
  triple: { credits: 3, amount: 1999, label: "Three songs" },
  collection: { credits: 10, amount: 4999, label: "Ten-song collection" },
} as const;

export type PackageKey = keyof typeof packages;

type StripeSession = {
  id: string;
  currency?: string | null;
  mode?: string;
  client_reference_id?: string | null;
  payment_status?: string;
  amount_total?: number | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string | undefined> | null;
};

function stripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe server configuration is missing.");
  const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publicKey) throw new Error("Stripe public configuration is missing.");
  const mode = key.startsWith("sk_test_") ? "test" : key.startsWith("sk_live_") ? "live" : null;
  if (!mode || !publicKey.startsWith(`pk_${mode}_`)) {
    throw new Error("Stripe public and secret keys must belong to the same test or live mode.");
  }
  return key;
}

async function stripeFetch(path: string, init?: RequestInit) {
  return fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
}

export function siteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (configured) return new URL(configured).origin;

  const headers = request.headers;
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host");
  const protocol =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "");
  if (!host) return new URL(request.url).origin;
  return `${protocol}://${host}`;
}

export async function createStripeCheckoutSession(input: {
  songId: string;
  userId: string;
  email: string;
  packageKey: PackageKey;
  request: Request;
}) {
  const pack = packages[input.packageKey];
  const base = siteOrigin(input.request);
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${base}/studio/${input.songId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/create?checkout=cancelled`,
    customer_email: input.email,
    client_reference_id: input.songId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(pack.amount),
    "line_items[0][price_data][product_data][name]": `Song Gift — ${pack.label}`,
    "line_items[0][price_data][product_data][description]": `${pack.credits} personalised song credit${pack.credits === 1 ? "" : "s"}`,
    "metadata[song_id]": input.songId,
    "metadata[user_id]": input.userId,
    "metadata[email]": input.email,
    "metadata[package]": input.packageKey,
    "metadata[credits_total]": String(pack.credits),
    "metadata[amount_paid]": String(pack.amount),
  });

  const response = await stripeFetch("/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = (await response.json().catch(() => ({}))) as {
    id?: string;
    url?: string;
  };
  if (!response.ok || !result.id || !result.url) {
    throw new Error("Stripe could not create the checkout session.");
  }
  return { id: result.id, url: result.url };
}

export async function retrieveStripeSession(sessionId: string): Promise<StripeSession> {
  const response = await stripeFetch(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const session = (await response.json().catch(() => ({}))) as StripeSession;
  if (!response.ok || !session.id) {
    throw new Error("Stripe could not verify this checkout session.");
  }
  return session;
}

export async function completePaidSession(session: StripeSession) {
  if (session.payment_status !== "paid") {
    throw new Error("Payment has not been completed.");
  }
  const metadata = session.metadata ?? {};
  const songId = metadata.song_id;
  const userId = metadata.user_id;
  const packageKey = metadata.package as PackageKey | undefined;
  const pack = packageKey && Object.hasOwn(packages, packageKey) ? packages[packageKey] : null;
  if (!songId || !userId || !pack) {
    throw new Error("The paid checkout session is missing valid song metadata.");
  }
  if (session.mode !== "payment" || session.currency !== "usd" ||
      session.amount_total !== pack.amount || session.client_reference_id !== songId) {
    throw new Error("The payment amount, currency, or song reference does not match this package.");
  }

  const supabase = getAdminSupabase();
  const { data: song, error: songError } = await supabase
    .from("songs")
    .select("*")
    .eq("id", songId)
    .eq("user_id", userId)
    .maybeSingle();
  if (songError || !song) {
    throw new Error("The song linked to this payment could not be found.");
  }

  const { data: existing, error: lookupError } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (lookupError) throw new Error("The payment record could not be checked.");

  let order = existing;
  if (order && (order.user_id !== userId || order.status !== "active")) {
    throw new Error("This payment is not active for this account.");
  }
  if (!order) {
    const email =
      session.customer_details?.email ||
      metadata.email ||
      "unknown@example.invalid";
    const { data: inserted, error: insertError } = await supabase
      .from("orders")
      .upsert(
        {
          user_id: userId,
          email,
          stripe_session_id: session.id,
          package: packageKey,
          credits_total: pack.credits,
          credits_used: 1,
          amount_paid: Number(session.amount_total ?? metadata.amount_paid ?? pack.amount),
          status: "active",
        },
        { onConflict: "stripe_session_id", ignoreDuplicates: true },
      )
      .select("*")
      .maybeSingle();
    if (insertError) throw new Error("The paid order could not be saved.");
    order = inserted;
    if (!order) {
      const { data: racedOrder, error: racedError } = await supabase
        .from("orders")
        .select("*")
        .eq("stripe_session_id", session.id)
        .single();
      if (racedError || !racedOrder) throw new Error("The paid order could not be recovered.");
      order = racedOrder;
    }
  }

  if (song.order_id !== order.id) {
    const { error: updateError } = await supabase
      .from("songs")
      .update({ order_id: order.id, status: song.status === "draft" ? "draft" : song.status })
      .eq("id", songId);
    if (updateError) throw new Error("The paid song could not be activated.");
  }

  return { ...song, order_id: order.id };
}

export async function getRemainingCredits(userId: string) {
  const { data, error } = await getAdminSupabase()
    .from("orders")
    .select("credits_total, credits_used")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw new Error("Credit balance could not be loaded.");
  return (data ?? []).reduce(
    (sum, order) => sum + Math.max(order.credits_total - order.credits_used, 0),
    0,
  );
}