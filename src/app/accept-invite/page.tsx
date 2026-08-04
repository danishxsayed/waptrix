"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

function AcceptInviteInner() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get("token") ?? "";

  const [mode, setMode]       = useState<"signup" | "login">("signup");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid invite link — no token found.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { error: signupErr } = await supabase.auth.signUp({ email, password });
        if (signupErr) throw new Error(signupErr.message);
        // After signup Supabase auto-signs them in (email confirmation disabled = immediate session)
      } else {
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (loginErr) throw new Error(loginErr.message);
      }

      // Now accept the invite
      const res  = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to accept invite");

      setSuccess(true);
      setTimeout(() => { window.location.href = "/"; }, 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-jade/10 border border-jade/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-jade" />
          </div>
          <h2 className="text-xl font-bold font-syne text-text-primary mb-2">You're in! 🎉</h2>
          <p className="text-sm text-text-muted">Redirecting you to the dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-jade text-bg px-4 py-2.5 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(16,185,129,0.35)]">W</div>
            <span className="text-jade text-2xl font-extrabold tracking-tight font-syne">Waptrix</span>
          </div>
          <h1 className="text-2xl font-bold font-syne text-text-primary">You've been invited!</h1>
          <p className="text-sm text-text-muted mt-1">
            {mode === "signup"
              ? "Create your account to join the team."
              : "Sign in to accept your invitation."}
          </p>
        </div>

        <div className="glass-card">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-6 bg-surface rounded-xl p-1">
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === "signup" ? "bg-jade text-bg" : "text-text-muted hover:text-text-primary"}`}
            >
              New account
            </button>
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === "login" ? "bg-jade text-bg" : "text-text-muted hover:text-text-primary"}`}
            >
              I have an account
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 mb-4">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Create a password" : "Your password"}
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  className="w-full pl-9 pr-10 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining team…</>
                : mode === "signup" ? "Create account & join" : "Sign in & join team"
              }
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-4">
            Already have an account?{" "}
            <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-jade font-semibold hover:underline">
              {mode === "signup" ? "Sign in instead" : "Create new account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 text-jade animate-spin" />
      </div>
    }>
      <AcceptInviteInner />
    </Suspense>
  );
}
