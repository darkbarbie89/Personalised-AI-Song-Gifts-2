"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useGetSharedSong } from "@workspace/api-client-react";
import { ArrowRight, Music2 } from "lucide-react";
import { ErrorState, Footer, LoadingState, Nav } from "@/components/shared";

export default function ListenPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data, isLoading, isError, refetch } = useGetSharedSong(shareToken);
  if (isLoading) return <><Nav/><LoadingState label="Opening a song made just for you…"/></>;
  if (isError || !data) return <><Nav/><div className="shell" style={{ padding: "45px 0" }}><ErrorState retry={() => refetch()} message="This listening page isn’t available right now. Ask the person who shared it to send the link again."/></div></>;
  const ready = data.status === "completed" && !!data.songUrl;
  return <main><Nav/><section className="shell share-card"><p className="eyebrow">A song gift, for you</p><h1 className="display" style={{ fontSize: "clamp(45px, 7vw, 72px)", lineHeight: 1, margin: "16px 0" }}>{data.recipientName}, this one is yours.</h1><p style={{ color: "var(--muted)", fontSize: 16 }}>Made with love by {data.senderName} · {data.occasion}</p>
    <div className="cover">{data.coverArtUrl ? <img src={data.coverArtUrl} alt={`Artwork for ${data.title}`}/> : <div className="cover-placeholder"><span>{data.title}</span></div>}</div>
    {ready ? <div className="form-card" style={{ textAlign: "left", maxWidth: 540, margin: "auto" }}><p className="eyebrow">Made especially for you</p><h2 className="display" style={{ fontSize: 31, margin: "9px 0 15px" }}>{data.title}</h2><audio className="audio-player" controls autoPlay src={data.songUrl ?? undefined}>Your browser does not support audio playback.</audio>{data.alternateSongUrl && <><p className="hint">A second version, for another kind of day</p><audio className="audio-player" controls src={data.alternateSongUrl}>Your browser does not support audio playback.</audio></>}<p className="hint">A story remembered. A song to come back to.</p></div> :
      <div className="form-card" style={{ maxWidth: 540, margin: "auto" }}><div className="brand-mark" style={{ margin: "0 auto 15px" }}><Music2 size={17}/></div><h2 className="display" style={{ fontSize: 31, margin: "8px 0" }}>Your song is on its way.</h2><p className="hint">The person who made this gift is putting the finishing touches on it. Come back soon to hear it.</p></div>}
    <p className="hint" style={{ marginTop: 30 }}>A personal story, shared between people who matter.</p><Link href="/" className="btn secondary" style={{ marginTop: 12 }}>Make a song for someone <ArrowRight size={15}/></Link>
  </section><Footer/></main>;
}