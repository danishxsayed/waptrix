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

function getInitial(email: string) {
  return email?.[0]?.toUpperCase() ?? "?";
}

function getAvatarColor(email: string) {
  const colors = [
    "bg-jade/20 text-jade border-jade/30",
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
  ];
  let hash = 0;
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[hash];
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TeamChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [myId, setMyId]         = useState<string | null>(null);
  const [myEmail, setMyEmail]   = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  // Fetch current user + initial messages
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setMyId(user.id); setMyEmail(user.email ?? ""); }

      const res = await fetch("/api/team-chat");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  // Supabase Realtime subscription for new messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("team-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages" },
        (payload) => {
          setMessages(prev => {
            // Avoid duplicates (optimistic insert + realtime)
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
          setTimeout(() => scrollToBottom(), 50);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    // Optimistic insert
    const optimistic: Message = {
      id:           `opt-${Date.now()}`,
      sender_id:    myId ?? "",
      sender_email: myEmail,
      message:      text,
      created_at:   new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(), 50);

    try {
      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        const saved = await res.json();
        // Replace optimistic with real
        setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
      }
    } catch { /* silent — optimistic stays */ }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group consecutive messages from same sender
  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].sender_id !== msg.sender_id,
    isLast:  i === messages.length - 1 || messages[i + 1].sender_id !== msg.sender_id,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border mb-0 flex-shrink-0">
        <div className="w-9 h-9 bg-jade/10 border border-jade/20 rounded-xl flex items-center justify-center">
          <MessageSquareText className="w-5 h-5 text-jade" />
        </div>
        <div>
          <h2 className="text-base font-bold font-syne">Team Chat</h2>
          <p className="text-xs text-text-muted">Internal — only your team can see this</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-jade animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 bg-jade/10 border border-jade/20 rounded-2xl flex items-center justify-center">
              <MessageSquareText className="w-7 h-7 text-jade opacity-50" />
            </div>
            <p className="font-semibold text-text-primary text-sm">No messages yet</p>
            <p className="text-xs text-text-muted">Send the first message to your team.</p>
          </div>
        ) : (
          grouped.map((msg) => {
            const isMe = msg.sender_id === myId;
            return (
              <div key={msg.id} className={`flex items-end gap-2 px-1 ${isMe ? "flex-row-reverse" : "flex-row"} ${msg.isFirst ? "mt-3" : "mt-0.5"}`}>
                {/* Avatar — only show on first of group, from the other person */}
                {!isMe && (
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${msg.isLast ? getAvatarColor(msg.sender_email) : "opacity-0"}`}>
                    {getInitial(msg.sender_email)}
                  </div>
                )}

                <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                  {/* Sender label — only on first of group */}
                  {!isMe && msg.isFirst && (
                    <span className="text-[10px] text-text-muted mb-1 ml-1">{msg.sender_email.split("@")[0]}</span>
                  )}

                  <div className={`relative group px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    isMe
                      ? "bg-jade text-background rounded-br-sm"
                      : "bg-card border border-border text-text-primary rounded-bl-sm"
                  }`}>
                    {msg.message}
                  </div>

                  {/* Timestamp — only on last of group */}
                  {msg.isLast && (
                    <span className="text-[10px] text-text-muted mt-1 mx-1">{formatTime(msg.created_at)}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-3 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your team… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50 resize-none max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as any}
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
      </div>
    </div>
  );
}
