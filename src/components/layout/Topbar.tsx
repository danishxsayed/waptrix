"use client";

import { Bell, Search, User } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Topbar() {
  const pathname = usePathname();
  
  // Format pathname for title
  const getTitle = () => {
    if (pathname === "/") return "Dashboard Overview";
    const path = pathname.split("/").filter(Boolean)[0];
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header className="h-20 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-10">
      <div>
        <h1 className="text-2xl font-bold font-syne text-text-primary tracking-tight">
          {getTitle()}
        </h1>
        <p className="text-xs text-text-muted mt-0.5">Welcome back, Danish 👋</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="input-field pl-10 w-64 text-sm"
          />
        </div>

        <button className="relative p-2 text-text-muted hover:text-jade transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-jade rounded-full border-2 border-surface"></span>
        </button>

        <div className="h-8 w-[1px] bg-border mx-2"></div>

        <button className="flex items-center gap-3 pl-2 pr-4 py-2 hover:bg-card rounded-xl transition-all border border-transparent hover:border-border group">
          <div className="w-9 h-9 bg-surface border border-border rounded-lg flex items-center justify-center group-hover:bg-card">
            <User className="w-5 h-5 text-text-muted group-hover:text-jade transition-colors" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-text-primary">Danish Sayed</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Pro Account</p>
          </div>
        </button>
      </div>
    </header>
  );
}
