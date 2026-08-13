"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

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

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E9EDEF]">
      <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <WaptrixLogo />
          <span className="font-bold text-[#111B21] text-lg tracking-tight">Waptrix</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 text-sm text-[#667781] hover:text-[#111B21] font-medium transition-colors rounded-lg hover:bg-[#EDE8DE]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <Link
            href="/login"
            className="flex items-center gap-1 border-2 border-[#111B21] text-[#111B21] text-sm font-bold px-5 py-2 rounded-full hover:bg-[#111B21] hover:text-white transition-all"
          >
            Log In <span className="text-xs">›</span>
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-1 bg-[#25D366] text-[#111B21] text-sm font-bold px-5 py-2 rounded-full hover:bg-[#128C7E] hover:text-white transition-all"
          >
            Get Started <span className="text-xs">›</span>
          </Link>
        </div>

        {/* Mobile */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-[#667781]">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-[#E9EDEF] px-6 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-3 px-3 text-sm text-[#667781] hover:text-[#111B21] font-medium border-b border-[#E9EDEF] last:border-0"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-4">
            <Link href="/login" className="text-center border-2 border-[#111B21] text-[#111B21] font-bold py-2.5 rounded-full text-sm">Log In</Link>
            <Link href="/pricing" className="text-center bg-[#25D366] text-[#111B21] font-bold py-2.5 rounded-full text-sm">Get Started</Link>
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
    { title: "Support",  links: [["Help Centre", "/docs"], ["Email Support", "mailto:support@waptrix.in"], ["WhatsApp Us", "https://wa.me/919999999999"]] },
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
  return (
    <div className="min-h-screen bg-[#EDE8DE] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-[68px]">{children}</main>
      <Footer />
    </div>
  );
}
