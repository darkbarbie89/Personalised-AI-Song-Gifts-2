import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { createHmac, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as checkout } from "../src/app/api/create-checkout/route";
import { POST as confirmPayment } from "../src/app/api/checkout/complete/route";
import { POST as createLyrics } from "../src/app/api/generate-lyrics/route";
import { POST as createSong } from "../src/app/api/generate-song/route";
import { PATCH as approveLyrics } from "../src/app/api/songs/[songId]/lyrics/route";
import { GET as getSong } from "../src/app/api/songs/[songId]/route";
import { GET as listSongs } from "../src/app/api/songs/route";
import { GET as sharedSong } from "../src/app/api/share/[shareToken]/route";
import { POST as signIn } from "../src/app/api/auth/session/route";
import { POST as stripeWebhook } from "../src/app/api/webhooks/stripe/route";

// Real route handlers and Supabase client; only external HTTP services are substituted.
// The interceptor rejects unknown URLs, so these tests never charge or generate paid media.
type Row = Record<string, any>;
const owner = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const brief = {
  recipientName: "Sam", relationship: "friend", occasion: "Birthday",
  story: "We met at university and have shared ten years of hikes, terrible jokes, and birthday celebrations.",
  mood: "Happy & Upbeat", genre: "Pop", package: "triple", useCredit: false,
};
const lyrics = "[Verse 1]\nTen years of trails and laughing in the rain\n[Chorus]\nI'd choose our little adventures all again";
const environment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://songgift-flow-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-supabase-key",
  STRIPE_SECRET_KEY: "sk_test_fixture_not_real",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture_not_real",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_fixture_not_real",
  ANTHROPIC_API_KEY: "test-only-lyric-key",
  APIFRAME_API_KEY: "test-only-music-key",
  NEXT_PUBLIC_BASE_URL: "https://songgift.test",
};
let songs: Row[];
let orders: Row[];
let sessions: Map<string, Row>;
let musicCalls: number;
let lyricCalls: number;
let lyricFailure: boolean;
let musicFailure: boolean;
let storageFailure: boolean;
let jobReady: boolean;
const originalFetch = globalThis.fetch;
const previousEnvironment = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
});
const request = (path: string, body?: unknown, token = "owner-token", method = "POST") =>
  new NextRequest(`https://songgift.test${path}`, {
    method, headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { cookie: `songgift_access=${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const context = (songId: string) => ({ params: Promise.resolve({ songId }) });

function matches(row: Row, url: URL) {
  return [...url.searchParams].every(([key, filter]) => {
    if (["select", "order", "on_conflict", "limit"].includes(key)) return true;
    if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3);
    if (filter === "is.null") return row[key] == null;
    throw new Error(`Unhandled test filter ${key}=${filter}`);
  });
}

async function intercept(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : {}));
  const body = typeof init?.body === "string" ? init.body : init?.body instanceof URLSearchParams ? init.body.toString() : "";
  if (url.hostname === "songgift-flow-test.supabase.co") {
    if (url.pathname === "/auth/v1/user") {
      const token = headers.get("authorization");
      if (!token?.includes("owner-token") && !token?.includes("other-token")) return json({ message: "Invalid session" }, 401);
      return json({ id: token.includes("other-token") ? other : owner, email: "fixture@example.com", user_metadata: {}, aud: "authenticated", created_at: "2026-01-01" });
    }
    if (url.pathname.startsWith("/storage/v1/object/")) {
      return storageFailure ? json({ message: "Fixture storage failure" }, 500) : json({ Key: url.pathname.split("/object/")[1], Id: randomUUID() });
    }
    if (url.pathname === "/rest/v1/rpc/claim_song_credit") {
      const order = orders.find(row => row.user_id === JSON.parse(body).p_user_id && row.credits_used < row.credits_total && row.status === "active");
      if (order) order.credits_used++;
      return json(order?.id ?? null);
    }
    if (url.pathname === "/rest/v1/rpc/restore_song_credit") {
      const order = orders.find(row => row.id === JSON.parse(body).p_order_id);
      if (order) order.credits_used--;
      return json(null);
    }
    const table = url.pathname.split("/").pop();
    const rows = table === "songs" ? songs : table === "orders" ? orders : null;
    assert.ok(rows, `Unexpected table ${table}`);
    let selected = rows.filter(row => matches(row, url));
    if (method === "POST") {
      const incoming = JSON.parse(body);
      if (table === "orders" && orders.some(row => row.stripe_session_id === incoming.stripe_session_id)) selected = [];
      else {
        const row = {
          id: randomUUID(), share_token: randomUUID(), created_at: new Date().toISOString(),
          lyrics: null, lyrics_approved: false, order_id: null, apiframe_task_id: null,
          song_url: null, alternate_song_url: null, cover_art_url: null, ...incoming,
        };
        rows.push(row); selected = [row];
      }
    } else if (method === "PATCH") {
      const changes = JSON.parse(body);
      selected.forEach(row => Object.assign(row, changes));
    } else if (method === "DELETE") {
      for (const row of selected) rows.splice(rows.indexOf(row), 1);
    }
    if (method !== "GET" && !url.searchParams.has("select")) return new Response(null, { status: 204 });
    return json(headers.get("accept")?.includes("vnd.pgrst.object") ? selected[0] ?? null : selected);
  }
  if (url.hostname === "api.stripe.com") {
    if (method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const params = new URLSearchParams(body);
      const id = `cs_test_${randomUUID().replaceAll("-", "")}`;
      const metadata = Object.fromEntries([...params].filter(([key]) => key.startsWith("metadata[")).map(([key, value]) => [key.slice(9, -1), value]));
      const session = {
        id, url: `https://checkout.stripe.com/c/pay/${id}`, metadata,
        payment_status: "unpaid", currency: params.get("line_items[0][price_data][currency]"),
        amount_total: Number(params.get("line_items[0][price_data][unit_amount]")),
        mode: params.get("mode"), client_reference_id: params.get("client_reference_id"),
        success_url: params.get("success_url"), cancel_url: params.get("cancel_url"),
      };
      sessions.set(id, session);
      return json(session);
    }
    const session = sessions.get(url.pathname.split("/").pop()!);
    return session ? json(session) : json({ error: "No session" }, 404);
  }
  if (url.hostname === "api.anthropic.com") {
    lyricCalls++;
    return lyricFailure ? json({ error: "Invalid test key" }, 401) : json({ content: [{ type: "text", text: lyrics }], stop_reason: "end_turn" });
  }
  if (url.hostname === "api.apiframe.ai") {
    if (url.pathname === "/v2/music/generate") {
      musicCalls++;
      return musicFailure ? json({ error: "Fixture provider failure" }, 500) : json({ data: { id: randomUUID() } });
    }
    return json({ data: { status: jobReady ? "COMPLETED" : "PROCESSING", result: { tracks: [{ audioUrl: "https://cdn.apiframe.ai/fixture.mp3" }] } } });
  }
  if (url.hostname === "cdn.apiframe.ai") return new Response(new Uint8Array([73, 68, 51, 1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } });
  throw new Error(`Unexpected external request: ${url.origin}${url.pathname}`);
}

async function paidSong(packageKey = "triple") {
  const response = await checkout(request("/api/create-checkout", { ...brief, package: packageKey }));
  assert.equal(response.status, 200, await response.clone().text());
  const result = await response.json();
  const session = [...sessions.values()].find(row => row.metadata.song_id === result.songId)!;
  session.payment_status = "paid";
  const confirmed = await confirmPayment(request("/api/checkout/complete", { sessionId: session.id }));
  assert.equal(confirmed.status, 200, await confirmed.clone().text());
  return { song: songs.find(row => row.id === result.songId)!, session };
}
const lyricRequest = (id: string, tryAgain = false) => request("/api/generate-lyrics", {
  songId: id, recipientName: brief.recipientName, relationship: brief.relationship,
  occasion: brief.occasion, story: brief.story, mood: brief.mood, genre: brief.genre, tryAgain,
});
const songRequest = (song: Row) => request("/api/generate-song", {
  songId: song.id, lyrics: song.lyrics, mood: song.mood, genre: song.genre,
});

describe("existing user flow through real Next.js handlers", { concurrency: false }, () => {
  before(() => { Object.assign(process.env, environment); globalThis.fetch = intercept; });
  after(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  beforeEach(() => {
    songs = []; orders = []; sessions = new Map();
    musicCalls = 0; lyricCalls = 0; lyricFailure = false; musicFailure = false; storageFailure = false; jobReady = false;
  });

  it("completes checkout, editable lyrics, approval, generation, public listening, and the owner dashboard", async () => {
    const auth = await signIn(request("/api/auth/session", { accessToken: "owner-token" }));
    assert.equal(auth.status, 200);
    assert.match(auth.headers.get("set-cookie")!, /songgift_access=.*HttpOnly/i);
    const { song, session } = await paidSong();
    assert.equal(session.success_url, `https://songgift.test/studio/${song.id}?session_id={CHECKOUT_SESSION_ID}`);
    assert.match(session.cancel_url, /\/create\?checkout=cancelled$/);
    const duplicate = await confirmPayment(request("/api/checkout/complete", { sessionId: session.id }));
    assert.equal(duplicate.status, 200);
    assert.equal(orders.length, 1);
    assert.equal(orders[0].credits_used, 1);
    assert.equal((await createLyrics(lyricRequest(song.id))).status, 200);
    assert.equal(song.lyrics, lyrics);
    const edited = `${lyrics}\nAnd every birthday still begins with you`;
    assert.equal((await approveLyrics(request(`/api/songs/${song.id}/lyrics`, { lyrics: edited }, "owner-token", "PATCH"), context(song.id))).status, 200);
    assert.equal(song.lyrics, edited);
    assert.equal(song.lyrics_approved, true);
    assert.equal((await createSong(songRequest(song))).status, 200);
    assert.equal(song.status, "generating_song");
    assert.equal((await createSong(songRequest(song))).status, 200);
    assert.equal(musicCalls, 1);
    assert.equal((await getSong(request(`/api/songs/${song.id}`, undefined, "owner-token", "GET"), context(song.id))).status, 200);
    jobReady = true;
    const completed = await getSong(request(`/api/songs/${song.id}`, undefined, "owner-token", "GET"), context(song.id));
    assert.equal(completed.status, 200, await completed.clone().text());
    assert.equal(song.status, "completed");
    assert.match(song.song_url, /\/song-assets\/songs\/.+\/take-1.mp3$/);
    const shared = await sharedSong(request(`/api/share/${song.share_token}`, undefined, "", "GET"), { params: Promise.resolve({ shareToken: song.share_token }) });
    const publicData = await shared.json();
    assert.equal(shared.status, 200);
    assert.equal(publicData.songUrl, song.song_url);
    assert.equal(publicData.story, undefined);
    assert.equal(publicData.user_id, undefined);
    const dashboard = await listSongs(request("/api/songs", undefined, "owner-token", "GET"));
    const shelf = await dashboard.json();
    assert.equal(shelf.songs[0].id, song.id);
    assert.equal(shelf.creditsRemaining, 2);
    assert.equal(shelf.completedSongs, 1);
    assert.equal((await approveLyrics(request(`/api/songs/${song.id}/lyrics`, { lyrics }, "owner-token", "PATCH"), context(song.id))).status, 409);
    assert.equal((await createLyrics(lyricRequest(song.id, true))).status, 409);
    assert.equal(lyricCalls, 1);
  });

  it("uses the existing package amounts without trusting client prices", async () => {
    for (const [pack, amount] of [["single", 999], ["triple", 1999], ["collection", 4999]] as const) {
      const response = await checkout(request("/api/create-checkout", { ...brief, package: pack, amount: 1 }));
      assert.equal(response.status, 200);
      const latest = [...sessions.values()].at(-1)!;
      assert.equal(latest.amount_total, amount);
      assert.equal(latest.currency, "usd");
    }
  });

  it("never grants a song to unpaid, wrong-account, or mismatched-amount checkouts", async () => {
    await checkout(request("/api/create-checkout", brief));
    const session = [...sessions.values()][0];
    assert.equal((await confirmPayment(request("/api/checkout/complete", { sessionId: session.id }))).status, 409);
    session.payment_status = "paid";
    assert.equal((await confirmPayment(request("/api/checkout/complete", { sessionId: session.id }, "other-token"))).status, 403);
    session.amount_total = 1;
    assert.equal((await confirmPayment(request("/api/checkout/complete", { sessionId: session.id }))).status, 502);
    assert.equal(orders.length, 0);
    assert.equal(songs[0].order_id, null);
    assert.equal((await createLyrics(lyricRequest(songs[0].id))).status, 402);
  });

  it("validates webhook signatures and fulfills repeated paid events only once", async () => {
    await checkout(request("/api/create-checkout", brief));
    const session = [...sessions.values()][0];
    session.payment_status = "paid";
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: session } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", environment.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("hex");
    const event = (signed: boolean) => new NextRequest("https://songgift.test/api/webhooks/stripe", {
      method: "POST", body,
      headers: { "stripe-signature": `t=${timestamp},v1=${signed ? signature : "0".repeat(64)}` },
    });
    assert.equal((await stripeWebhook(event(false))).status, 400);
    assert.equal(orders.length, 0);
    assert.equal((await stripeWebhook(event(true))).status, 200);
    assert.equal((await stripeWebhook(event(true))).status, 200);
    assert.equal(orders.length, 1);
    assert.equal(orders[0].credits_used, 1);
    assert.equal(songs[0].order_id, orders[0].id);
  });

  it("restores the previous lyric draft after a provider rejection", async () => {
    const { song } = await paidSong();
    song.lyrics = lyrics; song.status = "lyrics_ready";
    lyricFailure = true;
    assert.equal((await createLyrics(lyricRequest(song.id, true))).status, 503);
    assert.equal(song.status, "lyrics_ready");
    assert.equal(song.lyrics, lyrics);
    lyricFailure = false;
    assert.equal((await createLyrics(lyricRequest(song.id, true))).status, 200);
  });

  it("preserves approval and makes a rejected song-generation request retryable", async () => {
    const { song } = await paidSong();
    song.lyrics = lyrics; song.lyrics_approved = true; song.status = "lyrics_ready";
    musicFailure = true;
    assert.equal((await createSong(songRequest(song))).status, 502);
    assert.equal(song.status, "failed");
    assert.equal(song.lyrics_approved, true);
    musicFailure = false;
    assert.equal((await createSong(songRequest(song))).status, 200);
    assert.equal(song.status, "generating_song");
    assert.ok(song.apiframe_task_id);
  });

  it("starts only one provider job for concurrent clicks", async () => {
    const { song } = await paidSong();
    song.lyrics = lyrics; song.lyrics_approved = true; song.status = "lyrics_ready";
    const results = await Promise.all([createSong(songRequest(song)), createSong(songRequest(song))]);
    assert.ok(results.every(result => [200, 409].includes(result.status)));
    assert.equal(musicCalls, 1);
  });

  it("restores a claimed credit if storage fails before creation completes", async () => {
    await paidSong();
    storageFailure = true;
    const response = await checkout(request("/api/create-checkout", { ...brief, useCredit: true }));
    assert.equal(response.status, 503);
    assert.equal(orders[0].credits_used, 1);
    assert.equal(songs.length, 1);
  });

  it("does not expose another user's songs or permit anonymous mutations", async () => {
    const { song } = await paidSong();
    assert.equal((await getSong(request(`/api/songs/${song.id}`, undefined, "other-token", "GET"), context(song.id))).status, 404);
    const shelf = await listSongs(request("/api/songs", undefined, "other-token", "GET"));
    assert.equal((await shelf.json()).songs.length, 0);
    assert.equal((await checkout(request("/api/create-checkout", brief, ""))).status, 401);
  });
});
