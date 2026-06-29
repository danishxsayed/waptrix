"use client";

import { useState, useRef } from "react";
import {
  X, Send, Save, Info, Plus, Trash2, Smartphone, Image as ImageIcon,
  CheckCircle2, Clock, XCircle, Link, Phone, MessageSquare, Globe,
  AlertCircle, Loader2, Upload, Film, FileText as FileIcon, FolderOpen,
  ChevronDown, ChevronUp, CreditCard, LayoutGrid, Bold, Italic,
  Smile
} from "lucide-react";
import axios from "axios";
import MediaLibrary from "@/components/media/MediaLibrary";
import { readFileAsDataUrl, categoryFromMime, type MediaItem } from "@/lib/mediaStore";

// ─── Types ────────────────────────────────────────────────────────────────────
type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
type TemplateType = "BUTTONS" | "SIMPLE" | "PAY" | "CAROUSEL";

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

// ─── Sample preview data per category+type ────────────────────────────────────
function getSampleData(category: string, type: TemplateType): FormData {
  if (category === "AUTHENTICATION") {
    return {
      name: "sample", category, language: "en_US",
      header_type: "NONE", header_text: "", header_image_url: "",
      body: type === "BUTTONS"
        ? "Your verification code is *123456*.\n\nDo not share it with anyone. Valid for 10 minutes."
        : "Your OTP is 782341. Valid for 5 minutes. If you didn't request this, ignore.",
      footer: "",
      buttons: type === "BUTTONS" ? [{ type: "QUICK_REPLY", text: "Copy Code" }] : [],
    };
  }
  if (category === "UTILITY") {
    return {
      name: "sample", category, language: "en_US",
      header_type: "TEXT", header_text: "Order Update", header_image_url: "",
      body: type === "BUTTONS"
        ? "Hi John, your order #WP-4821 has been shipped!\n\nExpected delivery: Friday, 4 July."
        : "Dear John, your appointment on Monday, 7 July at 10:00 AM has been confirmed.\n\nPlease be on time.",
      footer: type === "BUTTONS" ? "Track anytime from our app" : "",
      buttons: type === "BUTTONS"
        ? [{ type: "URL", text: "Track Order" }, { type: "QUICK_REPLY", text: "Got it!" }]
        : [],
    };
  }
  // MARKETING default
  return {
    name: "sample", category: "MARKETING", language: "en_US",
    header_type: "NONE", header_text: "", header_image_url: "",
    body: "Upskill Faster This Year\n\nLearn industry-ready skills with expert-led courses.\nFlexible schedules. Real projects.\nProven outcomes.",
    footer: "Enroll today & start learning",
    buttons: type === "BUTTONS"
      ? [{ type: "URL", text: "Explore Courses" }, { type: "URL", text: "Get Fee Details" }, { type: "QUICK_REPLY", text: "Copy offer code" }]
      : [],
  };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-jade/15 text-jade border border-jade/30"><CheckCircle2 className="w-3.5 h-3.5" /> Approved by Meta</span>;
    case "PENDING":
      return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30"><Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Meta Review</span>;
    case "REJECTED":
      return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-danger/15 text-danger border border-danger/30"><XCircle className="w-3.5 h-3.5" /> Rejected by Meta</span>;
    default:
      return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-card text-text-muted border border-border">Draft</span>;
  }
}

// ─── WhatsApp Phone Preview ───────────────────────────────────────────────────
function PhonePreview({ formData, platform, metaStatus }: { formData: FormData; platform: "android" | "ios"; metaStatus: string }) {
  const isIOS = platform === "ios";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const WA = {
    bg: "#0B141A", bubble: "#005C4B", header: "#202C33", inputBar: "#202C33",
    buttonText: "#00A884", footerText: "#8696A0", timestamp: "#8696A0",
  };

  return (
    <div
      className={`relative overflow-hidden shadow-2xl ${isIOS ? "rounded-[44px] border-[5px] border-[#3A3A3C]" : "rounded-[32px] border-[3px] border-[#2A3540]"}`}
      style={{ width: 260, height: 540, background: isIOS ? "#000" : "#0D1821", flexShrink: 0 }}
    >
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ borderRadius: isIOS ? 40 : 30 }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ background: WA.header, height: isIOS ? 38 : 22, paddingTop: isIOS ? 10 : 4 }}>
          <span className="text-white text-[9px] font-semibold">{time}</span>
          <div className="flex items-center gap-1">
            <svg width="12" height="9" viewBox="0 0 12 9" fill="white" opacity="0.8"><rect x="0" y="5" width="2" height="4" rx="0.5"/><rect x="3" y="3" width="2" height="6" rx="0.5"/><rect x="6" y="1" width="2" height="8" rx="0.5"/><rect x="9" y="0" width="2" height="9" rx="0.5" opacity="0.3"/></svg>
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="white" strokeWidth="1.2" opacity="0.8"><path d="M1 3.5C2.8 1.8 5 1 5.5 1S8.2 1.8 10 3.5" strokeLinecap="round"/><path d="M2.5 5C3.6 4 4.5 3.5 5.5 3.5S7.4 4 8.5 5" strokeLinecap="round"/><circle cx="5.5" cy="8" r="1" fill="white" stroke="none"/></svg>
            <svg width="16" height="9" viewBox="0 0 16 9" opacity="0.8"><rect x="0.5" y="0.5" width="13" height="8" rx="1.5" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="1.5" width="9" height="6" rx="0.8" fill="white"/><path d="M14 3v3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
        </div>
        {isIOS && <div className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full" style={{ top: 6, width: 88, height: 26, zIndex: 10 }} />}
        {/* Top bar */}
        <div className="flex items-center px-2 gap-2 flex-shrink-0" style={{ background: WA.header, height: 50, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <svg width="9" height="14" viewBox="0 0 9 14" fill="none"><path d="M8 1L1 7L8 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/></svg>
          <div className="rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0" style={{ width: 34, height: 34, background: "#25D366" }}>W</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[11px] font-semibold leading-none mb-0.5">Waptrix Support</p>
            <p className="text-[9px] leading-none" style={{ color: WA.buttonText }}>online</p>
          </div>
          <div className="flex gap-3 pr-1" style={{ opacity: 0.75 }}>
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
            <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </div>
        </div>
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 flex flex-col justify-start" style={{ backgroundColor: WA.bg }}>
          <div className="flex justify-center mb-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#182229", color: WA.footerText }}>TODAY</span>
          </div>
          <div className="max-w-[90%]">
            <div className="rounded-lg rounded-tl-none overflow-hidden shadow-md" style={{ background: WA.bubble }}>
              {formData.header_type !== "NONE" && (
                <div>
                  {formData.header_type === "TEXT" && formData.header_text ? (
                    <div className="px-3 pt-2.5 pb-1"><p className="text-white font-bold text-[11px] leading-tight">{formData.header_text}</p></div>
                  ) : formData.header_type === "IMAGE" && formData.header_image_url ? (
                    <img src={formData.header_image_url} alt="Header" className="w-full" style={{ aspectRatio: "1.91/1", objectFit: "cover" }} />
                  ) : formData.header_type === "VIDEO" && formData.header_image_url ? (
                    <video src={formData.header_image_url} className="w-full" style={{ aspectRatio: "1.91/1", objectFit: "cover" }} autoPlay muted loop playsInline />
                  ) : formData.header_type === "DOCUMENT" && formData.header_image_url ? (
                    <div className="w-full px-3 py-3 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="w-8 h-8 rounded bg-amber-400/20 flex items-center justify-center"><FileIcon className="w-5 h-5 text-amber-400" /></div>
                      <p className="text-white text-[10px] font-bold">Document File</p>
                    </div>
                  ) : formData.header_type !== "TEXT" && formData.header_type !== "NONE" ? (
                    <div className="w-full flex items-center justify-center" style={{ aspectRatio: "1.91/1", background: "rgba(0,0,0,0.35)" }}>
                      <span className="text-xl">{formData.header_type === "IMAGE" ? "🖼️" : formData.header_type === "VIDEO" ? "🎬" : "📄"}</span>
                    </div>
                  ) : null}
                </div>
              )}
              <div className="px-3 pt-2 pb-2">
                <p className="text-white text-[11px] leading-relaxed whitespace-pre-wrap">
                  {formData.body.split(/({{[\d]+}})/g).map((part, i) =>
                    part.match(/{{[\d]+}}/) ? <span key={i} className="italic" style={{ color: "#d0f0e8" }}>{part}</span> : part
                  )}
                </p>
                {formData.footer && <p className="mt-1 text-[9px] leading-snug" style={{ color: WA.footerText }}>{formData.footer}</p>}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[8px]" style={{ color: WA.timestamp }}>{time}</span>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5l3 3 5-7" stroke={WA.buttonText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 5l3 3 5-7" stroke={WA.buttonText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
              {formData.buttons.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  {formData.buttons.map((btn, i) => (
                    <div key={i} className="flex items-center justify-center gap-1.5 py-2" style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none", color: WA.buttonText }}>
                      {btn.type === "URL" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={WA.buttonText} strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>}
                      {btn.type === "PHONE_NUMBER" && <svg width="10" height="10" viewBox="0 0 24 24" fill={WA.buttonText}><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>}
                      {btn.type === "QUICK_REPLY" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={WA.buttonText} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>}
                      <span className="text-[11px] font-semibold">{btn.text || "Button"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {metaStatus !== "DRAFT" && (
            <div className="flex justify-center mt-2">
              <div className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{
                background: metaStatus === "APPROVED" ? "rgba(0,168,132,0.15)" : metaStatus === "PENDING" ? "rgba(255,193,7,0.15)" : "rgba(244,63,94,0.15)",
                color: metaStatus === "APPROVED" ? "#00A884" : metaStatus === "PENDING" ? "#FFC107" : "#F43F5E",
                border: `1px solid ${metaStatus === "APPROVED" ? "rgba(0,168,132,0.3)" : metaStatus === "PENDING" ? "rgba(255,193,7,0.3)" : "rgba(244,63,94,0.3)"}`,
              }}>
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
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#00A884" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Button Row ───────────────────────────────────────────────────────────────
function ButtonRow({ btn, idx, onChange, onRemove }: { btn: TemplateButton; idx: number; onChange: (idx: number, updated: Partial<TemplateButton>) => void; onRemove: (idx: number) => void }) {
  const typeConfig: Record<ButtonType, { icon: React.ReactNode; label: string; placeholder: string }> = {
    QUICK_REPLY: { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Quick Reply", placeholder: "e.g. Yes, I'm interested" },
    URL: { icon: <Globe className="w-3.5 h-3.5" />, label: "Visit Website", placeholder: "e.g. Shop Now" },
    PHONE_NUMBER: { icon: <Phone className="w-3.5 h-3.5" />, label: "Call Phone", placeholder: "e.g. Call Us" },
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["QUICK_REPLY", "URL", "PHONE_NUMBER"] as ButtonType[]).map((t) => (
            <button key={t} onClick={() => onChange(idx, { type: t, text: btn.text, url: "", phone_number: "" })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${btn.type === t ? "bg-jade/10 border-jade text-jade" : "border-border text-text-muted hover:border-jade/30"}`}>
              {typeConfig[t].icon} {typeConfig[t].label}
            </button>
          ))}
        </div>
        <button onClick={() => onRemove(idx)} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div>
        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Button Label</label>
        <input className="input-field w-full text-xs" placeholder={typeConfig[btn.type].placeholder} value={btn.text} onChange={(e) => onChange(idx, { text: e.target.value })} />
      </div>
      {btn.type === "URL" && (
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block flex items-center gap-1"><Link className="w-3 h-3" /> Website URL</label>
          <input className="input-field w-full text-xs" placeholder="https://yourwebsite.com/page" value={btn.url || ""} onChange={(e) => onChange(idx, { url: e.target.value })} />
        </div>
      )}
      {btn.type === "PHONE_NUMBER" && (
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</label>
          <input className="input-field w-full text-xs" placeholder="+919035386421" value={btn.phone_number || ""} onChange={(e) => onChange(idx, { phone_number: e.target.value })} />
        </div>
      )}
    </div>
  );
}

// ─── Template Type Config ─────────────────────────────────────────────────────
const TEMPLATE_TYPES: { id: TemplateType; icon: React.ReactNode; title: string; desc: string }[] = [
  { id: "BUTTONS", icon: <MessageSquare className="w-5 h-5" />, title: "Template with Buttons (Quick Reply, URL, Copy Code etc)", desc: "Send a message with customised buttons to engage customers" },
  { id: "SIMPLE", icon: <FileIcon className="w-5 h-5" />, title: "Simple template (No buttons / Carousels)", desc: "Send a message only having a header / body / footer" },
  { id: "PAY", icon: <CreditCard className="w-5 h-5" />, title: "Template with WhatsApp Pay Checkout", desc: "Send messages through which customers can pay you" },
  { id: "CAROUSEL", icon: <LayoutGrid className="w-5 h-5" />, title: "Carousel", desc: "Send multiple product cards in a scrollable carousel" },
];

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Authentication",
};

const COMMON_EMOJIS = [
  "😊","👋","🎉","✅","🔥","💯","🎁","⭐","🚀","💪",
  "❤️","👍","📞","📱","🛒","💰","🎊","🙌","✨","🎯",
  "📣","⚡","🌟","💥","🏆","🙏","😍","💬","🎶","🌈",
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TemplateBuilder({ onClose, onSave, editTemplate }: { onClose: () => void; onSave: () => void; editTemplate?: any }) {
  // Step state
  const [step, setStep] = useState<1 | 2>(editTemplate ? 2 : 1);
  const [templateType, setTemplateType] = useState<TemplateType>(
    editTemplate?.buttons?.length > 0 ? "BUTTONS" : "SIMPLE"
  );

  const [formData, setFormData] = useState<FormData>({
    name: editTemplate?.name || "",
    category: editTemplate?.category || "MARKETING",
    language: editTemplate?.language || "en_US",
    header_type: editTemplate?.header_type || "NONE",
    header_text: editTemplate?.header_type === "IMAGE" ? "" : (editTemplate?.header_text || ""),
    header_image_url: editTemplate?.header_type === "IMAGE" ? (editTemplate?.header_text || "") : "",
    body: editTemplate?.body || "",
    footer: editTemplate?.footer || "",
    buttons: editTemplate?.buttons || [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios">("android");
  const [metaStatus, setMetaStatus] = useState<string>(editTemplate?.meta_status || "DRAFT");
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(editTemplate?.id || null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
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

  // Insert {{N}} variable into body at cursor
  const insertVariable = () => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const existing = [...(formData.body.match(/{{(\d+)}}/g) || [])];
    const nums = existing.map(m => parseInt(m.replace(/[{}]/g, "")));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = formData.body.slice(0, start) + `{{${nextNum}}}` + formData.body.slice(end);
    setFormData({ ...formData, body: newBody });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + `{{${nextNum}}}`.length, start + `{{${nextNum}}}`.length);
    }, 0);
  };

  // Wrap selected text with before/after markers (WhatsApp formatting)
  const wrapSelection = (before: string, after: string = before) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formData.body.slice(start, end);
    const newBody = formData.body.slice(0, start) + before + selected + after + formData.body.slice(end);
    setFormData({ ...formData, body: newBody });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = formData.body.slice(0, start) + emoji + formData.body.slice(end);
    setFormData({ ...formData, body: newBody });
    setShowEmojiPicker(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + [...emoji].length, start + [...emoji].length);
    }, 0);
  };

  const handleSave = async (submitToMeta: boolean = false) => {
    setError("");
    if (!formData.name.trim()) { setError("Template name is required."); return; }
    if (!formData.body.trim()) { setError("Body message is required."); return; }

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
      onSave();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.hint || err.message || "Save failed.";
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
    setFormData({ ...formData, buttons: [...formData.buttons, { type: "QUICK_REPLY", text: "" }] });
  };

  const isPostSubmit = metaStatus === "PENDING" || metaStatus === "APPROVED" || metaStatus === "REJECTED";

  // Preview data: sample in step 1, live in step 2
  const previewData = step === 1 ? getSampleData(formData.category, templateType) : formData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold ${toast.type === "success" ? "bg-jade/10 border-jade/30 text-jade" : "bg-danger/10 border-danger/30 text-danger"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="relative w-full max-w-6xl h-[92vh] bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold font-syne">
              {editTemplate ? "Edit Template" : "Create Template"}
            </h2>
            {isPostSubmit && <StatusBadge status={metaStatus} />}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg text-text-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* ── Left: Accordion Steps ──────────────────────────────── */}
          <div className="flex-1 overflow-y-auto border-r border-border">

            {/* ── STEP 1 ── */}
            <div className="border-b border-border">
              {/* Step 1 Header */}
              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${step >= 1 ? "bg-jade/10 border-jade text-jade" : "border-border text-text-muted"}`}>
                    {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
                  </div>
                  <span className="font-bold text-sm">Choose Template Category & Type</span>
                </div>
                {step === 1 ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
              </button>

              {step === 1 && (
                <div className="px-6 pb-6 space-y-6">
                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Template Category</label>
                    <div className="flex gap-2 flex-wrap">
                      {(["MARKETING", "UTILITY", "AUTHENTICATION"] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                            formData.category === cat
                              ? "bg-jade/10 border-jade text-jade shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                              : "bg-card border-border text-text-muted hover:border-jade/30 hover:text-text-primary"
                          }`}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Template Type</label>
                    <div className="space-y-2">
                      {TEMPLATE_TYPES.map((t) => {
                        const isComingSoon = t.id === "PAY" || t.id === "CAROUSEL";
                        return (
                          <button
                            key={t.id}
                            onClick={() => !isComingSoon && setTemplateType(t.id)}
                            disabled={isComingSoon}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                              templateType === t.id
                                ? "bg-jade/5 border-jade"
                                : isComingSoon
                                ? "border-border opacity-50 cursor-not-allowed"
                                : "border-border hover:border-jade/40 hover:bg-card/50"
                            }`}
                          >
                            {/* Radio circle */}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              templateType === t.id ? "border-jade" : "border-border"
                            }`}>
                              {templateType === t.id && <div className="w-2.5 h-2.5 rounded-full bg-jade" />}
                            </div>
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${templateType === t.id ? "text-jade" : "text-text-muted"}`}>
                              {t.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${templateType === t.id ? "text-jade" : "text-text-primary"}`}>{t.title}</p>
                              {t.desc && <p className="text-xs text-text-muted mt-0.5">{t.desc}</p>}
                            </div>
                            {isComingSoon && <span className="text-[10px] font-bold text-text-muted bg-card border border-border px-2 py-0.5 rounded-full flex-shrink-0">Coming soon</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save → go to step 2 */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setStep(2)}
                      className="btn-primary px-8"
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── STEP 2 ── */}
            <div>
              {/* Step 2 Header */}
              <button
                onClick={() => !editTemplate && setStep(2)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${step === 2 ? "bg-jade/10 border-jade text-jade" : "border-border text-text-muted"}`}>
                    2
                  </div>
                  <span className="font-bold text-sm">Draft your Template</span>
                </div>
                {step === 2 ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
              </button>

              {step === 2 && (
                <div className="px-6 pb-6 space-y-6">
                  {error && (
                    <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </div>
                  )}

                  {isPostSubmit && (
                    <div className={`rounded-2xl border p-5 space-y-2 ${metaStatus === "APPROVED" ? "bg-jade/5 border-jade/20" : metaStatus === "PENDING" ? "bg-amber-500/5 border-amber-500/20" : "bg-danger/5 border-danger/20"}`}>
                      <div className="flex items-center gap-2">
                        {metaStatus === "APPROVED" && <CheckCircle2 className="w-5 h-5 text-jade" />}
                        {metaStatus === "PENDING" && <Clock className="w-5 h-5 text-amber-400 animate-pulse" />}
                        {metaStatus === "REJECTED" && <XCircle className="w-5 h-5 text-danger" />}
                        <span className="font-bold text-sm">
                          {metaStatus === "APPROVED" && "Template Approved!"}
                          {metaStatus === "PENDING" && "Submitted — Awaiting Meta Review"}
                          {metaStatus === "REJECTED" && "Template Rejected"}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">
                        {metaStatus === "PENDING" && "Meta typically reviews templates within 24 hours."}
                        {metaStatus === "APPROVED" && "This template is approved and ready to use."}
                        {metaStatus === "REJECTED" && "Please review Meta's guidelines and edit the template."}
                      </p>
                    </div>
                  )}

                  {/* Template Name + Language */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Template Name</label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. order_confirmation"
                        className="input-field w-full text-sm"
                        disabled={isPostSubmit}
                      />
                      <p className="text-[10px] text-text-muted">Only lowercase, numbers and underscores</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Select Language</label>
                      <select
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        className="input-field w-full text-sm"
                        disabled={isPostSubmit}
                      >
                        <option value="en_US">English</option>
                        <option value="en_GB">English (UK)</option>
                        <option value="hi">Hindi</option>
                        <option value="ar">Arabic</option>
                        <option value="es">Spanish</option>
                        <option value="pt_BR">Portuguese (Brazil)</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="id">Indonesian</option>
                        <option value="ms">Malay</option>
                        <option value="ur">Urdu</option>
                        <option value="bn">Bengali</option>
                        <option value="ta">Tamil</option>
                      </select>
                    </div>
                  </div>

                  {/* Header Type */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Header (Optional)</label>
                      <p className="text-xs text-text-muted">Add a title, or, select the media type you want to get approved for this template's header</p>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      {["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"].map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
                          <div
                            onClick={() => !isPostSubmit && setFormData({ ...formData, header_type: type, header_image_url: "" })}
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${formData.header_type === type ? "border-jade" : "border-border group-hover:border-jade/40"}`}
                          >
                            {formData.header_type === type && <div className="w-2 h-2 rounded-full bg-jade" />}
                          </div>
                          <span
                            onClick={() => !isPostSubmit && setFormData({ ...formData, header_type: type, header_image_url: "" })}
                            className={`text-sm transition-colors ${formData.header_type === type ? "text-jade font-semibold" : "text-text-muted"}`}
                          >
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>

                    {formData.header_type === "TEXT" && (
                      <input name="header_text" value={formData.header_text} onChange={handleChange}
                        placeholder="Welcome to our store!" className="input-field w-full text-sm" disabled={isPostSubmit} />
                    )}

                    {formData.header_type === "IMAGE" && (
                      <div className="space-y-3">
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                        <div className="flex gap-2">
                          <button onClick={() => imageInputRef.current?.click()} disabled={isPostSubmit}
                            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-jade/40 hover:text-jade transition-all">
                            <Upload className="w-3.5 h-3.5" /> Upload Image
                          </button>
                          <button onClick={() => setShowMediaLibrary(true)} disabled={isPostSubmit}
                            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-jade/40 hover:text-jade transition-all">
                            <FolderOpen className="w-3.5 h-3.5" /> Choose from Library
                          </button>
                        </div>
                        {formData.header_image_url ? (
                          <div className="relative group">
                            <img src={formData.header_image_url} alt="Header" className="w-full max-h-36 object-cover rounded-xl border border-border" />
                            {!isPostSubmit && (
                              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                                <button onClick={() => imageInputRef.current?.click()} className="px-3 py-1.5 bg-jade text-background rounded-lg text-xs font-bold flex items-center gap-1"><Upload className="w-3 h-3" /> Replace</button>
                                <button onClick={() => setFormData({ ...formData, header_image_url: "" })} className="px-3 py-1.5 bg-danger text-white rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => imageInputRef.current?.click()} disabled={isPostSubmit}
                            className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-jade/40 hover:bg-jade/5 transition-all">
                            <ImageIcon className="w-7 h-7 text-text-muted" />
                            <span className="text-sm font-semibold text-text-muted">Drop image or click to upload</span>
                            <span className="text-xs text-text-muted">JPG, PNG, WebP up to 20MB</span>
                          </button>
                        )}
                        <input className="input-field w-full text-xs" placeholder="or paste URL: https://example.com/banner.jpg"
                          value={formData.header_image_url.startsWith("data:") ? "" : formData.header_image_url}
                          onChange={(e) => setFormData({ ...formData, header_image_url: e.target.value })} disabled={isPostSubmit} />
                      </div>
                    )}

                    {formData.header_type === "VIDEO" && (
                      <div className="space-y-3">
                        <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleMediaFile} />
                        <div className="flex gap-2">
                          <button onClick={() => videoInputRef.current?.click()} disabled={isPostSubmit}
                            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-blue-400/40 hover:text-blue-400 transition-all">
                            <Upload className="w-3.5 h-3.5" /> Upload Video
                          </button>
                          <button onClick={() => setShowMediaLibrary(true)} disabled={isPostSubmit}
                            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-blue-400/40 hover:text-blue-400 transition-all">
                            <FolderOpen className="w-3.5 h-3.5" /> Choose from Library
                          </button>
                        </div>
                        {formData.header_image_url ? (
                          <div className="flex items-center gap-3 p-3 bg-blue-400/10 border border-blue-400/20 rounded-xl">
                            <Film className="w-7 h-7 text-blue-400 flex-shrink-0" />
                            <p className="text-xs font-semibold text-blue-400 flex-1 truncate">{formData.header_image_url.startsWith("data:") ? "Video uploaded ✓" : formData.header_image_url}</p>
                            {!isPostSubmit && <button onClick={() => setFormData({ ...formData, header_image_url: "" })} className="p-1.5 text-text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        ) : (
                          <button onClick={() => videoInputRef.current?.click()} disabled={isPostSubmit}
                            className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-blue-400/40 hover:bg-blue-400/5 transition-all">
                            <Film className="w-7 h-7 text-text-muted" />
                            <span className="text-sm font-semibold text-text-muted">Drop video or click to upload</span>
                            <span className="text-xs text-text-muted">MP4, MOV, WebM up to 20MB</span>
                          </button>
                        )}
                      </div>
                    )}

                    {formData.header_type === "DOCUMENT" && (
                      <div className="space-y-3">
                        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" className="hidden" onChange={handleMediaFile} />
                        <div className="flex gap-2">
                          <button onClick={() => docInputRef.current?.click()} disabled={isPostSubmit}
                            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-amber-400/40 hover:text-amber-400 transition-all">
                            <Upload className="w-3.5 h-3.5" /> Upload Document
                          </button>
                          <button onClick={() => setShowMediaLibrary(true)} disabled={isPostSubmit}
                            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:border-amber-400/40 hover:text-amber-400 transition-all">
                            <FolderOpen className="w-3.5 h-3.5" /> Choose from Library
                          </button>
                        </div>
                        {formData.header_image_url ? (
                          <div className="flex items-center gap-3 p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl">
                            <FileIcon className="w-7 h-7 text-amber-400 flex-shrink-0" />
                            <p className="text-xs font-semibold text-amber-400 flex-1 truncate">{formData.header_image_url.startsWith("data:") ? "Document uploaded ✓" : formData.header_image_url}</p>
                            {!isPostSubmit && <button onClick={() => setFormData({ ...formData, header_image_url: "" })} className="p-1.5 text-text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        ) : (
                          <button onClick={() => docInputRef.current?.click()} disabled={isPostSubmit}
                            className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-amber-400/40 hover:bg-amber-400/5 transition-all">
                            <FileIcon className="w-7 h-7 text-text-muted" />
                            <span className="text-sm font-semibold text-text-muted">Drop document or click to upload</span>
                            <span className="text-xs text-text-muted">PDF, Word, PowerPoint, Excel up to 20MB</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Body</label>
                    <p className="text-xs text-text-muted">The WhatsApp message in the language you have selected</p>
                    <div className="border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-jade/30">
                      {/* Highlight overlay wrapper */}
                      <div className="relative bg-surface">
                        {/* Background layer — renders highlighted variables */}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 px-4 py-3 text-sm whitespace-pre-wrap break-words overflow-hidden pointer-events-none select-none"
                          style={{ lineHeight: "1.625", fontFamily: "inherit" }}
                        >
                          {formData.body.length === 0 ? (
                            <span className="text-text-muted">Write your template body here...</span>
                          ) : (
                            formData.body.split(/({{[\d]+}})/g).map((part, i) =>
                              part.match(/{{[\d]+}}/) ? (
                                <mark
                                  key={i}
                                  style={{
                                    background: "rgba(16,185,129,0.18)",
                                    color: "#10B981",
                                    borderRadius: "4px",
                                    padding: "1px 3px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {part}
                                </mark>
                              ) : (
                                <span key={i} style={{ color: "transparent" }}>{part}</span>
                              )
                            )
                          )}
                        </div>
                        {/* Transparent textarea on top */}
                        <textarea
                          ref={bodyRef}
                          name="body"
                          value={formData.body}
                          onChange={handleChange}
                          rows={5}
                          className="relative w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none placeholder:text-transparent"
                          style={{
                            color: "transparent",
                            caretColor: "var(--color-text-primary)",
                            lineHeight: "1.625",
                          }}
                          placeholder="Write your template body here..."
                          disabled={isPostSubmit}
                          onBlur={() => setShowEmojiPicker(false)}
                        />
                      </div>
                      {/* Toolbar */}
                      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card">
                        <button
                          onClick={insertVariable}
                          disabled={isPostSubmit}
                          className="flex items-center gap-1.5 text-xs font-semibold text-jade hover:text-jade-hover transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add variable
                          <span className="ml-1 text-[10px] text-text-muted font-normal">inserts {"{{N}}"} at cursor</span>
                        </button>
                        <div className="flex items-center gap-0.5">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); wrapSelection("*"); }}
                            disabled={isPostSubmit}
                            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors"
                            title="Bold (wraps with *)"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); wrapSelection("_"); }}
                            disabled={isPostSubmit}
                            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors italic"
                            title="Italic (wraps with _)"
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative">
                            <button
                              onMouseDown={(e) => { e.preventDefault(); setShowEmojiPicker(p => !p); }}
                              disabled={isPostSubmit}
                              className={`p-1.5 rounded transition-colors ${showEmojiPicker ? "text-jade bg-jade/10" : "text-text-muted hover:text-text-primary hover:bg-surface"}`}
                              title="Insert emoji"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {showEmojiPicker && (
                              <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-card border border-border rounded-xl shadow-xl z-20 grid grid-cols-6 gap-1">
                                {COMMON_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onMouseDown={(e) => { e.preventDefault(); insertEmoji(emoji); }}
                                    className="text-lg hover:bg-surface rounded-lg p-1 transition-colors leading-none"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-text-muted">
                        Use <code className="bg-jade/10 text-jade px-1 rounded text-[9px]">*bold*</code> and <code className="bg-jade/10 text-jade px-1 rounded text-[9px]">_italic_</code> for WhatsApp formatting
                      </p>
                      <p className="text-[10px] text-text-muted">{formData.body.length} chars</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Footer (Optional)</label>
                    <p className="text-xs text-text-muted">Add a short line of text to the bottom of your message template.</p>
                    <div className="relative">
                      <input
                        name="footer"
                        value={formData.footer}
                        onChange={handleChange}
                        placeholder="e.g. Reply STOP to unsubscribe"
                        className="input-field w-full text-sm pr-16"
                        disabled={isPostSubmit}
                        maxLength={60}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">{formData.footer.length}/60</span>
                    </div>
                  </div>

                  {/* Buttons — only for BUTTONS type */}
                  {templateType === "BUTTONS" && (
                    <div className="space-y-4">
                      <div className="border border-border rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold">Template with Buttons (Quick Reply, URL, Copy Code etc)</p>
                            <p className="text-xs text-text-muted mt-0.5">Create buttons that let customers respond to your message or take action.</p>
                          </div>
                        </div>

                        {/* Button limit info */}
                        <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg">
                          <p className="text-xs text-text-muted">The total number of buttons cannot exceed 3.</p>
                          <span className="text-xs font-bold text-jade">{formData.buttons.length}/3</span>
                        </div>

                        <div className="space-y-3">
                          {formData.buttons.map((btn, idx) => (
                            <ButtonRow key={idx} btn={btn} idx={idx} onChange={updateButton} onRemove={removeButton} />
                          ))}
                        </div>

                        {!isPostSubmit && formData.buttons.length < 3 && (
                          <button onClick={addButton} className="flex items-center gap-2 text-xs font-bold text-jade hover:text-jade-hover transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add Button
                          </button>
                        )}

                        {formData.buttons.length === 0 && (
                          <p className="text-xs text-text-muted italic">No buttons added yet. Quick reply or link buttons appear below the message.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isPostSubmit && (
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => handleSave(false)} disabled={isSubmitting} className="btn-secondary flex items-center gap-2">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save as Draft
                      </button>
                      <button onClick={() => handleSave(true)} disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit to Meta
                      </button>
                    </div>
                  )}
                  {isPostSubmit && (
                    <button onClick={onClose} className="btn-primary px-8">Done</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Preview Panel ─────────────────────────────────── */}
          <div className="w-[380px] bg-background p-6 flex flex-col items-center gap-4 flex-shrink-0">
            {/* Header */}
            <div className="w-full flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setPlatform("android")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${platform === "android" ? "bg-jade/10 border-jade text-jade" : "border-border text-text-muted hover:border-jade/30"}`}
                >
                  <Smartphone className="w-3 h-3" /> Android
                </button>
                <button
                  onClick={() => setPlatform("ios")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${platform === "ios" ? "bg-jade/10 border-jade text-jade" : "border-border text-text-muted hover:border-jade/30"}`}
                >
                  <Smartphone className="w-3 h-3" /> iOS
                </button>
              </div>
              <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                {step === 1 ? "Sample Preview" : "Live Preview"}
              </span>
            </div>

            <PhonePreview formData={previewData} platform={platform} metaStatus={step === 1 ? "DRAFT" : metaStatus} />

            {step === 1 && (
              <p className="text-xs text-text-muted text-center px-4 leading-relaxed">
                Use this preview to identify the template type that best fits your use case.
              </p>
            )}

            {step === 2 && isPostSubmit && (
              <div className="w-full text-center space-y-1">
                <StatusBadge status={metaStatus} />
                {metaStatus === "PENDING" && <p className="text-[10px] text-text-muted">This updates automatically when Meta responds.</p>}
              </div>
            )}

            {/* Info pill */}
            {step === 2 && !isPostSubmit && (
              <div className="flex items-center gap-2 text-text-muted text-xs bg-card border border-border rounded-xl px-4 py-2 w-full">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-jade" />
                <span>Once submitted, Meta review takes ~24h.</span>
              </div>
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
