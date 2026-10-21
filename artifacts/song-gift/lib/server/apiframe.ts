import { asRecord, readString } from "./http";
import { getAdminSupabase, uploadPublicFile } from "./supabase";

const API_ROOT = "https://api.apiframe.ai/v2";

function getApiKey() {
  const key = process.env.APIFRAME_API_KEY;
  if (!key) throw new Error("Apiframe server configuration is missing.");
  return key;
}

function trustedAudioUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "apiframe.ai" || url.hostname.endsWith(".apiframe.ai"))
    );
  } catch {
    return false;
  }
}

export async function startApiframeGeneration(input: {
  lyrics: string;
  recipientName: string;
  occasion: string;
  mood: string;
  genre: string;
}) {
  const response = await fetch(`${API_ROOT}/music/generate`, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "suno",
      prompt: input.lyrics,
      sunoParams: {
        custom_mode: true,
        model_version: "V5_5",
        title: `${input.recipientName} — ${input.occasion}`.slice(0, 80),
        style: `${input.genre}, ${input.mood}, heartfelt, personal song`.slice(0, 1000),
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const payload = asRecord(await response.json().catch(() => ({})));
  const data = asRecord(payload.data);
  if (!response.ok) {
    throw new Error("Apiframe could not start song generation.");
  }
  const taskId =
    readString(payload, "id", "taskId", "jobId", "task_id") ??
    readString(data, "id", "taskId", "jobId", "task_id");
  if (!taskId) throw new Error("Apiframe returned no generation job ID.");
  return taskId;
}

async function uploadTrack(url: string, songId: string, index: number) {
  if (!trustedAudioUrl(url)) throw new Error("The song provider returned an untrusted audio URL.");
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error("The completed song could not be downloaded.");
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > 50 * 1024 * 1024) {
    throw new Error("The completed song is larger than the allowed storage limit.");
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.byteLength === 0 || audio.byteLength > 50 * 1024 * 1024) {
    throw new Error("The completed song file is empty or too large.");
  }
  return uploadPublicFile(`songs/${songId}/take-${index + 1}.mp3`, audio, "audio/mpeg");
}

export async function refreshSongFromApiframe(row: Record<string, unknown>) {
  if (row.status !== "generating_song" || typeof row.apiframe_task_id !== "string") {
    return row;
  }

  const response = await fetch(
    `${API_ROOT}/jobs/${encodeURIComponent(row.apiframe_task_id)}`,
    {
      headers: { "X-API-Key": getApiKey() },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = asRecord(await response.json().catch(() => ({})));
  const job = asRecord(payload.data ?? payload);
  if (!response.ok) throw new Error("Song generation status could not be checked.");
  const status = String(job.status ?? "").toUpperCase();

  if (["FAILED", "ERROR", "CANCELLED", "CANCELED"].includes(status)) {
    const { data, error } = await getAdminSupabase()
      .from("songs")
      .update({ status: "failed" })
      .eq("id", String(row.id))
      .select("*")
      .single();
    if (error) throw new Error("Song generation failure could not be recorded.");
    return data;
  }
  if (!["COMPLETED", "SUCCEEDED", "SUCCESS"].includes(status)) return row;

  const result = asRecord(job.result ?? job.output);
  const rawTracks = result.tracks ?? job.tracks;
  const tracks = Array.isArray(rawTracks) ? rawTracks : [];
  const trackUrls = tracks
    .map((track) => readString(asRecord(track), "audioUrl", "audio_url", "url"))
    .filter((url): url is string => Boolean(url))
    .slice(0, 2);
  if (trackUrls.length === 0) {
    const { error } = await getAdminSupabase()
      .from("songs")
      .update({ status: "failed" })
      .eq("id", String(row.id));
    if (error) throw new Error("Song generation failure could not be recorded.");
    return { ...row, status: "failed" };
  }

  const uploaded = await Promise.all(
    trackUrls.map((url, index) => uploadTrack(url, String(row.id), index)),
  );
  const coverUrl = typeof row.cover_art_url === "string" ? row.cover_art_url : null;
  const { data, error } = await getAdminSupabase()
    .from("songs")
    .update({
      song_url: uploaded[0],
      alternate_song_url: uploaded[1] ?? null,
      cover_art_url: coverUrl,
      status: "completed",
    })
    .eq("id", String(row.id))
    .select("*")
    .single();
  if (error) throw new Error("The completed song could not be saved.");
  return data;
}