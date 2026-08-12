"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Zap, ArrowRight, X } from "lucide-react";

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = [
  {
    id:       "starter",
    name:     "Starter",
    price:    1499,
    period:   "month",
    badge:    null,
    desc:     "Perfect for small businesses just getting started with WhatsApp marketing.",
    features: [
      "3,000 conversations/month",
      "2 team members",
      "Bulk campaigns",
      "Message templates",
      "Unified inbox",
      "Basic analytics",
      "Email support",
    ],
    unavailable: ["Automation", "API access", "Priority support"],
  },
  {
    id:       "growth",
    name:     "Growth",
    price:    3999,
    period:   "month",
    badge:    "Most Popular",
    desc:     "For growing businesses that need automation and deeper insights.",
    features: [
      "10,000 conversations/month",
      "5 team members",
      "Bulk campaigns",
      "Message templates",
      "Unified inbox",
      "Advanced analytics",
      "Automation & auto-replies",
      "Media library",
      "Priority email support",
    ],
    unavailable: ["API access"],
  },
  {
    id:       "business",
    name:     "Business",
    price:    9999,
    period:   "month",
    badge:    null,
    desc:     "Full power for large teams with high-volume messaging needs.",
    features: [
      "50,000 conversations/month",
      "15 team members",
      "Bulk campaigns",
      "Message templates",
      "Unified inbox",
      "Advanced analytics",
      "Automation & auto-replies",
      "Media library",
      "API access",
      "Priority phone & email support",
      "Dedicated onboarding",
    ],
    unavailable: [],
  },
];

// ── Checkout modal ────────────────────────────────────────────────────────────
function CheckoutModal({
  plan,
  onClose,
}: {
  plan: typeof PLANS[0];
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Create order on our backend
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId:         plan.id,
          customerName:   form.name,
          customerEmail:  form.email,
          customerPhone:  form.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order creation failed");

      // 2. Load Cashfree JS SDK and open checkout
      const cashfree = await loadCashfree();
      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_self",
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0E1117] border border-[#273042] rounded-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8896AB] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-syne)" }}>
            Subscribe to {plan.name}
          </h3>
          <p className="text-[#8896AB] text-sm">
            ₹{plan.price.toLocaleString("en-IN")}/month · Cancel anytime
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#8896AB] mb-1.5 block">Full Name</label>
            <input
              required
              type="text"
              placeholder="Ravi Mehta"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#161B26] border border-[#273042] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8896AB] focus:outline-none focus:border-[#10B981]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#8896AB] mb-1.5 block">Email Address</label>
            <input
              required
              type="email"
              placeholder="ravi@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#161B26] border border-[#273042] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8896AB] focus:outline-none focus:border-[#10B981]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#8896AB] mb-1.5 block">Mobile Number</label>
            <input
              required
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-[#161B26] border border-[#273042] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#8896AB] focus:outline-none focus:border-[#10B981]/50"
            />
          </div>

          {error && (
            <p className="text-xs text-[#F43F5E] bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#10B981] hover:bg-[#34D399] disabled:opacity-60 text-[#080A0F] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#080A0F]/30 border-t-[#080A0F] rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                Pay ₹{plan.price.toLocaleString("en-IN")}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-[#8896AB] text-center">
            Secured by Cashfree · All major UPI, cards & net banking accepted
          </p>
        </form>
      </div>
    </div>
  );
}

// Load Cashfree SDK lazily
async function loadCashfree(): Promise<any> {
  if ((window as any).Cashfree) {
    return (window as any).Cashfree({ mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox' });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve((window as any).Cashfree({ mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox' }));
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ── Payment status banner ─────────────────────────────────────────────────────
function PaymentBanner() {
  const params = useSearchParams();
  const status = params.get("order_status");
  if (!status) return null;

  if (status === "SUCCESS") {
    return (
      <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl px-4 py-3 flex items-center gap-3 mb-8">
        <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#10B981]">Payment successful!</p>
          <p className="text-xs text-[#8896AB]">Your subscription is now active. <Link href="/login" className="text-[#10B981] underline">Sign in to your dashboard →</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-xl px-4 py-3 flex items-center gap-3 mb-8">
      <X className="w-5 h-5 text-[#F43F5E] flex-shrink-0" />
      <p className="text-sm text-[#F43F5E]">Payment was not completed. Please try again or <Link href="/contact" className="underline">contact support</Link>.</p>
    </div>
  );
}

// ── Pricing page ──────────────────────────────────────────────────────────────
function PricingContent() {
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);

  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Zap className="w-3 h-3" />
            Simple, transparent pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-syne)" }}>
            Plans that grow with you
          </h1>
          <p className="text-[#8896AB] max-w-xl mx-auto">
            Start free, scale as you grow. All plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>

        <PaymentBanner />

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-[#0E1117] border rounded-2xl p-6 flex flex-col transition-all ${
                plan.badge
                  ? "border-[#10B981]/50 shadow-[0_0_40px_rgba(16,185,129,0.1)]"
                  : "border-[#273042] hover:border-[#273042]/80"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#10B981] text-[#080A0F] text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "var(--font-syne)" }}>
                  {plan.name}
                </h3>
                <p className="text-xs text-[#8896AB] mb-4">{plan.desc}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>
                    ₹{plan.price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[#8896AB] text-sm mb-1">/month</span>
                </div>
              </div>

              <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#8896AB]">
                    <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.unavailable.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#8896AB]/30">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.badge
                    ? "bg-[#10B981] hover:bg-[#34D399] text-[#080A0F] hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                    : "border border-[#273042] hover:border-[#10B981]/40 text-white"
                }`}
              >
                Get started
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="mt-8 bg-[#0E1117] border border-[#273042] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-white mb-1" style={{ fontFamily: "var(--font-syne)" }}>Enterprise</h3>
            <p className="text-sm text-[#8896AB]">Custom volume, SLA, dedicated support, API access, and more. Let's talk.</p>
          </div>
          <Link
            href="/contact"
            className="flex-shrink-0 flex items-center gap-2 border border-[#273042] hover:border-[#10B981]/50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
          >
            Contact sales <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center" style={{ fontFamily: "var(--font-syne)" }}>
            Frequently asked questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: "What counts as a conversation?",
                a: "A conversation is a 24-hour messaging session opened when your business sends the first message, or when a customer replies to a template.",
              },
              {
                q: "Can I upgrade or downgrade my plan?",
                a: "Yes, you can change your plan at any time. Upgrades take effect immediately; downgrades apply at the start of the next billing cycle.",
              },
              {
                q: "Is GST included in the pricing?",
                a: "All prices shown are exclusive of GST. 18% GST is added at checkout as per Indian tax regulations.",
              },
              {
                q: "What payment methods are accepted?",
                a: "We accept all major UPI apps (GPay, PhonePe, Paytm), debit/credit cards, and net banking via Cashfree.",
              },
              {
                q: "Do you offer a free trial?",
                a: "Yes, every plan comes with a 14-day free trial. No credit card is required to start.",
              },
              {
                q: "What happens if I exceed my conversation limit?",
                a: "We'll notify you when you approach your limit. You can upgrade mid-cycle, and we won't cut off your service without warning.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-[#0E1117] border border-[#273042] rounded-xl p-5">
                <p className="font-semibold text-white text-sm mb-2">{faq.q}</p>
                <p className="text-xs text-[#8896AB] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedPlan && (
        <CheckoutModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}
    </section>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
