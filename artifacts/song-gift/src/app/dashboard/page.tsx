"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Copy, LogOut, Music2, Plus } from "lucide-react";
import { getListMySongsQueryKey, useClearAuthSession, useCompleteCheckout, useListMySongs } from "@workspace/api-client-react";
import { getSong } from "@workspace/api-client-react";
import { createClient } from "@supabase/supabase-js";
import { EmptyState, ErrorState, Footer, LoadingState, Nav } from "@/components/shared";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useListMySongs({ query: { queryKey: getListMySongsQueryKey(), refetchInterval: query => query.state.data?.songs.some(song => song.status === "generating_lyrics" || song.status === "generating_song") ? 6000 : false } });
  const clearSession = useClearAuthSession();
  const completeCheckout = useCompleteCheckout();
  const [copied, setCopied] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const generatingIds = (data?.songs ?? []).filter(song => song.status === "generating_song").map(song => song.id).sort().join(",");
  useEffect(() => {
    if (!generatingIds) return;
    const controller = new AbortController();
    let running = false;
    async function refreshGeneration() {
      if (running) return;
      running = true;
      try {
        for (const id of generatingIds.split(",")) await getSong(id, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setGenerationError("");
          await queryClient.invalidateQueries({ queryKey: getListMySongsQueryKey() });
        }
      } catch {
        if (!controller.signal.aborted) setGenerationError("We couldn’t refresh song generation. Your songs are safe; we’ll try again shortly.");
      } finally { running = false; }
    }
    void refreshGeneration();
    const timer = window.setInterval(() => void refreshGeneration(), 6000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [generatingIds, queryClient]);
  const completing = useRef(false);
  const completeMutationRef = useRef(completeCheckout.mutate);
  completeMutationRef.current = completeCheckout.mutate;
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId || completing.current) return;
    completing.current = true;
    completeMutationRef.current({ data: { sessionId } }, {
      onSuccess: () => {
        setCheckoutNotice("Your gift is ready to shape. We’ve added it to your song shelf.");
        queryClient.invalidateQueries({ queryKey: getListMySongsQueryKey() });
        window.history.replaceState({}, "", "/dashboard");
      },
      onError: () => setCheckoutError("We couldn’t confirm that checkout yet. Please refresh in a moment or contact support if you were charged."),
    });
  }, [queryClient]);
  async function signOut() {
    try {
      await clearSession.mutateAsync();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && anon) await createClient(url, anon).auth.signOut({ scope: "local" });
      queryClient.clear();
      router.push("/");
      router.refresh();
    } catch { setCheckoutError("We couldn’t sign you out. Please try again."); }
  }
  async function copyShare(token: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/listen/${token}`); setCopied(token); window.setTimeout(() => setCopied(""), 1800); } catch {}
  }
  if (isLoading) return <><Nav/><LoadingState label="Gathering your song shelf…"/></>;
  if (isError || !data) return <><Nav/><div className="shell" style={{ padding: "50px 0" }}><ErrorState retry={() => refetch()} message="We couldn’t open your song shelf. Sign in again or try once more."/><div style={{ textAlign: "center", marginTop: 20 }}><Link className="btn" href="/account">Sign in</Link></div></div></>;
  return <main><Nav/><section className="shell page-top"><div className="dashboard-head"><div><p className="eyebrow">Your little song shelf</p><h1 className="display">Made with meaning.</h1><p>Every story you’ve turned into a song, in one place.</p></div><button className="btn ghost" onClick={signOut} disabled={clearSession.isPending}><LogOut size={15}/> Sign out</button></div>
     <div className="stats"><div className="stat"><span>Song credits left</span><strong>{data.creditsRemaining}</strong></div><div className="stat"><span>Songs started</span><strong>{data.totalSongs}</strong></div><div className="stat"><span>Ready to share</span><strong>{data.completedSongs}</strong></div></div>
    {checkoutNotice && <div className="notice" role="status">{checkoutNotice}</div>}{checkoutError && <div className="notice" role="alert">{checkoutError}<button onClick={() => window.location.reload()} style={{ marginLeft: 8, textDecoration: "underline", background: "none", border: 0, color: "inherit" }}>Refresh</button></div>}
    {generationError && <div className="notice" role="alert">{generationError}</div>}
    {data.songs.length === 0 ? <EmptyState title="Your first song is waiting." body="Start with one person and one memory. We’ll help turn it into something they can keep." action={<Link className="btn" href="/create">Create a song <ArrowRight size={15}/></Link>}/> :
       <><div className="dashboard-section-head"><h2 className="display">Your songs</h2><Link className="btn secondary" href="/create"><Plus size={15}/> New song</Link></div><div className="song-list">{data.songs.map(song => <article className="song-row" key={song.id}><div className="song-thumb">{song.coverArtUrl ? <img src={song.coverArtUrl} alt="Song cover artwork" loading="lazy"/> : <Music2 size={22}/>}</div><div className="song-row-main"><h3>For {song.recipientName}</h3><p>{song.occasion} · {new Date(song.createdAt).toLocaleDateString()}</p></div><span className="status">{song.status.replaceAll("_", " ")}</span><Link href={`/studio/${song.id}`} className="btn ghost">Open <ArrowRight size={14}/></Link>{song.status === "completed" && <button className="btn secondary" onClick={() => copyShare(song.shareToken)}><Copy size={14}/>{copied === song.shareToken ? "Copied" : "Share"}</button>}</article>)}</div></>}
  </section><Footer/></main>;
}