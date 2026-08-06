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
  { name: "Dashboard",     href: "/",           icon: LayoutDashboard, minRole: "agent" },
  { name: "Inbox",         href: "/inbox",       icon: MessageSquare,   minRole: "agent", badge: true },
  { name: "Campaigns",     href: "/campaigns",   icon: Send,            minRole: "admin" },
  { name: "Templates",     href: "/templates",   icon: FileText,        minRole: "admin" },
  { name: "Media Library", href: "/media",       icon: Images,          minRole: "admin" },
  { name: "Contacts",      href: "/contacts",    icon: Users,           minRole: "admin" },
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
  { name: "Automations",   href: "/automations", icon: Bot,    minRole: "owner" },
  { name: "Connect",       href: "/connect",     icon: Link2,  minRole: "owner" },
  { name: "Settings",      href: "/settings",    icon: Settings, minRole: "owner" },
];

// For agents, Team Chat is a top-level item (they can't see Team Members parent)
const AGENT_EXTRA: NavItem[] = [
  { name: "Team Chat", href: "/team-chat", icon: MessageSquareText, minRole: "agent" },
];

function navItemsForRole(role: string): NavItem[] {
  const base = ALL_NAV_ITEMS.filter(item => ROLE_RANK[role] >= ROLE_RANK[item.minRole]);
  if (role === "agent" || role === "admin") {
    // Insert Team Chat after Inbox for non-owners
    const inboxIdx = base.findIndex(i => i.href === "/inbox");
    base.splice(inboxIdx + 1, 0, ...AGENT_EXTRA);
  }
  return base;
}

export default function Sidebar() {
  const pathname  = usePathname();
  const { tenant, role, loading } = useTenant();
  const router    = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({});
  const navItems  = navItemsForRole(role);

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
    const iv = setInterval(fetchUnread, 30_000);
    return () => clearInterval(iv);
  }, []);

  const getProgress = () => {
    if (!tenant) return 0;
    return (tenant.messages_used / tenant.messages_limit) * 100;
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const toggleExpand = (href: string) =>
    setExpanded(prev => ({ ...prev, [href]: !prev[href] }));

  return (
    <aside className="w-64 min-h-screen bg-surface border-r border-border flex flex-col">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-jade rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
            <span className="text-background font-bold text-xl">W</span>
          </div>
          <span className="text-2xl font-bold font-syne tracking-tight text-jade">Waptrix</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-0.5 mt-4 overflow-y-auto">
        {loading && (
          <div className="space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-card/50 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && navItems.map((item) => {
          const Icon     = item.icon;
          const hasKids  = !!item.children?.length;
          const isOpen   = expanded[item.href] ?? false;
          const isActive = hasKids
            ? (pathname === item.href || item.children!.some(c => pathname.startsWith(c.href)))
            : item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          if (hasKids) {
            return (
              <div key={item.href}>
                {/* Parent row — clicking toggles submenu */}
                <button
                  onClick={() => toggleExpand(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                    isActive
                      ? "bg-jade/10 text-jade border border-jade/20"
                      : "text-text-muted hover:text-text-primary hover:bg-card"
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-jade" : "group-hover:text-jade transition-colors"}`} />
                  <span className="font-medium flex-1 text-left">{item.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isActive ? "text-jade" : "text-text-muted"}`} />
                </button>

                {/* Children */}
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-3">
                    {item.children!.map(child => {
                      const CIcon      = child.icon;
                      const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
                            childActive
                              ? "bg-jade/10 text-jade"
                              : "text-text-muted hover:text-text-primary hover:bg-card"
                          }`}
                        >
                          <CIcon className={`w-4 h-4 flex-shrink-0 ${childActive ? "text-jade" : "group-hover:text-jade transition-colors"}`} />
                          <span className="font-medium">{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive
                  ? "bg-jade/10 text-jade border border-jade/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                  : "text-text-muted hover:text-text-primary hover:bg-card"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-jade" : "group-hover:text-jade transition-colors"}`} />
              <span className="font-medium flex-1">{item.name}</span>
              {item.badge && unreadCount > 0 && (
                <span className="w-5 h-5 bg-jade text-background text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-text-muted hover:text-red-400 hover:bg-red-500/5 group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {loading ? (
              <Loader2 className="w-4 h-4 text-jade animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-jade" />
            )}
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Plan: {loading ? "..." : tenant?.plan || "Starter"}
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-1.5 mb-2">
            <div
              className="bg-jade h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              style={{ width: `${loading ? 0 : getProgress()}%` }}
            />
          </div>
          <span className="text-[10px] text-text-muted">
            {loading
              ? "Loading usage..."
              : `${tenant?.messages_used.toLocaleString()} / ${tenant?.messages_limit.toLocaleString()} messages used`}
          </span>
        </div>
      </div>
    </aside>
  );
}
