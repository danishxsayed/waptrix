"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Settings2, Receipt } from "lucide-react";

const TABS = [
  { label: "Billing Details",       href: "/billing/details",      icon: Settings2 },
  { label: "Manage Subscription",   href: "/billing/subscription",  icon: CreditCard },
  { label: "Invoices",              href: "/billing/invoices",      icon: Receipt },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Sub-nav tabs */}
      <div className="flex gap-1 mb-8 bg-card border border-border rounded-2xl p-1.5">
        {TABS.map(t => {
          const active = pathname.startsWith(t.href);
          const Icon   = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active
                  ? "bg-[#D9FDD3] text-[#075E54] shadow-sm"
                  : "text-[#667781] hover:text-[#111B21] hover:bg-[#EDE8DE]"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-[#25D366]" : ""}`} />
              {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
