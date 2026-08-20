"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  FileText,
  Users,
  Link2,
  BarChart3,
  Settings,
  ShieldCheck,
  Images,
  Loader2,
  LogOut,
  MessageSquare,
  UserPlus,
  Bot,
  MessageSquareText,
  ChevronDown,
  CreditCard,
  Settings2,
  Receipt,
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ROLE_RANK: Record<string, number> = { agent: 0, admin: 1, owner: 2 };

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  minRole: "agent" | "admin" | "owner";
  badge?: boolean;
  children?: { name: string; href: string; icon: React.ElementType }[];
};

const ALL_NAV_ITEMS: NavItem[] = [
  { name: "Dashboard",     href: "/dashboard",  icon: LayoutDashboard, minRole: "agent" },
  { name: "Inbox",         href: "/inbox",       icon: MessageSquare,   minRole: "agent", badge: true },
  { name: "Campaigns",     href: "/campaigns",   icon: Send,            minRole: "admin" },
  { name: "Templates",     href: "/templates",   icon: FileText,        minRole: "admin" },
  { name: "Media Library", href: "/media",       icon: Images,          minRole: "admin" },
  { name: "Contacts",      href: "/contacts",    icon: Users,           minRole: "agent" },
  { name: "Analytics",     href: "/analytics",   icon: BarChart3,       minRole: "admin" },
  {
    name: "Team Members",
    href: "/team",
    icon: UserPlus,
    minRole: "owner",
    children: [
      { name: "Members",   href: "/team",       icon: Users },
      { name: "Team Chat", href: "/team-chat",  icon: MessageSquareText },
    ],
  },
  { name: "Automations",   href: "/automations", icon: Bot,      minRole: "owner" },
  { name: "Connect",       href: "/connect",     icon: Link2,    minRole: "owner" },
  { name: "Settings",      href: "/settings",    icon: Settings, minRole: "owner" },
  {
    name: "Billing",
    href: "/billing",
    icon: CreditCard,
    minRole: "owner",
    children: [
      { name: "Billing Details",     href: "/billing/details",      icon: Settings2 },
      { name: "Manage Subscription", href: "/billing/subscription",  icon: CreditCard },
      { name: "Invoices",            href: "/billing/invoices",      icon: Receipt },
    ],
  },
];

const AGENT_EXTRA: NavItem[] = [
  { name: "Team Chat", href: "/team-chat", icon: MessageSquareText, minRole: "agent" },
];

const AGENT_PROFILE: NavItem = { name: "Profile", href: "/profile", icon: UserCircle, minRole: "agent" };

function navItemsForRole(role: string): NavItem[] {
  const base = ALL_NAV_ITEMS.filter(item => ROLE_RANK[role] >= ROLE_RANK[item.minRole]);
  if (role === "agent" || role === "admin") {
    const inboxIdx = base.findIndex(i => i.href === "/inbox");
    base.splice(inboxIdx + 1, 0, ...AGENT_EXTRA);
  }
  if (role === "agent") base.push(AGENT_PROFILE);
  return base;
}

// Tooltip shown next to icon when sidebar is collapsed
function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none
      bg-[#111B21] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg
      whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111B21]" />
    </div>
  );
}

export default function Sidebar() {
  const pathname  = usePathname();
  const { tenant, role, loading } = useTenant();
  const router    = useRouter();

  const [collapsed, setCollapsed]             = useState(false);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [teamChatUnread, setTeamChatUnread]   = useState(0);
  const [expanded, setExpanded]               = useState<Record<string, boolean>>({});

  const navItems = navItemsForRole(role);

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem("sidebar_collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem("sidebar_collapsed", String(!prev));
      return !prev;
    });
  };

  // Auto-expand parent if a child is active
  useEffect(() => {
    navItems.forEach(item => {
      if (item.children?.some(c => pathname.startsWith(c.href))) {
        setExpanded(prev => ({ ...prev, [item.href]: true }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data: { unread_count: number }[] = await res.json();
          setUnreadCount(data.reduce((s, c) => s + (c.unread_count || 0), 0));
        }
      } catch (_) {}
    }
    fetchUnread();
    const iv = setInterval(fetchUnread, 60_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    async function fetchTeamChatUnread() {
      if (pathname === "/team-chat") { setTeamChatUnread(0); return; }
      try {
        const since = localStorage.getItem("lastSeenTeamChat") ?? "";
        const params = since ? `?since=${encodeURIComponent(since)}` : "";
        const res = await fetch(`/api/team-chat/unread${params}`);
        if (res.ok) {
          const { count } = await res.json();
          setTeamChatUnread(count ?? 0);
        }
      } catch (_) {}
    }
    fetchTeamChatUnread();
    const iv = setInterval(fetchTeamChatUnread, 40_000);
    return () => clearInterval(iv);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const toggleExpand = (href: string) =>
    setExpanded(prev => ({ ...prev, [href]: !prev[href] }));

  return (
    <aside
      className={`relative min-h-screen bg-white border-r border-[#E9EDEF] flex flex-col shadow-sm transition-all duration-300 ease-in-out flex-shrink-0 ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* Header */}
      <div className={`border-b border-[#E9EDEF] flex items-center ${collapsed ? "px-3 py-5 justify-center" : "px-5 py-5 justify-between"}`}>
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-[#25D366] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-extrabold text-lg leading-none" style={{ fontFamily: "Arial, sans-serif" }}>W</span>
          </div>
          {!collapsed && (
            <span className="text-xl font-extrabold text-[#111B21] tracking-tight truncate">Waptrix</span>
          )}
        </Link>

        {/* Toggle button — visible only when expanded (inside header) */}
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-[#667781] hover:bg-[#EDE8DE] hover:text-[#111B21] transition-colors flex-shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse toggle when collapsed — sits below logo */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-[#E9EDEF]">
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-[#667781] hover:bg-[#EDE8DE] hover:text-[#111B21] transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar ${collapsed ? "px-2" : "px-3"}`}>
        {loading && (
          <div className="space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-11 rounded-xl bg-[#EDE8DE] animate-pulse ${collapsed ? "w-10 mx-auto" : ""}`} />
            ))}
          </div>
        )}

        {!loading && navItems.map((item) => {
          const Icon     = item.icon;
          const hasKids  = !!item.children?.length;
          const isOpen   = expanded[item.href] ?? false;
          const isActive = hasKids
            ? (pathname === item.href || item.children!.some(c => pathname.startsWith(c.href)))
            : pathname.startsWith(item.href);

          // ── Collapsed mode: icon-only with tooltip ─────────────────
          if (collapsed) {
            const href = hasKids ? (item.children![0]?.href ?? item.href) : item.href;
            const badge = item.badge && unreadCount > 0;
            const tcBadge = item.href === "/team-chat" && teamChatUnread > 0;
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={href}
                  className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
                    isActive
                      ? "bg-[#D9FDD3] text-[#25D366]"
                      : "text-[#667781] hover:bg-[#EDE8DE] hover:text-[#111B21]"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {(badge || tcBadge) && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#25D366] rounded-full" />
                  )}
                </Link>
                <Tooltip label={item.name} />
              </div>
            );
          }

          // ── Expanded mode ──────────────────────────────────────────
          if (hasKids) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleExpand(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    isActive
                      ? "bg-[#D9FDD3] text-[#075E54]"
                      : "text-[#667781] hover:bg-[#EDE8DE] hover:text-[#111B21]"
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? "text-[#25D366]" : ""}`} />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-[#E9EDEF] pl-3">
                    {item.children!.map(child => {
                      const CIcon       = child.icon;
                      const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                      const isTeamChat  = child.href === "/team-chat";
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            childActive
                              ? "bg-[#D9FDD3] text-[#075E54] font-semibold"
                              : "text-[#667781] hover:bg-[#EDE8DE] hover:text-[#111B21]"
                          }`}
                        >
                          <CIcon className={`w-4 h-4 flex-shrink-0 ${childActive ? "text-[#25D366]" : ""}`} />
                          <span className="flex-1">{child.name}</span>
                          {isTeamChat && teamChatUnread > 0 && (
                            <span className="w-5 h-5 bg-[#25D366] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                              {teamChatUnread > 9 ? "9+" : teamChatUnread}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isTeamChatItem = item.href === "/team-chat";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? "bg-[#D9FDD3] text-[#075E54] font-semibold"
                  : "text-[#667781] hover:bg-[#EDE8DE] hover:text-[#111B21]"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? "text-[#25D366]" : ""}`} />
              <span className="flex-1">{item.name}</span>
              {item.badge && unreadCount > 0 && (
                <span className="w-5 h-5 bg-[#25D366] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {isTeamChatItem && teamChatUnread > 0 && (
                <span className="w-5 h-5 bg-[#25D366] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {teamChatUnread > 9 ? "9+" : teamChatUnread}
                </span>
              )}
            </Link>
          );
        })}

        {/* Logout */}
        <div className="pt-3 mt-3 border-t border-[#E9EDEF]">
          {collapsed ? (
            <div className="relative group">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all text-[#667781] hover:bg-red-50 hover:text-red-500"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <Tooltip label="Logout" />
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium text-[#667781] hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span className="font-medium">Logout</span>
            </button>
          )}
        </div>
      </nav>

      {/* Plan card */}
      <div className={`mt-auto ${collapsed ? "p-2" : "p-4"}`}>
        {collapsed ? (
          <div className="relative group flex justify-center">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border">
              {loading
                ? <Loader2 className="w-4 h-4 text-jade animate-spin" />
                : <ShieldCheck className="w-4 h-4 text-jade" />
              }
            </div>
            <Tooltip label={
              loading ? "..." : tenant?.plan === "pro" ? "Pro Plan" : tenant?.plan === "trial" ? "Free Trial" : "Free"
            } />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              {loading
                ? <Loader2 className="w-4 h-4 text-jade animate-spin" />
                : <ShieldCheck className="w-4 h-4 text-jade" />
              }
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {loading ? "..." : tenant?.plan === "pro" ? "Pro Plan" : tenant?.plan === "trial" ? "Free Trial" : (tenant?.plan || "Free")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse" />
              <span className="text-[11px] text-jade font-semibold">Unlimited Messages</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
