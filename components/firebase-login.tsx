"use client";

import { FormEvent, useState } from "react";
import { Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { FIREBASE_SIGN_IN_URL } from "@/lib/firebase-config";

function friendlyFirebaseError(code: string) {
  if (["INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD"].includes(code)) {
    return "Email বা password সঠিক নয়।";
  }
  if (code === "USER_DISABLED") return "এই account-টি disabled করা আছে।";
  if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") return "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করো।";
  if (code === "INVALID_EMAIL") return "সঠিক email address দাও।";
  return "Login করা যায়নি। Email ও password আবার যাচাই করো।";
}

type FirebaseSignInResponse = {
  idToken?: string;
  email?: string;
  localId?: string;
  error?: { message?: string };
};

export default function FirebaseLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const firebaseResponse = await fetch(FIREBASE_SIGN_IN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
      });
      const firebaseData = (await firebaseResponse.json()) as FirebaseSignInResponse;
      if (!firebaseResponse.ok || !firebaseData.idToken) {
        throw new Error(friendlyFirebaseError(firebaseData.error?.message || ""));
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ idToken: firebaseData.idToken }),
      });
      const sessionData = (await sessionResponse.json()) as { error?: string };
      if (!sessionResponse.ok) throw new Error(sessionData.error || "Secure session তৈরি করা যায়নি।");

      setPassword("");
      window.location.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login করা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="jf-auth-screen">
      <div className="jf-auth-bg" aria-hidden="true">
        <div className="jf-auth-orb jf-auth-orb-a" />
        <div className="jf-auth-orb jf-auth-orb-b" />
        <div className="jf-auth-stars" />
        <div className="jf-auth-grid" />
      </div>

      <section className="jf-auth-stage">
        <div className="jf-auth-mark" aria-hidden="true">
          <span className="jf-auth-mark-ring" />
          <span className="jf-auth-mark-core"><Sparkles size={24} /></span>
        </div>

        <form className="jf-auth-card" onSubmit={submit}>
          <span className="jf-auth-corner jf-auth-corner-tl" />
          <span className="jf-auth-corner jf-auth-corner-tr" />
          <span className="jf-auth-corner jf-auth-corner-bl" />
          <span className="jf-auth-corner jf-auth-corner-br" />

          <div className="jf-auth-eyebrow"><ShieldCheck size={14} /> Secure Ledger Access</div>
          <h1>JasimFlowX</h1>
          <p className="jf-auth-subtitle">Your private ledger, available from any device.</p>

          <label className="jf-auth-field">
            <span><Mail size={14} /> Email</span>
            <div className="jf-auth-input-wrap">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@gmail.com"
                required
              />
            </div>
          </label>

          <label className="jf-auth-field">
            <span><Lock size={14} /> Password</span>
            <div className="jf-auth-input-wrap">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
          </label>

          {error && <div className="jf-auth-error" role="alert">{error}</div>}

          <button className="jf-auth-submit" type="submit" disabled={busy}>
            {busy ? <><span className="jf-auth-spinner" /> Signing in…</> : <>Enter JasimFlowX <span>→</span></>}
          </button>

          <p className="jf-auth-footnote">Email/password is verified by Firebase Authentication. Your ledger data remains in Cloudflare D1.</p>
        </form>
      </section>
    </main>
  );
}
