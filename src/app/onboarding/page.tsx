"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Phone, Mail, Check } from "lucide-react";

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
  { id: "campaigns",    label: "Broadcast campaigns",      icon: "📢" },
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
            s <= step ? "bg-[#10B981]" : "bg-white/20"
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
          ? "border-[#10B981] bg-[#10B981]/20 text-white"
          : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router  = useRouter();
  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Step 1
  const [countryCode, setCountryCode]         = useState("+91");
  const [phone, setPhone]                     = useState("");
  const [isWhatsapp, setIsWhatsapp]           = useState(true);
  const [preferredContact, setPreferredContact] = useState<"whatsapp"|"phone"|"email">("whatsapp");

  // Step 2
  const [industry, setIndustry] = useState("");
  const [role, setRole]         = useState("Founder / Owner");
  const [teamSize, setTeamSize] = useState("2–5");

  // Step 3
  const [useCases, setUseCases]         = useState<string[]>([]);
  const [msgVolume, setMsgVolume]       = useState("1–10K");
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
      router.push("/connect");
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0F1A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#10B981] rounded-lg" />
          <span className="text-white font-bold text-lg">Waptrix</span>
        </div>

        <ProgressBar step={step} />
        <p className="text-white/50 text-sm mb-2">Step {step} of 3</p>

        {/* ── STEP 1: Contact ── */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">How can we reach you?</h1>
            <p className="text-white/50 text-sm mb-8">
              We'll only use this for account and billing updates — like a heads-up before your trial ends.
            </p>

            <label className="text-white/70 text-sm mb-2 block">Mobile number</label>
            <div className="flex gap-2 mb-4">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-white/10 border border-white/15 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#10B981] w-28"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#1a1c2e]">{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="9999999999"
                className="flex-1 bg-white/10 border border-white/15 text-white rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <label className="flex items-center gap-3 mb-6 cursor-pointer">
              <div
                onClick={() => setIsWhatsapp(!isWhatsapp)}
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  isWhatsapp ? "bg-[#10B981] border-[#10B981]" : "border-white/30 bg-transparent"
                }`}
              >
                {isWhatsapp && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-white/80 text-sm">This number is also on WhatsApp</span>
            </label>

            <label className="text-white/70 text-sm mb-3 block">Best way to contact you</label>
            <div className="flex gap-2 mb-8">
              {([
                { id: "whatsapp", icon: <MessageCircle className="w-4 h-4" />, label: "WhatsApp" },
                { id: "phone",    icon: <Phone className="w-4 h-4" />,          label: "Phone call" },
                { id: "email",    icon: <Mail className="w-4 h-4" />,            label: "Email" },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreferredContact(opt.id)}
                  className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    preferredContact === opt.id
                      ? "border-[#10B981] bg-[#10B981]/20 text-white"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!phone}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-[#080A0F] font-semibold py-3.5 rounded-xl transition-all"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Business ── */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">About your business</h1>
            <p className="text-white/50 text-sm mb-8">Helps us tailor templates and defaults for you.</p>

            <label className="text-white/70 text-sm mb-2 block">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-white/10 border border-white/15 text-white rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:border-[#10B981]"
            >
              <option value="" className="bg-[#1a1c2e]">Select industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i} className="bg-[#1a1c2e]">{i}</option>
              ))}
            </select>

            <label className="text-white/70 text-sm mb-2 block">Your role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white/10 border border-white/15 text-white rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:border-[#10B981]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="bg-[#1a1c2e]">{r}</option>
              ))}
            </select>

            <label className="text-white/70 text-sm mb-3 block">Team size</label>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {["Just me", "2–5", "6–20", "20+"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTeamSize(s)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    teamSize === s
                      ? "border-[#10B981] bg-[#10B981]/20 text-white"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-12 h-12 flex items-center justify-center rounded-xl border border-white/15 text-white/60 hover:border-white/30 transition-all"
              >
                ←
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-[#10B981] hover:bg-[#059669] text-[#080A0F] font-semibold py-3 rounded-xl transition-all"
              >
                Continue →
              </button>
            </div>
            <button
              onClick={() => setStep(3)}
              className="w-full text-center text-white/40 text-sm mt-4 hover:text-white/60 transition-all"
            >
              Skip this step
            </button>
          </div>
        )}

        {/* ── STEP 3: Goals ── */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">What will you use Waptrix for?</h1>
            <p className="text-white/50 text-sm mb-6">Pick all that apply.</p>

            <div className="flex flex-wrap gap-2 mb-6">
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

            <label className="text-white/70 text-sm mb-3 block">Messages per month (estimate)</label>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {VOLUME_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMsgVolume(v)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    msgVolume === v
                      ? "border-[#10B981] bg-[#10B981]/20 text-white"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <label className="text-white/70 text-sm mb-2 block">
              How did you hear about us? <span className="text-white/30">optional</span>
            </label>
            <select
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              className="w-full bg-white/10 border border-white/15 text-white rounded-xl px-4 py-3 text-sm mb-6 focus:outline-none focus:border-[#10B981]"
            >
              <option value="" className="bg-[#1a1c2e]">Select one</option>
              {REFERRAL_OPTIONS.map((r) => (
                <option key={r} value={r} className="bg-[#1a1c2e]">{r}</option>
              ))}
            </select>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2 mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="w-12 h-12 flex items-center justify-center rounded-xl border border-white/15 text-white/60 hover:border-white/30 transition-all"
              >
                ←
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-[#080A0F] font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
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
  );
}
