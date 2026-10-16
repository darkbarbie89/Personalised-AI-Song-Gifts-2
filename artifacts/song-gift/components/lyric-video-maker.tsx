"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Film, LoaderCircle, Pause, Play, RotateCcw, X } from "lucide-react";
import type { Song } from "@workspace/api-client-react";
import { drawVideoFrame } from "@/lib/lyric-video/draw";
import { exportLyricVideo, getVideoFormat, loadVideoAssets, type VideoAssets, type VideoFormat } from "@/lib/lyric-video/export";
import { activeCueIndex, estimateCues, formatVideoTime, validateCues, type VideoDraft, type VideoTheme } from "@/lib/lyric-video/timeline";
import "./lyric-video-maker.css";

type Loaded = { status: "idle" | "loading" | "ready" | "error"; error: string };
type Result = { blob: Blob; url: string; extension: string };

function fingerprint(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${text.length}:${h.toString(36)}`;
}

function readSaved(key: string, print: string, estimated: VideoDraft["cues"]): VideoDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v?.version !== 1 || v.fingerprint !== print || !Array.isArray(v.cues) || v.cues.length !== estimated.length) return null;
    if (v.theme !== "cream" && v.theme !== "midnight") return null;
    const cues = estimated.map((cue, i) => {
      const s = v.cues[i];
      return s && s.text === cue.text && typeof s.start === "number" && Number.isFinite(s.start) ? { text: cue.text, start: s.start } : null;
    });
    if (cues.some(c => !c)) return null;
    return { theme: v.theme, dedication: typeof v.dedication === "string" ? v.dedication.slice(0, 80) : "", cues: cues as VideoDraft["cues"] };
  } catch { return null; }
}

export default function LyricVideoMaker({ song }: { song: Song }) {
  const lyrics = song.lyrics ?? "";
  const songUrl = song.songUrl ?? "";
  const print = useMemo(() => fingerprint(`${lyrics}\n${songUrl}`), [lyrics, songUrl]);
  const storageKey = `songgift.lyricvideo.v1.${song.id}`;
  const hasCover = !!(song as { coverArtUrl?: string | null }).coverArtUrl;

  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Loaded>({ status: "idle", error: "" });
  const [supported, setSupported] = useState<boolean | null>(null);
  const [format, setFormat] = useState<VideoFormat | null>(null);
  const [duration, setDuration] = useState(0);
  const [draft, setDraft] = useState<VideoDraft>({ theme: "cream", dedication: "", cues: [] });
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [watch, setWatch] = useState(false);
  const [saved, setSaved] = useState<"none" | "saved" | "unavailable">("none");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const assetsRef = useRef<VideoAssets | null>(null);
  const loadAbort = useRef<AbortController | null>(null);
  const exportAbort = useRef<AbortController | null>(null);
  const exportingRef = useRef(false);
  const resultRef = useRef<Result | null>(null);
  resultRef.current = result;

  const info = useMemo(() => ({ recipientName: song.recipientName, occasion: song.occasion }), [song.recipientName, song.occasion]);
  const validation = duration > 0 ? validateCues(draft.cues, duration) : "Wait for the song to finish loading.";

  useEffect(() => {
    let alive = true;
    void getVideoFormat().then(found => {
      if (alive) { setFormat(found); setSupported(found !== null); }
    }).catch(() => { if (alive) setSupported(false); });
    return () => { alive = false; };
  }, []);

  // Release everything on unmount.
  useEffect(() => () => {
    loadAbort.current?.abort();
    exportAbort.current?.abort();
    assetsRef.current?.dispose();
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
  }, []);

  useEffect(() => {
    if (!exporting) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [exporting]);

  // Preview draw (never while the exporter owns the canvas).
  const ready = load.status === "ready";
  useEffect(() => {
    if (!ready || exporting || exportingRef.current || !canvasRef.current || !assetsRef.current) return;
    try { drawVideoFrame({ canvas: canvasRef.current, info, draft, cover: assetsRef.current.cover, time, duration }); }
    catch (error) { setExportError(error instanceof Error ? error.message : "The video preview could not be drawn."); }
  }, [open, ready, exporting, info, draft, time, duration]);

  // Smooth time while playing.
  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const tick = () => { if (audioRef.current) setTime(audioRef.current.currentTime); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  const clearResult = useCallback(() => {
    setResult(prev => { if (prev) URL.revokeObjectURL(prev.url); return null; });
    setWatch(false);
    setExportError("");
  }, []);

  const persist = useCallback((next: VideoDraft) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, songId: song.id, fingerprint: print, ...next }));
      setSaved("saved");
    } catch { setSaved("unavailable"); }
  }, [storageKey, song.id, print]);

  const update = useCallback((next: VideoDraft) => {
    setDraft(next);
    clearResult();
    persist(next);
  }, [clearResult, persist]);

  async function openMaker() {
    setOpen(true);
    if (load.status === "ready" || load.status === "loading") return;
    await startLoad();
  }

  async function startLoad() {
    const available = await getVideoFormat();
    if (!available) { setSupported(false); return; }
    setFormat(available);
    loadAbort.current?.abort();
    const controller = new AbortController();
    loadAbort.current = controller;
    setLoad({ status: "loading", error: "" });
    try {
      const assets = await loadVideoAssets(song.id, hasCover, controller.signal);
      if (controller.signal.aborted) { assets.dispose(); return; }
      assetsRef.current?.dispose();
      assetsRef.current = assets;
      const estimated = estimateCues(lyrics, assets.buffer.duration);
      const restored = readSaved(storageKey, print, estimated);
      setDuration(assets.buffer.duration);
      setDraft(restored ?? { theme: "cream", dedication: "", cues: estimated });
      setSaved(restored ? "saved" : "none");
      setTime(0);
      setLoad({ status: "ready", error: "" });
    } catch (err) {
      if (controller.signal.aborted) return;
      setLoad({ status: "error", error: err instanceof Error ? err.message : "We couldn’t load your song for the video." });
    }
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a || exporting) return;
    if (a.paused) void a.play().catch(() => setPlaying(false)); else a.pause();
  }
  function seek(t: number, play = false) {
    const a = audioRef.current;
    if (!a || exporting) return;
    a.currentTime = Math.max(0, Math.min(duration, t));
    setTime(a.currentTime);
    if (play) void a.play().catch(() => undefined);
  }
  function setCue(index: number, start: number) {
    update({ ...draft, cues: draft.cues.map((c, i) => i === index ? { ...c, start } : c) });
  }
  function resetEstimates() {
    update({ ...draft, cues: estimateCues(lyrics, duration) });
  }

  async function startExport() {
    const assets = assetsRef.current;
    const canvas = canvasRef.current;
    if (!assets || !canvas || exportingRef.current || validateCues(draft.cues, duration)) return;
    audioRef.current?.pause();
    clearResult();
    exportingRef.current = true;
    const controller = new AbortController();
    exportAbort.current = controller;
    setProgress(0);
    setExporting(true);
    try {
      const out = await exportLyricVideo({ canvas, info, draft, cover: assets.cover, buffer: assets.buffer, signal: controller.signal, onProgress: setProgress });
      if (controller.signal.aborted) return;
      setResult({ blob: out.blob, extension: out.extension, url: URL.createObjectURL(out.blob) });
    } catch (err) {
      if (!controller.signal.aborted && !(err instanceof DOMException && err.name === "AbortError")) {
        setExportError(err instanceof Error ? err.message : "The video couldn’t be finished. Please try again.");
      }
    } finally {
      exportingRef.current = false;
      exportAbort.current = null;
      setExporting(false);
    }
  }

  function download() {
    if (!result) return;
    const base = `${song.recipientName} song gift lyric video`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "song-gift-lyric-video";
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `${base}.${result.extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const formatLabel = format ? (format.extension === "mp4" ? "MP4" : "WebM") : "";
  const active = activeCueIndex(draft.cues, time);

  if (!open) {
    return <section className="shell lv-root" aria-label="Lyric video">
      <div className="lv-entry">
        <div>
          <p className="eyebrow">Optional extra</p>
          <h2>Create lyric video</h2>
          <p>Turn the finished song into a video with your words on screen, ready to send or play at the celebration.</p>
        </div>
        <button className="btn" onClick={openMaker}><Film size={15} /> Create lyric video</button>
      </div>
    </section>;
  }

  return <section className="shell lv-root" aria-label="Lyric video maker">
    <div className="lv-panel">
      <div className="lv-head">
        <div>
          <p className="eyebrow">Lyric video</p>
          <h2>Wrap the song in its words.</h2>
          <p className="lv-lede">Your approved lyrics appear exactly as written. Preview it, adjust when each line appears, then save the video.</p>
        </div>
        <button className="btn ghost lv-btn-sm" onClick={() => { audioRef.current?.pause(); setOpen(false); }} disabled={exporting}><X size={14} /> Close</button>
      </div>

      {supported === false && <div className="lv-note warn" role="alert">This browser can’t export videos. Please open Song Gift in the latest Chrome, Edge, or Safari on a computer to make a lyric video.</div>}

      {supported !== false && load.status === "loading" && <div><div className="lv-skel" /><p className="hint" style={{ marginTop: 10 }}>Loading your song and cover…</p></div>}

      {supported !== false && load.status === "error" && <div className="lv-note bad" role="alert">{load.error}<div className="lv-row"><button className="btn secondary lv-btn-sm" onClick={startLoad}><RotateCcw size={14} /> Try again</button></div></div>}

      {ready && draft.cues.length === 0 && <div className="lv-note warn">These lyrics don’t have any lines to show on screen, so a lyric video can’t be made for this song.</div>}

      {ready && draft.cues.length > 0 && <>
        <div className="lv-grid">
          <div>
            <div className="lv-stage"><canvas ref={canvasRef} className="lv-canvas" width={1280} height={720} aria-label="Lyric video preview" /></div>
            <audio ref={audioRef} src={assetsRef.current?.audioUrl} preload="auto"
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
              onTimeUpdate={e => setTime(e.currentTarget.currentTime)} />
            <div className="lv-player">
              <button className="btn secondary lv-btn-sm" onClick={togglePlay} disabled={exporting} aria-label={playing ? "Pause preview" : "Play preview"}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
              <input type="range" min={0} max={duration} step={0.01} value={Math.min(time, duration)} onChange={e => seek(Number(e.target.value))} disabled={exporting} aria-label="Seek" />
              <span className="lv-time">{formatVideoTime(time)} / {formatVideoTime(duration)}</span>
            </div>
          </div>

          <div className="lv-side">
            <div className="field" style={{ marginTop: 0 }}>
              <label>Look</label>
              <div className="lv-themes">
                {([["cream", "Cream"], ["midnight", "Midnight"]] as [VideoTheme, string][]).map(([t, label]) =>
                  <button key={t} type="button" className={`lv-theme ${t}`} aria-pressed={draft.theme === t} disabled={exporting} onClick={() => update({ ...draft, theme: t })}><i />{label}</button>)}
              </div>
            </div>
            <div className="field">
              <label htmlFor="lv-dedication">Dedication (optional)</label>
              <input id="lv-dedication" className="input" maxLength={80} value={draft.dedication} disabled={exporting} placeholder="For Mum, with all my love" onChange={e => update({ ...draft, dedication: e.target.value.slice(0, 80) })} />
              <small>{draft.dedication.length}/80 · shown before the first line and under the cover</small>
            </div>
            <p className="lv-saved" style={{ marginTop: 14 }}>
              {saved === "saved" && "Saved on this device. It won’t appear on other devices."}
              {saved === "unavailable" && "Couldn’t save on this device. Your changes will last until you leave this page."}
              {saved === "none" && "Changes are saved on this device only."}
            </p>
          </div>
        </div>

        <div className="lv-timing">
          <div className="lv-head" style={{ marginBottom: 0 }}>
            <div>
              <p className="eyebrow">Timing</p>
              <p className="lv-lede">The starting times are an estimate spread across the song. They are <strong>not</strong> automatically synced to the singing, so listen through and nudge any line that feels early or late.</p>
            </div>
            <button className="btn ghost lv-btn-sm" onClick={resetEstimates} disabled={exporting}><RotateCcw size={14} /> Reset estimates</button>
          </div>
          <div className="lv-lines">
            {draft.cues.map((cue, i) => <div key={i} className={`lv-line${i === active ? " active" : ""}`}>
              <b>{i + 1}</b>
              <span>{cue.text}</span>
              <input className="input" type="number" min={0} step={0.01} aria-label={`Line ${i + 1} start in seconds`} value={Number.isFinite(cue.start) ? cue.start : ""} disabled={exporting} onChange={e => setCue(i, e.target.value === "" ? NaN : Number(e.target.value))} />
              <div className="lv-line-actions">
                <button className="btn ghost" disabled={exporting || !Number.isFinite(cue.start)} onClick={() => seek(cue.start, true)}>Listen</button>
                <button className="btn ghost" disabled={exporting} onClick={() => setCue(i, Math.round(time * 100) / 100)}>Set to now</button>
              </div>
            </div>)}
          </div>
          {validation && <div className="lv-note warn" role="alert">{validation}</div>}
        </div>

        <div className="lv-export">
          <p className="eyebrow">Save the video</p>
          <p className="lv-lede">Your video includes the full {formatVideoTime(duration)} song. Keep this tab open while it renders; export speed depends on your device. {formatLabel ? `This browser will make a ${formatLabel} file.` : ""}{format?.extension === "webm" ? " WebM plays in most browsers and apps but not every phone gallery." : ""}</p>

          {exporting ? <>
            <div className="lv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><div style={{ transform: `scaleX(${progress})` }} /></div>
            <div className="lv-row"><span className="lv-time">Rendering {Math.round(progress * 100)}%</span><button className="btn secondary lv-btn-sm" onClick={() => exportAbort.current?.abort()}><X size={14} /> Cancel</button></div>
          </> : <div className="lv-row">
            <button className="btn" onClick={startExport} disabled={!!validation || !format}>{result ? "Make it again" : <><Film size={15} /> Make the video</>}</button>
            {result && <button className="btn secondary" onClick={download}><Download size={15} /> Download .{result.extension}</button>}
            {result && <button className="btn ghost" onClick={() => setWatch(w => !w)}>{watch ? "Hide video" : "Watch it"}</button>}
          </div>}
          {exportError && <div className="lv-note bad" role="alert">{exportError}</div>}
          {result && !exporting && <p className="hint" style={{ marginTop: 12 }}>Your video is ready ({(result.blob.size / 1048576).toFixed(1)} MB). Changing anything above will clear it.</p>}
          {result && watch && !exporting && <video className="lv-video" src={result.url} controls playsInline />}
        </div>
      </>}
      {exporting && <p className="hint" style={{ marginTop: 10 }}><LoaderCircle size={12} style={{ verticalAlign: "-2px" }} /> Don’t switch tabs. Preview controls are paused while recording.</p>}
    </div>
  </section>;
}
