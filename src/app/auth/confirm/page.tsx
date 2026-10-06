"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function ConfirmPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const ran          = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const supabase   = createClient();
    const code       = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type       = (searchParams.get("type") ?? "email") as any;

    async function confirm() {
      try {
        let error: any = null;

        if (token_hash) {
          const res = await supabase.auth.verifyOtp({ token_hash, type });
          error = res.error;
        } else if (code) {
          const res = await supabase.auth.exchangeCodeForSession(code);
          error = res.error;
        } else {
          router.replace("/verify-email?error=Invalid+link");
          return;
        }

        if (error) {
          router.replace(`/verify-email?error=${encodeURIComponent(error.message || "Verification failed")}`);
          return;
        }

        // Session is now established in the browser.
        // Check if this user has completed onboarding.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        const res = await fetch("/api/onboarding/status");
        const json = await res.json().catch(() => ({}));
        if (json.onboarding_done) {
          router.replace("/dashboard");
        } else {
          router.replace("/onboarding");
        }
      } catch {
        router.replace("/login");
      }
    }

    confirm();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#080A0F] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm">Verifying your account…</p>
      </div>
    </div>
  );
}
