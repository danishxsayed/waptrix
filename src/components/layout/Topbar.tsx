"use client";

import { Search, User, Loader2, Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTenant } from "@/context/TenantContext";
import NotificationBell from "@/components/layout/NotificationBell";

export default function Topbar() {
  const pathname = usePathname();
  const { tenant, loading } = useTenant();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Sync with current class on mount
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove("dark");
      html.classList.add("light");
      localStorage.setItem("waptrix-theme", "light");
      setIsDark(false);
    } else {
      html.classList.remove("light");
      html.classList.add("dark");
      localStorage.setItem("waptrix-theme", "dark");
      setIsDark(true);
    }
  };
  
  // Format pathname for title
  const getTitle = () => {
    if (pathname === "/") return "Dashboard Overview";
    const path = pathname.split("/").filter(Boolean)[0];
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  // Get first name for welcome message
  const getFirstName = () => {
    if (!tenant?.name) return "User";
    return tenant.name.split(" ")[0];
  };

  return (
    <header className="h-20 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-10">
      <div>
        <h1 className="text-2xl font-bold font-syne text-text-primary tracking-tight">
          {getTitle()}
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          {loading ? "Loading..." : `Welcome back, ${getFirstName()} 👋`}
        </p>
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

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-card hover:border-jade/30 transition-all text-text-muted hover:text-jade"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <NotificationBell />

        <div className="h-8 w-[1px] bg-border mx-2"></div>

        <button className="flex items-center gap-3 pl-2 pr-4 py-2 hover:bg-card rounded-xl transition-all border border-transparent hover:border-border group">
          <div className="w-9 h-9 bg-surface border border-border rounded-lg flex items-center justify-center group-hover:bg-card">
            {loading ? (
              <Loader2 className="w-5 h-5 text-jade animate-spin" />
            ) : (
              <User className="w-5 h-5 text-text-muted group-hover:text-jade transition-colors" />
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-text-primary">
              {loading ? "Loading..." : tenant?.name || "User"}
            </p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
              {loading ? "..." : `${tenant?.plan || 'Starter'} Account`}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}
