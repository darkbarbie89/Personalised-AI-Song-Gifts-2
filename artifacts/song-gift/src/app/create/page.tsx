"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { useCreateCheckout } from "@workspace/api-client-react";
import type { CheckoutInput, CheckoutInputPackage } from "@workspace/api-client-react";
import { Nav, Footer } from "@/components/shared";

const DRAFT_KEY = "song-gift-brief";
const initial: CheckoutInput = { recipientName: "", relationship: "", occasion: "", story: "", mood: "", genre: "", package: "single", useCredit: false };
const steps = ["Their story", "The occasion", "The sound", "Your package"];
const packages: { id: CheckoutInputPackage; title: string; amount: string; credits: string; note: string }[] = [
  { id: "single", title: "Single Song", amount: "$9.99", credits: "1 song credit", note: "One original song, made for one special person." },
  { id: "triple", title: "Gift Set", amount: "$19.99", credits: "3 song credits", note: "Three songs for the stories still to tell." },
  { id: "collection", title: "Collection", amount: "$49.99", credits: "10 song credits", note: "A collection of songs to keep close." },
];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<CheckoutInput>(initial);
  const createCheckout = useCreateCheckout();
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const packageFromUrl = packages.find(p => p.id === params.get("package"))?.id;
    let restored = { ...initial };
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
      for (const key of ["recipientName", "relationship", "occasion", "story", "mood", "genre"] as const) {
        if (typeof saved?.[key] === "string") restored[key] = saved[key];
      }
      if (packages.some(p => p.id === saved?.package)) restored.package = saved.package;
    } catch { /* Ignore malformed or unavailable browser storage, not the URL package. */ }
    if (packageFromUrl) restored.package = packageFromUrl;
    setBrief(restored);
    if (params.get("checkout") === "cancelled") setError("Checkout was cancelled. No payment was completed; you can review your details and try again.");
  }, []);
  function update<K extends keyof CheckoutInput>(key: K, value: CheckoutInput[K]) {
    const next = { ...brief, [key]: value };
    setBrief(next);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); }
    catch { setError("Browser storage is unavailable. Keep this tab open so you don’t lose your story."); }
  }
  const canContinue = step === 0 ? brief.recipientName.trim().length > 0 && brief.relationship.trim().length > 0 && brief.story.trim().length >= 50 : step === 1 ? brief.occasion.trim().length > 0 : step === 2 ? !!brief.mood && !!brief.genre : true;
  async function submit() {
    setError("");
    if (createCheckout.isPending) return;
    if (!brief.recipientName.trim() || !brief.relationship.trim() || brief.story.trim().length < 50 || !brief.occasion || !brief.mood || !brief.genre) {
      setStep(0);
      setError("Please complete all of your song details before checkout.");
      return;
    }
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!brief.useCredit && !/^pk_(test|live)_/.test(publishableKey ?? "")) {
      setError("Stripe checkout is not configured. Please try again once the public payment key is set.");
      return;
    }
    try {
      const result = await createCheckout.mutateAsync({ data: brief });
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else { try { localStorage.removeItem(DRAFT_KEY); } catch {} router.push(`/studio/${result.songId}`); }
    } catch (e) {
      const message = e instanceof Error ? e.message : "We couldn’t save your story just yet.";
       if ((e as { status?: number })?.status === 401 || /unauthorized|sign in|authentication|session/i.test(message)) router.push("/account?next=create");
      else setError(message || "We couldn’t save your story just yet. Please try again.");
    }
  }
  return <main><Nav/><div className="shell page-top story-page-hero"><div><p className="eyebrow">Your song begins here</p><h1 className="display">A few details. A lifetime of meaning.</h1><p>Tell us about your person, then choose the sound and package that feel right.</p></div><img src="/images/writing-story.jpg" alt="A person writing a meaningful story in a notebook"/></div>
    <div className="shell wizard-layout"><aside className="wizard-rail">{steps.map((title, i) => <div key={title} className={`rail-item ${step === i ? "active" : ""}`}><span className="rail-dot">{i < step ? <Check size={13}/> : i + 1}</span>{title}</div>)}</aside>
    <section className="form-card">
      <p className="eyebrow">Step {step + 1} of 4</p>
      {step === 0 && <div className="fade-in"><h2 className="display" style={{ fontSize: 38, margin: "12px 0" }}>Who is this song for?</h2><p className="hint">The more personal the details, the more unmistakably theirs it can feel.</p>
        <div className="field"><label htmlFor="recipient">Their name</label><input className="input" id="recipient" maxLength={80} placeholder="The name you call them" value={brief.recipientName} onChange={e => update("recipientName", e.target.value)}/></div>
        <div className="field"><label htmlFor="relationship">Your relationship to them</label><select className="select" id="relationship" value={brief.relationship} onChange={e => update("relationship", e.target.value)}><option value="">Choose a relationship</option>{["partner", "parent", "child", "friend", "sibling", "colleague", "other"].map(x => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select></div>
        <div className="field"><label htmlFor="story">What should the song remember?</label><textarea className="textarea" id="story" maxLength={5000} placeholder="A moment you still talk about, a phrase they always say, the way they showed up when it mattered…" value={brief.story} onChange={e => update("story", e.target.value)}/><small>{brief.story.length} characters · tell us at least 50</small><div className="prompt-list"><span>What makes them special?</span><span>A favourite memory together?</span><span>What do you want them to know?</span></div></div>
      </div>}
      {step === 1 && <div className="fade-in"><h2 className="display" style={{ fontSize: 38, margin: "12px 0" }}>What are you celebrating?</h2><p className="hint">The occasion gives the song its place in your story.</p>
        <div className="field"><label htmlFor="occasion">The occasion</label><select className="select" id="occasion" value={brief.occasion} onChange={e => update("occasion", e.target.value)}><option value="">Choose an occasion</option>{["Birthday", "Wedding", "Anniversary", "Mother’s Day", "Father’s Day", "Valentine’s", "Christmas", "Memorial", "Baby shower", "Graduation", "Just because"].map(x => <option key={x} value={x}>{x}</option>)}</select></div>
      </div>}
      {step === 2 && <div className="fade-in"><h2 className="display" style={{ fontSize: 38, margin: "12px 0" }}>What should it feel like?</h2><p className="hint">Choose a mood and a musical direction. There’s no wrong answer.</p>
        <div className="field"><label>Mood</label><div className="choices">{["Happy & Upbeat", "Romantic & Tender", "Emotional & Heartfelt", "Fun & Playful", "Calm & Peaceful"].map(x => <button key={x} type="button" className={`choice ${brief.mood === x ? "selected" : ""}`} onClick={() => update("mood", x)}>{x}</button>)}</div></div>
        <div className="field"><label>Musical style</label><div className="choices">{["Pop", "Acoustic", "R&B/Soul", "Country", "Jazz", "Electronic"].map(x => <button key={x} type="button" className={`choice ${brief.genre === x ? "selected" : ""}`} onClick={() => update("genre", x)}>{x}</button>)}</div></div>
      </div>}
      {step === 3 && <div className="fade-in"><h2 className="display" style={{ fontSize: 38, margin: "12px 0" }}>Choose how you’d like to begin.</h2><p className="hint">Select the package that feels right for the stories you want to turn into songs.</p><div className="packages">{packages.map(p => <button type="button" key={p.id} className={`package ${brief.package === p.id ? "selected" : ""}`} onClick={() => update("package", p.id)}><span className="eyebrow">{p.id === "single" ? "A keepsake" : p.id === "triple" ? "Most popular" : "For your collection"}</span><h3>{p.title}</h3><strong>{p.amount}</strong><p>{p.credits} · {p.note}</p></button>)}</div><p className="hint" style={{ marginTop: 18 }}>Secure checkout by Stripe. You’ll review your lyrics before the song is made.</p></div>}
      {error && <div className="notice" role="alert">{error}<span style={{ display: "block", marginTop: 8 }}>Your draft is saved here. <Link href="/account?next=create" style={{ fontWeight: 700, textDecoration: "underline" }}>Sign in and continue</Link></span></div>}
      <div className="wizard-actions">{step > 0 ? <button className="btn ghost" onClick={() => setStep(s => s - 1)}><ArrowLeft size={15}/> Back</button> : <span/>}
        {step < 3 ? <button className="btn" disabled={!canContinue} onClick={() => setStep(s => s + 1)}>Continue <ArrowRight size={15}/></button> : <button className="btn" disabled={createCheckout.isPending || !canContinue} onClick={submit}>{createCheckout.isPending ? <><LoaderCircle size={15}/> Saving your story…</> : <>Continue to your song <ArrowRight size={15}/></>}</button>}</div>
      <p className="hint" style={{ textAlign: "center", marginTop: 22 }}>Already started? <Link href="/account" style={{ color: "var(--coral-dark)", fontWeight: 700 }}>Sign in</Link></p>
    </section></div><Footer/>
  </main>;
}