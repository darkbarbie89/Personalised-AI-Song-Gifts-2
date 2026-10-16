import { drawVideoFrame, type DrawFrameInput } from "./draw";
import { validateCues } from "./timeline";
import { getSongVideoAsset } from "@workspace/api-client-react";
import {
  AudioBufferSource, BufferTarget, CanvasSource, Output, Mp4OutputFormat,
  WebMOutputFormat, canEncodeAudio, canEncodeVideo,
} from "mediabunny";

const FORMATS = [
  { mimeType: "video/mp4", extension: "mp4", videoCodec: "avc", audioCodec: "aac" },
  { mimeType: "video/webm", extension: "webm", videoCodec: "vp8", audioCodec: "opus" },
] as const;
export type VideoFormat = typeof FORMATS[number];

export async function getVideoFormat(): Promise<VideoFormat | null> {
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined" ||
      !("AudioEncoder" in window) || typeof AudioContext === "undefined") return null;
  for (const format of FORMATS) {
    const [video, audio] = await Promise.all([
      canEncodeVideo(format.videoCodec, { width: 1280, height: 720, frameRate: 24, bitrate: 1_800_000 }),
      canEncodeAudio(format.audioCodec, { sampleRate: 48000, numberOfChannels: 2, bitrate: 128_000 }),
    ]);
    if (video && audio) return format;
  }
  return null;
}

async function fetchAsset(songId: string, asset: "audio" | "cover", signal: AbortSignal) {
  const blob = await getSongVideoAsset(songId, { asset }, {
    credentials: "same-origin", signal, cache: "no-store", responseType: "blob",
  });
  if (!blob.size) throw new Error(`The song ${asset} file is empty.`);
  return blob;
}

export type VideoAssets = {
  buffer: AudioBuffer;
  audioUrl: string;
  cover: HTMLImageElement | null;
  dispose: () => void;
};

export async function loadVideoAssets(songId: string, hasCover: boolean, signal: AbortSignal): Promise<VideoAssets> {
  const [audio, image] = await Promise.all([
    fetchAsset(songId, "audio", signal),
    hasCover ? fetchAsset(songId, "cover", signal) : Promise.resolve(null),
  ]);
  signal.throwIfAborted();
  const context = new AudioContext();
  let buffer: AudioBuffer;
  try { buffer = await context.decodeAudioData(await audio.arrayBuffer()); }
  finally { await context.close(); }
  if (buffer.duration > 600) throw new Error("Video export currently supports songs up to 10 minutes long.");
  const audioUrl = URL.createObjectURL(audio);
  const coverUrl = image ? URL.createObjectURL(image) : null;
  try {
    let cover: HTMLImageElement | null = null;
    if (coverUrl) {
      cover = new Image();
      cover.src = coverUrl;
      await cover.decode();
    }
    signal.throwIfAborted();
    return {
      buffer, audioUrl, cover,
      dispose: () => { URL.revokeObjectURL(audioUrl); if (coverUrl) URL.revokeObjectURL(coverUrl); },
    };
  } catch (error) {
    URL.revokeObjectURL(audioUrl);
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    throw error;
  }
}

export type VideoExportInput = Omit<DrawFrameInput, "time" | "duration"> & {
  buffer: AudioBuffer;
  signal: AbortSignal;
  onProgress: (progress: number) => void;
};

/** Explicit media timestamps prevent wall-clock stalls from stretching or desynchronizing the gift. */
export async function exportLyricVideo(input: VideoExportInput) {
  const format = await getVideoFormat();
  if (!format) throw new Error("Video export is not supported in this browser. Try the latest Chrome, Edge, or Safari.");
  const invalid = validateCues(input.draft.cues, input.buffer.duration);
  if (invalid) throw new Error(invalid);
  input.signal.throwIfAborted();
  const target = new BufferTarget();
  const output = new Output({
    target,
    format: format.extension === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
  });
  const video = new CanvasSource(input.canvas, { codec: format.videoCodec, bitrate: 1_800_000 });
  const audio = new AudioBufferSource({ codec: format.audioCodec, bitrate: 128_000 });
  output.addVideoTrack(video, { frameRate: 24 });
  output.addAudioTrack(audio);
  output.setMetadataTags({ title: `A song for ${input.info.recipientName}`, artist: "Song Gift" });
  let exceededLimit = false;
  const stopSizeWatch = target.on("write", ({ end }) => { if (end > 220 * 1024 * 1024) exceededLimit = true; });
  const cancellation: { promise: Promise<void> | null } = { promise: null };
  const onAbort = () => {
    cancellation.promise = output.cancel();
    // The active encoding promise also rejects; consume cleanup errors without leaking a rejection.
    void cancellation.promise.catch(() => undefined);
  };
  try {
    await document.fonts.ready;
    input.signal.throwIfAborted();
    input.signal.addEventListener("abort", onAbort, { once: true });
    await output.start();
    // Audio first keeps buffered encoded packets much smaller than buffering all video first.
    await audio.add(input.buffer);
    audio.close();
    input.onProgress(0.05);
    const frames = Math.ceil(input.buffer.duration * 24);
    for (let frame = 0; frame < frames; frame++) {
      input.signal.throwIfAborted();
      if (exceededLimit) throw new Error("This video exceeded the browser's 220 MB export limit.");
      const time = frame / 24;
      const frameDuration = Math.min(1 / 24, input.buffer.duration - time);
      drawVideoFrame({ ...input, time, duration: input.buffer.duration });
      await video.add(time, frameDuration);
      if (frame % 6 === 0) {
        input.onProgress(0.05 + (frame / frames) * 0.9);
        // Let the browser paint progress and process cancellation without tying media time to this delay.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    video.close();
    input.signal.throwIfAborted();
    input.onProgress(0.95);
    await output.finalize();
    input.signal.throwIfAborted();
    if (!target.buffer?.byteLength) throw new Error("The browser produced an empty video. Please try again.");
    if (target.buffer.byteLength > 220 * 1024 * 1024) throw new Error("This video exceeded the browser's 220 MB export limit.");
    const blob = new Blob([target.buffer], { type: format.mimeType });
    input.onProgress(1);
    return { blob, extension: format.extension };
  } finally {
    stopSizeWatch();
    input.signal.removeEventListener("abort", onAbort);
    if (cancellation.promise) await cancellation.promise.catch(() => undefined);
    else if (output.state !== "finalized" && output.state !== "canceled") await output.cancel();
  }
}
