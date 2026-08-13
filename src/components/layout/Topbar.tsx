"use client";

import { Search, User, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import NotificationBell from "@/components/layout/NotificationBell";

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
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-[#667781] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search…"
            className="pl-9 pr-4 py-2 bg-[#EDE8DE] border border-[#E9EDEF] rounded-full text-sm text-[#111B21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 w-52 transition-all"
          />
        </div>

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
