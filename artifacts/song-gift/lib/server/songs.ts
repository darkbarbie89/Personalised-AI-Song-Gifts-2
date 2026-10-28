import type { Song } from "@workspace/api-client-react";
import { getAdminSupabase, uploadPublicFile } from "./supabase";

type SongRow = Record<string, unknown>;

export function serializeSong(row: SongRow): Song {
  return {
    id: String(row.id),
    recipientName: String(row.recipient_name ?? ""),
    relationship: String(row.relationship ?? ""),
    occasion: String(row.occasion ?? ""),
    story: String(row.story ?? ""),
    mood: String(row.mood ?? ""),
    genre: String(row.genre ?? ""),
    lyrics: typeof row.lyrics === "string" ? row.lyrics : null,
    lyricsApproved: Boolean(row.lyrics_approved),
    songUrl: typeof row.song_url === "string" ? row.song_url : null,
    alternateSongUrl:
      typeof row.alternate_song_url === "string" ? row.alternate_song_url : null,
    coverArtUrl: typeof row.cover_art_url === "string" ? row.cover_art_url : null,
    lyricVideoUrl: null,
    shareToken: String(row.share_token),
    status: String(row.status) as Song["status"],
    createdAt: String(row.created_at),
  };
}

export function senderNameFromUser(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata ?? {};
  const name = metadata.full_name ?? metadata.name ?? metadata.display_name;
  if (typeof name === "string" && name.trim()) return name.trim().slice(0, 80);
  return user.email?.split("@")[0]?.slice(0, 80) ?? "Someone special";
}

const moodColors: Record<string, [string, string]> = {
  "Happy & Upbeat": ["#ff946c", "#ffd07d"],
  "Romantic & Tender": ["#df8196", "#f2b1a4"],
  "Emotional & Heartfelt": ["#81719b", "#d2a3a4"],
  "Fun & Playful": ["#f28b5d", "#f7c66d"],
  "Calm & Peaceful": ["#4d9184", "#a6c4a2"],
};

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u001f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function createCoverSvg(recipientName: string, occasion: string, mood: string) {
  const [first, second] = moodColors[mood] ?? ["#ef8e75", "#f3bb80"];
  const safeName = escapeXml(recipientName.slice(0, 40));
  const safeOccasion = escapeXml(occasion.slice(0, 48));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${first}"/><stop offset="1" stop-color="${second}"/></linearGradient><radialGradient id="glow"><stop stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="1200" fill="url(#bg)"/><circle cx="240" cy="250" r="430" fill="url(#glow)"/><circle cx="1060" cy="1010" r="360" fill="url(#glow)"/>
<path d="M155 754c113-72 200-77 291-27 76 42 123 45 203-15 79-59 145-75 229-37 65 29 116 31 184-2" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="2"/>
<circle cx="284" cy="402" r="5" fill="#fff" fill-opacity=".8"/><circle cx="912" cy="326" r="4" fill="#fff" fill-opacity=".7"/><circle cx="1000" cy="746" r="6" fill="#fff" fill-opacity=".65"/><circle cx="407" cy="925" r="4" fill="#fff" fill-opacity=".8"/>
<text x="600" y="515" text-anchor="middle" fill="#fff" font-family="Georgia,serif" font-size="38" letter-spacing="10">A SONG FOR</text>
<text x="600" y="635" text-anchor="middle" fill="#fff" font-family="Georgia,serif" font-size="78" font-style="italic">${safeName}</text>
<path d="M520 680h160" stroke="#fff" stroke-opacity=".72" stroke-width="2"/>
<text x="600" y="745" text-anchor="middle" fill="#fff" fill-opacity=".92" font-family="Arial,sans-serif" font-size="24" letter-spacing="5">${safeOccasion.toUpperCase()}</text>
<text x="600" y="1064" text-anchor="middle" fill="#fff" fill-opacity=".72" font-family="Arial,sans-serif" font-size="17" letter-spacing="6">MADE FROM YOUR STORY</text>
</svg>`;
}

export async function ensureCoverArt(row: SongRow) {
  if (typeof row.cover_art_url === "string" && row.cover_art_url) return row.cover_art_url;
  const id = String(row.id);
  const svg = createCoverSvg(
    String(row.recipient_name ?? "Someone special"),
    String(row.occasion ?? "A special moment"),
    String(row.mood ?? ""),
  );
  const url = await uploadPublicFile(
    `songs/${id}/cover.svg`,
    Buffer.from(svg, "utf8"),
    "image/svg+xml",
  );
  const { error } = await getAdminSupabase()
    .from("songs")
    .update({ cover_art_url: url })
    .eq("id", id);
  if (error) throw new Error(`Song cover could not be saved: ${error.message}`);
  return url;
}