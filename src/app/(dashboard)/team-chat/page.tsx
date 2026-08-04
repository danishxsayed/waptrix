"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2, MessageSquareText } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  sender_email: string;
  message: string;
  created_at: string;
}

/* ── helpers ──────────────────────────────────────────────── */
function getInitial(email: string) {
  return (email?.[0] ?? "?").toUpperCase();
}

function getAvatarColor(email: string) {
  const palette = [
    "bg-jade/20 text-jade border-jade/30",
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
  ];
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) % palette.length;
  return palette[h];
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* tiny beep via Web Audio — no file needed */
function playNotification() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* browsers may block autoplay */ }
}

/* ── component ────────────────────────────────────────────── */
export default function TeamChatPage() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [myId, setMyId]           = useState<string | null>(null);
  const [myEmail, setMyEmail]     = useState("");
  const [tenantId, setTenantId]   = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const latestIds  = useRef<Set<string>>(new Set()); // track seen IDs for dedup

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  /* ── init: user + messages ─────────────────────────────── */
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setMyId(user.id); setMyEmail(user.email ?? ""); }

      // Fetch effective tenantId
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setTenantId(me.tenant?.id ?? null);
      }

      const res = await fetch("/api/team-chat");
      if (res.ok) {
        const data: Message[] = await res.json();
        data.forEach(m => latestIds.current.add(m.id));
        setMessages(data);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => { if (!loading) scrollToBottom(false); }, [loading, scrollToBottom]);

  /* ── Realtime subscription ─────────────────────────────── */
  useEffect(() => {
    if (!tenantId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`team-chat:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "team_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (latestIds.current.has(msg.id)) return; // already have it (optimistic)
          latestIds.current.add(msg.id);
          setMessages(prev => [...prev, msg]);
          // Replace optimistic message that matches by content + sender
          setMessages(prev => {
            const opt = prev.find(
              m => m.id.startsWith("opt-") &&
                   m.sender_id === msg.sender_id &&
                   m.message === msg.message
            );
            if (opt) return prev.map(m => m.id === opt.id ? msg : m);
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender_id !== myId) playNotification();
          setTimeout(() => scrollToBottom(), 50);
        }
      )
      .subscribe();

    /* ── polling fallback every 5s (catches Realtime misses) */
    const poll = setInterval(async () => {
      const res = await fetch("/api/team-chat");
      if (!res.ok) return;
      const data: Message[] = await res.json();
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = data.filter(m => !existingIds.has(m.id) && !m.id.startsWith("opt-"));
        if (newMsgs.length === 0) return prev;
        newMsgs.forEach(m => {
          latestIds.current.add(m.id);
          if (m.sender_id !== myId) playNotification();
        });
        setTimeout(() => scrollToBottom(), 50);
        return [...prev, ...newMsgs];
      });
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [tenantId, myId, scrollToBottom]);

  /* ── send ──────────────────────────────────────────────── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const optId = `opt-${Date.now()}`;
    const optimistic: Message = {
      id: optId, sender_id: myId ?? "", sender_email: myEmail,
      message: text, created_at: new Date().toISOString(),
    };
    latestIds.current.add(optId);
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(), 50);

    try {
      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        const saved: Message = await res.json();
        latestIds.current.add(saved.id);
        setMessages(prev => prev.map(m => m.id === optId ? saved : m));
      }
    } catch { /* optimistic stays */ }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ── grouped bubbles ───────────────────────────────────── */
  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].sender_id !== msg.sender_id,
    isLast:  i === messages.length - 1 || messages[i + 1]?.sender_id !== msg.sender_id,
  }));

  /* ── render ────────────────────────────────────────────── */
  /* -m-8 cancels the p-8 of <main> so chat fills the container exactly.
     The outer flex col + overflow-hidden ensures only the messages div scrolls. */
  return (
    <div className="-m-8 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-border flex-shrink-0">
        <div className="w-9 h-9 bg-jade/10 border border-jade/20 rounded-xl flex items-center justify-center">
          <MessageSquareText className="w-5 h-5 text-jade" />
        </div>
        <div>
          <h2 className="text-base font-bold font-syne">Team Chat</h2>
          <p className="text-xs text-text-muted">Internal — only your team can see this</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-0.5 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-jade animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 bg-jade/10 border border-jade/20 rounded-2xl flex items-center justify-center">
              <MessageSquareText className="w-7 h-7 text-jade opacity-40" />
            </div>
            <p className="font-semibold text-text-primary text-sm">No messages yet</p>
            <p className="text-xs text-text-muted">Send the first message to your team.</p>
          </div>
        ) : (
          grouped.map((msg) => {
            const isMe = msg.sender_id === myId;
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} ${msg.isFirst ? "mt-4" : "mt-0.5"}`}
              >
                {!isMe && (
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${msg.isLast ? getAvatarColor(msg.sender_email) : "opacity-0 pointer-events-none"}`}>
                    {getInitial(msg.sender_email)}
                  </div>
                )}
                <div className={`flex flex-col max-w-[68%] ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && msg.isFirst && (
                    <span className="text-[10px] text-text-muted mb-1 ml-1">
                      {msg.sender_email.split("@")[0]}
                    </span>
                  )}
                  <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
                    isMe
                      ? "bg-jade text-background rounded-br-sm"
                      : "bg-card border border-border text-text-primary rounded-bl-sm"
                  }`}>
                    {msg.message}
                  </div>
                  {msg.isLast && (
                    <span className="text-[10px] text-text-muted mt-1 mx-1">
                      {formatTime(msg.created_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-border bg-surface">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your team… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-background border border-border rounded-2xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50 resize-none overflow-y-auto"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-jade rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-jade/90 transition-colors"
          >
            {sending
              ? <Loader2 className="w-4 h-4 text-background animate-spin" />
              : <Send className="w-4 h-4 text-background" />
            }
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-2 ml-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
