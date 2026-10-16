"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Download, Link2, Music2, PenLine, Sparkles, Wand2 } from "lucide-react";

const OCCASIONS = ["Birthday", "Anniversary", "Wedding", "Friendship", "Thank you", "In memory"] as const;
const GENRES = [
  { id: "Pop", tempo: "0.9s" },
  { id: "Acoustic", tempo: "1.6s" },
  { id: "R&B", tempo: "1.3s" },
  { id: "Country", tempo: "1.1s" },
  { id: "Jazz", tempo: "1.8s" },
  { id: "Electronic", tempo: "0.7s" },
] as const;
const MOODS = ["Happy", "Romantic", "Emotional", "Playful", "Calm"] as const;

const CLOSERS: Record<(typeof OCCASIONS)[number], [string, string]> = {
  Birthday: ["Another year around the sun with you", "So here's your song, and every year is a gift"],
  Anniversary: ["Every year I choose you again", "Still you, still us, still home"],
  Wedding: ["Today the whole room hears it", "Two names, one song, forever begins"],
  Friendship: ["Nobody gets me quite the way you do", "Here's to us, and every road we take"],
  "Thank you": ["I never said it loud enough", "So let this song say thank you for me"],
  "In memory": ["You're in every quiet room I walk through", "I carry you, and the song carries on"],
};

const BARS = Array.from({ length: 44 }, (_, i) => 22 + Math.round(Math.abs(Math.sin(i * 1.7) * 60 + Math.cos(i * 0.6) * 18)));

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="sg-field">
      <span className="sg-label" id={`sg-l-${label}`}>{label}</span>
      <div className="sg-chips" role="radiogroup" aria-labelledby={`sg-l-${label}`}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} className={"sg-chip" + (value === o ? " is-on" : "")} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Composer() {
  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number]>("Birthday");
  const [genre, setGenre] = useState<(typeof GENRES)[number]["id"]>("Acoustic");
  const [mood, setMood] = useState<(typeof MOODS)[number]>("Happy");
  const [name, setName] = useState("Mama");
  const [detail, setDetail] = useState("you hum while the kettle boils");

  const tempo = GENRES.find((g) => g.id === genre)!.tempo;
  const who = name.trim() || "Mama";
  const what = detail.trim() || "you hum while the kettle boils";
  const lines = useMemo(() => {
    const [a, b] = CLOSERS[occasion];
    return [`${who}, I remember the way ${what}`, a, b];
  }, [occasion, who, what]);

  return (
    <div className="sg-composer" style={{ ["--tempo" as string]: tempo }}>
      <div className="sg-composer-top">
        <span className="sg-pill"><Sparkles size={13} aria-hidden /> Live preview</span>
        <span className="sg-composer-meta">{genre} · {mood}</span>
      </div>
      <div className="sg-field">
        <label className="sg-label" htmlFor="sg-name">Who is it for?</label>
        <input id="sg-name" className="sg-input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="A name" />
      </div>
      <div className="sg-field">
        <label className="sg-label" htmlFor="sg-detail">A detail only you know</label>
        <input id="sg-detail" className="sg-input" value={detail} maxLength={60} onChange={(e) => setDetail(e.target.value)} placeholder="the way you hum while cooking" />
      </div>
      <Chips label="Occasion" options={OCCASIONS} value={occasion} onChange={setOccasion} />
      <Chips label="Genre" options={GENRES.map((g) => g.id)} value={genre} onChange={setGenre} />
      <Chips label="Mood" options={MOODS} value={mood} onChange={setMood} />
      <div className="sg-lyrics" aria-live="polite">
        {lines.map((l, i) => (
          <p key={i + l}>{l}</p>
        ))}
      </div>
      <div className="sg-wave" aria-hidden>
        {BARS.map((h, i) => (
          <i key={i} style={{ height: `${h}%`, animationDelay: `${(i % 9) * -0.12}s` }} />
        ))}
      </div>
      <Link href="/create" className="sg-btn sg-btn-ink sg-btn-block">
        Write the real thing <ArrowRight size={16} aria-hidden />
      </Link>
      <p className="sg-fine">Illustrative preview. Your actual lyrics are written from your full story, and you edit them before the song is made.</p>
    </div>
  );
}

const STEPS = [
  { icon: PenLine, t: "Tell us about them", d: "Share the memories, the details only you know, and the kind of song you hear in your head." },
  { icon: Wand2, t: "Perfect the lyrics", d: "Read them, edit them, ask for a rewrite. The words aren't final until you say they are." },
  { icon: Music2, t: "Send a song they'll keep", d: "A finished original song with its own listening page, shareable by link, downloadable as MP3." },
];

const SONGS = [
  { tag: "Birthday for Mum", title: "This One's For You, Mama", meta: "Warm & Heartfelt · Acoustic Pop", c: "tomato" },
  { tag: "Wedding Anniversary", title: "Still You", meta: "Romantic & Tender · Soft Pop Ballad", c: "lime" },
  { tag: "Best Friend", title: "Here's To Us", meta: "Fun & Upbeat · Indie Pop", c: "cream" },
  { tag: "In Memory Of", title: "I Carry You", meta: "Gentle & Emotional · Acoustic", c: "ink" },
];

const FEATS = [
  { icon: Sparkles, t: "Personal lyrics", d: "Written from your story, with their name woven in. Every word is yours to review and edit before the song is made.", big: true },
  { icon: Music2, t: "Original song", d: "A real, finished song in the genre you choose. Pop, acoustic, R&B, country, jazz, or electronic." },
  { icon: Download, t: "MP3 download", d: "Download and keep forever. Play it at a party, in the car, or on a quiet evening together." },
  { icon: Link2, t: "Shareable page", d: "Every song gets a personal listening page with a unique link. Send it by text, email, or any app.", big: true },
];

const PLANS = [
  { name: "Single Song", whole: "$9", cents: ".99", blurb: "One original song for one special person.", pkg: "single", items: ["Custom lyrics from your story", "Full original song", "MP3 download", "Shareable listening page"] },
  { name: "Gift Set", whole: "$19", cents: ".99", blurb: "Three songs for the stories still to tell.", pkg: "triple", pop: true, items: ["3 song credits", "Use anytime, for anyone", "Everything in Single Song", "Save 33% per song"] },
  { name: "Collection", whole: "$49", cents: ".99", blurb: "Ten songs for everyone worth remembering.", pkg: "collection", items: ["10 song credits", "Use anytime, for anyone", "Everything in Single Song", "Save 50% per song"] },
];

const FAQ = [
  ["How does it actually work?", "Tell us about the person and the occasion, pick a mood and genre, and we write original lyrics from your story. You edit until every line feels right, then we create the finished song — usually in under three minutes."],
  ["Is every song unique?", "Yes. Every song is written from scratch using your story. The lyrics, melody, and arrangement are all original. No two songs are ever the same."],
  ["Can I change the lyrics?", "Absolutely. You review, edit, and request rewrites until every line is right. The song is only created after you approve the words."],
  ["How long does it take?", "Lyrics are ready in about 30 seconds. The finished song takes 2–3 minutes after you approve the words."],
  ["What genres are available?", "Pop, acoustic, R&B/soul, country, jazz, and electronic — each paired with moods like happy, romantic, emotional, playful, or calm."],
  ["How do I send it to someone?", "Every song gets its own listening page with a unique link. Send it by text, email, or any messaging app. You can also download the MP3."],
];

export default function HomePage() {
  const marquee = [...OCCASIONS, ...OCCASIONS];
  return (
    <main className="sg-home">
      <header className="sg-nav">
        <div className="sg-wrap sg-nav-in">
          <Link href="/" className="sg-logo" aria-label="Song Gift home">
            <span className="sg-logo-mark" aria-hidden><Music2 size={16} /></span>
            Song Gift
          </Link>
          <div className="sg-nav-links" role="navigation" aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#studio">Try it</a>
            <a href="#examples">Examples</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="sg-nav-cta">
            <Link href="/dashboard" className="sg-nav-quiet">My songs</Link>
            <Link href="/account" className="sg-nav-quiet sg-hide-sm">Account</Link>
            <Link href="/create" className="sg-btn sg-btn-ink sg-btn-sm">Make a song</Link>
          </div>
        </div>
      </header>

      <section className="sg-hero">
        <div className="sg-wrap sg-hero-grid">
          <div className="sg-hero-copy">
            <span className="sg-pill sg-pill-ink">Original songs, written from your story</span>
            <h1>Say it with a <em>song</em> made only for them.</h1>
            <p>You share the story. We write the lyrics, you perfect them, and in minutes you have a real, original song, ready to send as a gift.</p>
            <div className="sg-hero-actions">
              <Link href="/create" className="sg-btn sg-btn-lime sg-btn-lg">Create your song <ArrowRight size={18} aria-hidden /></Link>
              <a href="#studio" className="sg-btn sg-btn-line sg-btn-lg">Try the preview</a>
            </div>
            <ul className="sg-hero-facts">
              <li><Check size={15} aria-hidden /> Lyrics in about 30 seconds</li>
              <li><Check size={15} aria-hidden /> Finished song in 2–3 minutes</li>
              <li><Check size={15} aria-hidden /> From $9.99</li>
            </ul>
          </div>
          <div className="sg-hero-art" aria-hidden>
            <div className="sg-disc">
              <div className="sg-disc-ring" />
              <div className="sg-disc-ring r2" />
              <div className="sg-disc-label"><span>For</span><b>someone<br />you love</b></div>
            </div>
            <div className="sg-float f1"><Music2 size={16} /> Verse 1 · written for you</div>
            <div className="sg-float f2">Chorus<br /><small>Their name, your memory</small></div>
            <div className="sg-bars">
              {BARS.slice(0, 16).map((h, i) => (<i key={i} style={{ height: `${h}%`, animationDelay: `${i * -0.15}s` }} />))}
            </div>
          </div>
        </div>
      </section>

      <div className="sg-marquee" aria-hidden>
        <div className="sg-marquee-track">
          {marquee.map((o, i) => (<span key={i}>{o}<i /></span>))}
          {marquee.map((o, i) => (<span key={"b" + i}>{o}<i /></span>))}
        </div>
      </div>

      <section id="how" className="sg-sec">
        <div className="sg-wrap">
          <Reveal className="sg-head">
            <span className="sg-kicker">How it works</span>
            <h2>Three steps to a song that&apos;s theirs alone.</h2>
            <p>You bring the details. We bring the music.</p>
          </Reveal>
          <div className="sg-steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.08} className="sg-step-wrap">
                <article className="sg-step">
                  <span className="sg-step-n">0{i + 1}</span>
                  <span className="sg-step-ic"><s.icon size={22} aria-hidden /></span>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="studio" className="sg-sec sg-dark">
        <div className="sg-wrap sg-studio">
          <Reveal className="sg-studio-copy">
            <span className="sg-kicker sg-kicker-lime">Try it now</span>
            <h2>Hear how a story turns into lyrics.</h2>
            <p>Type a name and one small detail. Pick an occasion, genre and mood. Watch the first lines take shape, then take it all the way in the real studio.</p>
            <Link href="/create" className="sg-btn sg-btn-lime">Start your song <ArrowRight size={16} aria-hidden /></Link>
          </Reveal>
          <Reveal delay={0.1}><Composer /></Reveal>
        </div>
      </section>

      <section id="examples" className="sg-sec">
        <div className="sg-wrap">
          <Reveal className="sg-head">
            <span className="sg-kicker">Song ideas</span>
            <h2>Every song starts with a real story.</h2>
            <p>Four of the kinds of songs people make for someone they love. Yours will sound just as real.</p>
          </Reveal>
          <div className="sg-songs">
            {SONGS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <Link href="/create" className={`sg-song sg-song-${s.c}`}>
                  <div className="sg-song-art" aria-hidden>
                    {Array.from({ length: 5 }).map((_, k) => (<i key={k} style={{ height: `${30 + ((i * 17 + k * 23) % 55)}%` }} />))}
                  </div>
                  <span className="sg-song-tag">{s.tag}</span>
                  <h3>{s.title}</h3>
                  <p>{s.meta}</p>
                  <span className="sg-song-go">Make one like this <ArrowRight size={14} aria-hidden /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="sg-sec sg-tint">
        <div className="sg-wrap">
          <Reveal className="sg-head">
            <span className="sg-kicker">What you get</span>
            <h2>Everything you need. Nothing you don&apos;t.</h2>
          </Reveal>
          <div className="sg-bento">
            {FEATS.map((f, i) => (
              <Reveal key={f.t} delay={i * 0.06} className={"sg-feat-wrap" + (f.big ? " is-big" : "")}>
                <div className="sg-feat">
                  <span className="sg-step-ic"><f.icon size={22} aria-hidden /></span>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="sg-sec">
        <div className="sg-wrap">
          <Reveal className="sg-head">
            <span className="sg-kicker">Pricing</span>
            <h2>Pick the gift that fits.</h2>
            <p>Every package includes lyric editing, original music, MP3 download, and a personal listening page.</p>
          </Reveal>
          <div className="sg-plans">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08} className="sg-plan-wrap">
                <article className={"sg-plan" + (p.pop ? " is-pop" : "")}>
                  {p.pop && <span className="sg-plan-badge">Most loved</span>}
                  <h3>{p.name}</h3>
                  <div className="sg-price">{p.whole}<span>{p.cents}</span></div>
                  <p className="sg-plan-blurb">{p.blurb}</p>
                  <ul>
                    {p.items.map((it) => (<li key={it}><Check size={15} aria-hidden />{it}</li>))}
                  </ul>
                  <Link href={`/create?package=${p.pkg}`} className={"sg-btn sg-btn-block " + (p.pop ? "sg-btn-lime" : "sg-btn-ink")}>Get started</Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="sg-sec sg-tint">
        <div className="sg-wrap sg-faq-grid">
          <Reveal className="sg-faq-head">
            <span className="sg-kicker">FAQ</span>
            <h2>Common questions</h2>
            <p>Still wondering? Write to <a href="mailto:hello@songgift.com">hello@songgift.com</a>.</p>
          </Reveal>
          <div className="sg-faq">
            {FAQ.map(([q, a]) => (
              <details key={q} className="sg-faq-item">
                <summary>{q}<span aria-hidden className="sg-plus" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="sg-final">
        <div className="sg-wrap">
          <Reveal className="sg-final-in">
            <h2>Who is this song for?</h2>
            <p>Take a few minutes. Think of someone. We&apos;ll help you turn the feeling into something they can hear.</p>
            <Link href="/create" className="sg-btn sg-btn-ink sg-btn-lg">Start their song <ArrowRight size={18} aria-hidden /></Link>
          </Reveal>
        </div>
      </section>

      <footer className="sg-footer">
        <div className="sg-wrap sg-foot-in">
          <div>
            <span className="sg-logo"><span className="sg-logo-mark" aria-hidden><Music2 size={16} /></span>Song Gift</span>
            <p>Original songs made from your stories.</p>
          </div>
          <div className="sg-foot-cols">
            <div>
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <a href="#examples">Examples</a>
              <a href="#pricing">Pricing</a>
              <Link href="/create">Make a song</Link>
            </div>
            <div>
              <h4>You</h4>
              <Link href="/dashboard">My songs</Link>
              <Link href="/account">Account</Link>
            </div>
            <div>
              <h4>Support</h4>
              <a href="mailto:hello@songgift.com">Contact</a>
              <a href="#faq">FAQ</a>
            </div>
          </div>
        </div>
        <div className="sg-wrap sg-foot-bot">&copy; Song Gift. All rights reserved.</div>
      </footer>
    </main>
  );
}
