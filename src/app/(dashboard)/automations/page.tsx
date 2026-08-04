"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Bot, Send, Clock, Loader2, CheckCircle2, Info } from "lucide-react";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata",      label: "IST — India (UTC+5:30)" },
  { value: "Asia/Dubai",        label: "GST — Dubai (UTC+4)" },
  { value: "Asia/Singapore",    label: "SGT — Singapore (UTC+8)" },
  { value: "Asia/Kolkata",      label: "IST — India (UTC+5:30)" },
  { value: "Europe/London",     label: "GMT — London" },
  { value: "America/New_York",  label: "EST — New York (UTC-5)" },
  { value: "America/Los_Angeles", label: "PST — Los Angeles (UTC-8)" },
  { value: "UTC",               label: "UTC" },
];

const AUTOMATION_CONFIG = [
  {
    type: "greeting",
    icon: Send,
    color: "jade",
    title: "Greeting Message",
    subtitle: "Automatically sent when someone messages you for the very first time.",
    placeholder: "Hi! 👋 Thanks for reaching out. We'll get back to you shortly.",
    hasSchedule: false,
    tip: "Keep it short and friendly. Let them know someone will reply soon.",
  },
  {
    type: "ooo",
    icon: Clock,
    color: "info",
    title: "Out-of-Office Reply",
    subtitle: "Sent when a message arrives outside your business hours. Throttled to once per 12h per contact.",
    placeholder: "We're currently outside office hours. We'll respond first thing when we're back! 🙏",
    hasSchedule: true,
    tip: "Set your OOO window so customers know when to expect a response.",
  },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Record<string, any>>({});
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState<string | null>(null);
  const [saved, setSaved]             = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    axios.get("/api/automations")
      .then(r => {
        const map: Record<string, any> = {};
        if (Array.isArray(r.data)) r.data.forEach((a: any) => { map[a.type] = a; });
        setAutomations(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (type: string, patch: object) => {
    const updated = { ...(automations[type] ?? { type }), ...patch };
    setAutomations(prev => ({ ...prev, [type]: updated }));

    // Debounce save (wait 800ms after last change)
    clearTimeout(saveTimers.current[type]);
    saveTimers.current[type] = setTimeout(async () => {
      setSaving(type);
      try {
        const r = await axios.post("/api/automations", updated);
        setAutomations(prev => ({ ...prev, [type]: r.data }));
        setSaved(type);
        setTimeout(() => setSaved(null), 2000);
      } catch { /* silent */ }
      finally { setSaving(null); }
    }, 800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-jade animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-syne">Automations</h2>
        <p className="text-sm text-text-muted mt-1">
          Auto-reply to incoming WhatsApp messages. Replies are sent via your connected number and appear in the inbox.
        </p>
      </div>

      {/* Automation cards */}
      <div className="space-y-6">
        {AUTOMATION_CONFIG.map(({ type, icon: Icon, color, title, subtitle, placeholder, hasSchedule, tip }) => {
          const auto = automations[type] ?? {
            type, enabled: false, message: "", ooo_start: 18, ooo_end: 9, timezone: "Asia/Kolkata",
          };

          return (
            <div key={type} className={`glass-card border-${color}/10`}>
              {/* Top row: icon + title + toggle */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-${color}/10 border border-${color}/20`}>
                    <Icon className={`w-5 h-5 text-${color}`} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => update(type, { enabled: !auto.enabled })}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${auto.enabled ? "bg-jade" : "bg-surface border border-border"}`}
                  title={auto.enabled ? "Disable" : "Enable"}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${auto.enabled ? "left-7" : "left-1"}`} />
                </button>
              </div>

              {/* Expanded config (always visible so users can pre-fill before enabling) */}
              <div className="space-y-4">
                {/* Message textarea */}
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1.5">Auto-reply message</label>
                  <textarea
                    rows={3}
                    value={auto.message}
                    onChange={e => update(type, { message: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50 resize-none"
                  />
                </div>

                {/* OOO schedule */}
                {hasSchedule && (
                  <div className="flex flex-wrap gap-4 items-end">
                    <div>
                      <label className="text-xs font-bold text-text-muted block mb-1.5">OOO from</label>
                      <select
                        value={auto.ooo_start ?? 18}
                        onChange={e => update(type, { ooo_start: parseInt(e.target.value) })}
                        className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-jade/50"
                      >
                        {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-muted block mb-1.5">until</label>
                      <select
                        value={auto.ooo_end ?? 9}
                        onChange={e => update(type, { ooo_end: parseInt(e.target.value) })}
                        className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-jade/50"
                      >
                        {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs font-bold text-text-muted block mb-1.5">Timezone</label>
                      <select
                        value={auto.timezone ?? "Asia/Kolkata"}
                        onChange={e => update(type, { timezone: e.target.value })}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-jade/50"
                      >
                        {TIMEZONE_OPTIONS.map(o => <option key={o.value + o.label} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {/* Live preview */}
                    <div className="text-xs text-text-muted bg-surface border border-border rounded-xl px-3 py-2.5">
                      OOO active: <strong className="text-text-primary">
                        {(auto.ooo_start ?? 18).toString().padStart(2, "0")}:00
                        {" → "}
                        {(auto.ooo_end ?? 9).toString().padStart(2, "0")}:00
                      </strong>
                    </div>
                  </div>
                )}

                {/* Tip */}
                <div className="flex items-start gap-2 bg-surface border border-border rounded-xl px-4 py-3">
                  <Info className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-muted">{tip}</p>
                </div>

                {/* Save status */}
                <div className="flex items-center gap-2 h-5">
                  {saving === type && (
                    <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                    </p>
                  )}
                  {saved === type && (
                    <p className="text-[11px] text-jade flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" /> Saved
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="glass-card bg-jade/5 border-jade/15">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-jade flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-jade">How automations work</p>
            <p className="text-xs text-text-muted leading-relaxed">
              When a WhatsApp message arrives, Waptrix checks your automations and fires the appropriate reply via your connected number.
              The auto-reply appears in the shared inbox just like a normal outbound message — your team can see it and continue the conversation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
