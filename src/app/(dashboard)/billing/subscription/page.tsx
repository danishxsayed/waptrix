"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck, Calendar, RefreshCw, XCircle, ArrowRight,
  Loader2, AlertCircle, CheckCircle2, Clock, Zap,
} from "lucide-react";

interface Subscription {
  plan: string;
  status: string;
  billing_cycle: string | null;
  amount: number | null;
  currency: string;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  last_order_id: string | null;
  last_payment_id: string | null;
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly (3 months)", yearly: "Yearly",
};

const PLAN_AMOUNTS: Record<string, string> = {
  monthly: "₹1,999 / month", quarterly: "₹4,999 / 3 months", yearly: "₹17,999 / year",
};

export default function ManageSubscriptionPage() {
  const [sub, setSub]         = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]     = useState("");
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then(r => r.json())
      .then(d => { setSub(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    setCancelling(true); setError("");
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancel failed");
      setCancelled(true);
      setShowConfirm(false);
      setSub(s => s ? { ...s, plan: "trial", status: "trial", expires_at: null } : s);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const fmt = (d: string | null) => d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const statusColor = (s: string) => ({
    active: "bg-[#D9FDD3] text-[#075E54] border-[#25D366]/30",
    trial:  "bg-amber-50 text-amber-700 border-amber-300",
    expired: "bg-red-50 text-red-600 border-red-200",
    inactive: "bg-surface text-text-muted border-border",
  }[s] || "bg-surface text-text-muted border-border");

  const statusIcon = (s: string) => ({
    active: <CheckCircle2 className="w-3.5 h-3.5" />,
    trial:  <Clock className="w-3.5 h-3.5" />,
    expired: <XCircle className="w-3.5 h-3.5" />,
    inactive: <XCircle className="w-3.5 h-3.5" />,
  }[s] || <XCircle className="w-3.5 h-3.5" />);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 text-jade animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold font-syne text-text-primary">Manage Subscription</h1>
        <p className="text-sm text-text-muted mt-1">View and manage your Waptrix Pro plan.</p>
      </div>

      {cancelled && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Subscription cancelled. You'll retain access until expiry.
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-[#075E54] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#25D366]/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <p className="text-white font-extrabold text-lg leading-tight">Waptrix Pro</p>
              <p className="text-white/60 text-xs">
                {sub?.billing_cycle ? CYCLE_LABELS[sub.billing_cycle] : "WhatsApp Marketing Platform"}
              </p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border capitalize ${statusColor(sub?.status || "inactive")}`}>
            {statusIcon(sub?.status || "inactive")}
            {sub?.status || "inactive"}
          </span>
        </div>

        <div className="divide-y divide-border/50">
          {[
            ["Plan",           sub?.plan === "pro" ? "Waptrix Pro" : sub?.plan === "trial" ? "Free Trial" : "No active plan"],
            ["Billing Cycle",  sub?.billing_cycle ? CYCLE_LABELS[sub.billing_cycle] : "—"],
            ["Amount",         sub?.amount ? `₹${sub.amount.toLocaleString("en-IN")} + 18% GST` : "—"],
            ["Started",        fmt(sub?.started_at || null)],
            ["Expires",        sub?.plan === "trial" ? fmt(sub?.trial_ends_at || null) : fmt(sub?.expires_at || null)],
            ["Order ID",       sub?.last_order_id || "—"],
            ["Payment ID",     sub?.last_payment_id || "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-6 py-3.5">
              <span className="text-xs text-text-muted">{k}</span>
              <span className="text-xs font-semibold text-text-primary text-right max-w-[60%] break-all">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/pricing"
          className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl hover:border-jade transition-all group"
        >
          <div>
            <p className="font-bold text-sm text-text-primary">
              {sub?.status === "active" ? "Renew Subscription" : "Subscribe Now"}
            </p>
            <p className="text-xs text-text-muted mt-0.5">Choose a plan on the pricing page</p>
          </div>
          <div className="w-9 h-9 bg-jade/10 rounded-xl flex items-center justify-center group-hover:bg-jade/20 transition-colors">
            <RefreshCw className="w-4 h-4 text-jade" />
          </div>
        </Link>

        {sub?.status === "active" && !cancelled && (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl hover:border-red-300 transition-all group text-left"
          >
            <div>
              <p className="font-bold text-sm text-red-500">Cancel Subscription</p>
              <p className="text-xs text-text-muted mt-0.5">Access continues until expiry</p>
            </div>
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
          </button>
        )}
      </div>

      {/* Available Plans */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Available Plans</p>
        <div className="space-y-3">
          {Object.entries(PLAN_AMOUNTS).map(([cycle, price]) => (
            <div key={cycle} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-text-primary">{CYCLE_LABELS[cycle]}</p>
                <p className="text-xs text-text-muted">{price}</p>
              </div>
              <Link
                href={`/pricing`}
                className="text-xs font-bold text-jade hover:underline flex items-center gap-1"
              >
                Select <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-surface border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-5">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold font-syne text-lg text-text-primary">Cancel Subscription?</h3>
              <p className="text-sm text-text-muted mt-2">
                Your Pro access will continue until the current period ends. You won't be charged again.
              </p>
            </div>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-text-muted hover:bg-surface transition-all"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
              >
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                {cancelling ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
