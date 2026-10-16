"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, LoaderCircle, Music2, WandSparkles } from "lucide-react";
import { completeCheckout, getGetSongQueryKey, getListMySongsQueryKey, useApproveLyrics, useGenerateLyrics, useGetSong, useStartSongGeneration } from "@workspace/api-client-react";
import LyricVideoMaker from "@/components/lyric-video-maker";
import { ErrorState, Footer, LoadingState, Nav } from "@/components/shared";

export default function StudioPage() {
  const { songId } = useParams<{ songId: string }>();
  const queryClient = useQueryClient();
  const [payment, setPayment] = useState<"checking" | "ready" | "error">("checking");
  const [paymentError, setPaymentError] = useState("");
  const [paymentAttempt, setPaymentAttempt] = useState(0);
  const [lyrics, setLyrics] = useState("");
  const initialized = useRef("");
  const edited = useRef(false);
  const [message, setMessage] = useState("");
  const generateLyrics = useGenerateLyrics();
  const approve = useApproveLyrics();
  const generateSong = useStartSongGeneration();
  const busy = generateLyrics.isPending || approve.isPending || generateSong.isPending;
  const { data: song, isLoading, isError, refetch } = useGetSong(songId, { query: { queryKey: getGetSongQueryKey(songId), enabled: payment === "ready" && !busy, refetchInterval: 6000 } });
  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) { setPayment("ready"); return; }
    setPayment("checking");
    setPaymentError("");
    void completeCheckout({ sessionId }).then(paidSong => {
      if (!active) return;
      if (paidSong.id !== songId) {
        setPaymentError("This checkout belongs to another song. Open that song from your dashboard.");
        setPayment("error");
        return;
      }
      queryClient.setQueryData(getGetSongQueryKey(songId), paidSong);
      void queryClient.invalidateQueries({ queryKey: getListMySongsQueryKey() });
      try { localStorage.removeItem("song-gift-brief"); } catch { /* Storage may be disabled. */ }
      url.searchParams.delete("session_id");
      window.history.replaceState(null, "", url.pathname + url.search);
      setPayment("ready");
    }).catch(error => {
      if (!active) return;
      setPaymentError(error instanceof Error ? error.message : "Your payment could not be verified yet.");
      setPayment("error");
    });
    return () => { active = false; };
  }, [songId, paymentAttempt, queryClient]);
  useEffect(() => {
    if (!song) return;
    if (initialized.current !== song.id) {
      initialized.current = song.id;
      edited.current = false;
      setLyrics(song.lyrics ?? "");
    } else if (!edited.current && song.lyrics && !generateLyrics.isPending) {
      setLyrics(song.lyrics);
    }
  }, [song?.id, song?.lyrics, generateLyrics.isPending]);
  if (payment === "checking" || isLoading) return <><Nav/><LoadingState label={payment === "checking" ? "Confirming your checkout…" : "Opening your song studio…"}/></>;
  if (payment === "error") return <><Nav/><div className="shell" style={{ padding: "45px 0" }}><ErrorState retry={() => setPaymentAttempt(n => n + 1)} message={paymentError}/><p className="hint">No need to pay again. You can retry confirmation, or sign in to the account used at checkout.</p><Link className="btn" href={`/account?next=${encodeURIComponent(`/studio/${songId}${typeof window !== "undefined" ? window.location.search : ""}`)}`}>Sign in to continue</Link></div></>;
  if (isError || !song) return <><Nav/><div className="shell" style={{ padding: "45px 0" }}><ErrorState retry={() => refetch()} message="We couldn’t find this song. It may have moved, or you may need to sign in."/><Link className="btn" href={`/account?next=${encodeURIComponent(`/studio/${songId}`)}`}>Sign in to continue</Link></div></>;
  const finished = song.status === "completed";
  const approvedOrMaking = song.lyricsApproved || song.status === "generating_song" || finished;
  const hasLyricsDraft = song.lyrics != null || lyrics.length > 0 || edited.current || approvedOrMaking;
  async function createLyrics(tryAgain = false) {
    if (!song) return;
    setMessage("");
    try {
      await queryClient.cancelQueries({ queryKey: getGetSongQueryKey(songId) });
      const result = await generateLyrics.mutateAsync({ data: {
        songId,
        recipientName: song.recipientName,
        relationship: song.relationship,
        occasion: song.occasion,
        story: song.story,
        mood: song.mood,
        genre: song.genre,
        tryAgain,
      } });
      setLyrics(result.lyrics);
      edited.current = false;
      queryClient.setQueryData(getGetSongQueryKey(songId), (old: typeof song | undefined) => old ? { ...old, lyrics: result.lyrics, status: "lyrics_ready" as const } : old);
      void queryClient.invalidateQueries({ queryKey: getListMySongsQueryKey() });
    } catch (err) { setMessage(err instanceof Error ? err.message : "The lyric draft couldn’t be made. Please try again."); }
  }
  async function approveAndMake() {
    setMessage("");
    try {
      await queryClient.cancelQueries({ queryKey: getGetSongQueryKey(songId) });
      const updated = await approve.mutateAsync({ songId, data: { lyrics } });
      edited.current = false;
      queryClient.setQueryData(getGetSongQueryKey(songId), updated);
      const generating = await generateSong.mutateAsync({ data: {
        songId,
        lyrics: updated.lyrics ?? lyrics,
        genre: updated.genre,
        mood: updated.mood,
      } });
      queryClient.setQueryData(getGetSongQueryKey(songId), generating);
      void queryClient.invalidateQueries({ queryKey: getListMySongsQueryKey() });
      await refetch();
    } catch (err) { setMessage(err instanceof Error ? err.message : "We couldn’t start the song just yet. Please try again."); }
  }
  async function retrySong() {
    if (!song) return;
    setMessage("");
    try {
      const generating = await generateSong.mutateAsync({ data: {
        songId,
        lyrics: song.lyrics ?? lyrics,
        genre: song.genre,
        mood: song.mood,
      } });
      queryClient.setQueryData(getGetSongQueryKey(songId), generating);
      void queryClient.invalidateQueries({ queryKey: getListMySongsQueryKey() });
      await refetch();
    }
    catch (err) { setMessage(err instanceof Error ? err.message : "The song couldn’t restart just yet. Please try again."); }
  }
  return <main><Nav/><div className="shell page-top"><Link href="/dashboard" className="hint" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ArrowLeft size={14}/> Your songs</Link><p className="eyebrow" style={{ marginTop: 24 }}>A song for {song.recipientName}</p><h1 className="display">Let’s make it sound like them.</h1><p>{song.occasion} · {song.mood} · {song.genre}</p></div>
    <section className="shell studio-grid"><div className="form-card"><div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center" }}><div><p className="eyebrow">The words</p><h2 className="display" style={{ fontSize: 32, margin: "8px 0" }}>A first draft, together.</h2></div>{song.lyrics && !approvedOrMaking && <button className="btn ghost" onClick={() => createLyrics(true)} disabled={busy}><WandSparkles size={15}/> Try another draft</button>}</div>
      {!hasLyricsDraft && !finished ? <div className="empty-state" style={{ marginTop: 24 }}><Music2 size={24} color="#cc6554"/><h2>Let’s find the words.</h2><p>We’ll use the details you shared to shape a lyric draft you can review and edit.</p><button className="btn" onClick={() => createLyrics(false)} disabled={busy}>{generateLyrics.isPending ? <><LoaderCircle size={15}/> Finding the words…</> : "Create my lyric draft"}</button></div> :
      <><div className="field" style={{ marginTop: 24 }}><label htmlFor="lyrics">{approvedOrMaking ? "Your approved lyrics" : "Edit anything that doesn’t sound like you"}</label><textarea className="textarea lyrics-editor" id="lyrics" value={lyrics} onChange={e => { edited.current = true; setLyrics(e.target.value); }} readOnly={approvedOrMaking || busy} maxLength={5000} placeholder="Your lyric draft will appear here…"/></div>
        {!approvedOrMaking && <button className="btn" onClick={approveAndMake} disabled={busy || lyrics.trim().length < 20}>{busy ? <><LoaderCircle size={15}/> Saving your words…</> : <><Check size={15}/> These words feel right</>}</button>}
      </>}
      {message && <div className="notice" role="alert">{message}</div>}
    </div>
    <aside className="studio-side"><p className="eyebrow">The making</p><h2 className="display" style={{ fontSize: 28, margin: "10px 0" }}>A few gentle steps.</h2><div className="status-track"><div className="track-item"><span className="track-icon"><Check size={14}/></span>Your story is in safe hands</div><div className="track-item"><span className="track-icon">{song.lyrics ? <Check size={14}/> : <span>2</span>}</span>Review and approve the lyrics</div><div className="track-item"><span className="track-icon">{finished ? <Check size={14}/> : <span>3</span>}</span>Set your song to music</div></div>
      {song.status === "generating_song" && <div className="notice">Your song is taking shape now. This page will update as soon as it’s ready.</div>}
      {song.lyricsApproved && !finished && song.status !== "generating_song" && song.status !== "failed" && <div className="notice">Your lyrics are approved. Continue to turn them into music.<button className="btn" onClick={retrySong} disabled={busy}>{generateSong.isPending ? "Starting your song…" : "Generate my song"}</button></div>}
      {song.status === "failed" && <div className="notice">The song needs another moment. Your approved lyrics are safe.<button className="btn secondary" style={{ display: "flex", marginTop: 12 }} onClick={retrySong} disabled={busy}>{generateSong.isPending ? "Starting again…" : "Try generating again"}</button></div>}
      {finished && song.songUrl && <div><p className="eyebrow">Ready to listen</p><audio className="audio-player" controls src={song.songUrl}>Your browser does not support audio playback.</audio>{song.alternateSongUrl && <><p className="hint">An alternate take</p><audio className="audio-player" controls src={song.alternateSongUrl}>Your browser does not support audio playback.</audio></>}<Link className="btn" href={`/listen/${song.shareToken}`}>Open gift page <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }}/></Link></div>}
    </aside></section>{song.status === "completed" && song.songUrl && song.lyrics && <LyricVideoMaker song={song}/>}<Footer/></main>;
}