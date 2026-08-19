"use client";

import { useEffect } from "react";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Dynamically renders a favicon with an optional red badge showing `count`.
 * Draws entirely on canvas — no dependency on loading the .ico file.
 */
export function useFaviconBadge(count: number) {
  useEffect(() => {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Base icon: green rounded square with white "W" ──
    roundRect(ctx, 0, 0, size, size, 7);
    ctx.fillStyle = "#25D366";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 19px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("W", size / 2, size / 2 + 1);

    // ── Badge ──
    if (count > 0) {
      const label = count > 99 ? "99+" : String(count);
      const isLong = label.length > 2;
      const badgeR = isLong ? 11 : 10;  // bigger radius
      const bx = size - badgeR + 1;     // centre x
      const by = badgeR - 1;            // centre y

      // Border ring
      ctx.beginPath();
      ctx.arc(bx, by, badgeR + 2, 0, 2 * Math.PI);
      ctx.fillStyle = "#25D366";
      ctx.fill();

      // Red circle
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, 2 * Math.PI);
      ctx.fillStyle = "#EF4444";
      ctx.fill();

      // Count text
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${isLong ? 10 : 15}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx, by + 1);
    }

    // ── Swap favicon — safely replace existing icon links ──
    const dataUrl = canvas.toDataURL("image/png");
    let link = document.getElementById("__waptrix_favicon__") as HTMLLinkElement | null;
    if (!link) {
      // Remove any existing favicon links first (only once)
      document.querySelectorAll("link[rel*='icon']").forEach(el => {
        try { el.parentNode?.removeChild(el); } catch (_) {}
      });
      link = document.createElement("link");
      link.id = "__waptrix_favicon__";
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    link.href = dataUrl;
  }, [count]);
}
