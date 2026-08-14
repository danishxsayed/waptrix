"use client";

import { Search, User, Loader2, Users, Send, FileText, MessageSquare, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import NotificationBell from "@/components/layout/NotificationBell";
import { useState, useEffect, useRef, useCallback } from "react";

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

  // Fetch results whenever debounced query changes
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

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, -1)); }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); navigate(results[active]); }
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  const navigate = useCallback((r: any) => {
    router.push(r.href);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  }, [router]);

  const clear = () => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); };

  // Group results by type
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
      {/* Right icon — loading spinner or clear */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-[#667781] animate-spin" />
        ) : query ? (
          <button onClick={clear} className="text-[#667781] hover:text-[#111B21]">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
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
                    {items.map((r, i) => {
                      // Calculate flat index for keyboard active tracking
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
                          <div className={`w-7 h-7 rounded-lg bg-[#EDE8DE] flex items-center justify-center flex-shrink-0`}>
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

        {/* User chip */}
        <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#E9EDEF] hover:bg-[#EDE8DE] transition-all">
          <div className="w-7 h-7 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <span className="text-white text-xs font-bold">
                {(tenant?.name || "U")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-[#111B21] leading-tight">
              {loading ? "Loading…" : tenant?.name || "User"}
            </p>
            <p className="text-[10px] text-[#667781]">{tenant?.plan || "Starter"}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
