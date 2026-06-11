"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Bell, CheckCheck, ExternalLink, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  meta: {
    template_id?: string | null;
    template_name?: string;
    status?: string;
    reason?: string | null;
  };
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusColor(status?: string) {
  switch (status) {
    case "APPROVED": return "text-emerald-400";
    case "REJECTED":
    case "DISABLED": return "text-red-400";
    case "FLAGGED":
    case "PAUSED": return "text-amber-400";
    default: return "text-text-muted";
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Stable Supabase client for realtime
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (_) {}
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Supabase Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => { fetchNotifications(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchNotifications]);

  // Polling fallback every 30s
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }

  async function markRead(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) markRead(n.id);
    if (n.meta?.template_id) {
      setOpen(false);
      router.push("/templates");
    }
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 text-text-muted hover:text-jade transition-colors rounded-lg hover:bg-card"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-jade text-background text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-surface leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[520px] flex flex-col bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold font-syne text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs font-bold bg-jade/10 text-jade px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-text-muted hover:text-jade flex items-center gap-1 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Bell className="w-10 h-10 text-text-muted/30 mb-3" />
                <p className="text-sm text-text-muted font-semibold">No notifications yet</p>
                <p className="text-xs text-text-muted/60 mt-1">
                  You'll be notified when Meta updates your template statuses.
                </p>
              </div>
            ) : (
              <ul>
                {notifications.map(n => (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`
                      px-5 py-4 border-b border-border/50 last:border-0 cursor-pointer
                      transition-colors hover:bg-surface/60
                      ${!n.is_read ? "bg-jade/[0.03]" : ""}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        {!n.is_read ? (
                          <span className="w-2 h-2 rounded-full bg-jade block" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-transparent block" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-snug ${!n.is_read ? "text-text-primary" : "text-text-muted"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          {n.body}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-text-muted/60">{timeAgo(n.created_at)}</span>
                          {n.meta?.status && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor(n.meta.status)}`}>
                              {n.meta.status}
                            </span>
                          )}
                          {n.meta?.template_id && (
                            <span className="text-[10px] text-jade flex items-center gap-0.5">
                              View template <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mark read on hover */}
                      {!n.is_read && (
                        <button
                          onClick={e => { e.stopPropagation(); markRead(n.id); }}
                          className="shrink-0 mt-0.5 p-1 rounded text-text-muted/40 hover:text-jade hover:bg-jade/10 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-border shrink-0">
              <button
                onClick={() => { setOpen(false); router.push("/templates"); }}
                className="text-xs text-jade hover:text-jade/80 font-semibold transition-colors"
              >
                Go to Templates →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
