import Link from "next/link";
import { ArrowRight, AudioLines, Heart, Music2, PenLine } from "lucide-react";
import { Footer, Nav } from "@/components/shared";

export default function HomePage() {
  return <main>
    <Nav/>
    <section className="hero"><div className="shell hero-grid">
      <div className="fade-in"><p className="eyebrow">A gift that sounds like you</p><h1 className="display">Some things are too <em>special</em> for a card.</h1><p className="hero-copy">Tell the story only you know. We’ll shape it into a one-of-a-kind song they can play whenever they need to feel close to you.</p><div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}><Link className="btn" href="/create">Create your song <ArrowRight size={16}/></Link><Link className="btn ghost" href="/#how-it-works">See how it works</Link></div><p className="hint" style={{ marginTop: 19 }}>Personal words. Their name. A keepsake that lasts.</p></div>
      <div className="hero-art" aria-label="A keepsake record for a song made with love"><div className="record"><div className="record-label"><span>made<br/>for you<br/><small>song gift</small></span></div></div><div className="art-note note-one">“The long way home, just to finish one more story.”</div><div className="art-note note-two">A memory, turned into a melody.</div></div>
    </div></section>
    <section id="how-it-works" className="section shell"><div className="section-heading"><p className="eyebrow">The making of it</p><h2 className="display">A little story becomes a lot of feeling.</h2><p>We make the process thoughtful and simple. You bring the details that make it yours; we help give them a melody.</p></div><div className="steps-grid">
      <article className="step-card"><span className="step-number">01 — REMEMBER</span><h3>Tell us about them</h3><p>Share the small details, the big milestones, and the things only your people would understand.</p></article>
      <article className="step-card"><span className="step-number">02 — SHAPE</span><h3>Make the words yours</h3><p>Review the lyrics and keep refining until every line feels like it belongs to your story.</p></article>
      <article className="step-card"><span className="step-number">03 — GIVE</span><h3>Send a song to keep</h3><p>Your finished song gets a personal listening page, ready to share with the person who inspired it.</p></article>
    </div></section>
    <section className="quote-band"><blockquote>“It felt like someone had gathered all our little moments and put them somewhere we could hear them.”</blockquote><p>— Emma, celebrating an anniversary</p></section>
    <section className="section shell"><div className="section-heading"><p className="eyebrow">Made for their moment</p><h2 className="display">For the ordinary things that mean everything.</h2></div><div className="steps-grid">
      <article className="step-card"><Heart size={18} color="#bb5d4e"/><h3>For your person</h3><p>A partner, parent, best friend, or the person who always shows up.</p></article>
      <article className="step-card"><PenLine size={18} color="#bb5d4e"/><h3>For a day worth keeping</h3><p>An anniversary, a milestone, a thank-you, or simply because.</p></article>
      <article className="step-card"><AudioLines size={18} color="#bb5d4e"/><h3>For the words you mean</h3><p>Specific memories make a song feel unmistakably theirs.</p></article>
    </div></section>
    <section id="pricing" className="section shell"><div className="section-heading"><p className="eyebrow">A song they can keep</p><h2 className="display">Choose the gift that feels right.</h2><p>Every song begins with your story, and every package includes time to review and edit the lyrics before music is made.</p></div><div className="price-grid">
      <article className="price-card"><p className="eyebrow">A keepsake</p><h3>Single Song</h3><p className="amount">$9.99</p><p className="price-detail">One original song for one special person.</p><Link href="/create?package=single" className="btn ghost">Choose Single Song</Link></article>
      <article className="price-card featured"><span className="price-badge">Most popular</span><p className="eyebrow">More to remember</p><h3>Gift Set</h3><p className="amount">$19.99</p><p className="price-detail">Three song credits for the stories still to tell.</p><Link href="/create?package=triple" className="btn">Choose Gift Set</Link></article>
      <article className="price-card"><p className="eyebrow">For your collection</p><h3>Collection</h3><p className="amount">$49.99</p><p className="price-detail">Ten song credits for the people and moments you want to keep close.</p><Link href="/create?package=collection" className="btn ghost">Choose Collection</Link></article>
    </div></section>
    <section className="shell section" style={{ paddingTop: 10 }}><div className="cta-panel"><div><p className="eyebrow">Start with one memory</p><h2 className="display">Who is this song for?</h2><p className="hero-copy" style={{ fontSize: 15, margin: 0 }}>Take a few quiet minutes. We’ll help with the rest.</p></div><Link href="/create" className="btn">Begin their song <Music2 size={16}/></Link></div></section>
    <Footer/>
  </main>;
}