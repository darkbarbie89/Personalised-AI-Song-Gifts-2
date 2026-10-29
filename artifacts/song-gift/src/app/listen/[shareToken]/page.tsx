"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";
import { getGetSharedSongQueryKey, useGetSharedSong } from "@workspace/api-client-react";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowRight, Copy, Download, Headphones, Music2, QrCode, Share2, Video } from "lucide-react";
import { ErrorState, Footer, LoadingState, Nav } from "@/components/shared";
import LyricVideoMaker from "@/components/lyric-video-maker";

export default function ListenPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [shareStatus, setShareStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [audioVersion, setAudioVersion] = useState<"original" | "alternate">("original");
  const [mediaMode, setMediaMode] = useState<"audio" | "video">("audio");
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, refetch } = useGetSharedSong(shareToken, { query: { queryKey: getGetSharedSongQueryKey(shareToken), refetchInterval: query => query.state.data?.status === "generating_song" ? 6000 : false } });

  function createShareUrl() {
    return new URL(`/listen/${shareToken}`, window.location.origin).toString();
  }

  async function copyGiftLink(url: string) {
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Song link copied. Paste it into a message or card.");
    } catch {
      setIsQrOpen(true);
      setShareStatus("Clipboard access is unavailable. Select the song link below to copy it.");
    }
  }

  async function shareGift() {
    const url = createShareUrl();
    setShareUrl(url);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `A song for ${data?.recipientName ?? "you"}`,
          text: "A song made just for you.",
          url,
        });
        setShareStatus("Your share options are ready.");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await copyGiftLink(url);
  }

  function toggleQrCode() {
    const nextOpen = !isQrOpen;
    setShareUrl(createShareUrl());
    setIsQrOpen(nextOpen);
    setShareStatus("");
  }

  function downloadQrCode() {
    const canvas = qrContainerRef.current?.querySelector("canvas");
    if (!canvas) {
      setShareStatus("The QR code is still loading. Please try again.");
      return;
    }
    try {
      const name = (data?.recipientName ?? "song").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "song";
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `singagift-${name}-qr.png`;
      link.click();
      setShareStatus("Your QR code has been downloaded as a print-ready PNG.");
    } catch {
      setShareStatus("The QR code could not be downloaded. Please try again.");
    }
  }

  if (isLoading) return <><Nav/><LoadingState label="Opening a song made just for you…"/></>;
  if (isError || !data) return <><Nav/><div className="shell" style={{ padding: "45px 0" }}><ErrorState retry={() => refetch()} message="This listening page isn’t available right now. Ask the person who shared it to send the link again."/></div></>;
  const ready = data.status === "completed" && !!data.songUrl;
  const hasSavedVideo = ready && !!data.lyricVideoUrl;
  const selectedAudioUrl = audioVersion === "alternate" && data.alternateSongUrl
    ? data.alternateSongUrl
    : data.songUrl;
  return <main><Nav/><section className="shell listen-page">
    <header className="listen-intro">
      <p className="eyebrow">A keepsake, set to music</p>
      <h1 className="display">For {data.recipientName}, with love.</h1>
      <p className="listen-byline">A song made by <strong>{data.senderName}</strong><span aria-hidden="true">·</span>{data.occasion}</p>
    </header>
    <div className={`listen-layout${ready ? "" : " is-pending"}`}>
      <div className="listen-cover">
        {data.coverArtUrl ? <img src={data.coverArtUrl} alt={`Artwork for ${data.title}`} /> : <div className="cover-placeholder"><span>{data.title}</span></div>}
      </div>
      {ready ? <section className="listen-player-card" aria-labelledby="listen-title">
        <p className="eyebrow">A song to keep</p>
        <h2 className="display listen-title" id="listen-title">{data.title}</h2>
        {hasSavedVideo && <div className="listen-media-switch" role="group" aria-label="Choose how to enjoy this gift">
          <button type="button" className={mediaMode === "audio" ? "active" : ""} aria-pressed={mediaMode === "audio"} onClick={() => setMediaMode("audio")}><Headphones size={15}/> Listen</button>
          <button type="button" className={mediaMode === "video" ? "active" : ""} aria-pressed={mediaMode === "video"} onClick={() => setMediaMode("video")}><Video size={15}/> Watch lyrics</button>
        </div>}
        {mediaMode === "video" && hasSavedVideo ? <div className="listen-media-frame">
          <video key={data.lyricVideoUrl} className="listen-saved-video-player" controls playsInline preload="metadata" src={data.lyricVideoUrl ?? undefined}>
            Your browser does not support video playback.
          </video>
        </div> : <div className="listen-track">
          <div className="listen-track-heading">
            <label htmlFor="listen-audio">Listen to the {audioVersion === "original" ? "original" : "alternate"} version</label>
            {data.alternateSongUrl && <div className="listen-version-switch" role="group" aria-label="Choose song version">
              <button type="button" className={audioVersion === "original" ? "active" : ""} aria-pressed={audioVersion === "original"} onClick={() => setAudioVersion("original")}>Original</button>
              <button type="button" className={audioVersion === "alternate" ? "active" : ""} aria-pressed={audioVersion === "alternate"} onClick={() => setAudioVersion("alternate")}>Alternate take</button>
            </div>}
          </div>
          <audio key={selectedAudioUrl} id="listen-audio" className="audio-player" controls preload="metadata" aria-label={`${data.title}, ${audioVersion === "original" ? "original version" : "alternate take"}`} src={selectedAudioUrl ?? undefined}>Your browser does not support audio playback.</audio>
        </div>}
        <p className="listen-note">A little piece of your story, made into something you can return to.</p>
        <div className="listen-share-tools">
          <div className="listen-share-buttons">
            <button type="button" className="btn" onClick={shareGift}><Share2 size={16}/> Share song</button>
            <button type="button" className="btn ghost" onClick={toggleQrCode} aria-expanded={isQrOpen} aria-controls="listen-qr-panel"><QrCode size={16}/> {isQrOpen ? "Hide QR code" : "Get QR code"}</button>
          </div>
          {shareStatus && <p className="hint listen-share-status" role="status">{shareStatus}</p>}
          {isQrOpen && shareUrl && <section className="listen-qr-panel" id="listen-qr-panel" aria-label="QR code for this song">
            <div className="listen-qr-code" ref={qrContainerRef} role="img" aria-label="QR code that opens this song's listening page">
              <QRCodeCanvas value={shareUrl} size={768} level="H" bgColor="#ffffff" fgColor="#1b1014" includeMargin/>
            </div>
            <div className="listen-qr-copy">
              <p className="eyebrow">Add it to a card</p>
              <h3 className="display">Scan to listen</h3>
              <p className="hint">Download the QR image and place it on a printed or digital card. Anyone with the link can listen.</p>
              <label className="listen-url-label" htmlFor="listen-share-url">Song link</label>
              <div className="listen-share-url">
                <input id="listen-share-url" value={shareUrl} readOnly onFocus={event => event.currentTarget.select()} aria-label="Direct song link"/>
                <button type="button" className="btn ghost" onClick={() => copyGiftLink(shareUrl)}><Copy size={15}/> Copy</button>
              </div>
              <button type="button" className="btn secondary listen-download-qr" onClick={downloadQrCode}><Download size={15}/> Download QR (PNG)</button>
            </div>
          </section>}
        </div>
      </section> : <section className="listen-player-card listen-pending" aria-live="polite">
        <div className="brand-mark" aria-hidden="true"><Music2 size={17}/></div>
        <p className="eyebrow">Being made with care</p>
        <h2 className="display listen-title">Your song is on its way.</h2>
        <p className="hint">The person who made this gift is putting the finishing touches on it. Come back soon to hear it.</p>
      </section>}
    </div>
    {hasSavedVideo && <div className="listen-video-download">
      <a className="btn ghost" href={`${data.lyricVideoUrl}&download=1`}><Download size={15}/> Download lyric video</a>
    </div>}
    {ready && data.lyrics && !data.lyricVideoUrl && <LyricVideoMaker
      song={data}
      shareToken={shareToken}
      onVideoSaved={() => { void refetch(); }}
    />}
    <div className="listen-cta">
      <p className="hint">Made with care by {data.senderName}, especially for {data.recipientName}.</p>
      <Link href="/" className="btn secondary">Make a song for someone <ArrowRight size={15}/></Link>
    </div>
  </section><Footer/></main>;
}