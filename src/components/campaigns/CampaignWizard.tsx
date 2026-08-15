"use client";

import { useState, useEffect } from "react";
import {
  X, ChevronRight, ChevronLeft, Send, Users, FileText,
  Calendar, CheckCircle2, AlertCircle, Loader2, Plus, Trash2,
  Zap, Eye, MessageSquare, Clock, Info, ImageIcon, Video, UploadCloud,
} from "lucide-react";
import axios from "axios";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AutoReplyRule {
  id: string;
  keywords: string;   // comma-separated
  response: string;
}

interface FormData {
  name: string;
  description: string;
  template_id: string;
  segment_id: string;
  variable_mapping: Record<string, string>;
  header_media_url: string;
  send_now: boolean;
  scheduled_at: string;
  timezone: string;
  auto_replies: {
    enabled: boolean;
    rules: AutoReplyRule[];
  };
}

const STEP_META = [
  { label: "Details",  icon: FileText,     desc: "Name & description" },
  { label: "Audience", icon: Users,        desc: "Pick contacts" },
  { label: "Message",  icon: MessageSquare,desc: "Template & preview" },
  { label: "Auto-Reply",icon: Zap,         desc: "Keyword triggers" },
  { label: "Launch",   icon: Send,         desc: "Review & send" },
];

// ─── Timezone options ────────────────────────────────────────────────────────
const TZ_OPTIONS = [
  { group: "India",             options: [{ v: "Asia/Kolkata",       l: "India (IST, UTC+5:30)" }] },
  { group: "Gulf",              options: [
      { v: "Asia/Dubai",        l: "UAE / GST (UTC+4)" },
      { v: "Asia/Riyadh",       l: "Saudi / AST (UTC+3)" },
      { v: "Asia/Kuwait",       l: "Kuwait (UTC+3)" },
  ]},
  { group: "Asia",              options: [
      { v: "Asia/Karachi",      l: "Pakistan (UTC+5)" },
      { v: "Asia/Dhaka",        l: "Bangladesh (UTC+6)" },
      { v: "Asia/Singapore",    l: "Singapore (UTC+8)" },
      { v: "Asia/Tokyo",        l: "Japan (UTC+9)" },
  ]},
  { group: "Europe",            options: [
      { v: "Europe/London",     l: "London (GMT/BST)" },
      { v: "Europe/Paris",      l: "Central Europe (CET)" },
  ]},
  { group: "Americas",          options: [
      { v: "America/New_York",  l: "Eastern (ET)" },
      { v: "America/Los_Angeles",l:"Pacific (PT)" },
  ]},
  { group: "Other",             options: [{ v: "UTC", l: "UTC+0" }] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function wallClockToUTC(naive: string, tz: string): string {
  const naiveUTC = new Date(naive + ":00Z");
  const fmt = new Intl.DateTimeFormat("sv", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const tzShown = new Date(fmt.format(naiveUTC));
  const offsetMs = tzShown.getTime() - naiveUTC.getTime();
  return new Date(naiveUTC.getTime() - offsetMs).toISOString();
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── WhatsApp preview bubble ─────────────────────────────────────────────────
function WaPreview({
  body, mapping, headerType, headerMediaUrl,
}: {
  body: string;
  mapping: Record<string, string>;
  headerType?: string;
  headerMediaUrl?: string;
}) {
  const fieldLabels: Record<string, string> = {
    name: "Contact Name", phone: "Phone Number", email: "Email",
    custom1: "User ID", custom2: "Tags", custom3: "Appt/Location",
  };
  const rendered = body.replace(/{{\d+}}/g, (match) => {
    const num = match.replace("{{", "").replace("}}", "");
    const field = mapping[num];
    return field ? `[${fieldLabels[field] || field}]` : match;
  });

  const ht = headerType?.toUpperCase();

  return (
    <div className="bg-[#EDE8DE] rounded-2xl p-4 font-sans">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-bold text-[#075E54]">WhatsApp Preview</span>
      </div>
      <div className="bg-[#D9FDD3] rounded-xl rounded-tl-none shadow-sm overflow-hidden max-w-xs">
        {/* Header media preview */}
        {ht === 'IMAGE' && headerMediaUrl && (
          <img src={headerMediaUrl} alt="Header" className="w-full max-h-36 object-cover" />
        )}
        {ht === 'IMAGE' && !headerMediaUrl && (
          <div className="w-full h-24 bg-[#b7ebc3] flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-[#075E54]/40" />
          </div>
        )}
        {ht === 'VIDEO' && (
          <div className="w-full h-24 bg-[#b7ebc3] flex items-center justify-center gap-2">
            <Video className="w-8 h-8 text-[#075E54]/40" />
            {headerMediaUrl && <span className="text-[10px] text-[#075E54]/60 font-bold">Video attached</span>}
          </div>
        )}
        {ht === 'DOCUMENT' && (
          <div className="w-full h-14 bg-[#b7ebc3] flex items-center justify-center gap-2 px-3">
            <FileText className="w-6 h-6 text-[#075E54]/60" />
            <span className="text-[10px] text-[#075E54]/60 font-bold truncate">
              {headerMediaUrl ? headerMediaUrl.split('/').pop() : 'Document'}
            </span>
          </div>
        )}
        <div className="p-3">
          <p className="text-xs text-[#111B21] whitespace-pre-wrap leading-relaxed">{rendered}</p>
          <p className="text-[9px] text-[#667781] text-right mt-1.5 flex items-center justify-end gap-0.5">
            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
            <CheckCircle2 className="w-2.5 h-2.5 text-[#25D366]" />
            <CheckCircle2 className="w-2.5 h-2.5 text-[#25D366] -ml-1.5" />
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Header media upload ─────────────────────────────────────────────────────
function HeaderMediaUpload({
  headerType, value, onChange,
}: {
  headerType: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const accept =
    headerType === "VIDEO"    ? "video/mp4,video/3gpp" :
    headerType === "DOCUMENT" ? ".pdf,.doc,.docx,application/pdf" :
    "image/jpeg,image/png,image/webp";

  const TypeIcon =
    headerType === "VIDEO"    ? Video :
    headerType === "DOCUMENT" ? FileText :
    ImageIcon;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <div className="flex items-center gap-2">
        <TypeIcon className="w-3.5 h-3.5 text-jade" />
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{headerType} Header</p>
      </div>

      {value ? (
        <>
          {/* Already have a URL — show it, offer to replace */}
          {headerType === "IMAGE" && (
            <img src={value} alt="Header" className="w-full max-h-36 object-cover rounded-xl border border-jade/20" />
          )}
          <div className="flex items-center justify-between bg-jade/5 border border-jade/20 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-jade shrink-0" />
              <span className="text-xs text-jade font-semibold truncate">
                {headerType === "IMAGE" ? "Image from template" : value.split("/").pop()}
              </span>
            </div>
            <label className="text-[10px] font-bold text-text-muted hover:text-jade cursor-pointer ml-2 shrink-0 transition-colors">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Replace"}
              <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
          </div>
        </>
      ) : (
        <>
          {/* No URL yet — show upload */}
          <p className="text-[11px] text-text-muted">
            No media stored for this template. Upload a {headerType.toLowerCase()} to send with this campaign.
          </p>
          <label className={`flex items-center justify-center gap-2 cursor-pointer rounded-xl px-4 py-3 border-2 border-dashed transition-all ${
            uploading ? "opacity-50 cursor-not-allowed" : "hover:border-jade hover:bg-jade/5 border-border"
          }`}>
            {uploading ? <Loader2 className="w-4 h-4 text-jade animate-spin" /> : <UploadCloud className="w-4 h-4 text-jade" />}
            <span className="text-sm font-bold text-jade">
              {uploading ? "Uploading…" : `Upload ${headerType.toLowerCase()}`}
            </span>
            <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        </>
      )}

      {uploadError && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
      )}
    </div>
  );
}

// ─── Step progress indicator ─────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  return (
    <div className="px-8 py-4 border-b border-border bg-card/50">
      <div className="flex items-center gap-1">
        {STEP_META.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          const Icon = s.icon;
          return (
            <div key={n} className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  done   ? "bg-jade border-jade text-white" :
                  active ? "bg-jade/10 border-jade text-jade" :
                           "bg-surface border-border text-text-muted"
                }`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${active ? "text-jade" : done ? "text-jade/70" : "text-text-muted"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEP_META.length - 1 && (
                <div className={`h-px flex-1 mx-1 mb-3 transition-all ${n < step ? "bg-jade" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CampaignWizard({
  onClose, onLaunch, initialSegmentId,
}: {
  onClose: () => void;
  onLaunch: () => void;
  initialSegmentId?: string;
}) {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [launchError, setLaunchError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    template_id: "",
    segment_id: initialSegmentId || "",
    variable_mapping: {},
    header_media_url: "",
    send_now: true,
    scheduled_at: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    auto_replies: { enabled: false, rules: [] },
  });

  useEffect(() => {
    if (initialSegmentId) setFormData(p => ({ ...p, segment_id: initialSegmentId }));
  }, [initialSegmentId]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoadingData(true);
    setLoadError("");
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get("/api/templates"),
        axios.get("/api/contacts/segments"),
      ]);
      setTemplates((tRes.data || []).filter((t: any) => t.meta_status === "APPROVED"));
      setSegments(sRes.data || []);
    } catch (err: any) {
      setLoadError(err.response?.data?.error || "Failed to load data. Please retry.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const minDatetimeLocal = (): string => {
    const nowPlus1m = new Date(Date.now() + 60_000);
    const fmt = new Intl.DateTimeFormat("sv", {
      timeZone: formData.timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
    return fmt.format(nowPlus1m).replace(" ", "T");
  };

  const scheduledAtIsValid = () => {
    if (!formData.scheduled_at) return false;
    return new Date(wallClockToUTC(formData.scheduled_at, formData.timezone)) > new Date();
  };

  // Auto-reply helpers
  const addRule = () => setFormData(p => ({
    ...p,
    auto_replies: {
      ...p.auto_replies,
      rules: [...p.auto_replies.rules, { id: uid(), keywords: "", response: "" }],
    },
  }));

  const updateRule = (id: string, field: "keywords" | "response", val: string) =>
    setFormData(p => ({
      ...p,
      auto_replies: {
        ...p.auto_replies,
        rules: p.auto_replies.rules.map(r => r.id === id ? { ...r, [field]: val } : r),
      },
    }));

  const removeRule = (id: string) =>
    setFormData(p => ({
      ...p,
      auto_replies: {
        ...p.auto_replies,
        rules: p.auto_replies.rules.filter(r => r.id !== id),
      },
    }));

  const handleLaunch = async () => {
    setLaunchError("");
    setIsSubmitting(true);
    try {
      const payload: any = { ...formData };
      if (!payload.send_now && payload.scheduled_at) {
        payload.scheduled_at = wallClockToUTC(payload.scheduled_at, payload.timezone);
      }
      // Embed header media URL inside variable_mapping with a reserved key
      if (payload.header_media_url) {
        payload.variable_mapping = {
          ...payload.variable_mapping,
          _header_media_url: payload.header_media_url,
        };
      }
      delete payload.header_media_url;
      // Clean up auto_replies — strip ids from rules before sending
      payload.auto_replies = {
        enabled: payload.auto_replies.enabled,
        rules: payload.auto_replies.rules
          .filter((r: AutoReplyRule) => r.keywords.trim() && r.response.trim())
          .map((r: AutoReplyRule) => ({
            keywords: r.keywords.split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean),
            response: r.response.trim(),
          })),
      };
      await axios.post("/api/campaigns", payload);
      onLaunch();
      onClose();
    } catch (err: any) {
      setLaunchError(err.response?.data?.error || err.message || "Launch failed.");
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === formData.template_id);
  const selectedSegment = segments.find(s => s.id === formData.segment_id);
  const variables: string[] = selectedTemplate ? (selectedTemplate.body.match(/{{\d+}}/g) || []) : [];

  const fieldLabels: Record<string, string> = {
    name: "Contact Name", phone: "Phone Number", email: "Email",
    custom1: "User ID", custom2: "Tags", custom3: "Appt/Location",
  };

  // Step validation
  const canNext: Record<number, boolean> = {
    1: formData.name.trim().length > 0,
    2: formData.segment_id !== "",
    3: formData.template_id !== "",
    4: true,
    5: formData.send_now || scheduledAtIsValid(),
  };

  const go = (dir: 1 | -1) => {
    setLaunchError("");
    setStep(s => s + dir);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-card shrink-0">
          <div>
            <h2 className="text-lg font-bold font-syne leading-tight">New Campaign</h2>
            <p className="text-[10px] text-text-muted">
              Step {step} of {STEP_META.length} — {STEP_META[step - 1].desc}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl text-text-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step bar */}
        <StepBar step={step} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-jade animate-spin" />
              <p className="text-sm text-text-muted">Loading templates & segments…</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center px-8">
              <AlertCircle className="w-10 h-10 text-danger opacity-70" />
              <p className="text-sm text-danger">{loadError}</p>
              <button onClick={fetchData} className="btn-secondary text-sm">Retry</button>
            </div>
          ) : (
            <div className="p-8">

              {/* ── STEP 1: Details ────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader icon={FileText} title="Campaign Details" sub="Give your campaign a name and optional description" />
                  <div className="space-y-4">
                    <Field label="Campaign Name *">
                      <input
                        value={formData.name}
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. August Flash Sale"
                        className="input-field w-full text-sm"
                      />
                    </Field>
                    <Field label="Description (optional)">
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        placeholder="What is this campaign about? (internal note)"
                        rows={3}
                        className="input-field w-full text-sm resize-none"
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Audience ───────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader icon={Users} title="Target Audience" sub="Choose which contacts receive this campaign" />
                  {segments.length === 0 ? (
                    <EmptyState icon={Users} title="No segments found" sub="Go to Contacts → create a segment first." />
                  ) : (
                    <div className="space-y-3">
                      {segments.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setFormData(p => ({ ...p, segment_id: s.id }))}
                          className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-4 ${
                            formData.segment_id === s.id
                              ? "bg-jade/5 border-jade"
                              : "bg-card border-border hover:border-jade/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.segment_id === s.id ? "bg-jade/10" : "bg-surface"}`}>
                              <Users className={`w-5 h-5 ${formData.segment_id === s.id ? "text-jade" : "text-text-muted"}`} />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{s.name}</p>
                              <p className="text-[11px] text-text-muted mt-0.5">{s.contact_count ?? "All"} contacts</p>
                            </div>
                          </div>
                          {formData.segment_id === s.id && <CheckCircle2 className="w-5 h-5 text-jade shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Message ────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader icon={MessageSquare} title="Message Template" sub="Select an approved WhatsApp template" />
                  {templates.length === 0 ? (
                    <EmptyState icon={FileText} title="No approved templates" sub="Go to Templates → create and get Meta approval first." />
                  ) : (
                    <div className="space-y-3">
                      {templates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setFormData(p => ({
                            ...p,
                            template_id: t.id,
                            variable_mapping: {},
                            // Auto-populate header URL from template if it has stored media
                            header_media_url: (['IMAGE','VIDEO','DOCUMENT'].includes(t.header_type?.toUpperCase()))
                              ? (t.header_text?.startsWith('https://') ? t.header_text : "")
                              : "",
                          }))}
                          className={`w-full p-4 rounded-2xl border text-left transition-all ${
                            formData.template_id === t.id
                              ? "bg-jade/5 border-jade"
                              : "bg-card border-border hover:border-jade/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm">{t.name}</p>
                              <p className="text-[11px] text-text-muted mt-1 line-clamp-2 italic">&ldquo;{t.body}&rdquo;</p>
                            </div>
                            <span className="text-[10px] font-bold text-text-muted uppercase px-2 py-0.5 border border-border rounded-lg shrink-0">{t.category}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Variable mapping */}
                  {selectedTemplate && variables.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border">
                      <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Map Variables</p>
                      <p className="text-[11px] text-text-muted">Which contact field fills each template variable?</p>
                      {variables.map((v: string) => {
                        const num = v.replace("{{", "").replace("}}", "");
                        return (
                          <div key={v} className="flex items-center gap-3">
                            <span className="font-mono text-jade bg-jade/10 border border-jade/20 px-3 py-1.5 rounded-lg text-xs shrink-0">{v}</span>
                            <select
                              className="input-field flex-1 text-xs"
                              value={formData.variable_mapping[num] || ""}
                              onChange={e => setFormData(p => ({
                                ...p,
                                variable_mapping: { ...p.variable_mapping, [num]: e.target.value },
                              }))}
                            >
                              <option value="">Select contact field</option>
                              {Object.entries(fieldLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Header media upload — shown only when template needs it */}
                  {selectedTemplate && ['IMAGE','VIDEO','DOCUMENT'].includes(selectedTemplate.header_type?.toUpperCase()) && (
                    <HeaderMediaUpload
                      headerType={selectedTemplate.header_type.toUpperCase()}
                      value={formData.header_media_url}
                      onChange={(url) => setFormData(p => ({ ...p, header_media_url: url }))}
                    />
                  )}

                  {/* WhatsApp preview */}
                  {selectedTemplate && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-3.5 h-3.5 text-jade" />
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Preview</p>
                      </div>
                      <WaPreview
                        body={selectedTemplate.body}
                        mapping={formData.variable_mapping}
                        headerType={selectedTemplate.header_type}
                        headerMediaUrl={formData.header_media_url}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: Auto-Replies ───────────────────────────── */}
              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader icon={Zap} title="Automated Replies" sub="Auto-respond when recipients reply with specific keywords" />

                  {/* Enable toggle */}
                  <button
                    onClick={() => setFormData(p => ({
                      ...p,
                      auto_replies: { ...p.auto_replies, enabled: !p.auto_replies.enabled },
                    }))}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                      formData.auto_replies.enabled
                        ? "bg-jade/5 border-jade"
                        : "bg-card border-border hover:border-jade/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.auto_replies.enabled ? "bg-jade/10" : "bg-surface"}`}>
                        <Zap className={`w-5 h-5 ${formData.auto_replies.enabled ? "text-jade" : "text-text-muted"}`} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">Enable Automated Replies</p>
                        <p className="text-[11px] text-text-muted">Auto-send a message when a recipient replies</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-all flex items-center ${formData.auto_replies.enabled ? "bg-jade" : "bg-border"}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${formData.auto_replies.enabled ? "translate-x-6" : "translate-x-0"}`} />
                    </div>
                  </button>

                  {formData.auto_replies.enabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-jade" />
                          <p className="text-xs text-text-muted">
                            Add keyword groups — if a reply contains any keyword, the response is sent automatically.
                          </p>
                        </div>
                      </div>

                      {/* Rules */}
                      {formData.auto_replies.rules.map((rule, i) => (
                        <div key={rule.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Rule {i + 1}</span>
                            <button
                              onClick={() => removeRule(rule.id)}
                              className="p-1 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                              Trigger Keywords <span className="text-text-muted font-normal">(comma-separated)</span>
                            </label>
                            <input
                              value={rule.keywords}
                              onChange={e => updateRule(rule.id, "keywords", e.target.value)}
                              placeholder="yes, interested, sure, tell me more"
                              className="input-field w-full text-sm"
                            />
                            <p className="text-[10px] text-text-muted">
                              Match is case-insensitive. Partial matches count (e.g. "yes" matches "Yes please").
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Automated Response</label>
                            <textarea
                              value={rule.response}
                              onChange={e => updateRule(rule.id, "response", e.target.value)}
                              placeholder="Thanks for your interest! Here's more about our product..."
                              rows={3}
                              className="input-field w-full text-sm resize-none"
                            />
                          </div>

                          {/* Mini preview */}
                          {rule.response && (
                            <div className="bg-[#EDE8DE] rounded-xl p-3">
                              <p className="text-[9px] font-bold text-[#667781] mb-1.5 uppercase tracking-wider">Preview</p>
                              <div className="bg-[#D9FDD3] rounded-xl rounded-tl-none p-2.5 max-w-xs shadow-sm">
                                <p className="text-[11px] text-[#111B21] whitespace-pre-wrap leading-relaxed">{rule.response}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={addRule}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-jade/40 hover:bg-jade/5 text-text-muted hover:text-jade transition-all text-sm font-bold"
                      >
                        <Plus className="w-4 h-4" /> Add Reply Rule
                      </button>
                    </div>
                  )}

                  {!formData.auto_replies.enabled && (
                    <div className="flex items-start gap-3 p-4 bg-surface border border-border/50 rounded-xl text-xs text-text-muted">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Skip this step if you don't need auto-replies. You can always edit the campaign later to add them.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 5: Schedule & Review ──────────────────────── */}
              {step === 5 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader icon={Send} title="Schedule & Launch" sub="When to send and a final review" />

                  {/* Send now / schedule */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormData(p => ({ ...p, send_now: true }))}
                      className={`p-4 rounded-2xl border text-left transition-all ${formData.send_now ? "bg-jade/5 border-jade" : "bg-card border-border hover:border-jade/30"}`}
                    >
                      <Send className={`w-5 h-5 mb-2 ${formData.send_now ? "text-jade" : "text-text-muted"}`} />
                      <p className="font-bold text-sm">Send Now</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Broadcast starts immediately</p>
                    </button>
                    <button
                      onClick={() => setFormData(p => ({ ...p, send_now: false }))}
                      className={`p-4 rounded-2xl border text-left transition-all ${!formData.send_now ? "bg-jade/5 border-jade" : "bg-card border-border hover:border-jade/30"}`}
                    >
                      <Clock className={`w-5 h-5 mb-2 ${!formData.send_now ? "text-jade" : "text-text-muted"}`} />
                      <p className="font-bold text-sm">Schedule</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Pick a date & time</p>
                    </button>
                  </div>

                  {!formData.send_now && (
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                      <Field label="Timezone">
                        <select
                          value={formData.timezone}
                          onChange={e => setFormData(p => ({ ...p, timezone: e.target.value, scheduled_at: "" }))}
                          className="input-field w-full text-sm"
                        >
                          {TZ_OPTIONS.map(g => (
                            <optgroup key={g.group} label={g.group}>
                              {g.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </Field>
                      <Field label="Date & Time">
                        <input
                          type="datetime-local"
                          value={formData.scheduled_at}
                          min={minDatetimeLocal()}
                          onChange={e => setFormData(p => ({ ...p, scheduled_at: e.target.value }))}
                          className="input-field w-full text-sm"
                        />
                        {formData.scheduled_at && !scheduledAtIsValid() && (
                          <p className="text-xs text-danger mt-1">Please pick a future date and time.</p>
                        )}
                      </Field>
                    </div>
                  )}

                  {/* Summary card */}
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 bg-surface/50 border-b border-border">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Campaign Summary</p>
                    </div>
                    <div className="divide-y divide-border/50">
                      {[
                        ["Campaign", formData.name],
                        ["Audience", selectedSegment?.name || "—"],
                        ["Template", selectedTemplate?.name || "—"],
                        ["Schedule", formData.send_now ? "Immediately" : (formData.scheduled_at ? (() => {
                          const d = new Date(wallClockToUTC(formData.scheduled_at, formData.timezone));
                          return new Intl.DateTimeFormat("en-IN", {
                            timeZone: formData.timezone, dateStyle: "medium", timeStyle: "short",
                          }).format(d);
                        })() : "Not set")],
                        ["Auto-Replies", formData.auto_replies.enabled
                          ? `Enabled (${formData.auto_replies.rules.filter(r => r.keywords && r.response).length} rule${formData.auto_replies.rules.filter(r => r.keywords && r.response).length !== 1 ? "s" : ""})`
                          : "Disabled"
                        ],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between px-5 py-3">
                          <span className="text-xs text-text-muted">{k}</span>
                          <span className={`text-xs font-bold text-right max-w-[60%] truncate ${k === "Auto-Replies" && formData.auto_replies.enabled ? "text-jade" : "text-text-primary"}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {launchError && (
                    <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs">Launch failed</p>
                        <p className="text-xs mt-0.5 opacity-80">{launchError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-20 border-t border-border bg-card px-8 flex items-center justify-between shrink-0">
          <button
            onClick={() => go(-1)}
            disabled={step === 1 || isLoadingData}
            className={`flex items-center gap-1 text-sm font-bold transition-colors ${
              step === 1 || isLoadingData ? "text-text-muted opacity-30 cursor-not-allowed" : "text-text-primary hover:text-jade"
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < 5 ? (
            <button
              onClick={() => go(1)}
              disabled={isLoadingData || !!loadError || !canNext[step]}
              className="btn-primary flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isSubmitting || !canNext[5]}
              className="btn-primary flex items-center gap-2 px-8 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? "Launching…" : formData.send_now ? "Launch Campaign 🚀" : "Schedule Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 bg-jade/10 rounded-xl flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-jade" />
      </div>
      <div>
        <h3 className="font-bold font-syne text-lg leading-tight">{title}</h3>
        <p className="text-xs text-text-muted">{sub}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div className="p-10 text-center bg-card border border-dashed border-border rounded-2xl space-y-2">
      <Icon className="w-8 h-8 text-text-muted mx-auto opacity-30" />
      <p className="text-sm font-semibold text-text-muted">{title}</p>
      <p className="text-xs text-text-muted">{sub}</p>
    </div>
  );
}
