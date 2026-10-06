"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PLAN_LABELS: Record<string, { name: string; price: string; billing: string }> = {
  pro_monthly:   { name: "Waptrix Pro — Monthly",   price: "₹1,999",  billing: "Billed monthly" },
  pro_quarterly: { name: "Waptrix Pro — Quarterly", price: "₹4,998",  billing: "Billed every 3 months" },
  pro_yearly:    { name: "Waptrix Pro — Yearly",    price: "₹17,988", billing: "Billed yearly" },
};

function loadRazorpay(): Promise<any> {
  if ((window as any).Razorpay) return Promise.resolve((window as any).Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve((window as any).Razorpay);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const planId       = searchParams.get("plan") || "pro_monthly";
  const planInfo     = PLAN_LABELS[planId] ?? PLAN_LABELS["pro_monthly"];

  const [status, setStatus] = useState<"opening" | "loading" | "dismissed" | "success" | "error">("opening");
  const [errMsg, setErrMsg] = useState("");
  const ran = useRef(false);

  const startPayment = async () => {
    if (ran.current) return;
    ran.current = true;
    setStatus("loading");

    try {
      // Try Bearer token first (works if session synced to localStorage),
      // always include cookies as fallback — server tries both.
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const fetchHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        fetchHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/payments/checkout-order", {
        method:      "POST",
        headers:     fetchHeaders,
        credentials: "include",
        body:        JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.href = `/login?plan=${encodeURIComponent(planId)}`;
        return;
      }

      if (!res.ok) throw new Error(data.error || "Could not create payment session.");

      const RazorpayCheckout = await loadRazorpay();

      const rzp = new RazorpayCheckout({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      data.amountPaise,
        currency:    "INR",
        name:        "Waptrix",
        description: data.planName,
        order_id:    data.razorpayOrderId,
        prefill:     data.prefill,
        theme:       { color: "#25D366" },
        handler: () => {
          // Payment successful — clear pending plan and redirect to dashboard
          fetch("/api/payments/clear-pending", {
            method: "POST", credentials: "include",
          }).catch(() => {});
          setStatus("success");
          setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
        },
        modal: {
          ondismiss: () => {
            // User closed the Razorpay modal — show dismissed state
            ran.current = false;
            setStatus("dismissed");
          },
        },
      });

      rzp.open();

    } catch (err: any) {
      console.error("checkout startPayment error:", err);
      setErrMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
      ran.current = false;
    }
  };

  useEffect(() => {
    // Auto-open payment modal shortly after page load
    const t = setTimeout(startPayment, 600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen bg-[#EDE8DE] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-[#E9EDEF] shadow-sm p-8 w-full max-w-sm text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 bg-[#25D366] rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(37,211,102,0.35)]">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <span className="text-[#111B21] font-bold text-xl tracking-tight">Waptrix</span>
        </div>

        {/* ── Opening / Loading ── */}
        {(status === "opening" || status === "loading") && (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-[#25D366] animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-[#111B21]">
              {status === "loading" ? "Setting up payment…" : "Opening payment…"}
            </h2>

            <div className="bg-[#EDE8DE] rounded-xl p-4 text-left">
              <p className="text-xs text-[#667781] font-medium mb-1">Selected plan</p>
              <p className="text-[#111B21] font-bold text-sm">{planInfo.name}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[#25D366] font-extrabold text-2xl">{planInfo.price}</span>
              </div>
              <p className="text-[#667781] text-xs mt-1">{planInfo.billing}</p>
            </div>

            <p className="text-[#667781] text-xs">
              Secure payment via Razorpay · UPI · Cards · Net Banking · Wallets
            </p>

            <button
              onClick={startPayment}
              disabled={status === "loading"}
              className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Please wait…
                </span>
              ) : "Open Payment"}
            </button>

            <a href="/dashboard" className="block text-[#667781] text-xs hover:text-[#111B21] transition-colors">
              Skip — continue with free trial
            </a>
          </div>
        )}

        {/* ── Dismissed (user closed Razorpay modal) ── */}
        {status === "dismissed" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#F0F2F5] border border-[#E9EDEF] flex items-center justify-center mx-auto">
              <X className="w-7 h-7 text-[#667781]" />
            </div>
            <h2 className="text-xl font-bold text-[#111B21]">Payment cancelled</h2>
            <p className="text-[#667781] text-sm leading-relaxed">
              No worries — you can complete your subscription anytime. Your account is safe.
            </p>

            <div className="bg-[#EDE8DE] rounded-xl p-4 text-left">
              <p className="text-xs text-[#667781] font-medium mb-1">Selected plan</p>
              <p className="text-[#111B21] font-bold text-sm">{planInfo.name}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[#25D366] font-extrabold text-2xl">{planInfo.price}</span>
              </div>
              <p className="text-[#667781] text-xs mt-1">{planInfo.billing}</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { window.location.href = "/dashboard"; }}
                className="flex-1 py-3 rounded-xl border border-[#E9EDEF] text-[#667781] text-sm font-medium hover:border-[#25D366]/40 hover:text-[#111B21] transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={startPayment}
                className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3 rounded-xl transition-all text-sm"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Success ── */}
        {status === "success" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#D9FDD3] border border-[#25D366]/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-[#25D366]" />
            </div>
            <h2 className="text-xl font-bold text-[#111B21]">Payment Successful!</h2>
            <p className="text-[#667781] text-sm">
              Your Waptrix Pro subscription is now active. Taking you to the dashboard…
            </p>
            <Loader2 className="w-5 h-5 text-[#25D366] animate-spin mx-auto" />
          </div>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-[#111B21]">Payment Failed</h2>
            <p className="text-[#667781] text-sm">{errMsg}</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { window.location.href = "/dashboard"; }}
                className="flex-1 py-3 rounded-xl border border-[#E9EDEF] text-[#667781] text-sm font-medium hover:border-[#25D366]/40 hover:text-[#111B21] transition-all"
              >
                Skip for now
              </button>
              <button
                onClick={startPayment}
                className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3 rounded-xl transition-all text-sm"
              >
                Try again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EDE8DE] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#25D366] animate-spin" />
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}
