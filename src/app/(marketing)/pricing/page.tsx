"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, X, ArrowRight, Zap } from "lucide-react";

const PLANS = [
  {
    id: "starter", name: "Starter", price: 1499,
    badge: null,
    desc: "Perfect for small businesses getting started.",
    features: ["3,000 conversations/month", "2 team members", "Bulk campaigns", "Message templates", "Unified inbox", "Basic analytics", "Email support"],
    missing: ["Automation", "API access", "Priority support"],
  },
  {
    id: "growth", name: "Growth", price: 3999,
    badge: "Most Popular",
    desc: "For growing businesses that need automation.",
    features: ["10,000 conversations/month", "5 team members", "Bulk campaigns", "Message templates", "Unified inbox", "Advanced analytics", "Automation & auto-replies", "Media library", "Priority support"],
    missing: ["API access"],
  },
  {
    id: "business", name: "Business", price: 9999,
    badge: null,
    desc: "Full power for high-volume messaging.",
    features: ["50,000 conversations/month", "15 team members", "Everything in Growth", "API access", "Dedicated onboarding", "Priority phone & email"],
    missing: [],
  },
];

function CheckoutModal({ plan, onClose }: { plan: typeof PLANS[0]; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order creation failed");

      const cashfree = await loadCashfree();
      cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-7 shadow-2xl relative border border-[#E9EDEF]">
        <button onClick={onClose} className="absolute top-5 right-5 text-[#667781] hover:text-[#111B21]">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-extrabold text-[#111B21] mb-1">Subscribe to {plan.name}</h3>
        <p className="text-[#667781] text-sm mb-6">₹{plan.price.toLocaleString("en-IN")}/month · Cancel anytime</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: "Full Name", key: "name", type: "text", placeholder: "Ravi Mehta" },
            { label: "Email Address", key: "email", type: "email", placeholder: "ravi@example.com" },
            { label: "Mobile Number", key: "phone", type: "tel", placeholder: "9876543210" },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-[#667781] mb-1.5 block">{f.label}</label>
              <input
                required type={f.type} placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full bg-[#EDE8DE] border border-[#E9EDEF] rounded-xl px-4 py-2.5 text-sm text-[#111B21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-[#111B21] hover:text-white font-bold py-3 rounded-full text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Processing…</> : <>Pay ₹{plan.price.toLocaleString("en-IN")} <ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-xs text-[#667781] text-center">Secured by Cashfree · UPI, cards & net banking accepted</p>
        </form>
      </div>
    </div>
  );
}

async function loadCashfree(): Promise<any> {
  if ((window as any).Cashfree) return (window as any).Cashfree({ mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox" });
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => resolve((window as any).Cashfree({ mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox" }));
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function PaymentBanner() {
  const params = useSearchParams();
  const status = params.get("order_status");
  if (!status) return null;
  return status === "SUCCESS" ? (
    <div className="bg-[#D9FDD3] border border-[#25D366]/30 rounded-2xl px-5 py-4 flex items-center gap-3 mb-10">
      <CheckCircle className="w-5 h-5 text-[#075E54] flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-[#075E54]">Payment successful!</p>
        <p className="text-xs text-[#128C7E]">Your subscription is active. <Link href="/login" className="underline font-semibold">Sign in →</Link></p>
      </div>
    </div>
  ) : (
    <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-10">
      <X className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-600">Payment not completed. <Link href="/contact" className="underline">Contact support</Link></p>
    </div>
  );
}

function PricingContent() {
  const [selected, setSelected] = useState<typeof PLANS[0] | null>(null);

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">Simple pricing</p>
          <h1 className="text-5xl font-extrabold text-[#111B21] tracking-tight mb-4">Plans that grow with you</h1>
          <p className="text-[#667781] max-w-lg mx-auto">14-day free trial on every plan. No credit card required. Cancel anytime.</p>
        </div>

        <PaymentBanner />

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-3xl p-7 flex flex-col border-2 transition-all ${
                plan.badge ? "border-[#25D366] shadow-xl shadow-[#25D366]/10" : "border-[#E9EDEF]"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#25D366] text-[#111B21] text-xs font-bold px-4 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}
              <h3 className="text-lg font-extrabold text-[#111B21] mb-1">{plan.name}</h3>
              <p className="text-xs text-[#667781] mb-5">{plan.desc}</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-5xl font-extrabold text-[#111B21] tracking-tight">₹{plan.price.toLocaleString("en-IN")}</span>
                <span className="text-[#667781] text-sm mb-1.5">/mo</span>
              </div>
              <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#111B21]">
                    <CheckCircle className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#667781]/40">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setSelected(plan)}
                className={`w-full py-3 rounded-full font-bold text-sm transition-all ${
                  plan.badge
                    ? "bg-[#25D366] text-[#111B21] hover:bg-[#128C7E] hover:text-white"
                    : "border-2 border-[#111B21] text-[#111B21] hover:bg-[#111B21] hover:text-white"
                }`}
              >
                Get started
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="bg-[#075E54] rounded-3xl p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="font-extrabold text-white text-lg mb-1">Enterprise</h3>
            <p className="text-sm text-[#D9FDD3]">Custom volume, SLA, dedicated support, API access. Let's talk.</p>
          </div>
          <Link href="/contact" className="flex-shrink-0 flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-6 py-3 rounded-full hover:bg-white transition-all text-sm">
            Contact sales <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-3xl font-extrabold text-[#111B21] text-center mb-10 tracking-tight">Common questions</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              ["What counts as a conversation?", "A 24-hour messaging session opened when you send the first message or a customer replies."],
              ["Can I change my plan?", "Yes, upgrade or downgrade anytime. Upgrades take effect immediately."],
              ["Is GST included?", "Prices shown are exclusive of GST. 18% GST applies at checkout."],
              ["What payment methods?", "All major UPI (GPay, PhonePe, Paytm), cards, and net banking via Cashfree."],
              ["Do you offer a free trial?", "Yes — 14 days free on every plan. No credit card needed."],
              ["What if I exceed my limit?", "We notify you before you hit your limit. You can upgrade mid-cycle."],
            ].map(([q, a]) => (
              <div key={q} className="bg-white rounded-2xl p-5 border border-[#E9EDEF]">
                <p className="font-bold text-[#111B21] text-sm mb-2">{q}</p>
                <p className="text-xs text-[#667781] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected && <CheckoutModal plan={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

export default function PricingPage() {
  return <Suspense><PricingContent /></Suspense>;
}
