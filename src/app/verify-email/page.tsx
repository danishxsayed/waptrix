"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, RefreshCw, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailParam = searchParams.get("email") ?? "";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  // Countdown timer for resend rate limiting
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Poll for verified status every 4s — redirect automatically when verified
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        router.replace("/connect");
      }
    };
    interval = setInterval(check, 4000);
    return () => clearInterval(interval);
  }, [router]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setResendMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        // Rate limit
        if (error.message.toLowerCase().includes("rate limit") || error.status === 429) {
          setResendMsg({ type: "error", text: "Too many requests. Please wait a minute before trying again." });
        } else {
          setResendMsg({ type: "error", text: error.message });
        }
      } else {
        setResendMsg({ type: "success", text: "Verification email sent! Check your inbox (and spam folder)." });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err: any) {
      setResendMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    const supabase = createClient();
    // Refresh session to pick up latest email_confirmed_at
    await supabase.auth.refreshSession();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email_confirmed_at) {
      router.replace("/connect");
    } else {
      setResendMsg({ type: "error", text: "Email not yet verified. Please check your inbox and click the verification link." });
      setChecking(false);
    }
  };

  // Detect common email providers
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const emailLinks: Record<string, { label: string; url: string }> = {
    "gmail.com": { label: "Open Gmail", url: "https://mail.google.com" },
    "googlemail.com": { label: "Open Gmail", url: "https://mail.google.com" },
    "outlook.com": { label: "Open Outlook", url: "https://outlook.live.com" },
    "hotmail.com": { label: "Open Outlook", url: "https://outlook.live.com" },
    "live.com": { label: "Open Outlook", url: "https://outlook.live.com" },
    "yahoo.com": { label: "Open Yahoo Mail", url: "https://mail.yahoo.com" },
    "protonmail.com": { label: "Open ProtonMail", url: "https://mail.proton.me" },
    "icloud.com": { label: "Open iCloud Mail", url: "https://www.icloud.com/mail" },
  };
  const emailLink = emailDomain ? emailLinks[emailDomain] : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-10 group w-fit mx-auto">
          <div className="w-9 h-9 bg-jade rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
            <span className="text-background font-bold text-xl">W</span>
          </div>
          <span className="text-2xl font-bold font-syne tracking-tight text-jade">Waptrix</span>
        </Link>

        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl space-y-6 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-jade/10 border-2 border-jade/20 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-jade" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-syne text-text-primary">Check your email</h1>
            <p className="text-text-muted text-sm leading-relaxed">
              We've sent a verification link to
            </p>
            {email && (
              <p className="font-semibold text-text-primary text-sm bg-card border border-border rounded-xl px-3 py-2 break-all">
                {email}
              </p>
            )}
            <p className="text-text-muted text-xs">
              Click the link in the email to verify your account. Check your spam folder if you don't see it.
            </p>
          </div>

          {/* Error from callback (expired/invalid link) */}
          {errorParam && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-sm flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{decodeURIComponent(errorParam)}</span>
            </div>
          )}

          {/* Resend feedback */}
          {resendMsg && (
            <div className={`rounded-xl p-3 text-sm flex items-start gap-2 text-left ${
              resendMsg.type === "success"
                ? "bg-jade/10 border border-jade/20 text-jade"
                : "bg-red-500/10 border border-red-500/20 text-red-500"
            }`}>
              {resendMsg.type === "success"
                ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              }
              <span>{resendMsg.text}</span>
            </div>
          )}

          {/* Primary action — open email */}
          {emailLink && (
            <a
              href={emailLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 group rounded-2xl text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4" />
              {emailLink.label}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}

          {/* Check if verified */}
          <button
            onClick={handleCheckVerified}
            disabled={checking}
            className="w-full py-3 rounded-2xl border border-border text-sm font-semibold text-text-primary hover:bg-card transition-colors flex items-center justify-center gap-2"
          >
            {checking
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
              : <><CheckCircle className="w-4 h-4" /> I've verified my email</>
            }
          </button>

          {/* Resend */}
          <div className="pt-2 border-t border-border">
            {!email && (
              <div className="mb-3">
                <input
                  type="email"
                  placeholder="Enter your email to resend"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50"
                />
              </div>
            )}
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0 || !email}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-jade transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />
              }
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : resending ? "Sending..." : "Resend verification email"
              }
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          Wrong account?{" "}
          <Link href="/login" className="text-jade font-semibold hover:underline">Sign in with a different account</Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-jade" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
