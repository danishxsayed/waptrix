"use client";

import { useEffect, useState } from "react";
import { useFaviconBadge } from "@/hooks/useFaviconBadge";

/**
 * Polls /api/conversations every 15 s and keeps the favicon badge
 * in sync with the total unread count. Renders nothing visible.
 */
export default function FaviconBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data: { unread_count?: number }[] = await res.json();
          const total = data.reduce((s, c) => s + (Number(c.unread_count) || 0), 0);
          setCount(total);
        }
      } catch (_) {}
    }

    poll();
    const iv = setInterval(poll, 15_000);
    return () => clearInterval(iv);
  }, []);

  useFaviconBadge(count);
  return null;
}
