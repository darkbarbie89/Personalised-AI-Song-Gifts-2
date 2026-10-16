"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle, Music2 } from "lucide-react";
import { useCreateAuthSession } from "@workspace/api-client-react";
import { Nav } from "@/components/shared";

export default function AccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const exchange = useCreateAuthSession();
  const queryClient = useQueryClient();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) { setMessage("Account sign-in is not configured yet. Please try again later."); setBusy(false); return; }
    const supabase = createClient(url, anon);
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/account" } });
      if (result.error) throw result.error;
      const token = result.data.session?.access_token;
      if (!token) {
        setMessage("Your account is ready. Check your email to confirm it, then come back here to sign in.");
        setMode("signin");
        return;
      }
      await exchange.mutateAsync({ data: { accessToken: token } });
      queryClient.clear();
      const next = new URLSearchParams(window.location.search).get("next");
      const destination = next === "create" ? "/create" : next;
      const safeDestination = destination && /^\/(?:create|dashboard|studio\/[a-f0-9-]{36})(?:\?|$)/i.test(destination)
        ? destination : "/dashboard";
      router.push(safeDestination);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "We couldn’t complete sign-in. Please try again.");
    } finally { setBusy(false); }
  }

  return <main><Nav/><div className="auth-experience"><div className="auth-photo"><img src="/images/generations-listening.jpg" alt="Two people listening to music together"/><div><span>Made from a real story</span><strong>A song they can return to.</strong></div></div><div className="auth-wrap"><section className="form-card auth-card">
    <div className="brand-mark"><Music2 size={17}/></div><p className="eyebrow" style={{ marginTop: 23 }}>Your songs, together</p><h1 className="display">{mode === "signin" ? "Welcome back." : "Let’s keep this close."}</h1><p className="hint">Sign in to find your song gifts, or make an account to begin a new one.</p>
    <div className="auth-switch"><button className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setMessage(""); }}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(""); }}>Create account</button></div>
    <form onSubmit={submit}><div className="field"><label htmlFor="email">Email address</label><input className="input" id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></div><div className="field"><label htmlFor="password">Password</label><input className="input" id="password" type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></div>
      {message && <div className="notice" role="alert">{message}</div>}
      <button className="btn" style={{ width: "100%", marginTop: 8 }} disabled={busy || exchange.isPending}>{busy || exchange.isPending ? <><LoaderCircle size={16}/> One moment…</> : mode === "signin" ? "Sign in to your account" : "Create my account"}</button></form>
    <p className="hint" style={{ textAlign: "center", marginTop: 20 }}>Your story draft stays saved on this device while you sign in.</p>
    <button className="btn ghost" style={{ marginTop: 16 }} onClick={() => router.push("/create")}><ArrowLeft size={14}/> Back to your story</button>
  </section></div></div></main>;
}