"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Phone, Mail, Check, X, Zap, ArrowRight } from "lucide-react";

// ─── Plan data (mirror of /src/lib/plans.ts) ──────────────────────────────────
const PLAN_OPTIONS = [
  {
    id:       "pro_monthly",
    label:    "Monthly",
    price:    "₹1,999",
    per:      "/month",
    billing:  "Billed monthly",
    badge:    null,
  },
  {
    id:       "pro_quarterly",
    label:    "Quarterly",
    price:    "₹1,666",
    per:      "/month",
    billing:  "₹4,998 billed every 3 months",
    badge:    "Most popular",
    saveBadge: "Save 17%",
  },
  {
    id:       "pro_yearly",
    label:    "Yearly",
    price:    "₹1,499",
    per:      "/month",
    billing:  "₹17,988 billed yearly",
    badge:    "Save 25%",
  },
];

const PRO_FEATURES = [
  "Unlimited WhatsApp conversations",
  "Bulk campaigns to unlimited contacts",
  "Smart unified inbox",
  "Message templates (Meta-approved)",
  "Real-time analytics",
  "Automation & keyword replies",
  "Up to 10 team members",
  "Priority support",
];

// ─── Constants ────────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+91",  label: "🇮🇳 +91" },
  { code: "+1",   label: "🇺🇸 +1"  },
  { code: "+44",  label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971"},
  { code: "+65",  label: "🇸🇬 +65" },
  { code: "+60",  label: "🇲🇾 +60" },
  { code: "+92",  label: "🇵🇰 +92" },
  { code: "+880", label: "🇧🇩 +880"},
];

const INDUSTRIES = [
  "E-commerce / Retail", "Education / EdTech", "Healthcare",
  "Real Estate", "Finance / Banking", "Travel & Hospitality",
  "Food & Restaurant", "Logistics & Delivery", "IT & Software",
  "Marketing Agency", "Manufacturing", "Other",
];

const ROLES = [
  "Founder / Owner", "Marketing Manager", "Sales Manager",
  "Operations Manager", "Developer / Tech Lead", "Customer Support Lead", "Other",
];

const USE_CASE_OPTIONS = [
  { id: "campaigns",    label: "Bulk campaigns",      icon: "📢" },
  { id: "inbox",        label: "Customer support inbox",   icon: "💬" },
  { id: "orders",       label: "Order & delivery updates", icon: "📦" },
  { id: "appointments", label: "Appointment reminders",    icon: "📅" },
  { id: "flows",        label: "Lead capture with Flows",  icon: "🔗" },
  { id: "crm",          label: "CRM sync",                 icon: "⚙️" },
];

const VOLUME_OPTIONS = ["< 1K", "1–10K", "10–50K", "50K+"];
const REFERRAL_OPTIONS = [
  "Google Search", "Instagram / Facebook", "LinkedIn",
  "Friend / Colleague", "YouTube", "WhatsApp", "Other",
];

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            s <= step ? "bg-[#25D366]" : "bg-[#E9EDEF]"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Chip button ─────────────────────────────────────────────────────────────
function Chip({
  label, selected, onClick, icon,
}: { label: string; selected: boolean; onClick: () => void; icon?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
        selected
          ? "border-[#25D366] bg-[#D9FDD3] text-[#075E54]"
          : "border-[#E9EDEF] bg-white text-[#667781] hover:border-[#25D366]/40 hover:text-[#111B21]"
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

// ─── Plan selection modal (shown after onboarding for trial users) ─────────────
function PlanModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState("pro_monthly");
  const [paying, setPaying]     = useState(false);

  const plan = PLAN_OPTIONS.find((p) => p.id === selected)!;

  const goTrial = () => {
    window.location.href = "/dashboard";
  };

  const goCheckout = () => {
    setPaying(true);
    window.location.href = `/checkout?plan=${selected}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#111B21]/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-[#E9EDEF] shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E9EDEF]">
          <div>
            <h2 className="text-lg font-bold text-[#111B21]">Choose your plan</h2>
            <p className="text-[#667781] text-xs mt-0.5">You can upgrade or change anytime</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667781] hover:bg-[#EDE8DE] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {/* Trial option */}
          <button
            type="button"
            onClick={() => setSelected("trial")}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
              selected === "trial"
                ? "border-[#25D366] bg-[#D9FDD3]/50"
                : "border-[#E9EDEF] bg-white hover:border-[#25D366]/40"
            }`}
          >
            <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "trial" ? "border-[#25D366]" : "border-[#E9EDEF]"
            }`}>
              {selected === "trial" && <div className="w-2 h-2 rounded-full bg-[#25D366]" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#111B21]">Free Trial</span>
                <span className="text-[10px] font-bold bg-[#D9FDD3] text-[#075E54] px-2 py-0.5 rounded-full border border-[#25D366]/20">7 days free</span>
              </div>
              <p className="text-[#667781] text-xs mt-0.5">Full access. No credit card needed.</p>
            </div>
            <span className="text-[#111B21] font-bold text-sm">₹0</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E9EDEF]" />
            <span className="text-[10px] font-bold text-[#667781] uppercase tracking-widest">Or upgrade to Pro</span>
            <div className="flex-1 h-px bg-[#E9EDEF]" />
          </div>

          {/* Paid plan options */}
          {PLAN_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                selected === p.id
                  ? "border-[#25D366] bg-[#D9FDD3]/50"
                  : "border-[#E9EDEF] bg-white hover:border-[#25D366]/40"
              }`}
            >
              <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected === p.id ? "border-[#25D366]" : "border-[#E9EDEF]"
              }`}>
                {selected === p.id && <div className="w-2 h-2 rounded-full bg-[#25D366]" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[#111B21]">Pro — {p.label}</span>
                  {p.badge === "Most popular" && (
                    <span className="text-[10px] font-bold bg-[#25D366] text-[#111B21] px-2 py-0.5 rounded-full">{p.badge}</span>
                  )}
                  {"saveBadge" in p && p.saveBadge && (
                    <span className="text-[10px] font-bold bg-[#D9FDD3] text-[#075E54] px-2 py-0.5 rounded-full border border-[#25D366]/20">{p.saveBadge}</span>
                  )}
                  {p.badge && p.badge !== "Most popular" && (
                    <span className="text-[10px] font-bold bg-[#D9FDD3] text-[#075E54] px-2 py-0.5 rounded-full border border-[#25D366]/20">{p.badge}</span>
                  )}
                </div>
                <p className="text-[#667781] text-xs mt-0.5">{p.billing}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[#111B21] font-bold text-sm">{p.price}</span>
                <span className="text-[#667781] text-xs">{p.per}</span>
              </div>
            </button>
          ))}

          {/* Pro features summary */}
          {selected !== "trial" && (
            <div className="bg-[#EDE8DE] rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-[#667781] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Everything in Pro
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {PRO_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-[#25D366] flex-shrink-0" />
                    <span className="text-[#111B21] text-[11px]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 flex gap-3">
          {selected === "trial" ? (
            <button
              onClick={goTrial}
              className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={goTrial}
                className="px-4 py-3 rounded-xl border border-[#E9EDEF] text-[#667781] text-sm font-medium hover:border-[#25D366]/40 hover:text-[#111B21] transition-all"
              >
                Use Trial
              </button>
              <button
                onClick={goCheckout}
                disabled={paying}
                className="flex-1 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Subscribe <ArrowRight className="w-4 h-4" /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router  = useRouter();
  const [step, setStep]       = useState(1);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Step 1
  const [countryCode, setCountryCode]           = useState("+91");
  const [phone, setPhone]                       = useState("");
  const [isWhatsapp, setIsWhatsapp]             = useState(true);
  const [preferredContact, setPreferredContact] = useState<"whatsapp"|"phone"|"email">("whatsapp");

  // Step 2
  const [industry, setIndustry] = useState("");
  const [role, setRole]         = useState("Founder / Owner");
  const [teamSize, setTeamSize] = useState("2–5");

  // Step 3
  const [useCases, setUseCases]             = useState<string[]>([]);
  const [msgVolume, setMsgVolume]           = useState("1–10K");
  const [referralSource, setReferralSource] = useState("");

  const toggleUseCase = (id: string) => {
    setUseCases((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          phone:             `${countryCode}${phone}`,
          is_whatsapp:       isWhatsapp,
          preferred_contact: preferredContact,
          industry,
          role,
          team_size:         teamSize,
          use_cases:         useCases,
          msg_volume:        msgVolume,
          referral_source:   referralSource,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      // Case 2 — User pre-selected a paid plan: go straight to checkout
      if (data.pending_plan_id) {
        window.location.href = `/checkout?plan=${encodeURIComponent(data.pending_plan_id)}`;
        return;
      }

      // Case 1 — Trial user: show plan selection popup for one final upgrade opportunity
      setShowPlanModal(true);
      setSaving(false);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  // Shared input classes
  const inputCls = "w-full bg-white border border-[#E9EDEF] text-[#111B21] rounded-xl px-4 py-3 text-sm placeholder-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]/60 transition-all";
  const selectCls = "w-full bg-white border border-[#E9EDEF] text-[#111B21] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]/60 transition-all";
  const labelCls  = "text-[#667781] text-sm mb-2 block font-medium";

  return (
    <div className="min-h-screen bg-[#EDE8DE] flex items-center justify-center px-4">
      {showPlanModal && <PlanModal onClose={() => setShowPlanModal(false)} />}
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-[#25D366] rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(37,211,102,0.35)]">
            <span className="text-white font-bold text-lg leading-none">W</span>
          </div>
          <span className="text-[#111B21] font-bold text-xl tracking-tight">Waptrix</span>
        </div>

        <ProgressBar step={step} />
        <p className="text-[#667781] text-sm mb-2">Step {step} of 3</p>

        {/* White card wrapping each step */}
        <div className="bg-white rounded-2xl border border-[#E9EDEF] shadow-sm p-6">

          {/* ── STEP 1: Contact ── */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-[#111B21] mb-1">How can we reach you?</h1>
              <p className="text-[#667781] text-sm mb-6">
                We'll only use this for account and billing updates.
              </p>

              <label className={labelCls}>Mobile number</label>
              <div className="flex gap-2 mb-4">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-white border border-[#E9EDEF] text-[#111B21] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]/60 w-28 transition-all"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9999999999"
                  className="flex-1 bg-white border border-[#E9EDEF] text-[#111B21] rounded-xl px-4 py-3 text-sm placeholder-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]/60 transition-all"
                />
              </div>

              <label className="flex items-center gap-3 mb-6 cursor-pointer select-none">
                <div
                  onClick={() => setIsWhatsapp(!isWhatsapp)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    isWhatsapp ? "bg-[#25D366] border-[#25D366]" : "border-[#E9EDEF] bg-white"
                  }`}
                >
                  {isWhatsapp && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[#111B21] text-sm">This number is also on WhatsApp</span>
              </label>

              <label className={labelCls}>Best way to contact you</label>
              <div className="flex gap-2 mb-6">
                {([
                  { id: "whatsapp", icon: <MessageCircle className="w-4 h-4" />, label: "WhatsApp" },
                  { id: "phone",    icon: <Phone className="w-4 h-4" />,          label: "Call" },
                  { id: "email",    icon: <Mail className="w-4 h-4" />,            label: "Email" },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPreferredContact(opt.id)}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      preferredContact === opt.id
                        ? "border-[#25D366] bg-[#D9FDD3] text-[#075E54]"
                        : "border-[#E9EDEF] bg-white text-[#667781] hover:border-[#25D366]/40"
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!phone}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2: Business ── */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-[#111B21] mb-1">About your business</h1>
              <p className="text-[#667781] text-sm mb-6">Helps us tailor templates and defaults for you.</p>

              <label className={labelCls}>Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className={selectCls + " mb-4"}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>

              <label className={labelCls}>Your role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={selectCls + " mb-4"}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <label className={labelCls}>Team size</label>
              <div className="grid grid-cols-4 gap-2 mb-6">
                {["Just me", "2–5", "6–20", "20+"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTeamSize(s)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      teamSize === s
                        ? "border-[#25D366] bg-[#D9FDD3] text-[#075E54]"
                        : "border-[#E9EDEF] bg-white text-[#667781] hover:border-[#25D366]/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E9EDEF] text-[#667781] hover:border-[#25D366]/40 hover:text-[#111B21] transition-all"
                >
                  ←
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3 rounded-xl transition-all"
                >
                  Continue →
                </button>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full text-center text-[#667781] text-sm mt-4 hover:text-[#111B21] transition-all"
              >
                Skip this step
              </button>
            </div>
          )}

          {/* ── STEP 3: Goals ── */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-[#111B21] mb-1">What will you use Waptrix for?</h1>
              <p className="text-[#667781] text-sm mb-5">Pick all that apply.</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {USE_CASE_OPTIONS.map((uc) => (
                  <Chip
                    key={uc.id}
                    label={uc.label}
                    icon={uc.icon}
                    selected={useCases.includes(uc.id)}
                    onClick={() => toggleUseCase(uc.id)}
                  />
                ))}
              </div>

              <label className={labelCls}>Messages per month (estimate)</label>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {VOLUME_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMsgVolume(v)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      msgVolume === v
                        ? "border-[#25D366] bg-[#D9FDD3] text-[#075E54]"
                        : "border-[#E9EDEF] bg-white text-[#667781] hover:border-[#25D366]/40"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <label className={labelCls}>
                How did you hear about us?{" "}
                <span className="text-[#667781]/60 font-normal">optional</span>
              </label>
              <select
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                className={selectCls + " mb-5"}
              >
                <option value="">Select one</option>
                {REFERRAL_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E9EDEF] text-[#667781] hover:border-[#25D366]/40 hover:text-[#111B21] transition-all"
                >
                  ←
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    "Finish setup ✓"
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
