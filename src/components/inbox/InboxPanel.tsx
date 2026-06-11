"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare, Send, Paperclip, Search, CheckCheck, Check,
  Clock, FileText, Mic, X, Loader2, Download, Play
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InboxPanel({
  onUnreadChange,
  fullHeight = false,
}: {
  onUnreadChange?: (count: number) => void;
  fullHeight?: boolean;
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeConvRef = useRef<Conversation | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // ── Stable client: MUST NOT be re-created on every render or realtime breaks
  const supabase = useMemo(() => createClient(), []);

  // Keep ref in sync with state
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

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

  // ── Polling fallback — guarantees updates even if Supabase Realtime is down
  useEffect(() => {
    const poll = async () => {
      // Refresh conversations and check for new unread
      const res = await fetch('/api/conversations');
      if (!res.ok) return;
      const fresh: Conversation[] = await res.json();

      setConversations(prev => {
        const prevUnread = prev.reduce((s, c) => s + (c.unread_count || 0), 0);
        const newUnread  = fresh.reduce((s, c) => s + (c.unread_count || 0), 0);
        if (newUnread > prevUnread) playNotificationSound();
        // Only update state if something actually changed
        const changed = JSON.stringify(fresh.map(c => `${c.id}:${c.last_message_at}:${c.unread_count}`))
                     !== JSON.stringify(prev.map(c => `${c.id}:${c.last_message_at}:${c.unread_count}`));
        return changed ? fresh : prev;
      });

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

    const interval = setInterval(poll, 3000);
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, status: updated.status } : m));
      })
      // New conversations (first message from a new contact)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, (payload) => {
        const newConv = payload.new as Conversation;
        setConversations((prev) => prev.find((c) => c.id === newConv.id) ? prev : [newConv, ...prev]);
      })
      // Conversation updates (last_message, unread_count)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, (payload) => {
        const updated = payload.new as Conversation;
        setConversations((prev) =>
          prev
            .map((c) => c.id === updated.id ? { ...c, ...updated } : c)
            .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        );
      })
      .subscribe((status) => {
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
      body = {
        type: "template",
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language || "en_US",
        components: [],
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
        alert(data.error || "Failed to send");
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
      alert(err.message || "Failed to send");
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
                      {group.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              msg.direction === "outbound"
                                ? "bg-jade text-background rounded-br-sm"
                                : "bg-card border border-border text-text-primary rounded-bl-sm"
                            }`}
                          >
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

                            {/* Text content — show for text messages and as caption for media */}
                            {(msg.type === "text" || (msg.content && !["[image]","[video]","[audio]","[document]","[sticker]"].includes(msg.content))) && (
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
                      ))}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Reply bar ──────────────────────────────────────── */}
            <div className="border-t border-border bg-card p-4 space-y-3">
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
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choose a template...
                        </option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {selectedTemplate && (
                        <div className="bg-surface border border-jade/20 rounded-xl p-3 text-xs text-text-muted italic">
                          &ldquo;{selectedTemplate.body}&rdquo;
                        </div>
                      )}
                      <button
                        onClick={sendReply}
                        disabled={isSending || !selectedTemplate}
                        className="w-full py-2.5 bg-jade text-background text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-jade/90 transition-colors flex items-center justify-center gap-2"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
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
              Select a conversation from the left to view messages and reply to customers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
