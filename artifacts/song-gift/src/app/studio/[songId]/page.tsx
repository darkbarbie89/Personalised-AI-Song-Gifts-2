"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, LoaderCircle, Music2, WandSparkles } from "lucide-react";
import { getGetSongQueryKey, useApproveLyrics, useGenerateLyrics, useGetSong, useStartSongGeneration } from "@workspace/api-client-react";
import { ErrorState, Footer, LoadingState, Nav } from "@/components/shared";

export default function StudioPage() {
  const { songId } = useParams<{ songId: string }>();
  const queryClient = useQueryClient();
  const { data: song, isLoading, isError, refetch } = useGetSong(songId, { query: { queryKey: getGetSongQueryKey(songId), refetchInterval: 6000 } });
  const [lyrics, setLyrics] = useState("");
  const initialized = useRef("");
  const [message, setMessage] = useState("");
  const generateLyrics = useGenerateLyrics();
  const approve = useApproveLyrics();
  const generateSong = useStartSongGeneration();
  useEffect(() => {
    if (song && initialized.current !== song.id) { initialized.current = song.id; setLyrics(song.lyrics ?? ""); }
  }, [song]);
  if (isLoading) return <><Nav/><LoadingState label="Opening your song studio…"/></>;
  if (isError || !song) return <><Nav/><div className="shell" style={{ padding: "45px 0" }}><ErrorState retry={() => refetch()} message="We couldn’t find this song. It may have moved, or you may need to sign in."/></div></>;
  const busy = generateLyrics.isPending || approve.isPending || generateSong.isPending;
  const finished = song.status === "completed";
  const approvedOrMaking = song.lyricsApproved || song.status === "generating_song" || finished;
    async function createLyrics(tryAgain = false) {
    setMessage("");
    try {
      // @ts-expect-error - songId resolves full input server-side
      const result = await generateLyrics.mutateAsync({ data: { songId, tryAgain } });
      setLyrics(result.lyrics);
      queryClient.setQueryData(getGetSongQueryKey(songId), (old: typeof song | undefined) => old ? { ...old, lyrics: result.lyrics, status: "lyrics_ready" as const } : old);
    } catch (err) { setMessage(err instanceof Error ? err.message : "The lyric draft couldn't be made. Please try again."); }
  }
  async function approveAndMake() {
    setMessage("");
    try {
      const updated = await approve.mutateAsync({ songId, data: { lyrics } });
      queryClient.setQueryData(getGetSongQueryKey(songId), updated);
      // @ts-expect-error - API accepts songId at top level
      await generateSong.mutateAsync({ songId });
      await refetch();
    } catch (err) { setMessage(err instanceof Error ? err.message : "We couldn't start the song just yet. Please try again."); }
  }
  async function retrySong() {
    setMessage("");
    try {
      // @ts-expect-error - API accepts songId at top level
      await generateSong.mutateAsync({ songId });
      await refetch();
    }
    catch (err) { setMessage(err instanceof Error ? err.message : "The song couldn't restart just yet. Please try again."); }
  }
  return <main><Nav/><div className="shell page-top"><Link href="/dashboard" className="hint" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ArrowLeft size={14}/> Your songs</Link><p className="eyebrow" style={{ marginTop: 24 }}>A song for {song.recipientName}</p><h1 className="display">Let’s make it sound like them.</h1><p>{song.occasion} · {song.mood} · {song.genre}</p></div>
    <section className="shell studio-grid"><div className="form-card"><div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center" }}><div><p className="eyebrow">The words</p><h2 className="display" style={{ fontSize: 32, margin: "8px 0" }}>A first draft, together.</h2></div>{song.lyrics && !approvedOrMaking && <button className="btn ghost" onClick={() => createLyrics(true)} disabled={busy}><WandSparkles size={15}/> Try another draft</button>}</div>
      {!lyrics && !finished ? <div className="empty-state" style={{ marginTop: 24 }}><Music2 size={24} color="#cc6554"/><h2>Let’s find the words.</h2><p>We’ll use the details you shared to shape a lyric draft you can review and edit.</p><button className="btn" onClick={() => createLyrics(false)} disabled={busy}>{generateLyrics.isPending ? <><LoaderCircle size={15}/> Finding the words…</> : "Create my lyric draft"}</button></div> :
      <><div className="field" style={{ marginTop: 24 }}><label htmlFor="lyrics">{approvedOrMaking ? "Your approved lyrics" : "Edit anything that doesn’t sound like you"}</label><textarea className="textarea lyrics-editor" id="lyrics" value={lyrics} onChange={e => setLyrics(e.target.value)} readOnly={approvedOrMaking} maxLength={5000} placeholder="Your lyric draft will appear here…"/></div>
        {!approvedOrMaking && <button className="btn" onClick={approveAndMake} disabled={busy || lyrics.trim().length < 20}>{busy ? <><LoaderCircle size={15}/> Saving your words…</> : <><Check size={15}/> These words feel right</>}</button>}
      </>}
      {message && <div className="notice" role="alert">{message}</div>}
    </div>
    <aside className="studio-side"><p className="eyebrow">The making</p><h2 className="display" style={{ fontSize: 28, margin: "10px 0" }}>A few gentle steps.</h2><div className="status-track"><div className="track-item"><span className="track-icon"><Check size={14}/></span>Your story is in safe hands</div><div className="track-item"><span className="track-icon">{song.lyrics ? <Check size={14}/> : <span>2</span>}</span>Review and approve the lyrics</div><div className="track-item"><span className="track-icon">{finished ? <Check size={14}/> : <span>3</span>}</span>Set your song to music</div></div>
      {song.status === "generating_song" && <div className="notice">Your song is taking shape now. This page will update as soon as it’s ready.</div>}
      {song.status === "failed" && <div className="notice">The song needs another moment. Your approved lyrics are safe.<button className="btn secondary" style={{ display: "flex", marginTop: 12 }} onClick={retrySong} disabled={busy}>{generateSong.isPending ? "Starting again…" : "Try generating again"}</button></div>}
      {finished && song.songUrl && <div><p className="eyebrow">Ready to listen</p><audio className="audio-player" controls src={song.songUrl}>Your browser does not support audio playback.</audio>{song.alternateSongUrl && <><p className="hint">An alternate take</p><audio className="audio-player" controls src={song.alternateSongUrl}>Your browser does not support audio playback.</audio></>}<Link className="btn" href={`/listen/${song.shareToken}`}>Open gift page <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }}/></Link></div>}
    </aside></section><Footer/></main>;
}
