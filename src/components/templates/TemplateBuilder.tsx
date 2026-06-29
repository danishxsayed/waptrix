"use client";

import { useState, useRef } from "react";
import {
  X, Send, Save, Info, Plus, Trash2, Smartphone, Image as ImageIcon,
  CheckCircle2, Clock, XCircle, Link, Phone, MessageSquare, Globe,
  AlertCircle, Loader2, Upload, Film, FileText as FileIcon, FolderOpen
} from "lucide-react";
import axios from "axios";
import MediaLibrary from "@/components/media/MediaLibrary";
import { readFileAsDataUrl, categoryFromMime, type MediaItem } from "@/lib/mediaStore";


// ─── Types ────────────────────────────────────────────────────────────────────
type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
}

interface FormData {
  name: string;
  category: string;
  language: string;
  header_type: string;
  header_text: string;
  header_image_url: string;
  body: string;
  footer: string;
  buttons: TemplateButton[];
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-jade/15 text-jade border border-jade/30">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved by Meta
        </span>
      );
    case "PENDING":
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Meta Review
        </span>
      );
    case "REJECTED":
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-danger/15 text-danger border border-danger/30">
          <XCircle className="w-3.5 h-3.5" /> Rejected by Meta
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-card text-text-muted border border-border">
          Draft
        </span>
      );
  }
}

// ─── WhatsApp phone frame ──────────────────────────────────────────────────────
function PhonePreview({
  formData,
  platform,
  metaStatus,
}: {
  formData: FormData;
  platform: "android" | "ios";
  metaStatus: string;
}) {
  const isIOS = platform === "ios";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Authentic WhatsApp dark mode colors
  const WA = {
    bg: "#0B141A",           // chat background
    bubble: "#005C4B",       // outgoing message / business template bubble
    header: "#202C33",       // top bar
    inputBar: "#202C33",     // bottom input area
    buttonText: "#00A884",   // WhatsApp teal for CTA buttons
    buttonBorder: "#1D3129", // subtle divider inside bubble
    footerText: "#8696A0",   // footer / muted text
    timestamp: "#8696A0",    // ✓✓ time
  };

  return (
    <div
      className={`relative overflow-hidden shadow-2xl ${
        isIOS ? "rounded-[44px] border-[5px] border-[#3A3A3C]" : "rounded-[32px] border-[3px] border-[#2A3540]"
      }`}
      style={{ width: 270, height: 560, background: isIOS ? "#000" : "#0D1821", flexShrink: 0 }}
    >
      {/* ── Screen fills the entire frame ── */}
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{ borderRadius: isIOS ? 40 : 30 }}
      >
        {/* Status bar (time + icons) */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{ background: WA.header, height: isIOS ? 38 : 22, paddingTop: isIOS ? 10 : 4 }}
        >
          <span className="text-white text-[9px] font-semibold">{time}</span>
          <div className="flex items-center gap-1">
            {/* Signal bars */}
            <svg width="12" height="9" viewBox="0 0 12 9" fill="white" opacity="0.8">
              <rect x="0" y="5" width="2" height="4" rx="0.5"/>
              <rect x="3" y="3" width="2" height="6" rx="0.5"/>
              <rect x="6" y="1" width="2" height="8" rx="0.5"/>
              <rect x="9" y="0" width="2" height="9" rx="0.5" opacity="0.3"/>
            </svg>
            {/* WiFi */}
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="white" strokeWidth="1.2" opacity="0.8">
              <path d="M1 3.5C2.8 1.8 5 1 5.5 1S8.2 1.8 10 3.5" strokeLinecap="round"/>
              <path d="M2.5 5C3.6 4 4.5 3.5 5.5 3.5S7.4 4 8.5 5" strokeLinecap="round"/>
              <circle cx="5.5" cy="8" r="1" fill="white" stroke="none"/>
            </svg>
            {/* Battery */}
            <svg width="16" height="9" viewBox="0 0 16 9" opacity="0.8">
              <rect x="0.5" y="0.5" width="13" height="8" rx="1.5" stroke="white" strokeWidth="1" fill="none"/>
              <rect x="1.5" y="1.5" width="9" height="6" rx="0.8" fill="white"/>
              <path d="M14 3v3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Dynamic Island / Notch — iOS only, sits on top of status bar */}
        {isIOS && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full"
            style={{ top: 6, width: 88, height: 26, zIndex: 10 }}
          />
        )}

        {/* WhatsApp top bar (contact row) */}
        <div
          className="flex items-center px-2 gap-2 flex-shrink-0"
          style={{ background: WA.header, height: 50, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Back arrow */}
          <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
            <path d="M8 1L1 7L8 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
          </svg>
          {/* Avatar */}
          <div
            className="rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0"
            style={{ width: 34, height: 34, background: "#25D366" }}
          >
            W
          </div>
          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-[11px] font-semibold leading-none mb-0.5">Waptrix Support</p>
            <p className="text-[9px] leading-none" style={{ color: WA.buttonText }}>online</p>
          </div>
          {/* Action icons */}
          <div className="flex gap-3 pr-1" style={{ opacity: 0.75 }}>
            {/* Video */}
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
            </svg>
            {/* Phone */}
            <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/>
            </svg>
            {/* 3-dot */}
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
            </svg>
          </div>
        </div>

        {/* Chat wallpaper */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3 space-y-1 flex flex-col justify-start"
          style={{
            backgroundImage: `url("/wa-wallpaper.png")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundColor: WA.bg,
          }}
        >
          {/* Date chip */}
          <div className="flex justify-center mb-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#182229", color: WA.footerText }}>
              TODAY
            </span>
          </div>

          {/* Template message card */}
          <div className="max-w-[88%]">
            {/* Bubble */}
            <div className="rounded-lg rounded-tl-none overflow-hidden shadow-md" style={{ background: WA.bubble }}>
              {/* IMAGE / VIDEO / DOCUMENT header */}
              {formData.header_type !== "NONE" && (
                <div>
                  {formData.header_type === "TEXT" && formData.header_text ? (
                    <div className="px-3 pt-2.5 pb-1">
                      <p className="text-white font-bold text-[12px] leading-tight">{formData.header_text}</p>
                    </div>
                  ) : formData.header_type === "IMAGE" && formData.header_image_url ? (
                    <img src={formData.header_image_url} alt="Header" className="w-full" style={{ aspectRatio: "1.91/1", objectFit: "cover" }} />
                  ) : formData.header_type === "VIDEO" && formData.header_image_url ? (
                    <video 
                      src={formData.header_image_url} 
                      className="w-full" 
                      style={{ aspectRatio: "1.91/1", objectFit: "cover" }} 
                      autoPlay muted loop playsInline
                    />
                  ) : formData.header_type === "DOCUMENT" && formData.header_image_url ? (
                    <div className="w-full px-3 py-4 flex items-center gap-3" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="w-10 h-10 rounded-lg bg-amber-400/20 flex items-center justify-center border border-amber-400/30">
                        <FileIcon className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[11px] font-bold truncate">Document File</p>
                        <p className="text-white/40 text-[9px] uppercase tracking-wider">PDF • 1.2 MB</p>
                      </div>
                    </div>
                  ) : formData.header_type !== "TEXT" && formData.header_type !== "NONE" ? (
                    <div className="w-full flex items-center justify-center" style={{ aspectRatio: "1.91/1", background: "rgba(0,0,0,0.35)" }}>
                      <div className="text-center">
                        <div className="text-2xl mb-1">
                          {formData.header_type === "IMAGE" ? "🖼️" : formData.header_type === "VIDEO" ? "🎬" : "📄"}
                        </div>
                        <p className="text-[9px] uppercase font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {formData.header_type}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Body + footer + timestamp */}
              <div className="px-3 pt-2 pb-2">
                <p className="text-white text-[12px] leading-relaxed whitespace-pre-wrap">
                  {formData.body.split(/({{[\d]+}})/g).map((part, i) =>
                    part.match(/{{[\d]+}}/) ? (
                      <span key={i} className="italic" style={{ color: "#d0f0e8" }}>{part}</span>
                    ) : part
                  )}
                </p>
                {formData.footer && (
                  <p className="mt-1.5 text-[10px] leading-snug" style={{ color: WA.footerText }}>
                    {formData.footer}
                  </p>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[9px]" style={{ color: WA.timestamp }}>{time}</span>
                  {/* Double tick */}
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                    <path d="M1 5l3 3 5-7" stroke={WA.buttonText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 5l3 3 5-7" stroke={WA.buttonText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Template Buttons — attached to bubble, separated by hairline */}
              {formData.buttons.length > 0 && (
                <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)` }}>
                  {formData.buttons.map((btn, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center gap-1.5 py-2.5"
                      style={{
                        borderTop: i > 0 ? `1px solid rgba(255,255,255,0.08)` : "none",
                        color: WA.buttonText,
                      }}
                    >
                      {btn.type === "URL" && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={WA.buttonText} strokeWidth="2.5" strokeLinecap="round">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                        </svg>
                      )}
                      {btn.type === "PHONE_NUMBER" && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill={WA.buttonText}>
                          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/>
                        </svg>
                      )}
                      {btn.type === "QUICK_REPLY" && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={WA.buttonText} strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
                        </svg>
                      )}
                      <span className="text-[12px] font-semibold">{btn.text || "Button"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Meta status chip (shown inside the chat as a system message) */}
          {metaStatus !== "DRAFT" && (
            <div className="flex justify-center mt-3">
              <div
                className="text-[9px] font-semibold px-3 py-1 rounded-full"
                style={{
                  background: metaStatus === "APPROVED" ? "rgba(0,168,132,0.15)" : metaStatus === "PENDING" ? "rgba(255,193,7,0.15)" : "rgba(244,63,94,0.15)",
                  color: metaStatus === "APPROVED" ? "#00A884" : metaStatus === "PENDING" ? "#FFC107" : "#F43F5E",
                  border: `1px solid ${metaStatus === "APPROVED" ? "rgba(0,168,132,0.3)" : metaStatus === "PENDING" ? "rgba(255,193,7,0.3)" : "rgba(244,63,94,0.3)"}`,
                }}
              >
                {metaStatus === "APPROVED" ? "✓ Template Approved" : metaStatus === "PENDING" ? "⏳ Pending Review" : "✗ Rejected"}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ background: WA.inputBar }}>
          <div className="flex-1 rounded-full py-1.5 px-3 flex items-center" style={{ background: "#2A3942" }}>
            <span className="text-[9px]" style={{ color: WA.footerText }}>Type a message</span>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#00A884" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Button Row ───────────────────────────────────────────────────────────────
function ButtonRow({
  btn,
  idx,
  onChange,
  onRemove,
}: {
  btn: TemplateButton;
  idx: number;
  onChange: (idx: number, updated: Partial<TemplateButton>) => void;
  onRemove: (idx: number) => void;
}) {
  const typeConfig: Record<ButtonType, { icon: React.ReactNode; label: string; placeholder: string }> = {
    QUICK_REPLY: { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Quick Reply", placeholder: "e.g. Yes, I'm interested" },
    URL: { icon: <Globe className="w-3.5 h-3.5" />, label: "Visit Website", placeholder: "e.g. Shop Now" },
    PHONE_NUMBER: { icon: <Phone className="w-3.5 h-3.5" />, label: "Call Phone", placeholder: "e.g. Call Us" },
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3 animate-in slide-in-from-left-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["QUICK_REPLY", "URL", "PHONE_NUMBER"] as ButtonType[]).map((t) => (
            <button
              key={t}
              onClick={() => onChange(idx, { type: t, text: btn.text, url: "", phone_number: "" })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                btn.type === t
                  ? "bg-jade/10 border-jade text-jade"
                  : "border-border text-text-muted hover:border-jade/30"
              }`}
            >
              {typeConfig[t].icon} {typeConfig[t].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => onRemove(idx)}
          className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid gap-2">
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">
            Button Label
          </label>
          <input
            className="input-field w-full text-xs"
            placeholder={typeConfig[btn.type].placeholder}
            value={btn.text}
            onChange={(e) => onChange(idx, { text: e.target.value })}
          />
        </div>

        {btn.type === "URL" && (
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block flex items-center gap-1">
              <Link className="w-3 h-3" /> Website URL
            </label>
            <input
              className="input-field w-full text-xs"
              placeholder="https://yourwebsite.com/page"
              value={btn.url || ""}
              onChange={(e) => onChange(idx, { url: e.target.value })}
            />
          </div>
        )}

        {btn.type === "PHONE_NUMBER" && (
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone Number
            </label>
            <input
              className="input-field w-full text-xs"
              placeholder="+919035386421"
              value={btn.phone_number || ""}
              onChange={(e) => onChange(idx, { phone_number: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TemplateBuilder({
  onClose,
  onSave,
  editTemplate,
}: {
  onClose: () => void;
  onSave: () => void;
  editTemplate?: any;
}) {
  const [formData, setFormData] = useState<FormData>({
    name: editTemplate?.name || "",
    category: editTemplate?.category || "MARKETING",
    language: editTemplate?.language || "en_US",
    header_type: editTemplate?.header_type || "NONE",
    header_text: editTemplate?.header_type === "IMAGE" ? "" : (editTemplate?.header_text || ""),
    header_image_url: editTemplate?.header_type === "IMAGE" ? (editTemplate?.header_text || "") : "",
    body: editTemplate?.body || "Hello {{1}}, we have a special offer for you!",
    footer: editTemplate?.footer || "Reply STOP to opt out",
    buttons: editTemplate?.buttons || [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios">("android");
  const [metaStatus, setMetaStatus] = useState<string>(editTemplate?.meta_status || "DRAFT");
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(editTemplate?.id || null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    // Also save to media library
    const { addMedia } = await import("@/lib/mediaStore");
    addMedia({ name: file.name, category: "IMAGE", dataUrl, mimeType: file.type, sizeBytes: file.size });
    setFormData({ ...formData, header_image_url: dataUrl });
  };

  const handleMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const { addMedia } = await import("@/lib/mediaStore");
    addMedia({ name: file.name, category: categoryFromMime(file.type), dataUrl, mimeType: file.type, sizeBytes: file.size });
    setFormData({ ...formData, header_image_url: dataUrl });
  };

  const handleLibrarySelect = (item: MediaItem) => {
    setFormData({ ...formData, header_image_url: item.dataUrl });
    setShowMediaLibrary(false);
  };

  const handleSave = async (submitToMeta: boolean = false) => {
    setError("");
    if (!formData.name.trim()) {
      setError("Template name is required.");
      return;
    }
    if (!formData.body.trim()) {
      setError("Body message is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      let res;
      if (savedTemplateId) {
        res = await axios.put(`/api/templates/${savedTemplateId}`, payload);
      } else {
        res = await axios.post("/api/templates", payload);
      }
      const templateId = res.data.id;
      setSavedTemplateId(templateId);

      if (submitToMeta) {
        await axios.post(`/api/templates/${templateId}/submit`);
        setMetaStatus("PENDING");
        showToast("Submitted to Meta! Review takes ~24h.");
      } else {
        setMetaStatus("DRAFT");
        showToast("Saved as draft successfully.");
        onSave();
        onClose();
      }
      onSave(); // refresh list in background
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.hint ||
        err.message ||
        "Save failed. Check console for details.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateButton = (idx: number, updated: Partial<TemplateButton>) => {
    const newBtns = [...formData.buttons];
    newBtns[idx] = { ...newBtns[idx], ...updated };
    setFormData({ ...formData, buttons: newBtns });
  };

  const removeButton = (idx: number) => {
    const newBtns = [...formData.buttons];
    newBtns.splice(idx, 1);
    setFormData({ ...formData, buttons: newBtns });
  };

  const addButton = () => {
    if (formData.buttons.length >= 3) return;
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { type: "QUICK_REPLY", text: "" }],
    });
  };

  // After submission — show status view
  const isPostSubmit = metaStatus === "PENDING" || metaStatus === "APPROVED" || metaStatus === "REJECTED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold ${
            toast.type === "success"
              ? "bg-jade/10 border-jade/30 text-jade"
              : "bg-danger/10 border-danger/30 text-danger"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="relative w-full max-w-6xl h-[90vh] bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-syne">
              {isPostSubmit ? formData.name || "Template" : (editTemplate ? "Edit Template" : "Create Template")}
            </h2>
            <StatusBadge status={metaStatus} />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg text-text-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* ── Left: Form ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-8 space-y-7 border-r border-border">
            {error && (
              <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Post-submit status panel */}
            {isPostSubmit && (
              <div
                className={`rounded-2xl border p-5 space-y-2 ${
                  metaStatus === "APPROVED"
                    ? "bg-jade/5 border-jade/20"
                    : metaStatus === "PENDING"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-danger/5 border-danger/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {metaStatus === "APPROVED" && <CheckCircle2 className="w-5 h-5 text-jade" />}
                  {metaStatus === "PENDING" && (
                    <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  )}
                  {metaStatus === "REJECTED" && <XCircle className="w-5 h-5 text-danger" />}
                  <span className="font-bold text-sm">
                    {metaStatus === "APPROVED" && "Template Approved!"}
                    {metaStatus === "PENDING" && "Submitted — Awaiting Meta Review"}
                    {metaStatus === "REJECTED" && "Template Rejected"}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {metaStatus === "PENDING" &&
                    "Meta typically reviews templates within 24 hours. You can check back in the Templates list for the updated status."}
                  {metaStatus === "APPROVED" &&
                    "This template is approved and ready to use in campaigns."}
                  {metaStatus === "REJECTED" &&
                    "Please review Meta's message template guidelines and edit the template."}
                </p>
              </div>
            )}

            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Template Name
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. order_confirmation"
                  className="input-field w-full text-sm"
                  disabled={isPostSubmit}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input-field w-full text-sm"
                  disabled={isPostSubmit}
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
            </div>

            {/* Header Type */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                Header Type
              </label>
              <div className="flex gap-2 flex-wrap">
                {["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"].map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setFormData({ ...formData, header_type: type, header_image_url: "" })
                    }
                    disabled={isPostSubmit}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      formData.header_type === type
                        ? "bg-jade/10 border-jade text-jade shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                        : "bg-card border-border text-text-muted hover:border-jade/30"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* TEXT header input */}
              {formData.header_type === "TEXT" && (
                <input
                  name="header_text"
                  value={formData.header_text}
                  onChange={handleChange}
                  placeholder="Welcome to our store!"
                  className="input-field w-full text-sm mt-2"
                  disabled={isPostSubmit}
                />
              )}

              {/* IMAGE header upload */}
              {formData.header_type === "IMAGE" && (
                <div className="space-y-3 mt-2">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  {/* Action row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isPostSubmit}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-jade/40 hover:text-jade transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Image
                    </button>
                    <button
                      onClick={() => setShowMediaLibrary(true)}
                      disabled={isPostSubmit}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-jade/40 hover:text-jade transition-all"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Choose from Library
                    </button>
                  </div>
                  {/* Preview */}
                  {formData.header_image_url ? (
                    <div className="relative group">
                      <img src={formData.header_image_url} alt="Header preview" className="w-full max-h-40 object-cover rounded-xl border border-border" />
                      {!isPostSubmit && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                          <button onClick={() => imageInputRef.current?.click()} className="px-3 py-2 bg-jade text-background rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" /> Replace
                          </button>
                          <button onClick={() => setFormData({ ...formData, header_image_url: "" })} className="px-3 py-2 bg-danger text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => imageInputRef.current?.click()} disabled={isPostSubmit}
                      className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-jade/40 hover:bg-jade/5 transition-all"
                    >
                      <ImageIcon className="w-7 h-7 text-text-muted" />
                      <span className="text-sm font-semibold text-text-muted">Drop image here or click to upload</span>
                      <span className="text-xs text-text-muted">JPG, PNG, WebP up to 20MB</span>
                    </button>
                  )}
                  {/* URL paste */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-text-muted uppercase font-bold">or paste URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <input className="input-field w-full text-xs" placeholder="https://example.com/banner.jpg"
                    value={formData.header_image_url.startsWith("data:") ? "" : formData.header_image_url}
                    onChange={(e) => setFormData({ ...formData, header_image_url: e.target.value })}
                    disabled={isPostSubmit}
                  />
                </div>
              )}

              {/* VIDEO header upload */}
              {formData.header_type === "VIDEO" && (
                <div className="space-y-3 mt-2">
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleMediaFile} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isPostSubmit}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-blue-400/40 hover:text-blue-400 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Video
                    </button>
                    <button
                      onClick={() => setShowMediaLibrary(true)}
                      disabled={isPostSubmit}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-blue-400/40 hover:text-blue-400 transition-all"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Choose from Library
                    </button>
                  </div>
                  {formData.header_image_url ? (
                    <div className="flex items-center gap-3 p-3 bg-blue-400/10 border border-blue-400/20 rounded-xl">
                      <Film className="w-8 h-8 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-400 truncate">
                          {formData.header_image_url.startsWith("data:") ? "Video uploaded ✓" : formData.header_image_url}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">Ready to use in template</p>
                      </div>
                      {!isPostSubmit && (
                        <button onClick={() => setFormData({ ...formData, header_image_url: "" })} className="p-1.5 text-text-muted hover:text-danger rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => videoInputRef.current?.click()} disabled={isPostSubmit}
                      className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-blue-400/40 hover:bg-blue-400/5 transition-all"
                    >
                      <Film className="w-7 h-7 text-text-muted" />
                      <span className="text-sm font-semibold text-text-muted">Drop video here or click to upload</span>
                      <span className="text-xs text-text-muted">MP4, MOV, WebM up to 20MB</span>
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-text-muted uppercase font-bold">or paste URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <input className="input-field w-full text-xs" placeholder="https://example.com/video.mp4"
                    value={formData.header_image_url.startsWith("data:") ? "" : formData.header_image_url}
                    onChange={(e) => setFormData({ ...formData, header_image_url: e.target.value })}
                    disabled={isPostSubmit}
                  />
                </div>
              )}

              {/* DOCUMENT header upload */}
              {formData.header_type === "DOCUMENT" && (
                <div className="space-y-3 mt-2">
                  <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" className="hidden" onChange={handleMediaFile} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => docInputRef.current?.click()}
                      disabled={isPostSubmit}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-amber-400/40 hover:text-amber-400 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Document
                    </button>
                    <button
                      onClick={() => setShowMediaLibrary(true)}
                      disabled={isPostSubmit}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-amber-400/40 hover:text-amber-400 transition-all"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Choose from Library
                    </button>
                  </div>
                  {formData.header_image_url ? (
                    <div className="flex items-center gap-3 p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl">
                      <FileIcon className="w-8 h-8 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-400 truncate">
                          {formData.header_image_url.startsWith("data:") ? "Document uploaded ✓" : formData.header_image_url}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">Ready to use in template</p>
                      </div>
                      {!isPostSubmit && (
                        <button onClick={() => setFormData({ ...formData, header_image_url: "" })} className="p-1.5 text-text-muted hover:text-danger rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => docInputRef.current?.click()} disabled={isPostSubmit}
                      className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-amber-400/40 hover:bg-amber-400/5 transition-all"
                    >
                      <FileIcon className="w-7 h-7 text-text-muted" />
                      <span className="text-sm font-semibold text-text-muted">Drop document here or click to upload</span>
                      <span className="text-xs text-text-muted">PDF, Word, PowerPoint, Excel up to 20MB</span>
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-text-muted uppercase font-bold">or paste URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <input className="input-field w-full text-xs" placeholder="https://example.com/brochure.pdf"
                    value={formData.header_image_url.startsWith("data:") ? "" : formData.header_image_url}
                    onChange={(e) => setFormData({ ...formData, header_image_url: e.target.value })}
                    disabled={isPostSubmit}
                  />
                </div>
              )}
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Body Message
                </label>
                <div className="relative group">
                  <div className="flex items-center gap-1 text-[10px] text-jade bg-jade/10 px-2 py-1 rounded-lg cursor-help">
                    <Info className="w-3 h-3" /> Use Variables
                  </div>
                  <div className="absolute bottom-full mb-2 right-0 w-52 p-3 bg-card border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs text-text-muted z-10">
                    Use{" "}
                    <code className="text-jade bg-jade/10 px-1 rounded">{"{{1}}"}</code>,{" "}
                    <code className="text-jade bg-jade/10 px-1 rounded">{"{{2}}"}</code> for dynamic
                    content like name or order ID.
                  </div>
                </div>
              </div>
              <textarea
                name="body"
                value={formData.body}
                onChange={handleChange}
                rows={5}
                className="input-field w-full text-sm resize-none"
                placeholder="Write your template body here..."
                disabled={isPostSubmit}
              />
              <p className="text-[10px] text-text-muted text-right">
                {formData.body.length} chars
              </p>
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Footer Text (Optional)
              </label>
              <input
                name="footer"
                value={formData.footer}
                onChange={handleChange}
                placeholder="Reply STOP to unsubscribe"
                className="input-field w-full text-sm"
                disabled={isPostSubmit}
              />
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Buttons (Max 3)
                </label>
                {!isPostSubmit && formData.buttons.length < 3 && (
                  <button
                    onClick={addButton}
                    className="text-xs font-bold text-jade hover:text-jade-hover flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Button
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {formData.buttons.map((btn, idx) => (
                  <ButtonRow
                    key={idx}
                    btn={btn}
                    idx={idx}
                    onChange={updateButton}
                    onRemove={removeButton}
                  />
                ))}
                {formData.buttons.length === 0 && (
                  <p className="text-xs text-text-muted italic">
                    No buttons added. Quick reply or link buttons appear below the message.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Preview ───────────────────────────────────────── */}
          <div className="w-[420px] bg-background p-6 flex flex-col items-center gap-5 flex-shrink-0">
            {/* Platform toggle */}
            <div className="flex items-center gap-3 w-full justify-center">
              <button
                onClick={() => setPlatform("android")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  platform === "android"
                    ? "bg-jade/10 border-jade text-jade"
                    : "border-border text-text-muted hover:border-jade/30"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Android
              </button>
              <button
                onClick={() => setPlatform("ios")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  platform === "ios"
                    ? "bg-jade/10 border-jade text-jade"
                    : "border-border text-text-muted hover:border-jade/30"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> iOS
              </button>
              <span className="text-[10px] text-text-muted opacity-50">Live Preview</span>
            </div>

            <PhonePreview formData={formData} platform={platform} metaStatus={metaStatus} />

            {/* Meta status indicator below phone */}
            {isPostSubmit && (
              <div className="w-full text-center space-y-1">
                <StatusBadge status={metaStatus} />
                {metaStatus === "PENDING" && (
                  <p className="text-[10px] text-text-muted">This updates automatically when Meta responds.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer bar */}
        <div className="h-20 border-t border-border bg-card px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-text-muted text-xs">
            <Info className="w-4 h-4 flex-shrink-0" />
            {isPostSubmit
              ? "Template saved. Status updates within 24h."
              : "Once submitted, Meta review takes ~24h."}
          </div>
          <div className="flex gap-3">
            {!isPostSubmit && (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting}
                  className="btn-secondary flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit to Meta
                </button>
              </>
            )}
            {isPostSubmit && (
              <button onClick={onClose} className="btn-primary px-8">
                Done
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media Library Picker */}
      {showMediaLibrary && (
        <MediaLibrary
          onClose={() => setShowMediaLibrary(false)}
          onSelect={handleLibrarySelect}
          selectionMode={true}
          filterCategory={
            formData.header_type === "IMAGE" ? "IMAGE"
            : formData.header_type === "VIDEO" ? "VIDEO"
            : formData.header_type === "DOCUMENT" ? "DOCUMENT"
            : undefined
          }
        />
      )}
    </div>
  );
}
