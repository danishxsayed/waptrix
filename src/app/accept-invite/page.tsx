"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

function AcceptInviteInner() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get("token") ?? "";

  const [mode, setMode]           = useState<"signup" | "login">("signup");
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  // On mount: resolve invited email from token, then sign out any existing session
  useEffect(() => {
    if (!token) {
      setError("Invalid invite link — no token found.");
      setInitLoading(false);
      return;
    }

    async function init() {
      try {
        // 1. Fetch the invited email for this token (no auth needed)
        const res = await fetch(`/api/team/invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid or expired invite link.");
          return;
        }

        setInvitedEmail(data.email);

        // 2. Sign out any existing session so it doesn't interfere
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // If they're already signed in with the RIGHT email, skip auth entirely on submit
          if (user.email?.toLowerCase() === data.email.toLowerCase()) {
            // Already signed in as the correct user — jump straight to accepting
            await acceptInvite();
            return;
          }
          // Wrong account — sign out first
          await supabase.auth.signOut();
        }
      } catch {
        setError("Failed to load invite. Please try again.");
      } finally {
        setInitLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const acceptInvite = async () => {
    const res  = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to accept invite");
    setSuccess(true);
    setTimeout(() => { window.location.href = "/"; }, 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitedEmail) return;
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { error: signupErr } = await supabase.auth.signUp({ email: invitedEmail, password });
        if (signupErr) throw new Error(signupErr.message);
      } else {
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email: invitedEmail, password });
        if (loginErr) throw new Error(loginErr.message);
      }

      // Wait for the session cookie to be set before calling the server
      await new Promise(r => setTimeout(r, 500));

      await acceptInvite();
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

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 text-jade animate-spin" />
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
          {invitedEmail && (
            <p className="text-xs text-jade mt-2 bg-jade/10 border border-jade/20 rounded-xl px-4 py-2">
              Invited as <strong>{invitedEmail}</strong>
            </p>
          )}
        </div>

        <div className="glass-card">
          {/* Mode toggle — only show if we have an email (valid invite) */}
          {invitedEmail && (
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
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 mb-4">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {invitedEmail ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email — locked to invited address */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={invitedEmail}
                    readOnly
                    className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary opacity-70 cursor-not-allowed"
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
                    placeholder={mode === "signup" ? "Create a password (min 6 chars)" : "Your password"}
                    required
                    minLength={mode === "signup" ? 6 : undefined}
                    autoFocus
                    className="w-full pl-9 pr-10 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining team…</>
                  : mode === "signup" ? "Create account & join" : "Sign in & join team"
                }
              </button>

              <p className="text-center text-xs text-text-muted">
                {mode === "signup" ? "Already have an account? " : "New to Waptrix? "}
                <button type="button" onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-jade font-semibold hover:underline">
                  {mode === "signup" ? "Sign in instead" : "Create new account"}
                </button>
              </p>
            </form>
          ) : null}
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
