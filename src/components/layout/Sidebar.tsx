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
  Images
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Send },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Media Library", href: "/media", icon: Images },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Connect", href: "/connect", icon: Link2 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

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

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

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
              <Icon className={`w-5 h-5 ${isActive ? "text-jade" : "group-hover:text-jade transition-colors"}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-jade" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Plan: Pro</span>
          </div>
          <div className="w-full bg-surface rounded-full h-1.5 mb-2">
            <div className="bg-jade h-full rounded-full w-3/4 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
          </div>
          <span className="text-[10px] text-text-muted">7,500 / 10,000 messages used</span>
        </div>
      </div>
    </aside>
  );
}
