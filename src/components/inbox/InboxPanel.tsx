"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare, Send, Paperclip, Search, CheckCheck, Check,
  Clock, FileText, Mic, X, Loader2, Download, Play, Plus, Phone, AlertCircle
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  type: string;
  content: string;
  media_url?: string;
  media_id?: string;
  media_mime?: string;
  meta_message_id?: string;
  replied_to_message_id?: string;
  status: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  language: string;
  components: any[];
  meta_status: string;
  header_type?: string;
  header_text?: string;
  footer?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatConvTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM/yy");
}

function formatMsgTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function groupByDate(messages: ChatMessage[]) {
  const groups: { label: string; messages: ChatMessage[] }[] = [];
  let currentLabel = "";
  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const label = isToday(d)
      ? "Today"
      : isYesterday(d)
      ? "Yesterday"
      : format(d, "MMMM d, yyyy");
    if (label !== currentLabel) {
      groups.push({ label, messages: [] });
      currentLabel = label;
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

// ─── Template Bubble ──────────────────────────────────────────────────────────
function TemplateBubble({ template }: { template: Template }) {
  const headerType = template.header_type || "NONE";
  const headerText = template.header_text || "";
  const isMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType);
  const isUrl = headerText.startsWith("http");

  return (
    <div className="rounded-2xl overflow-hidden border border-background/20 min-w-[220px] max-w-[260px]">
      {/* Header */}
      {headerType === "TEXT" && headerText && (
        <div className="px-3 pt-2.5 pb-1">
          <p className="font-bold text-sm leading-snug">{headerText}</p>
        </div>
      )}
      {headerType === "IMAGE" && (
        isUrl ? (
          <img src={headerText} alt="Header" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
        ) : (
          <div className="w-full h-32 bg-background/20 flex items-center justify-center">
            <FileText className="w-8 h-8 opacity-40" />
          </div>
        )
      )}
      {headerType === "VIDEO" && (
        isUrl ? (
          <video src={headerText} className="w-full h-32 object-cover" muted playsInline />
        ) : (
          <div className="w-full h-32 bg-background/20 flex items-center justify-center">
            <Play className="w-8 h-8 opacity-40" />
          </div>
        )
      )}
      {headerType === "DOCUMENT" && (
        <div className="w-full px-3 py-2 bg-background/20 flex items-center gap-2">
          <FileText className="w-5 h-5 opacity-60" />
          <span className="text-xs opacity-70 truncate">{isUrl ? headerText.split("/").pop() : "Document"}</span>
        </div>
      )}

      {/* Body */}
      <div className="px-3 py-2">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{template.body}</p>
      </div>

      {/* Footer */}
      {template.footer && (
        <div className="px-3 pb-2">
          <p className="text-xs opacity-50">{template.footer}</p>
        </div>
      )}

      {/* Buttons */}
      {template.buttons && template.buttons.length > 0 && (
        <div className="border-t border-background/20">
          {template.buttons.map((btn, i) => (
            <div
              key={i}
              className="px-3 py-2 text-center text-xs font-semibold border-b border-background/10 last:border-b-0 opacity-80"
            >
              {btn.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Extract ordered variable indices from a template body, e.g. ["1","2"] from "Hello {{1}}, enjoy {{2}}!" */
function extractTemplateVars(body: string): string[] {
  const matches = [...new Set((body || "").match(/{{(\d+)}}/g)?.map(m => m.replace(/[{}]/g, "")) ?? [])];
  return matches.sort((a, b) => Number(a) - Number(b));
}

/** Returns the indices (in the buttons array) of URL buttons that have a dynamic {{1}} suffix */
function urlButtonIndices(buttons?: { type: string; url?: string }[]): number[] {
  if (!buttons) return [];
  return buttons.reduce<number[]>((acc, btn, i) => {
    if (btn.type === "URL" && btn.url && /\{\{1\}\}/.test(btn.url)) acc.push(i);
    return acc;
  }, []);
}

function avatarInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Status icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-text-muted" />;
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-text-muted" />;
  if (status === "failed") return <X className="w-3.5 h-3.5 text-red-400" />;
  if (status === "sending") return <Loader2 className="w-3 h-3 text-background/60 animate-spin" />;
  return <Clock className="w-3 h-3 text-text-muted" />;
}

// ─── Quoted message bubble ────────────────────────────────────────────────────

/** Quoted context rendered INSIDE the message bubble — matches WhatsApp style */
function QuotedBubble({ quoted, isOutbound }: { quoted: ChatMessage; isOutbound: boolean }) {
  let preview = quoted.content || "";
  if (quoted.type === "template" || preview.startsWith("[Template:")) {
    const m = preview.match(/^\[Template:\s*(.+)\]$/);
    preview = m ? `Template: ${m[1]}` : "Template message";
  } else if (["image", "video", "audio", "document", "sticker"].includes(quoted.type)) {
    preview = `📎 ${quoted.type.charAt(0).toUpperCase() + quoted.type.slice(1)}`;
  } else if (preview === "[button message]") {
    preview = "Button reply";
  }
  if (preview.length > 100) preview = preview.slice(0, 100) + "…";

  return (
    <div
      className={`border-l-4 pl-3 pr-2 py-1.5 mb-2 rounded-r-lg ${
        isOutbound
          ? "border-background/50 bg-background/10"
          : "border-jade/60 bg-jade/5"
      }`}
    >
      <p className={`text-[11px] font-bold mb-0.5 ${isOutbound ? "text-background/70" : "text-jade"}`}>
        {quoted.direction === "outbound" ? "You" : "Contact"}
      </p>
      <p className={`text-xs leading-snug line-clamp-2 ${isOutbound ? "text-background/60" : "text-text-muted"}`}>
        {preview}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InboxPanel({
  onUnreadChange,
  fullHeight = false,
  initialPhone,
}: {
  onUnreadChange?: (count: number) => void;
  fullHeight?: boolean;
  initialPhone?: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState<"text" | "template" | "media">("text");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [sendError, setSendError] = useState<string>("");
  const [templateVarValues, setTemplateVarValues] = useState<string[]>([]);
  const [templateBtnValues, setTemplateBtnValues] = useState<string[]>([]);

  // ── New Chat state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatTemplate, setNewChatTemplate] = useState<Template | null>(null);
  const [newChatVarValues, setNewChatVarValues] = useState<string[]>([]);
  const [newChatBtnValues, setNewChatBtnValues] = useState<string[]>([]);
  const [newChatSending, setNewChatSending] = useState(false);
  const [newChatError, setNewChatError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeConvRef = useRef<Conversation | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const onUnreadChangeRef = useRef(onUnreadChange);
  // ── Stable client: MUST NOT be re-created on every render or realtime breaks
  const supabase = useMemo(() => createClient(), []);

  // Keep refs in sync with latest props/state
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { onUnreadChangeRef.current = onUnreadChange; }, [onUnreadChange]);

  // ── Notification sound — warm C-E-G chime
  const playNotificationSound = useCallback(() => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      const play = () => {
        const t = ctx.currentTime;
        [
          { freq: 523.25, delay: 0,    dur: 0.45 },
          { freq: 659.25, delay: 0.10, dur: 0.45 },
          { freq: 783.99, delay: 0.20, dur: 0.60 },
        ].forEach(({ freq, delay, dur }) => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, t + delay);
          gain.gain.linearRampToValueAtTime(0.22, t + delay + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
          osc.start(t + delay);
          osc.stop(t + delay + dur + 0.05);
        });
      };
      ctx.state === 'suspended' ? ctx.resume().then(play) : play();
    } catch (_) {}
  }, []);

  // ── Unlock AudioContext on any user interaction
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // ── Fetch conversations
  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data: Conversation[] = await res.json();
      setConversations(data);
      const total = data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      onUnreadChange?.(total);
    }
    setLoadingConvs(false);
  }, [onUnreadChange]);

  // ── Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    const res = await fetch(`/api/conversations/${convId}/messages`);
    if (res.ok) {
      const data: ChatMessage[] = await res.json();
      setMessages(data);
    }
    setLoadingMsgs(false);
  }, []);

  // ── Fetch approved templates
  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) {
      const data: Template[] = await res.json();
      setTemplates(data.filter((t) => t.meta_status === "APPROVED"));
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchTemplates();
  }, [fetchConversations, fetchTemplates]);

  // ── Auto-select conversation when initialPhone is provided (from contacts page)
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (!initialPhone || didAutoSelect.current || conversations.length === 0) return;
    const clean = initialPhone.replace(/\D/g, "");
    const match = conversations.find((c) => c.contact_phone.replace(/\D/g, "") === clean);
    if (match) {
      didAutoSelect.current = true;
      selectConversation(match);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone, conversations]);

  // ── Polling fallback — guarantees updates even if Supabase Realtime is down
  useEffect(() => {
    const poll = async () => {
      // Refresh conversations and check for new unread
      const res = await fetch('/api/conversations');
      if (!res.ok) return;
      const fresh: Conversation[] = await res.json();

      const newTotal = fresh.reduce((s, c) => s + (c.unread_count || 0), 0);

      setConversations(prev => {
        const prevUnread = prev.reduce((s, c) => s + (c.unread_count || 0), 0);
        if (newTotal > prevUnread) playNotificationSound();
        const changed = JSON.stringify(fresh.map(c => `${c.id}:${c.last_message_at}:${c.unread_count}`))
                     !== JSON.stringify(prev.map(c => `${c.id}:${c.last_message_at}:${c.unread_count}`));
        return changed ? fresh : prev;
      });

      // Always sync sidebar badge with latest server count
      onUnreadChangeRef.current?.(newTotal);

      // Refresh active conversation messages
      const conv = activeConvRef.current;
      if (!conv) return;
      const mRes = await fetch(`/api/conversations/${conv.id}/messages`);
      if (!mRes.ok) return;
      const freshMsgs: ChatMessage[] = await mRes.json();
      setMessages(prev => {
        if (freshMsgs.length === prev.filter(m => !m.id.startsWith('temp-')).length) return prev;
        // Merge: keep optimistic temp messages, add new real ones
        const realIds = new Set(prev.filter(m => !m.id.startsWith('temp-')).map(m => m.id));
        const newReal = freshMsgs.filter(m => !realIds.has(m.id));
        return newReal.length > 0 ? [...prev.filter(m => !m.id.startsWith('temp-')), ...freshMsgs.slice(-200)] : prev;
      });
    };

    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [playNotificationSound]);

  // ── Select a conversation
  const selectConversation = useCallback(
    async (conv: Conversation) => {
      setActiveConv(conv);
      setReplyText("");
      setMediaFile(null);
      setMediaPreview("");
      setSelectedTemplate(null);
      await fetchMessages(conv.id);

      // Mark as read
      if (conv.unread_count > 0) {
        await fetch(`/api/conversations/${conv.id}/mark-read`, { method: "POST" });
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
        onUnreadChange?.(
          conversations.reduce(
            (sum, c) => sum + (c.id === conv.id ? 0 : c.unread_count || 0),
            0
          )
        );
      }
    },
    [fetchMessages, conversations, onUnreadChange]
  );

  // ── Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Supabase Realtime — single stable subscription (no re-mount on conv change)
  // Uses activeConvRef to avoid stale closures when switching conversations.
  useEffect(() => {
    const channel = supabase
      .channel(`inbox-${Date.now()}`) // unique name prevents ghost subscriptions
      // New inbound/outbound messages
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload: any) => {
        const newMsg = payload.new as ChatMessage;
        const currentConv = activeConvRef.current;

        // Append to active conversation's message list
        if (newMsg.conversation_id === currentConv?.id) {
          setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }

        // Update conversation sidebar for inbound messages
        if (newMsg.direction === "inbound") {
          playNotificationSound();
          setConversations((prev) => {
            const exists = prev.find((c) => c.id === newMsg.conversation_id);
            if (!exists) {
              // Unknown conversation — re-fetch the full list
              fetchConversations();
              return prev;
            }
            return prev
              .map((c) => c.id === newMsg.conversation_id ? {
                ...c,
                last_message: newMsg.content,
                last_message_at: newMsg.created_at,
                unread_count: currentConv?.id === c.id ? 0 : (c.unread_count || 0) + 1,
              } : c)
              .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          });
        }
      })
      // Message status updates (sent → delivered → read)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (payload: any) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, status: updated.status } : m));
      })
      // New conversations (first message from a new contact)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, (payload: any) => {
        const newConv = payload.new as Conversation;
        setConversations((prev) => prev.find((c) => c.id === newConv.id) ? prev : [newConv, ...prev]);
      })
      // Conversation updates (last_message, unread_count)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, (payload: any) => {
        const updated = payload.new as Conversation;
        setConversations((prev) =>
          prev
            .map((c) => c.id === updated.id ? { ...c, ...updated } : c)
            .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        );
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') console.log('Inbox realtime connected');
        if (status === 'CHANNEL_ERROR') console.error('Inbox realtime error — falling back to polling');
      });

    return () => { supabase.removeChannel(channel); };
  }, []); // ← empty deps: subscribe ONCE for the lifetime of the component

  // ── Send reply — optimistic UI for instant feel
  const sendReply = async () => {
    if (!activeConv) return;
    if (replyMode === "text" && !replyText.trim()) return;
    if (replyMode === "template" && !selectedTemplate) return;
    if (replyMode === "media" && !mediaFile && !mediaPreview) return;

    let body: any = {};
    let optimisticContent = "";

    if (replyMode === "text") {
      optimisticContent = replyText.trim();
      body = { type: "text", content: optimisticContent };
    } else if (replyMode === "template" && selectedTemplate) {
      optimisticContent = `[Template: ${selectedTemplate.name}]`;

      // Header component — required for IMAGE/VIDEO/DOCUMENT headers on every send
      const headerComponents: any[] = [];
      if (
        selectedTemplate.header_type &&
        ["IMAGE", "VIDEO", "DOCUMENT"].includes(selectedTemplate.header_type) &&
        selectedTemplate.header_text?.startsWith("https://")
      ) {
        const mediaType = selectedTemplate.header_type.toLowerCase(); // "image" | "video" | "document"
        headerComponents.push({
          type: "header",
          parameters: [{ type: mediaType, [mediaType]: { link: selectedTemplate.header_text } }],
        });
      }

      const vars = extractTemplateVars(selectedTemplate.body);
      const bodyComponents = vars.length > 0
        ? [{ type: "body", parameters: templateVarValues.map(v => ({ type: "text", text: v || " " })) }]
        : [];
      const btnIndices = urlButtonIndices(selectedTemplate.buttons);
      const btnComponents = btnIndices.map((btnIdx, i) => ({
        type: "button",
        sub_type: "url",
        index: String(btnIdx),
        parameters: [{ type: "text", text: templateBtnValues[i] || "" }],
      }));
      body = {
        type: "template",
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language || "en_US",
        components: [...headerComponents, ...bodyComponents, ...btnComponents],
      };
    } else if (replyMode === "media" && mediaFile) {
      const mediaType = mediaFile.type.startsWith("image/") ? "image"
        : mediaFile.type.startsWith("video/") ? "video"
        : mediaFile.type.startsWith("audio/") ? "audio"
        : "document";
      optimisticContent = `[${mediaType}]`;

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(mediaFile);
      });
      body = { type: mediaType, mediaUrl: dataUrl, mediaMimeType: mediaFile.type };
    }

    // ── Optimistic: show message instantly with "sending" status
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: activeConv.id,
      direction: "outbound",
      type: body.type || "text",
      content: optimisticContent,
      // For media: use local object URL so image shows immediately
      media_url: replyMode === "media" && mediaPreview ? mediaPreview : undefined,
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyText("");
    setMediaFile(null);
    setMediaPreview("");
    setSelectedTemplate(null);
    setTemplateVarValues([]);
    setTemplateBtnValues([]);
    setSendError("");

    setIsSending(true);
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        // Replace optimistic message with failed status
        setMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...m, status: "failed" } : m)
        );
        setSendError(data.error || "Failed to send message. Please try again.");
        return;
      }

      // Replace optimistic message with real one from server
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...data, id: data.id || tempId } : m)
      );

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, last_message: optimisticContent, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, status: "failed" } : m)
      );
      setSendError(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Handle media file pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    } else {
      setMediaPreview("");
    }
    setReplyMode("media");
  };

  // ── Start a new conversation with any phone number via template message
  const handleStartConversation = async () => {
    if (!newChatPhone.trim()) { setNewChatError("Phone number is required."); return; }
    if (!newChatTemplate) { setNewChatError("Select a template — WhatsApp requires a template to start a new conversation."); return; }
    setNewChatError("");
    setNewChatSending(true);
    try {
      // Header component for media templates
      const newChatHeaderComponents: any[] = [];
      if (
        newChatTemplate.header_type &&
        ["IMAGE", "VIDEO", "DOCUMENT"].includes(newChatTemplate.header_type) &&
        newChatTemplate.header_text?.startsWith("https://")
      ) {
        const mediaType = newChatTemplate.header_type.toLowerCase();
        newChatHeaderComponents.push({
          type: "header",
          parameters: [{ type: mediaType, [mediaType]: { link: newChatTemplate.header_text } }],
        });
      }

      const newChatVars = extractTemplateVars(newChatTemplate.body);
      const newChatBodyComponents = newChatVars.length > 0
        ? [{ type: "body", parameters: newChatVarValues.map(v => ({ type: "text", text: v || " " })) }]
        : [];
      const newChatBtnIndices = urlButtonIndices(newChatTemplate.buttons);
      const newChatBtnComponents = newChatBtnIndices.map((btnIdx, i) => ({
        type: "button",
        sub_type: "url",
        index: String(btnIdx),
        parameters: [{ type: "text", text: newChatBtnValues[i] || "" }],
      }));
      const newChatComponents = [...newChatHeaderComponents, ...newChatBodyComponents, ...newChatBtnComponents];
      const res = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newChatPhone.trim(),
          contactName: newChatName.trim() || undefined,
          templateName: newChatTemplate.name,
          languageCode: newChatTemplate.language || "en_US",
          components: newChatComponents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewChatError(data.error || "Failed to start conversation.");
        return;
      }
      // Add/refresh the conversation in the list and select it
      const conv: Conversation = data.conversation;
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id);
        if (exists) return prev.map((c) => c.id === conv.id ? { ...c, ...conv } : c);
        return [conv, ...prev];
      });
      setShowNewChat(false);
      setNewChatPhone("");
      setNewChatName("");
      setNewChatTemplate(null);
      setNewChatVarValues([]);
      setNewChatBtnValues([]);
      selectConversation(conv);
    } catch (err: any) {
      setNewChatError(err.message || "Failed to start conversation.");
    } finally {
      setNewChatSending(false);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_phone.includes(searchQuery)
  );

  const messageGroups = groupByDate(messages);
  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="glass-card !p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-jade/10 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-jade" />
          </div>
          <div>
            <h3 className="font-bold font-syne text-base">WhatsApp Inbox</h3>
            <p className="text-[11px] text-text-muted">
              {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowNewChat(true); setNewChatError(""); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-jade text-background text-xs font-bold rounded-xl hover:bg-jade-hover transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          title="Start a new conversation"
        >
          <Plus className="w-3.5 h-3.5" /> New Chat
        </button>
      </div>

      <div className={`flex ${fullHeight ? "h-[calc(100vh-260px)]" : "h-[600px]"}`}>
        {/* ── Left: Conversation List ────────────────────────────── */}
        <div className="w-80 border-r border-border flex flex-col flex-shrink-0">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2 border border-border">
              <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 text-jade animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                <MessageSquare className="w-10 h-10 text-text-muted opacity-30 mb-3" />
                <p className="text-sm text-text-muted font-medium">No conversations yet</p>
                <p className="text-[11px] text-text-muted mt-1">
                  Messages from customers will appear here
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-border/50 hover:bg-card transition-colors text-left ${
                    activeConv?.id === conv.id ? "bg-jade/5 border-l-2 border-l-jade" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-jade/20 text-jade font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {avatarInitials(conv.contact_name || conv.contact_phone)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {conv.contact_name || conv.contact_phone}
                      </span>
                      <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">
                        {formatConvTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-text-muted truncate">
                        {conv.last_message || "No messages yet"}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-jade text-background text-[10px] font-bold rounded-full flex items-center justify-center">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Chat View ───────────────────────────────────── */}
        {activeConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-jade/20 text-jade font-bold text-sm flex items-center justify-center">
                  {avatarInitials(activeConv.contact_name || activeConv.contact_phone)}
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {activeConv.contact_name || activeConv.contact_phone}
                  </p>
                  <p className="text-[11px] text-text-muted">{activeConv.contact_phone}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar bg-background/40">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-jade animate-spin" />
                </div>
              ) : messageGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-text-muted opacity-30 mb-3" />
                  <p className="text-sm text-text-muted">No messages yet</p>
                  <p className="text-xs text-text-muted mt-1">Send the first message below</p>
                </div>
              ) : (
                messageGroups.map((group) => (
                  <div key={group.label}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider px-2">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-2">
                      {group.messages.map((msg) => {
                        const isOutbound = msg.direction === "outbound";
                        // Find the message being replied to (matched by meta_message_id)
                        const quotedMsg = msg.replied_to_message_id
                          ? messages.find(m => m.meta_message_id === msg.replied_to_message_id)
                          : null;
                        return (
                        <div key={msg.id}>
                        <div
                          className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              msg.direction === "outbound"
                                ? "bg-jade text-background rounded-br-sm"
                                : "bg-card border border-border text-text-primary rounded-bl-sm"
                            }`}
                          >
                            {/* Quoted context — inside the bubble */}
                            {quotedMsg && (
                              <QuotedBubble quoted={quotedMsg} isOutbound={isOutbound} />
                            )}

                            {/* Media rendering */}
                            {msg.type === "image" && (msg.media_id || msg.media_url) && (() => {
                              const src = msg.media_url || `/api/whatsapp/media/${msg.media_id}`;
                              return (
                                <div className="mb-2 rounded-xl overflow-hidden max-w-[240px]">
                                  <img
                                    src={src}
                                    alt="Photo"
                                    className="w-full h-auto object-cover rounded-xl cursor-pointer"
                                    onClick={() => window.open(src, '_blank')}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                </div>
                              );
                            })()}
                            {msg.type === "video" && (msg.media_id || msg.media_url) && (
                              <div className="mb-2 rounded-xl overflow-hidden max-w-[240px]">
                                <video
                                  controls
                                  className="w-full h-auto rounded-xl"
                                  src={msg.media_url || `/api/whatsapp/media/${msg.media_id}`}
                                />
                              </div>
                            )}
                            {msg.type === "audio" && (msg.media_id || msg.media_url) && (
                              <div className="mb-2">
                                <audio controls className="w-full max-w-[220px]"
                                  src={msg.media_url || `/api/whatsapp/media/${msg.media_id}`} />
                              </div>
                            )}
                            {msg.type === "document" && (msg.media_id || msg.media_url) && (() => {
                              const href = msg.media_url || `/api/whatsapp/media/${msg.media_id}`;
                              return (
                                <a href={href} target="_blank" rel="noopener noreferrer"
                                  className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-xl border ${
                                    msg.direction === "outbound"
                                      ? "border-background/20 text-background/80 hover:text-background"
                                      : "border-border text-text-muted hover:text-text-primary"
                                  } transition-colors`}
                                >
                                  <FileText className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-xs font-medium truncate max-w-[160px]">
                                    {msg.content || "Document"}
                                  </span>
                                  <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                                </a>
                              );
                            })()}
                            {msg.type === "sticker" && (msg.media_id || msg.media_url) && (
                              <div className="mb-2 w-20 h-20">
                                <img
                                  src={msg.media_url || `/api/whatsapp/media/${msg.media_id}`}
                                  alt="Sticker"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}

                            {/* Template message bubble */}
                            {(msg.type === "template" || msg.content?.startsWith("[Template:")) && (() => {
                              const nameMatch = msg.content?.match(/^\[Template:\s*(.+)\]$/);
                              const tplName = nameMatch?.[1]?.trim();
                              const tpl = templates.find(t => t.name === tplName);
                              return tpl ? (
                                <TemplateBubble template={tpl} />
                              ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words opacity-70 italic">
                                  {tplName ? `Template: ${tplName}` : msg.content}
                                </p>
                              );
                            })()}

                            {/* Button reply (quick reply tap) — render as plain text */}
                            {(msg.type === "button" || msg.content === "[button message]") && (
                              <p className="text-sm font-medium">
                                {msg.content === "[button message]" ? "—" : msg.content}
                              </p>
                            )}

                            {/* Text content — show for text messages and as caption for media */}
                            {msg.type !== "template" && msg.type !== "button" &&
                             msg.content !== "[button message]" &&
                             !msg.content?.startsWith("[Template:") &&
                             (msg.type === "text" || (msg.content && !["[image]","[video]","[audio]","[document]","[sticker]"].includes(msg.content))) && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            )}

                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                msg.direction === "outbound" ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span
                                className={`text-[10px] ${
                                  msg.direction === "outbound" ? "text-background/60" : "text-text-muted"
                                }`}
                              >
                                {formatMsgTime(msg.created_at)}
                              </span>
                              {msg.direction === "outbound" && (
                                <StatusIcon status={msg.status} />
                              )}
                            </div>
                          </div>
                        </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Reply bar ──────────────────────────────────────── */}
            <div className="border-t border-border bg-card p-4 space-y-3">
              {/* Send error */}
              {sendError && (
                <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{sendError}</span>
                  <button onClick={() => setSendError("")} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
              )}
              {/* Mode tabs */}
              <div className="flex items-center gap-1">
                {(["text", "template", "media"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setReplyMode(mode);
                      setReplyText("");
                      setMediaFile(null);
                      setMediaPreview("");
                      setSelectedTemplate(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize ${
                      replyMode === mode
                        ? "bg-jade text-background"
                        : "text-text-muted hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-text-muted">
                  {replyMode === "text" && "Free-text (within 24h window)"}
                  {replyMode === "template" && "Works outside 24h window"}
                  {replyMode === "media" && "Send image, video, or document"}
                </span>
              </div>

              {/* TEXT mode */}
              {replyMode === "text" && (
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50 resize-none"
                  />
                  <button
                    onClick={sendReply}
                    disabled={isSending || !replyText.trim()}
                    className="w-10 h-10 bg-jade rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-jade/90 transition-colors flex-shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 text-background animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-background" />
                    )}
                  </button>
                </div>
              )}

              {/* TEMPLATE mode */}
              {replyMode === "template" && (
                <div className="space-y-2">
                  {templates.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-3">
                      No approved templates. Create one in the Templates section.
                    </p>
                  ) : (
                    <>
                      <select
                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-jade/50"
                        onChange={(e) => {
                          const t = templates.find((t) => t.id === e.target.value) || null;
                          setSelectedTemplate(t);
                          const vars = extractTemplateVars(t?.body || "");
                          setTemplateVarValues(vars.map(() => ""));
                          const btnIdxs = urlButtonIndices(t?.buttons);
                          setTemplateBtnValues(btnIdxs.map(() => ""));
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Choose a template...</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>

                      {selectedTemplate && (() => {
                        const vars = extractTemplateVars(selectedTemplate.body);
                        const btnIdxs = urlButtonIndices(selectedTemplate.buttons);
                        return (
                          <>
                            {/* Template body preview */}
                            <div className="bg-surface border border-jade/20 rounded-xl p-3 text-xs text-text-muted italic">
                              &ldquo;{selectedTemplate.body}&rdquo;
                            </div>

                            {/* Body variable inputs */}
                            {vars.length > 0 && (
                              <div className="space-y-2 p-3 bg-surface/50 border border-border rounded-xl">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                  Fill in template variables
                                </p>
                                {vars.map((varIndex, i) => (
                                  <div key={varIndex} className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-jade bg-jade/10 border border-jade/20 px-1.5 py-0.5 rounded shrink-0">
                                      {`{{${varIndex}}}`}
                                    </span>
                                    <input
                                      type="text"
                                      value={templateVarValues[i] || ""}
                                      onChange={e => {
                                        const updated = [...templateVarValues];
                                        updated[i] = e.target.value;
                                        setTemplateVarValues(updated);
                                      }}
                                      placeholder={`Value for {{${varIndex}}}`}
                                      className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-jade/50"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* URL button suffix inputs */}
                            {btnIdxs.length > 0 && (
                              <div className="space-y-2 p-3 bg-surface/50 border border-amber-500/20 rounded-xl">
                                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                  Button URL suffix
                                </p>
                                {btnIdxs.map((btnIdx, i) => {
                                  const btn = selectedTemplate.buttons![btnIdx];
                                  const baseUrl = (btn.url || "").replace(/\{\{1\}\}$/, "");
                                  return (
                                    <div key={btnIdx} className="space-y-1">
                                      <p className="text-[10px] text-text-muted truncate">{btn.text}: <span className="text-amber-400">{baseUrl}</span><span className="text-jade">…</span></p>
                                      <input
                                        type="text"
                                        value={templateBtnValues[i] || ""}
                                        onChange={e => {
                                          const updated = [...templateBtnValues];
                                          updated[i] = e.target.value;
                                          setTemplateBtnValues(updated);
                                        }}
                                        placeholder="URL suffix (e.g. page/123)"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-amber-500/50"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <button
                        onClick={sendReply}
                        disabled={isSending || !selectedTemplate || (
                          extractTemplateVars(selectedTemplate?.body || "").length > 0 &&
                          templateVarValues.some(v => !v.trim())
                        ) || (
                          urlButtonIndices(selectedTemplate?.buttons).length > 0 &&
                          templateBtnValues.some(v => !v.trim())
                        )}
                        className="w-full py-2.5 bg-jade text-background text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-jade/90 transition-colors flex items-center justify-center gap-2"
                      >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Template
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* MEDIA mode */}
              {replyMode === "media" && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {!mediaFile ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-2 text-text-muted hover:border-jade/50 hover:text-jade transition-colors"
                    >
                      <Paperclip className="w-6 h-6" />
                      <span className="text-xs font-medium">
                        Click to select image, video, audio, or document
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3">
                      {mediaPreview ? (
                        <img src={mediaPreview} alt="preview" className="w-12 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-text-muted" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mediaFile.name}</p>
                        <p className="text-xs text-text-muted">
                          {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview("");
                        }}
                        className="text-text-muted hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={sendReply}
                    disabled={isSending || !mediaFile}
                    className="w-full py-2.5 bg-jade text-background text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-jade/90 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                    Send File
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state — no conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-jade/10 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-jade opacity-60" />
            </div>
            <h4 className="font-bold font-syne text-lg">WhatsApp Inbox</h4>
            <p className="text-sm text-text-muted mt-2 max-w-xs">
              Select a conversation from the left, or start a new one.
            </p>
            <button
              onClick={() => { setShowNewChat(true); setNewChatError(""); }}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-jade text-background text-sm font-bold rounded-xl hover:bg-jade-hover transition-all shadow-[0_0_16px_rgba(16,185,129,0.25)]"
            >
              <Plus className="w-4 h-4" /> Start New Conversation
            </button>
          </div>
        )}
      </div>

      {/* ── New Chat Modal ──────────────────────────────────────────────────── */}
      {showNewChat && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-jade/10 rounded-xl border border-jade/25 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-jade" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">Start New Conversation</p>
                  <p className="text-[10px] text-text-muted">Requires a WhatsApp-approved template</p>
                </div>
              </div>
              <button
                onClick={() => { setShowNewChat(false); setNewChatError(""); setNewChatPhone(""); setNewChatName(""); setNewChatTemplate(null); }}
                className="p-1.5 hover:bg-surface rounded-lg text-text-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {/* Info banner */}
              <div className="flex gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>WhatsApp only allows template messages to start a new conversation. Free-text is available once the contact replies.</span>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  value={newChatPhone}
                  onChange={e => setNewChatPhone(e.target.value)}
                  placeholder="+971501234567"
                  className="input-field w-full text-sm font-mono"
                  autoFocus
                />
                <p className="text-[10px] text-text-muted">Include country code, e.g. +971 for UAE, +91 for India</p>
              </div>

              {/* Contact name (optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Contact Name (optional)</label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                  placeholder="e.g. Ahmed Khan"
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Template picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">
                  Template <span className="text-rose-400">*</span>
                </label>
                {templates.length === 0 ? (
                  <div className="p-3 bg-surface border border-border rounded-xl text-xs text-text-muted text-center">
                    No approved templates found. Create and get templates approved in the Templates section.
                  </div>
                ) : (
                  <select
                    value={newChatTemplate?.name || ""}
                    onChange={e => {
                      const t = templates.find(t => t.name === e.target.value) || null;
                      setNewChatTemplate(t);
                      const vars = extractTemplateVars(t?.body || "");
                      setNewChatVarValues(vars.map(() => ""));
                      const btnIdxs = urlButtonIndices(t?.buttons);
                      setNewChatBtnValues(btnIdxs.map(() => ""));
                    }}
                    className="input-field w-full text-sm bg-background border-border"
                  >
                    <option value="">Select an approved template…</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                    ))}
                  </select>
                )}
                {newChatTemplate && (() => {
                  const vars = extractTemplateVars(newChatTemplate.body);
                  const btnIdxs = urlButtonIndices(newChatTemplate.buttons);
                  return (
                    <>
                      <div className="p-3 bg-surface border border-border rounded-xl text-xs text-text-muted leading-relaxed">
                        <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Preview</span>
                        {newChatTemplate.body}
                      </div>
                      {vars.length > 0 && (
                        <div className="space-y-2 p-3 bg-surface/50 border border-border rounded-xl">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Fill in variables</p>
                          {vars.map((varIndex, i) => (
                            <div key={varIndex} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-jade bg-jade/10 border border-jade/20 px-1.5 py-0.5 rounded shrink-0">
                                {`{{${varIndex}}}`}
                              </span>
                              <input
                                type="text"
                                value={newChatVarValues[i] || ""}
                                onChange={e => {
                                  const updated = [...newChatVarValues];
                                  updated[i] = e.target.value;
                                  setNewChatVarValues(updated);
                                }}
                                placeholder={`Value for {{${varIndex}}}`}
                                className="input-field flex-1 text-xs py-1.5"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {btnIdxs.length > 0 && (
                        <div className="space-y-2 p-3 bg-surface/50 border border-amber-500/20 rounded-xl">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Button URL suffix</p>
                          {btnIdxs.map((btnIdx, i) => {
                            const btn = newChatTemplate.buttons![btnIdx];
                            const baseUrl = (btn.url || "").replace(/\{\{1\}\}$/, "");
                            return (
                              <div key={btnIdx} className="space-y-1">
                                <p className="text-[10px] text-text-muted truncate">{btn.text}: <span className="text-amber-400">{baseUrl}</span><span className="text-jade">…</span></p>
                                <input
                                  type="text"
                                  value={newChatBtnValues[i] || ""}
                                  onChange={e => {
                                    const updated = [...newChatBtnValues];
                                    updated[i] = e.target.value;
                                    setNewChatBtnValues(updated);
                                  }}
                                  placeholder="URL suffix (e.g. page/123)"
                                  className="input-field w-full text-xs py-1.5"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Error */}
              {newChatError && (
                <div className="flex items-start gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {newChatError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowNewChat(false); setNewChatError(""); setNewChatPhone(""); setNewChatName(""); setNewChatTemplate(null); }}
                  className="flex-1 btn-secondary py-2.5 text-sm"
                  disabled={newChatSending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartConversation}
                  disabled={newChatSending || !newChatPhone.trim() || !newChatTemplate || (
                    extractTemplateVars(newChatTemplate?.body || "").length > 0 &&
                    newChatVarValues.some(v => !v.trim())
                  ) || (
                    urlButtonIndices(newChatTemplate?.buttons).length > 0 &&
                    newChatBtnValues.some(v => !v.trim())
                  )}
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {newChatSending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send &amp; Open Chat</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
