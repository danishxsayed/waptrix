"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare, Send, Paperclip, Search, CheckCheck, Check,
  Clock, Image, FileText, Mic, MoreVertical, X, ChevronDown, Loader2
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

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
  if (status === "read")
    return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === "delivered")
    return <CheckCheck className="w-3.5 h-3.5 text-text-muted" />;
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-text-muted" />;
  if (status === "failed")
    return <X className="w-3.5 h-3.5 text-red-400" />;
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
  const supabase = createClient();

  // ── Notification sound (Web Audio API — no external file needed)
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
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

  // ── Supabase Realtime — listen for new messages
  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;

          // If message is for the active conversation, append it
          if (newMsg.conversation_id === activeConv?.id) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          // Update conversation list
          if (newMsg.direction === "inbound") {
            playNotificationSound();
            setConversations((prev) => {
              const updated = prev.map((c) => {
                if (c.id === newMsg.conversation_id) {
                  const isActive = activeConv?.id === c.id;
                  return {
                    ...c,
                    last_message: newMsg.content,
                    last_message_at: newMsg.created_at,
                    unread_count: isActive ? 0 : (c.unread_count || 0) + 1,
                  };
                }
                return c;
              });
              // Re-sort by latest
              return updated.sort(
                (a, b) =>
                  new Date(b.last_message_at).getTime() -
                  new Date(a.last_message_at).getTime()
              );
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv?.id, playNotificationSound]);

  // ── Send reply
  const sendReply = async () => {
    if (!activeConv) return;

    if (replyMode === "text" && !replyText.trim()) return;
    if (replyMode === "template" && !selectedTemplate) return;
    if (replyMode === "media" && !mediaFile && !mediaPreview) return;

    setIsSending(true);

    try {
      let body: any = {};

      if (replyMode === "text") {
        body = { type: "text", content: replyText.trim() };
      } else if (replyMode === "template" && selectedTemplate) {
        body = {
          type: "template",
          templateName: selectedTemplate.name,
          languageCode: selectedTemplate.language || "en_US",
          components: [],
        };
      } else if (replyMode === "media" && mediaFile) {
        // Convert file to base64 data URL for upload
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(mediaFile);
        });

        const mediaType = mediaFile.type.startsWith("image/")
          ? "image"
          : mediaFile.type.startsWith("video/")
          ? "video"
          : mediaFile.type.startsWith("audio/")
          ? "audio"
          : "document";

        body = {
          type: mediaType,
          mediaUrl: dataUrl,
          mediaMimeType: mediaFile.type,
        };
      }

      const res = await fetch(`/api/conversations/${activeConv.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to send");
        return;
      }

      // Append the sent message optimistically
      setMessages((prev) => [...prev, data]);
      setReplyText("");
      setMediaFile(null);
      setMediaPreview("");
      setSelectedTemplate(null);

      // Update conversation last message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, last_message: data.content, last_message_at: data.created_at }
            : c
        )
      );
    } catch (err: any) {
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
                            {/* Media badge */}
                            {msg.type === "image" && (
                              <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                <Image className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold uppercase">Photo</span>
                              </div>
                            )}
                            {msg.type === "document" && (
                              <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                <FileText className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold uppercase">Document</span>
                              </div>
                            )}
                            {msg.type === "audio" && (
                              <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                <Mic className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold uppercase">Voice message</span>
                              </div>
                            )}

                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>

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
