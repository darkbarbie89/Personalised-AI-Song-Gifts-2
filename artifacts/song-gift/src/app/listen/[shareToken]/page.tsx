"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { getGetSharedSongQueryKey, useGetSharedSong } from "@workspace/api-client-react";
import { ArrowRight, Music2 } from "lucide-react";
import { ErrorState, Footer, LoadingState, Nav } from "@/components/shared";

export default function ListenPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data, isLoading, isError, refetch } = useGetSharedSong(shareToken, { query: { queryKey: getGetSharedSongQueryKey(shareToken), refetchInterval: query => query.state.data?.status === "generating_song" ? 6000 : false } });
  if (isLoading) return <><Nav/><LoadingState label="Opening a song made just for you…"/></>;
  if (isError || !data) return <><Nav/><div className="shell" style={{ padding: "45px 0" }}><ErrorState retry={() => refetch()} message="This listening page isn’t available right now. Ask the person who shared it to send the link again."/></div></>;
  const ready = data.status === "completed" && !!data.songUrl;
  return <main><Nav/><section className="shell listen-page">
    <header className="listen-intro">
      <p className="eyebrow">A song gift, for you</p>
      <h1 className="display">{data.recipientName}, this one is yours.</h1>
      <p className="listen-byline">Made with love by {data.senderName} <span aria-hidden="true">·</span> {data.occasion}</p>
    </header>
    <div className={`listen-layout${ready ? "" : " is-pending"}`}>
      <div className="listen-cover">
        {data.coverArtUrl ? <img src={data.coverArtUrl} alt={`Artwork for ${data.title}`} /> : <div className="cover-placeholder"><span>{data.title}</span></div>}
      </div>
      {ready ? <section className="listen-player-card" aria-labelledby="listen-title">
        <p className="eyebrow">Made especially for you</p>
        <h2 className="display listen-title" id="listen-title">{data.title}</h2>
        <div className="listen-track">
          <label htmlFor="listen-primary">Original version</label>
          <audio id="listen-primary" className="audio-player" controls autoPlay preload="metadata" aria-label={`${data.title}, original version`} src={data.songUrl ?? undefined}>Your browser does not support audio playback.</audio>
        </div>
        {data.alternateSongUrl && <div className="listen-track">
          <label htmlFor="listen-alternate">An alternate take</label>
          <audio id="listen-alternate" className="audio-player" controls preload="metadata" aria-label={`${data.title}, alternate take`} src={data.alternateSongUrl}>Your browser does not support audio playback.</audio>
        </div>}
        <p className="listen-note">A story remembered. A song to come back to.</p>
      </section> : <section className="listen-player-card listen-pending" aria-live="polite">
        <div className="brand-mark" aria-hidden="true"><Music2 size={17}/></div>
        <p className="eyebrow">Being made with care</p>
        <h2 className="display listen-title">Your song is on its way.</h2>
        <p className="hint">The person who made this gift is putting the finishing touches on it. Come back soon to hear it.</p>
      </section>}
    </div>
    <div className="listen-cta">
      <p className="hint">A personal story, shared between people who matter.</p>
      <Link href="/" className="btn secondary">Make a song for someone <ArrowRight size={15}/></Link>
    </div>
  </section><Footer/></main>;
}