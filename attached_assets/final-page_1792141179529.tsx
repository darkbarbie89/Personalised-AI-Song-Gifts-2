import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">
      {/* NAV */}
      <nav className="hp-nav">
        <div className="hp-shell hp-nav-inner">
          <Link href="/" className="hp-nav-logo">
            <span className="hp-nav-note">♪</span> song gift
          </Link>
          <div className="hp-nav-links">
            <a href="#how">How it works</a>
            <a href="#songs">Listen</a>
            <a href="#pricing">Pricing</a>
          </div>
          <Link className="hp-btn hp-btn-sm" href="/create">Make a song</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hp-hero">
        <div className="hp-shell">
          <div className="hp-hero-text">
            <h1>Turn your favorite memory into a song they&apos;ll keep forever.</h1>
            <p className="hp-hero-sub">You share the story. We write the lyrics, you perfect them, and in minutes you have a real, original song — ready to send as a gift.</p>
            <div className="hp-hero-actions">
              <Link className="hp-btn" href="/create">Create your song</Link>
              <a className="hp-btn hp-btn-ghost" href="#songs">Listen to examples</a>
            </div>
            <div className="hp-proof">
              <div className="hp-proof-avatars">
                <span style={{ background: "#f472b6" }}>A</span>
                <span style={{ background: "#60a5fa" }}>M</span>
                <span style={{ background: "#34d399" }}>J</span>
                <span style={{ background: "#fbbf24" }}>R</span>
              </div>
              <p><strong>2,400+</strong> songs made for someone special</p>
            </div>
          </div>

          <div className="hp-hero-visual">
            {/* Organic blobs */}
            <div className="hp-blob hp-blob-1"></div>
            <div className="hp-blob hp-blob-2"></div>
            <div className="hp-blob hp-blob-3"></div>

            {/* Photo cutout */}
            <div className="hp-hero-photo">
              <img src="/images/hero-person.png" alt="Two people smiling and listening to a song together on headphones" />
            </div>

            {/* Floating reaction bubbles — positioned OUTSIDE the photo */}
            <div className="hp-bubble hp-bubble-1">
              <span className="hp-bubble-dot" style={{ background: "#f472b6" }}>S</span>
              <span>How was the surprise? 🥺</span>
            </div>
            <div className="hp-bubble hp-bubble-2">
              <span className="hp-bubble-dot" style={{ background: "#60a5fa" }}>J</span>
              <span>She cried happy tears!! 😭</span>
            </div>
            <div className="hp-bubble hp-bubble-3">
              <span className="hp-bubble-dot" style={{ background: "#34d399" }}>A</span>
              <span>Really Amazing 😍🎶</span>
            </div>

            {/* Now Playing mini card */}
            <div className="hp-now-playing">
              <div className="hp-np-icon">♪</div>
              <div>
                <strong>Now Playing</strong>
                <span>This One&apos;s For You, Mama</span>
              </div>
            </div>

            {/* Emoji accents */}
            <span className="hp-float-emoji hp-fe-1">😍</span>
            <span className="hp-float-emoji hp-fe-2">❤️</span>
          </div>
        </div>
      </section>

      {/* SOCIAL BAR */}
      <section className="hp-social-bar">
        <div className="hp-shell hp-social-inner">
          <div className="hp-social-dot"></div>
          <div className="hp-social-text">
            <small>Listen to a real song we made</small>
            <span>&quot;This One&apos;s For You, Mama&quot; — a birthday gift from her daughter</span>
          </div>
          <button className="hp-btn hp-btn-sm" type="button">▶ Play sample</button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="hp-section">
        <div className="hp-shell">
          <div className="hp-section-intro">
            <h2>Three steps to a song that&apos;s theirs alone.</h2>
            <p>You bring the details. We bring the music.</p>
          </div>
          <div className="hp-steps">
            <article className="hp-step">
              <div className="hp-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <h3>Tell us about them</h3>
              <p>Share the memories, the details only you know, and the kind of song you hear in your head.</p>
            </article>
            <article className="hp-step">
              <div className="hp-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3>Perfect the lyrics</h3>
              <p>Read them, edit them, ask for a rewrite — the words aren&apos;t final until you say they are.</p>
            </article>
            <article className="hp-step">
              <div className="hp-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <h3>Send a song they&apos;ll keep</h3>
              <p>A finished original song with its own listening page, shareable by link, downloadable as MP3.</p>
            </article>
          </div>
        </div>
      </section>

      {/* DEMO SONGS */}
      <section id="songs" className="hp-section hp-section-alt">
        <div className="hp-shell">
          <div className="hp-section-intro">
            <h2>Every song starts with a real story.</h2>
            <p>These are songs people made for someone they love. Yours will sound just as real.</p>
          </div>
          <div className="hp-songs">
            <article className="hp-song-card">
              <div className="hp-song-art hp-song-emerald">
                <button className="hp-song-play" type="button" aria-label="Play This One's For You, Mama">
                  <svg width="18" height="18" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="white"/></svg>
                </button>
              </div>
              <span className="hp-song-tag">Birthday for Mum</span>
              <h3>This One&apos;s For You, Mama</h3>
              <p>Warm &amp; Heartfelt · Acoustic Pop</p>
            </article>
            <article className="hp-song-card">
              <div className="hp-song-art hp-song-amber">
                <button className="hp-song-play" type="button" aria-label="Play Still You">
                  <svg width="18" height="18" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="white"/></svg>
                </button>
              </div>
              <span className="hp-song-tag">Wedding Anniversary</span>
              <h3>Still You</h3>
              <p>Romantic &amp; Tender · Soft Pop Ballad</p>
            </article>
            <article className="hp-song-card">
              <div className="hp-song-art hp-song-blue">
                <button className="hp-song-play" type="button" aria-label="Play Here's To Us">
                  <svg width="18" height="18" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="white"/></svg>
                </button>
              </div>
              <span className="hp-song-tag">Best Friend</span>
              <h3>Here&apos;s To Us</h3>
              <p>Fun &amp; Upbeat · Indie Pop</p>
            </article>
            <article className="hp-song-card">
              <div className="hp-song-art hp-song-violet">
                <button className="hp-song-play" type="button" aria-label="Play I Carry You">
                  <svg width="18" height="18" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="white"/></svg>
                </button>
              </div>
              <span className="hp-song-tag">In Memory Of</span>
              <h3>I Carry You</h3>
              <p>Gentle &amp; Emotional · Acoustic</p>
            </article>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="hp-section">
        <div className="hp-shell">
          <div className="hp-section-intro">
            <h2>People don&apos;t forget a gift like this.</h2>
          </div>
          <div className="hp-testimonials">
            <article className="hp-testimonial">
              <div className="hp-stars">★★★★★</div>
              <blockquote>&ldquo;It felt like someone gathered all our little moments and put them somewhere we could hear them.&rdquo;</blockquote>
              <footer>
                <span className="hp-t-avatar" style={{ background: "linear-gradient(135deg,#f472b6,#ec4899)" }}>E</span>
                <div>
                  <strong>Emma L.</strong>
                  <span>Anniversary gift for husband</span>
                </div>
              </footer>
            </article>
            <article className="hp-testimonial">
              <div className="hp-stars">★★★★★</div>
              <blockquote>&ldquo;My mum couldn&apos;t stop crying. She plays it every morning now. Best gift I&apos;ve ever given.&rdquo;</blockquote>
              <footer>
                <span className="hp-t-avatar" style={{ background: "linear-gradient(135deg,#60a5fa,#3b82f6)" }}>D</span>
                <div>
                  <strong>David K.</strong>
                  <span>Birthday gift for mum</span>
                </div>
              </footer>
            </article>
            <article className="hp-testimonial">
              <div className="hp-stars">★★★★★</div>
              <blockquote>&ldquo;We played it at the reception. There wasn&apos;t a dry eye in the room.&rdquo;</blockquote>
              <footer>
                <span className="hp-t-avatar" style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}>P</span>
                <div>
                  <strong>Priya S.</strong>
                  <span>Wedding gift for best friend</span>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="hp-section hp-section-alt">
        <div className="hp-shell">
          <div className="hp-section-intro">
            <h2>Everything you need. Nothing you don&apos;t.</h2>
          </div>
          <div className="hp-features">
            <div className="hp-feat">
              <div className="hp-feat-icon">✦</div>
              <h3>Personal lyrics</h3>
              <p>Written from your story, with their name woven in. Every word is yours to review and edit before the song is made.</p>
            </div>
            <div className="hp-feat">
              <div className="hp-feat-icon">♪</div>
              <h3>Original song</h3>
              <p>A real, finished song in the genre you choose. Pop, acoustic, R&amp;B, country, jazz, or electronic.</p>
            </div>
            <div className="hp-feat">
              <div className="hp-feat-icon">↓</div>
              <h3>MP3 download</h3>
              <p>Download and keep forever. Play it at a party, in the car, or on a quiet evening together.</p>
            </div>
            <div className="hp-feat">
              <div className="hp-feat-icon">⇗</div>
              <h3>Shareable page</h3>
              <p>Every song gets a personal listening page with a unique link. Send it by text, email, or any app.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="hp-section">
        <div className="hp-shell">
          <div className="hp-section-intro">
            <h2>Pick the gift that fits.</h2>
            <p>Every package includes lyric editing, original music, MP3 download, and a personal listening page.</p>
          </div>
          <div className="hp-pricing">
            <article className="hp-price-card">
              <h3>Single Song</h3>
              <div className="hp-price">$9<span>.99</span></div>
              <p>One original song for one special person.</p>
              <ul>
                <li>Custom lyrics from your story</li>
                <li>Full original song</li>
                <li>MP3 download</li>
                <li>Shareable listening page</li>
              </ul>
              <Link className="hp-btn hp-btn-ghost hp-btn-block" href="/create?package=single">Get started</Link>
            </article>
            <article className="hp-price-card hp-price-pop">
              <div className="hp-price-badge">Most loved</div>
              <h3>Gift Set</h3>
              <div className="hp-price">$19<span>.99</span></div>
              <p>Three songs for the stories still to tell.</p>
              <ul>
                <li>3 song credits</li>
                <li>Use anytime, for anyone</li>
                <li>Everything in Single Song</li>
                <li>Save 33% per song</li>
              </ul>
              <Link className="hp-btn hp-btn-block" href="/create?package=triple">Get started</Link>
            </article>
            <article className="hp-price-card">
              <h3>Collection</h3>
              <div className="hp-price">$49<span>.99</span></div>
              <p>Ten songs for everyone worth remembering.</p>
              <ul>
                <li>10 song credits</li>
                <li>Use anytime, for anyone</li>
                <li>Everything in Single Song</li>
                <li>Save 50% per song</li>
              </ul>
              <Link className="hp-btn hp-btn-ghost hp-btn-block" href="/create?package=collection">Get started</Link>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="hp-section hp-section-alt">
        <div className="hp-shell">
          <div className="hp-section-intro">
            <h2>Common questions</h2>
          </div>
          <div className="hp-faq">
            <details className="hp-faq-item">
              <summary>How does it actually work?</summary>
              <p>Tell us about the person and the occasion, pick a mood and genre, and we write original lyrics from your story. You edit until every line feels right, then we create the finished song — usually in under three minutes.</p>
            </details>
            <details className="hp-faq-item">
              <summary>Is every song unique?</summary>
              <p>Yes. Every song is written from scratch using your story. The lyrics, melody, and arrangement are all original. No two songs are ever the same.</p>
            </details>
            <details className="hp-faq-item">
              <summary>Can I change the lyrics?</summary>
              <p>Absolutely. You review, edit, and request rewrites until every line is right. The song is only created after you approve the words.</p>
            </details>
            <details className="hp-faq-item">
              <summary>How long does it take?</summary>
              <p>Lyrics are ready in about 30 seconds. The finished song takes 2–3 minutes after you approve the words.</p>
            </details>
            <details className="hp-faq-item">
              <summary>What genres are available?</summary>
              <p>Pop, acoustic, R&amp;B/soul, country, jazz, and electronic — each paired with moods like happy, romantic, emotional, playful, or calm.</p>
            </details>
            <details className="hp-faq-item">
              <summary>How do I send it to someone?</summary>
              <p>Every song gets its own listening page with a unique link. Send it by text, email, or any messaging app. You can also download the MP3.</p>
            </details>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="hp-section hp-cta-section">
        <div className="hp-shell">
          <div className="hp-cta">
            <h2>Who is this song for?</h2>
            <p>Take a few minutes. Think of someone. We&apos;ll help you turn the feeling into something they can hear.</p>
            <Link className="hp-btn hp-btn-lg" href="/create">Start their song</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="hp-footer">
        <div className="hp-shell hp-footer-inner">
          <div className="hp-footer-brand">
            <span className="hp-nav-logo"><span className="hp-nav-note">♪</span> song gift</span>
            <p>Original songs made from your stories.</p>
          </div>
          <div className="hp-footer-links">
            <div>
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <a href="#songs">Examples</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div>
              <h4>Support</h4>
              <a href="mailto:hello@songgift.com">Contact</a>
              <a href="#faq">FAQ</a>
            </div>
          </div>
          <div className="hp-footer-bottom">
            <p>&copy; 2024 Song Gift. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
