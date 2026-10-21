"use client";

import Link from "next/link";
import { Music2, ArrowRight, Heart, RefreshCw } from "lucide-react";

export function Brand({ ariaLabel }: { ariaLabel?: string }) {
  return <Link href="/" className="brand" aria-label={ariaLabel ?? "SingaGift home"}>
    <span className="brand-mark" aria-hidden="true"><Music2 size={16}/></span>
    <span>SingaGift</span>
  </Link>;
}

export function Nav() {
  return <header className="shell nav"><Brand/><nav className="nav-links"><Link className="hide-mobile" href="/#how">How it works</Link><Link className="hide-mobile" href="/dashboard">My songs</Link><Link href="/account" className="btn">Account <ArrowRight size={15}/></Link></nav></header>;
}

export function Footer() {
  return <footer className="shell footer"><Brand/><span>A little piece of your story, kept in song.</span><nav className="footer-links" aria-label="Footer"><Link href="/#pricing">Pricing</Link><Link href="/create">Create a song</Link><Link href="/account">Your account</Link></nav><span>Made for the people who matter.</span></footer>;
}

export function LoadingState({ label = "Gathering your songs…" }: { label?: string }) {
  return <div className="shell" style={{ padding: "35px 0 90px" }} aria-live="polite"><div className="skeleton" style={{ height: 42, width: "42%", marginBottom: 24 }}/><div className="skeleton" style={{ height: 160, marginBottom: 12 }}/><div className="skeleton" style={{ height: 95 }}/><p className="hint">{label}</p></div>;
}

export function ErrorState({ retry, message = "We couldn't bring this page together just now." }: { retry?: () => void; message?: string }) {
  return <div className="empty-state"><Heart size={25} color="#cc6554"/><h2>A small pause</h2><p>{message}</p>{retry && <button className="btn secondary" onClick={retry}><RefreshCw size={15}/> Try again</button>}</div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="brand-mark" style={{ margin: "0 auto" }}><Music2 size={17}/></span><h2>{title}</h2><p>{body}</p>{action}</div>;
}