"use client";

import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client"; // still used for sign-out

function OfferPopup() {
  const [visible, setVisible]     = useState(false);
  const [animating, setAnimating] = useState(false);
  const [config, setConfig]       = useState<{ enabled: boolean; image_url: string | null; link_url: string } | null>(null);

  useEffect(() => {
    fetch("/api/popup")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.enabled && data?.image_url) {
          setConfig(data);
          const timer = setTimeout(() => { setVisible(true); setAnimating(true); }, 1200);
          return () => clearTimeout(timer);
        }
      })
      .catch(() => {});
  }, []);

  const close = () => {
    setAnimating(false);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible || !config) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transition: "opacity 0.3s ease, transform 0.3s cubic-bezier(.34,1.56,.64,1)",
          opacity: animating ? 1 : 0,
          transform: animating ? "scale(1) translateY(0)" : "scale(0.88) translateY(20px)",
        }}
        className="relative max-w-sm w-full"
      >
        <button
          onClick={close}
          className="absolute -top-3 -right-3 z-10 bg-white text-[#111B21] rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-[#EDE8DE] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <Link href={config.link_url || "/pricing"} onClick={close}>
          <Image
            src={config.image_url!}
            alt="Offer"
            width={480}
            height={600}
            className="w-full rounded-2xl shadow-2xl cursor-pointer"
            priority
            unoptimized
          />
        </Link>
      </div>
    </div>
  );
}

// ── Offer bar ────────────────────────────────────────────────────────────────
const OFFER_DURATION_SECS = 24 * 60 * 60; // 24 h — resets automatically when done
const pad = (n: number) => String(n).padStart(2, "0");

function OfferBar({ onHeightChange }: { onHeightChange: (h: number) => void }) {
  const [dismissed, setDismissed] = useState(true); // hidden until client-side check
  const [secs, setSecs]           = useState(OFFER_DURATION_SECS);
  const barRef                    = useRef<HTMLDivElement>(null);

  // ResizeObserver keeps the parent offset in sync whenever the bar changes height
  // (handles mobile 2-line layout, window resize, etc.)
  useEffect(() => {
    if (dismissed || !barRef.current) return;
    const el = barRef.current;
    onHeightChange(el.offsetHeight);
    const ro = new ResizeObserver(() => onHeightChange(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [dismissed, onHeightChange]);

  useEffect(() => {
    // Stay hidden if user dismissed during this browser session
    if (sessionStorage.getItem("offerBarDismissed") === "1") return;

    // Get or initialise the countdown end timestamp
    let endTime = parseInt(localStorage.getItem("offerBarEnd") || "0", 10);
    const now   = Math.floor(Date.now() / 1000);
    if (!endTime || endTime <= now) {
      endTime = now + OFFER_DURATION_SECS;
      localStorage.setItem("offerBarEnd", String(endTime));
    }

    setSecs(Math.max(0, endTime - now));
    setDismissed(false);

    const interval = setInterval(() => {
      const remaining = parseInt(localStorage.getItem("offerBarEnd") || "0", 10) - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        // Timer finished → reset for another 24 h automatically
        const newEnd = Math.floor(Date.now() / 1000) + OFFER_DURATION_SECS;
        localStorage.setItem("offerBarEnd", String(newEnd));
        setSecs(OFFER_DURATION_SECS);
      } else {
        setSecs(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  const dismiss = () => {
    sessionStorage.setItem("offerBarDismissed", "1");
    setDismissed(true);
    onHeightChange(0);
  };

  if (dismissed) return null;

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 right-0 z-[60] bg-[#075E54] text-white"
    >
      {/* Desktop layout */}
      <div className="hidden sm:flex items-center justify-center gap-3 px-4 py-2.5 text-sm relative">
        <span className="bg-[#25D366] text-[#111B21] text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0">
          Launch offer
        </span>
        <span className="text-white/90">
          Get <span className="font-bold text-white">20% off</span> your first 3 months — resets in
        </span>
        {/* Countdown */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-3 py-1 font-mono text-sm font-semibold tabular-nums flex-shrink-0">
          <span>{pad(h)}</span>
          <span className="text-white/50">:</span>
          <span>{pad(m)}</span>
          <span className="text-white/50">:</span>
          <span>{pad(s)}</span>
        </div>
        <Link
          href="/signup"
          className="bg-[#25D366] hover:bg-[#1ebe5d] text-[#111B21] font-bold text-xs px-4 py-1.5 rounded-full transition-colors flex-shrink-0"
        >
          Claim offer →
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss offer"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile layout — 2 lines */}
      <div className="sm:hidden px-4 py-2 relative">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-[#25D366] text-[#111B21] text-[10px] font-bold px-2 py-0.5 rounded-full">
              Launch offer
            </span>
            <span className="text-white/90 text-xs font-medium">20% off first 3 months</span>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss offer"
            className="text-white/50 hover:text-white transition-colors flex-shrink-0 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini countdown */}
          <div className="flex items-center gap-1 bg-white/10 rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums">
            <span>{pad(h)}</span>
            <span className="text-white/40">:</span>
            <span>{pad(m)}</span>
            <span className="text-white/40">:</span>
            <span>{pad(s)}</span>
          </div>
          <span className="text-white/60 text-[11px]">left</span>
          <Link
            href="/signup"
            className="ml-auto bg-[#25D366] hover:bg-[#1ebe5d] text-[#111B21] font-bold text-[11px] px-3 py-1.5 rounded-full transition-colors"
          >
            Claim →
          </Link>
        </div>
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { label: "Features",  href: "/#features" },
  { label: "Pricing",   href: "/pricing" },
  { label: "Blog",      href: "/blog" },
  { label: "Docs",      href: "/docs" },
  { label: "About",     href: "/about" },
  { label: "Contact",   href: "/contact" },
];

function WaptrixLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#25D366" />
      {/* W lettermark */}
      <text
        x="18"
        y="26"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        fill="white"
        letterSpacing="-1"
      >
        W
      </text>
    </svg>
  );
}

/** Build the app subdomain URL — works in both dev and production */
function appUrl(path: string) {
  if (typeof window === "undefined") return path;
  const { protocol, hostname, port } = window.location;
  const h = hostname.startsWith("app.") ? hostname : `app.${hostname}`;
  const p = port ? `:${port}` : "";
  return `${protocol}//${h}${p}${path}`;
}

function Navbar({ topOffset = 0 }: { topOffset?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ name: string; email: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    // Use /api/me (server-side) — more reliable than browser Supabase client
    // since it reads the actual session cookies directly.
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.userName) {
          setSessionUser({ name: data.userName, email: data.userEmail || "" });
        }
        setSessionLoaded(true);
      })
      .catch(() => setSessionLoaded(true));
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSessionUser(null);
    setUserMenuOpen(false);
    window.location.href = "/";
  };

  return (
    <header className="fixed left-0 right-0 z-50 bg-white border-b border-[#E9EDEF]" style={{ top: topOffset }}>
      <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <WaptrixLogo />
          <span className="font-bold text-[#111B21] text-lg tracking-tight">Waptrix</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map((l) => {
            const isActive = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href.split("#")[0]) && l.href !== "/#features";
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  isActive
                    ? "bg-[#D9FDD3] text-[#075E54] font-semibold"
                    : "text-[#667781] hover:text-[#111B21] hover:bg-[#EDE8DE]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {sessionLoaded && sessionUser ? (
            /* ── Logged-in state ── */
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-[#EDE8DE] border border-[#E9EDEF] rounded-full hover:bg-[#D9FDD3] transition-all text-sm font-bold text-[#111B21]"
              >
                <div className="w-6 h-6 bg-[#25D366] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {sessionUser.name[0].toUpperCase()}
                </div>
                {sessionUser.name.split(" ")[0]}
                <ChevronDown className={`w-3.5 h-3.5 text-[#667781] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E9EDEF] rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#E9EDEF]">
                    <p className="text-xs font-bold text-[#111B21] truncate">{sessionUser.name}</p>
                    <p className="text-[10px] text-[#667781] truncate">{sessionUser.email}</p>
                  </div>
                  <a
                    href={appUrl("/dashboard")}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#111B21] hover:bg-[#D9FDD3] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#25D366]" />
                    Go to Dashboard
                  </a>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#667781] hover:bg-[#EDE8DE] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : sessionLoaded ? (
            /* ── Logged-out state ── */
            <>
              <Link
                href="/login"
                className="flex items-center gap-1 border-2 border-[#111B21] text-[#111B21] text-sm font-bold px-5 py-2 rounded-full hover:bg-[#111B21] hover:text-white transition-all"
              >
                Log In <span className="text-xs">›</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 bg-[#25D366] text-[#111B21] text-sm font-bold px-5 py-2 rounded-full hover:bg-[#128C7E] hover:text-white transition-all"
              >
                Get Started <span className="text-xs">›</span>
              </Link>
            </>
          ) : (
            /* ── Loading skeleton ── */
            <div className="flex items-center gap-3">
              <div className="w-20 h-9 bg-[#EDE8DE] rounded-full animate-pulse" />
              <div className="w-28 h-9 bg-[#EDE8DE] rounded-full animate-pulse" />
            </div>
          )}
        </div>

        {/* Mobile */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-[#667781]">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-[#E9EDEF] px-6 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((l) => {
            const isActive = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href.split("#")[0]) && l.href !== "/#features";
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`py-3 px-3 text-sm font-medium border-b border-[#E9EDEF] last:border-0 ${
                  isActive ? "text-[#075E54] font-semibold" : "text-[#667781] hover:text-[#111B21]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <div className="flex flex-col gap-2 pt-4">
            {sessionUser ? (
              <>
                <a href={appUrl("/dashboard")} onClick={() => setOpen(false)} className="text-center bg-[#25D366] text-[#111B21] font-bold py-2.5 rounded-full text-sm">Go to Dashboard</a>
                <button onClick={handleSignOut} className="text-center border-2 border-[#667781] text-[#667781] font-bold py-2.5 rounded-full text-sm">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="text-center border-2 border-[#111B21] text-[#111B21] font-bold py-2.5 rounded-full text-sm">Log In</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="text-center bg-[#25D366] text-[#111B21] font-bold py-2.5 rounded-full text-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const cols = [
    { title: "Company",  links: [["About", "/about"], ["Contact", "/contact"], ["Blog", "/blog"], ["Careers", "/contact"]] },
    { title: "Product",  links: [["Features", "/#features"], ["Pricing", "/pricing"], ["Docs", "/docs"], ["Changelog", "/blog"]] },
    { title: "Legal",    links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]] },
    { title: "Support",  links: [["Help Centre", "/docs"], ["Email Support", "mailto:support@waptrix.in"], ["WhatsApp Us", "https://wa.me/918088365856"]] },
  ];

  return (
    <footer className="bg-white border-t border-[#E9EDEF]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <WaptrixLogo />
              <span className="font-bold text-[#111B21] text-lg">Waptrix</span>
            </Link>
            <p className="text-sm text-[#667781] leading-relaxed max-w-xs">
              The professional WhatsApp Business API platform for growing Indian businesses.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold text-[#111B21] uppercase tracking-wider mb-4">{col.title}</p>
              <div className="flex flex-col gap-3">
                {col.links.map(([label, href]) => (
                  <Link key={`${label}-${href}`} href={href} className="text-sm text-[#667781] hover:text-[#25D366] transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#E9EDEF] pt-6 flex flex-col sm:flex-row justify-between gap-3">
          <p className="text-xs text-[#667781]">© {new Date().getFullYear()} Waptrix Technologies Pvt. Ltd. All rights reserved.</p>
          <p className="text-xs text-[#667781]">Made with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [barHeight, setBarHeight] = useState(0);

  return (
    <div className="min-h-screen bg-[#EDE8DE] flex flex-col">
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-2DX20HZESP"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-2DX20HZESP');
        `}
      </Script>

      <OfferPopup />
      <OfferBar onHeightChange={setBarHeight} />
      <Navbar topOffset={barHeight} />
      <main className="flex-1" style={{ paddingTop: barHeight + 68 }}>{children}</main>
      <Footer />
    </div>
  );
}
