"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, X, ArrowRight, Zap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Cycle = "monthly" | "quarterly" | "yearly";

const CYCLES: { id: Cycle; label: string; badge?: string }[] = [
  { id: "monthly",   label: "Monthly" },
  { id: "quarterly", label: "Quarterly", badge: "Save 17%" },
  { id: "yearly",    label: "Yearly",    badge: "Save 25%" },
];

const PRICING: Record<Cycle, { planId: string; price: number; perMonth: number; billed: string }> = {
  monthly:   { planId: "pro_monthly",   price: 1999,  perMonth: 1999, billed: "Billed every month" },
  quarterly: { planId: "pro_quarterly", price: 4998,  perMonth: 1666, billed: "₹4,998 billed every 3 months" },
  yearly:    { planId: "pro_yearly",    price: 17988, perMonth: 1499, billed: "₹17,988 billed every year" },
};

const FEATURES = [
  "Unlimited WhatsApp conversations",
  "Up to 10 team members",
  "Bulk campaigns to unlimited contacts",
  "Message templates (Meta-approved)",
  "Smart unified inbox",
  "Real-time analytics dashboard",
  "Automation & keyword auto-replies",
  "Media library",
  "Internal team chat",
  "Official WhatsApp Business API",
  "Priority email support",
  "Onboarding assistance",
];

// ─── Cashfree SDK loader ──────────────────────────────────────────────────────
function loadCashfree(): Promise<any> {
  const mode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox";
  if ((window as any).Cashfree) {
    return Promise.resolve((window as any).Cashfree({ mode }));
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload  = () => resolve((window as any).Cashfree({ mode }));
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── Payment banner ───────────────────────────────────────────────────────────
function PaymentBanner() {
  const params  = useSearchParams();
  const status  = params.get("order_status");
  const expired = params.get("expired");

  if (expired === "1") {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-center gap-3 mb-10">
        <span className="text-2xl">⏰</span>
        <div>
          <p className="text-sm font-bold text-amber-800">Your 7-day free trial has ended</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Subscribe to Waptrix Pro below to continue — all your data is safe and waiting.
          </p>
        </div>
      </div>
    );
  }

  if (!status) return null;
  return (status === "SUCCESS" || status === "PAID") ? (
    <div className="bg-[#D9FDD3] border border-[#25D366]/30 rounded-2xl px-5 py-4 flex items-center gap-3 mb-10">
      <CheckCircle className="w-5 h-5 text-[#075E54] flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-[#075E54]">Payment successful — your subscription is active!</p>
        <p className="text-xs text-[#128C7E] mt-0.5">
          Check your email for the confirmation.{" "}
          <Link href="/dashboard" className="underline font-semibold">Go to Dashboard →</Link>
        </p>
      </div>
    </div>
  ) : (
    <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-10">
      <X className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-600">
        Payment was not completed. Please try again or{" "}
        <Link href="/contact" className="underline font-semibold">contact support</Link>.
      </p>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function PricingContent() {
  const router  = useRouter();
  const [cycle, setCycle]         = useState<Cycle>("monthly");
  const [paying, setPaying]       = useState(false);
  const [payError, setPayError]   = useState("");
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const pricing = PRICING[cycle];

  // Detect session — onAuthStateChange fires immediately with INITIAL_SESSION
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser({
          id:    session.user.id,
          email: session.user.email || "",
          name:  session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
        });
      } else {
        setSessionUser(null);
      }
      setSessionLoaded(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubscribe = async () => {
    setPayError("");

    // Not logged in → send to login with plan preserved
    if (!sessionUser) {
      router.push(`/login?plan=${pricing.planId}`);
      return;
    }

    // Logged in → create order then open Cashfree checkout
    setPaying(true);
    try {
      // Get fresh access token to send as Authorization header
      const supabase   = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch("/api/payments/initiate", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: pricing.planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "We couldn't create your payment session. Please try again.");

      const cashfree = await loadCashfree();
      cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch (err: any) {
      setPayError(err.message);
      setPaying(false);
    }
  };

  return (
    <section className="py-20 px-6 bg-[#EDE8DE] min-h-screen">
      <div className="max-w-4xl mx-auto">

        {/* Independence Day Banner */}
        <div className="relative overflow-hidden rounded-3xl mb-10 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] p-px">
          <div className="bg-[#111B21] rounded-3xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="text-white font-extrabold text-base leading-tight">
                  Independence Day Launch Offer
                </p>
                <p className="text-[#667781] text-xs mt-0.5">
                  Launching on 15 August 🇮🇳 — Start free, no credit card needed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-bold text-[#111B21] bg-[#FF9933] px-3 py-1.5 rounded-full">🇮🇳 15 AUG</span>
              <span className="text-[10px] font-bold text-[#111B21] bg-[#25D366] px-3 py-1.5 rounded-full">7-Day Free Trial</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">Simple, honest pricing</p>
          <h1 className="text-5xl font-extrabold text-[#111B21] tracking-tight mb-4">
            One plan. Everything included.
          </h1>
          <p className="text-[#667781] max-w-md mx-auto">
            No hidden fees. No per-message charges beyond your Meta costs. Start with a 7-day free trial — no card required.
          </p>
        </div>

        <PaymentBanner />

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-white border border-[#E9EDEF] rounded-2xl p-1.5 gap-1 shadow-sm">
            {CYCLES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCycle(c.id); setPayError(""); }}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  cycle === c.id
                    ? "bg-[#25D366] text-[#111B21] shadow-md"
                    : "text-[#667781] hover:text-[#111B21]"
                }`}
              >
                {c.label}
                {c.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    cycle === c.id
                      ? "bg-[#111B21]/10 text-[#111B21]"
                      : "bg-[#25D366]/15 text-[#25D366]"
                  }`}>
                    {c.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan card */}
        <div className="bg-white rounded-3xl border-2 border-[#25D366] shadow-xl shadow-[#25D366]/10 overflow-hidden mb-8">
          {/* Top */}
          <div className="bg-[#075E54] px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#25D366]" />
                <span className="text-xs font-bold text-[#25D366] uppercase tracking-widest">Waptrix Pro</span>
              </div>
              <p className="text-white text-sm opacity-80">{pricing.billed}</p>
            </div>
            <div className="text-right">
              <div className="flex items-end gap-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">
                  ₹{pricing.perMonth.toLocaleString("en-IN")}
                </span>
                <span className="text-white/60 text-sm mb-1">/month</span>
              </div>
              {cycle !== "monthly" && (
                <p className="text-[#25D366] text-xs font-bold mt-0.5">
                  Total ₹{pricing.price.toLocaleString("en-IN")} · {cycle === "quarterly" ? "Save 17%" : "Save 25%"}
                </p>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="px-8 py-7">
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-[#111B21]">
                  <CheckCircle className="w-4 h-4 text-[#25D366] flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            {/* Trial CTA — always visible */}
            {sessionUser ? (
              <a
                href={(() => {
                  if (typeof window === "undefined") return "/dashboard";
                  const { protocol, hostname, port } = window.location;
                  const h = hostname.startsWith("app.") ? hostname : `app.${hostname}`;
                  return `${protocol}//${h}${port ? ":" + port : ""}/dashboard`;
                })()}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-[#111B21] hover:text-white font-extrabold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
              >
                Go to Dashboard <ArrowRight className="w-5 h-5" />
              </a>
            ) : (
              <Link
                href="/signup"
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-[#111B21] hover:text-white font-extrabold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
              >
                🎉 Start 7-Day Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            <p className="text-center text-xs text-[#667781] mt-3">
              No card required · After trial, pay ₹{pricing.perMonth.toLocaleString("en-IN")}/mo · +18% GST
            </p>

            {/* Subscribe / pay directly */}
            <div className="mt-4 border-t border-[#E9EDEF] pt-4">
              {sessionUser ? (
                <p className="text-center text-xs text-[#667781] mb-2">
                  Logged in as <span className="font-semibold text-[#111B21]">{sessionUser.name}</span> — subscribe directly
                </p>
              ) : (
                <p className="text-center text-xs text-[#667781] mb-2">Already have an account? Subscribe now</p>
              )}

              {payError && (
                <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3 text-center">
                  {payError}
                </p>
              )}

              <button
                onClick={handleSubscribe}
                disabled={paying || !sessionLoaded}
                className="w-full border-2 border-[#25D366] text-[#075E54] font-bold py-3 rounded-2xl text-sm transition-all hover:bg-[#25D366] hover:text-[#111B21] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating payment…
                  </>
                ) : (
                  <>
                    {sessionUser
                      ? `Subscribe — ₹${pricing.price.toLocaleString("en-IN")}`
                      : `Log in & Subscribe — ₹${pricing.price.toLocaleString("en-IN")}`
                    }
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Enterprise */}
        <div className="bg-[#111B21] rounded-3xl p-7 flex flex-col sm:flex-row items-center justify-between gap-5 mb-16">
          <div>
            <h3 className="font-extrabold text-white text-lg mb-1">Need more volume?</h3>
            <p className="text-sm text-[#667781]">Custom team sizes, SLA, dedicated account manager, and API access.</p>
          </div>
          <Link
            href="/contact"
            className="flex-shrink-0 flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-6 py-3 rounded-full hover:bg-white transition-all text-sm"
          >
            Talk to sales <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-3xl font-extrabold text-[#111B21] text-center mb-8 tracking-tight">
            Common questions
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["Can I switch billing cycles?",           "Yes — upgrade from monthly to quarterly or yearly anytime. The remaining days of your current plan will be credited."],
              ["What payment methods are accepted?",     "UPI (GPay, PhonePe, Paytm), debit/credit cards, and net banking — all via Cashfree."],
              ["Is GST included in the price?",          "Prices shown are exclusive of GST. 18% GST applies at checkout for Indian customers."],
              ["When will I get my invoice?",            "A receipt is emailed instantly after payment. GST invoices are available on request."],
              ["What happens when my plan expires?",     "You'll get a reminder 7 days before expiry. After expiry, sending is paused until you renew."],
              ["Is the WhatsApp Business API included?", "Yes — Waptrix runs on the official Meta WhatsApp Business API. You connect your own number."],
            ].map(([q, a]) => (
              <div key={q} className="bg-white rounded-2xl p-5 border border-[#E9EDEF]">
                <p className="font-bold text-[#111B21] text-sm mb-2">{q}</p>
                <p className="text-xs text-[#667781] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

export default function PricingPage() {
  return <Suspense><PricingContent /></Suspense>;
}
