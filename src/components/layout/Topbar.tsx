"use client";

import {
  Search, Loader2, Users, Send, FileText, MessageSquare, X,
  ChevronDown, LogOut, User, Settings, CreditCard, HelpCircle,
  Building2, Zap, Clock, XCircle, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import NotificationBell from "@/components/layout/NotificationBell";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Type icons ─────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  contact:      { label: "Contact",      icon: Users,        color: "text-blue-400" },
  campaign:     { label: "Campaign",     icon: Send,         color: "text-[#25D366]" },
  template:     { label: "Template",     icon: FileText,     color: "text-amber-400" },
  conversation: { label: "Conversation", icon: MessageSquare,color: "text-purple-400" },
};

// ─── Debounce hook ───────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Global search ───────────────────────────────────────────────────────────
function GlobalSearch() {
  const router    = useRouter();
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [active, setActive]     = useState(-1);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(query, 280);

  useEffect(() => {
    if (debounced.length < 2) { setResults([]); setOpen(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setResults(d.results || []); setOpen(true); setActive(-1); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, -1)); }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); navigate(results[active]); }
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  const navigate = useCallback((r: any) => {
    router.push(r.href);
    setQuery(""); setResults([]); setOpen(false); setActive(-1);
    inputRef.current?.blur();
  }, [router]);

  const clear = () => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); };

  const grouped: Record<string, any[]> = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  return (
    <div ref={wrapRef} className="relative hidden md:block">
      <Search className="w-4 h-4 text-[#667781] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder="Search contacts, campaigns…"
        autoComplete="off"
        className="pl-9 pr-8 py-2 bg-[#EDE8DE] border border-[#E9EDEF] rounded-full text-sm text-[#111B21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 w-56 transition-all focus:w-72"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-[#667781] animate-spin" />
        ) : query ? (
          <button onClick={clear} className="text-[#667781] hover:text-[#111B21]">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-[#E9EDEF] rounded-2xl shadow-2xl overflow-hidden z-50">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center text-sm text-[#667781]">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {Object.entries(grouped).map(([type, items]) => {
                const meta = TYPE_META[type] || { label: type, icon: Search, color: "text-[#667781]" };
                const Icon = meta.icon;
                return (
                  <div key={type}>
                    <div className="px-4 py-2 bg-[#EDE8DE]/60 border-b border-[#E9EDEF]">
                      <span className="text-[10px] font-bold text-[#667781] uppercase tracking-widest">
                        {meta.label}s
                      </span>
                    </div>
                    {items.map(r => {
                      const flatIdx = results.indexOf(r);
                      const isActive = active === flatIdx;
                      return (
                        <button
                          key={r.id}
                          onClick={() => navigate(r)}
                          onMouseEnter={() => setActive(flatIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isActive ? "bg-[#D9FDD3]" : "hover:bg-[#EDE8DE]/50"
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#EDE8DE] flex items-center justify-center flex-shrink-0">
                            <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#111B21] truncate">{r.title}</p>
                            {r.sub && <p className="text-[11px] text-[#667781] truncate">{r.sub}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Plan status helpers ─────────────────────────────────────────────────────
function getPlanStatus(tenant: any): { label: string; color: string; icon: React.ElementType } {
  if (!tenant) return { label: "Loading", color: "text-[#667781]", icon: Clock };
  if (tenant.plan === "trial") {
    const trialEnd = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
    if (trialEnd && trialEnd < new Date()) return { label: "Trial Expired", color: "text-red-500", icon: XCircle };
    return { label: "Free Trial", color: "text-amber-600", icon: Clock };
  }
  if (tenant.plan === "pro") {
    const expires = tenant.plan_expires_at ? new Date(tenant.plan_expires_at) : null;
    if (expires && expires < new Date()) return { label: "Expired", color: "text-red-500", icon: XCircle };
    return { label: "Pro Active", color: "text-[#075E54]", icon: CheckCircle2 };
  }
  return { label: "Free", color: "text-[#667781]", icon: Clock };
}

function getPlanBadge(plan: string) {
  if (plan === "pro")   return "bg-[#D9FDD3] text-[#075E54]";
  if (plan === "trial") return "bg-amber-50 text-amber-700";
  return "bg-[#EDE8DE] text-[#667781]";
}

// ─── User Menu ───────────────────────────────────────────────────────────────
function UserMenu() {
  const router = useRouter();
  const { tenant, loading } = useTenant();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initial = (tenant?.name || "U")[0].toUpperCase();
  const planStatus = getPlanStatus(tenant);
  const StatusIcon = planStatus.icon;
  const planLabel = tenant?.plan === "pro" ? "Waptrix Pro" : tenant?.plan === "trial" ? "Free Trial" : "Free";

  const menuItems = [
    { label: "Profile",                href: "/settings?tab=profile",  icon: User },
    { label: "Billing & Subscription", href: "/billing",               icon: CreditCard },
    { label: "Settings",               href: "/settings",              icon: Settings },
    { label: "Help & Support",         href: "https://waptrix.in/docs",icon: HelpCircle, external: true },
  ];

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-2xl border transition-all ${
          open ? "border-[#25D366] bg-[#D9FDD3]/40" : "border-[#E9EDEF] hover:bg-[#EDE8DE]"
        }`}
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-[#25D366] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
          ) : (
            <span className="text-white text-sm font-extrabold leading-none">{initial}</span>
          )}
        </div>

        {/* Name + plan */}
        <div className="text-left hidden sm:block">
          <p className="text-xs font-bold text-[#111B21] leading-tight truncate max-w-[100px]">
            {loading ? "Loading…" : tenant?.name || "User"}
          </p>
          <p className="text-[10px] text-[#667781] leading-tight">{planLabel}</p>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-[#667781] transition-transform duration-200 hidden sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white border border-[#E9EDEF] rounded-2xl shadow-2xl overflow-hidden z-50">

          {/* User identity block */}
          <div className="px-4 py-4 border-b border-[#E9EDEF] bg-[#EDE8DE]/30">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#25D366] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-base font-extrabold">{initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#111B21] truncate">
                  {loading ? "…" : tenant?.name || "User"}
                </p>
                {tenant?.email && (
                  <p className="text-[11px] text-[#667781] truncate">{tenant.email}</p>
                )}
                {tenant?.company && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-[#667781] flex-shrink-0" />
                    <p className="text-[11px] text-[#667781] truncate">{tenant.company}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Plan badge + status */}
            <div className="mt-3 flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${getPlanBadge(tenant?.plan || "")}`}>
                <Zap className="w-3 h-3" />
                {planLabel}
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${planStatus.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {planStatus.label}
              </span>
            </div>
          </div>

          {/* Nav links */}
          <div className="py-2">
            {menuItems.map(item => {
              const Icon = item.icon;
              if (item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#667781] hover:text-[#111B21] hover:bg-[#EDE8DE]/50 transition-colors"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#667781] hover:text-[#111B21] hover:bg-[#EDE8DE]/50 transition-colors"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Logout */}
          <div className="border-t border-[#E9EDEF] py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────────
export default function Topbar() {
  const pathname = usePathname();
  const { tenant, loading } = useTenant();

  const getTitle = () => {
    if (pathname === "/dashboard" || pathname === "/") return "Dashboard";
    const path = pathname.split("/").filter(Boolean)[0];
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const getFirstName = () => {
    if (!tenant?.name) return "there";
    return tenant.name.split(" ")[0];
  };

  return (
    <header className="h-16 border-b border-[#E9EDEF] bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-bold text-[#111B21] tracking-tight">{getTitle()}</h1>
        <p className="text-xs text-[#667781]">
          {loading ? "Loading…" : `Welcome back, ${getFirstName()} 👋`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <GlobalSearch />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
