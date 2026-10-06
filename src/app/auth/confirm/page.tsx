"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function ConfirmInner() {
  const searchParams = useSearchParams();
  const ran          = useRef(false);
  const [status, setStatus] = useState("Verifying your account…");
  const [err, setErr]       = useState("");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const supabase   = createClient();
    const code       = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type       = (searchParams.get("type") ?? "email") as any;

    async function confirm() {
      try {
        setStatus("Exchanging verification code…");
        let error: any = null;

        if (token_hash) {
          const res = await supabase.auth.verifyOtp({ token_hash, type });
          error = res.error;
        } else if (code) {
          const res = await supabase.auth.exchangeCodeForSession(code);
          error = res.error;
        } else {
          setErr("No verification code found in the link. Please request a new one.");
          return;
        }

        if (error) {
          setErr(`Verification failed: ${error.message}`);
          return;
        }

        setStatus("Verified! Loading your account…");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErr("Could not load user after verification. Please try logging in.");
          return;
        }

        setStatus("Almost done…");
        const res  = await fetch("/api/onboarding/status");
        const json = await res.json().catch(() => ({}));

        // Full page reload so all cookies are sent fresh to the server
        window.location.href = json.onboarding_done ? "/dashboard" : "/onboarding";
      } catch (e: any) {
        setErr(`Unexpected error: ${e?.message || String(e)}`);
      }
    }

    confirm();
  }, [searchParams]);

  if (err) {
    return (
      <div className="min-h-screen bg-[#080A0F] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">✕</span>
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Verification failed</h2>
          <p className="text-white/50 text-sm mb-6">{err}</p>
          <a href="/signup" className="block w-full bg-[#10B981] text-[#080A0F] font-semibold py-3 rounded-xl text-sm text-center">
            Sign up again
          </a>
          <a href="/login" className="block mt-3 text-white/40 text-sm hover:text-white/60">
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080A0F] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm">{status}</p>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
      </div>
    }>
      <ConfirmInner />
    </Suspense>
  );
}
