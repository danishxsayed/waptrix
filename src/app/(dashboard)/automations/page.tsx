"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Bot, Send, Clock, Loader2, CheckCircle2, Info, Hash, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata",       label: "IST — India (UTC+5:30)" },
  { value: "Asia/Dubai",         label: "GST — Dubai (UTC+4)" },
  { value: "Asia/Singapore",     label: "SGT — Singapore (UTC+8)" },
  { value: "Europe/London",      label: "GMT — London" },
  { value: "America/New_York",   label: "EST — New York (UTC-5)" },
  { value: "America/Los_Angeles",label: "PST — Los Angeles (UTC-8)" },
  { value: "UTC",                label: "UTC" },
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

interface KeywordRule {
  id: string;
  keywords: string[];
  response: string;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Record<string, any>>({});
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState<string | null>(null);
  const [saved, setSaved]             = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Keyword rules state
  const [kwEnabled, setKwEnabled]     = useState(false);
  const [kwRules, setKwRules]         = useState<KeywordRule[]>([]);
  const [kwSaving, setKwSaving]       = useState(false);
  const [kwSaved, setKwSaved]         = useState(false);
  const [kwError, setKwError]         = useState("");
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState<Record<string, string>>({});
  const kwSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    axios.get("/api/automations")
      .then(r => {
        const map: Record<string, any> = {};
        if (Array.isArray(r.data)) {
          r.data.forEach((a: any) => {
            map[a.type] = a;
            if (a.type === "keyword_rules") {
              setKwEnabled(!!a.enabled);
              try {
                const parsed = JSON.parse(a.message || "[]");
                setKwRules(Array.isArray(parsed) ? parsed : []);
              } catch { setKwRules([]); }
            }
          });
        }
        setAutomations(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (type: string, patch: object) => {
    const updated = { ...(automations[type] ?? { type }), ...patch };
    setAutomations(prev => ({ ...prev, [type]: updated }));
    clearTimeout(saveTimers.current[type]);
    saveTimers.current[type] = setTimeout(async () => {
      setSaving(type);
      try {
        const r = await axios.post("/api/automations", updated);
        setAutomations(prev => ({ ...prev, [type]: r.data }));
        setSaved(type);
        setTimeout(() => setSaved(null), 2000);
      } catch { }
      finally { setSaving(null); }
    }, 800);
  };

  // Save keyword rules (debounced)
  const saveKwRules = (rules: KeywordRule[], enabled: boolean) => {
    if (kwSaveTimer.current) clearTimeout(kwSaveTimer.current);
    kwSaveTimer.current = setTimeout(async () => {
      setKwSaving(true); setKwError("");
      try {
        await axios.post("/api/automations", {
          type: "keyword_rules",
          enabled,
          message: JSON.stringify(rules),
        });
        setKwSaved(true);
        setTimeout(() => setKwSaved(false), 2000);
      } catch (err: any) {
        setKwError(err.response?.data?.error || "Save failed");
      } finally { setKwSaving(false); }
    }, 600);
  };

  const addRule = () => {
    const newRule: KeywordRule = { id: genId(), keywords: [], response: "" };
    const next = [...kwRules, newRule];
    setKwRules(next);
    setExpandedRule(newRule.id);
    saveKwRules(next, kwEnabled);
  };

  const deleteRule = (id: string) => {
    const next = kwRules.filter(r => r.id !== id);
    setKwRules(next);
    saveKwRules(next, kwEnabled);
  };

  const updateRule = (id: string, patch: Partial<KeywordRule>) => {
    const next = kwRules.map(r => r.id === id ? { ...r, ...patch } : r);
    setKwRules(next);
    saveKwRules(next, kwEnabled);
  };

  const addKeyword = (ruleId: string) => {
    const kw = (newKeywordInput[ruleId] || "").trim();
    if (!kw) return;
    const rule = kwRules.find(r => r.id === ruleId);
    if (!rule) return;
    const next = [...new Set([...rule.keywords, kw])];
    updateRule(ruleId, { keywords: next });
    setNewKeywordInput(prev => ({ ...prev, [ruleId]: "" }));
  };

  const removeKeyword = (ruleId: string, kw: string) => {
    const rule = kwRules.find(r => r.id === ruleId);
    if (!rule) return;
    updateRule(ruleId, { keywords: rule.keywords.filter(k => k !== kw) });
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
      <div>
        <h2 className="text-xl font-bold font-syne">Automations</h2>
        <p className="text-sm text-text-muted mt-1">
          Auto-reply to incoming WhatsApp messages. Replies appear in the inbox like normal messages.
        </p>
      </div>

      {/* ── Greeting & OOO cards ───────────────────────────────── */}
      <div className="space-y-6">
        {AUTOMATION_CONFIG.map(({ type, icon: Icon, color, title, subtitle, placeholder, hasSchedule, tip }) => {
          const auto = automations[type] ?? {
            type, enabled: false, message: "", ooo_start: 18, ooo_end: 9, timezone: "Asia/Kolkata",
          };

          return (
            <div key={type} className={`glass-card border-${color}/10`}>
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
                <button
                  onClick={() => update(type, { enabled: !auto.enabled })}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${auto.enabled ? "bg-jade" : "bg-surface border border-border"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${auto.enabled ? "left-7" : "left-1"}`} />
                </button>
              </div>

              <div className="space-y-4">
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

                {hasSchedule && (
                  <div className="flex flex-wrap gap-4 items-end">
                    <div>
                      <label className="text-xs font-bold text-text-muted block mb-1.5">OOO from</label>
                      <select value={auto.ooo_start ?? 18} onChange={e => update(type, { ooo_start: parseInt(e.target.value) })}
                        className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-jade/50">
                        {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-muted block mb-1.5">until</label>
                      <select value={auto.ooo_end ?? 9} onChange={e => update(type, { ooo_end: parseInt(e.target.value) })}
                        className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-jade/50">
                        {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs font-bold text-text-muted block mb-1.5">Timezone</label>
                      <select value={auto.timezone ?? "Asia/Kolkata"} onChange={e => update(type, { timezone: e.target.value })}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-jade/50">
                        {TIMEZONE_OPTIONS.map(o => <option key={o.value + o.label} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="text-xs text-text-muted bg-surface border border-border rounded-xl px-3 py-2.5">
                      OOO active: <strong className="text-text-primary">
                        {(auto.ooo_start ?? 18).toString().padStart(2, "0")}:00 → {(auto.ooo_end ?? 9).toString().padStart(2, "0")}:00
                      </strong>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-surface border border-border rounded-xl px-4 py-3">
                  <Info className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-muted">{tip}</p>
                </div>

                <div className="flex items-center gap-2 h-5">
                  {saving === type && <p className="text-[11px] text-text-muted flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</p>}
                  {saved === type && <p className="text-[11px] text-jade flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Saved</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Keyword Rules ─────────────────────────────────────── */}
      <div className="glass-card border-warning/10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-warning/10 border border-warning/20">
              <Hash className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="font-bold text-sm">Keyword Auto-Replies</p>
              <p className="text-xs text-text-muted mt-0.5">
                Reply automatically when a message contains specific words or phrases.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !kwEnabled;
              setKwEnabled(next);
              saveKwRules(kwRules, next);
            }}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${kwEnabled ? "bg-jade" : "bg-surface border border-border"}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${kwEnabled ? "left-7" : "left-1"}`} />
          </button>
        </div>

        {/* Rules list */}
        <div className="space-y-3 mb-4">
          {kwRules.length === 0 && (
            <div className="text-center py-8 bg-surface border border-dashed border-border rounded-xl">
              <Hash className="w-8 h-8 text-text-muted opacity-30 mx-auto mb-2" />
              <p className="text-sm text-text-muted">No keyword rules yet</p>
              <p className="text-xs text-text-muted mt-1">Add a rule to auto-reply when someone types a keyword.</p>
            </div>
          )}

          {kwRules.map((rule, idx) => {
            const isExpanded = expandedRule === rule.id;
            return (
              <div key={rule.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                {/* Rule header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-5 h-5 rounded-full bg-warning/20 text-warning text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {rule.keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {rule.keywords.map(kw => (
                          <span key={kw} className="px-2 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded-full text-[11px] font-bold">
                            {kw}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">No keywords set</p>
                    )}
                    {rule.response && !isExpanded && (
                      <p className="text-[11px] text-text-muted mt-0.5 truncate">→ {rule.response}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                      className="p-1.5 rounded-lg hover:bg-border text-text-muted transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border">
                    {/* Keywords input */}
                    <div className="pt-3">
                      <label className="text-xs font-bold text-text-muted block mb-1.5">
                        Trigger keywords <span className="font-normal">(message must contain any of these)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {rule.keywords.map(kw => (
                          <span key={kw} className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded-full text-[11px] font-bold">
                            {kw}
                            <button onClick={() => removeKeyword(rule.id, kw)} className="hover:text-danger transition-colors">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newKeywordInput[rule.id] || ""}
                          onChange={e => setNewKeywordInput(prev => ({ ...prev, [rule.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(rule.id); } }}
                          placeholder="e.g. price, cost, how much"
                          className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50"
                        />
                        <button
                          onClick={() => addKeyword(rule.id)}
                          className="px-3 py-2 bg-warning/10 text-warning border border-warning/20 text-xs font-bold rounded-xl hover:bg-warning/20 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Response */}
                    <div>
                      <label className="text-xs font-bold text-text-muted block mb-1.5">Auto-reply message</label>
                      <textarea
                        rows={3}
                        value={rule.response}
                        onChange={e => updateRule(rule.id, { response: e.target.value })}
                        placeholder="Type the reply to send when this keyword is matched…"
                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add rule button */}
        <button
          onClick={addRule}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm text-text-muted hover:text-jade hover:border-jade/40 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add keyword rule
        </button>

        {/* Save status */}
        <div className="flex items-center gap-2 mt-3 h-5">
          {kwSaving && <p className="text-[11px] text-text-muted flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</p>}
          {kwSaved && <p className="text-[11px] text-jade flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Saved</p>}
          {kwError && <p className="text-[11px] text-danger flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> {kwError}</p>}
        </div>

        <div className="flex items-start gap-2 bg-card border border-border rounded-xl px-4 py-3 mt-3">
          <Info className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted">
            Rules are checked in order — the first match wins. Keywords are case-insensitive and match partial words.
            The same contact won't get a keyword reply from OOO or greeting at the same time.
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="glass-card bg-jade/5 border-jade/15">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-jade flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-jade">How automations work</p>
            <p className="text-xs text-text-muted leading-relaxed">
              When a WhatsApp message arrives, Waptrix checks automations in order: greeting (first-ever message),
              keyword rules (content match), then OOO (outside business hours). Only one rule fires per message.
              All auto-replies appear in the shared inbox so your team can follow up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
