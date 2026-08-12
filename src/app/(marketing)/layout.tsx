"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, MessageSquare, Zap } from "lucide-react";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Docs", href: "/docs" },
  { label: "About", href: "/about" },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080A0F]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-[#080A0F]" />
          </div>
          <span className="font-bold text-lg text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Waptrix
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-[#8896AB] hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[#8896AB] hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-semibold bg-[#10B981] hover:bg-[#34D399] text-[#080A0F] px-4 py-2 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-[#8896AB] hover:text-white p-2"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#0E1117] border-t border-white/5 px-4 py-4 flex flex-col gap-4">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm text-[#8896AB] hover:text-white py-2 border-b border-white/5"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/login" className="text-sm text-center text-[#8896AB] hover:text-white py-2 border border-white/10 rounded-lg">
              Sign in
            </Link>
            <Link href="/pricing" className="text-sm text-center font-semibold bg-[#10B981] text-[#080A0F] py-2 rounded-lg">
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#080A0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#080A0F]" />
              </div>
              <span className="font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>Waptrix</span>
            </Link>
            <p className="text-sm text-[#8896AB] max-w-xs leading-relaxed">
              The professional WhatsApp marketing platform for growing businesses in India.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Product</p>
            <div className="flex flex-col gap-3">
              {[["Features", "/#features"], ["Pricing", "/pricing"], ["Docs", "/docs"], ["Blog", "/blog"]].map(([label, href]) => (
                <Link key={href} href={href} className="text-sm text-[#8896AB] hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Company</p>
            <div className="flex flex-col gap-3">
              {[["About", "/about"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([label, href]) => (
                <Link key={href} href={href} className="text-sm text-[#8896AB] hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Get Started</p>
            <div className="flex flex-col gap-3">
              {[["Sign Up", "/signup"], ["Sign In", "/login"]].map(([label, href]) => (
                <Link key={href} href={href} className="text-sm text-[#8896AB] hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#8896AB]">© {new Date().getFullYear()} Waptrix. All rights reserved.</p>
          <p className="text-xs text-[#8896AB]">Made with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080A0F] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
