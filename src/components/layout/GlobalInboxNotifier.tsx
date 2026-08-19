"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useFaviconBadge } from "@/hooks/useFaviconBadge";

/** Plays the same 3-note chime used inside InboxPanel */
function playChime(audioCtxRef: React.MutableRefObject<AudioContext | null>) {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
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
        osc.type = "sine";
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
    ctx.state === "suspended" ? ctx.resume().then(play) : play();
  } catch (_) {}
}

/**
 * Renders nothing visible.
 * - Polls /api/conversations every 10 s from ANY dashboard page.
 * - Updates favicon badge with total unread count.
 * - Plays notification chime when unread count increases and user is NOT on /inbox.
 *   (InboxPanel already handles sound on the inbox page itself.)
 */
export default function GlobalInboxNotifier() {
  const pathname      = usePathname();
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const prevCountRef  = useRef<number | null>(null);   // null = first load, skip sound
  const [count, setCount] = useState(0);

  // Unlock AudioContext on any user interaction (required by browsers)
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    };
    document.addEventListener("click", unlock, { once: false });
    document.addEventListener("keydown", unlock, { once: false });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const onInbox = pathname?.startsWith("/inbox");

    async function poll() {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) return;
        const data: { unread_count?: number; status?: string }[] = await res.json();

        // Only count open conversations (closed ones don't need notifications)
        const total = data
          .filter(c => !c.status || c.status === "open")
          .reduce((s, c) => s + (Number(c.unread_count) || 0), 0);

        setCount(total);

        // Play sound if count went up and user is NOT on inbox page
        if (
          !onInbox &&
          prevCountRef.current !== null &&
          total > prevCountRef.current
        ) {
          playChime(audioCtxRef);
        }

        prevCountRef.current = total;
      } catch (_) {}
    }

    poll();
    const iv = setInterval(poll, 10_000);
    return () => clearInterval(iv);
  }, [pathname]);

  useFaviconBadge(count);
  return null;
}
