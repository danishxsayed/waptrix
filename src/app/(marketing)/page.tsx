import Link from "next/link";
import {
  MessageSquare, Send, Users, BarChart3, Bot, Shield,
  CheckCircle, ArrowRight, Zap, Globe, Clock, Star,
  Smartphone, Inbox, FileText
} from "lucide-react";

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#10B981]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3 h-3" />
          Official WhatsApp Business API Platform
        </div>

        <h1
          className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Scale Your Business with{" "}
          <span className="text-[#10B981]">WhatsApp Marketing</span>
        </h1>

        <p className="text-lg text-[#8896AB] max-w-2xl mx-auto mb-10 leading-relaxed">
          Send bulk campaigns, manage customer conversations, automate replies,
          and track every message — all from one powerful platform built for
          Indian businesses.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#34D399] text-[#080A0F] font-bold px-8 py-3.5 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] text-sm"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-2 border border-[#273042] hover:border-[#10B981]/50 text-[#8896AB] hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-sm"
          >
            View Pricing
          </Link>
        </div>

        <p className="text-xs text-[#8896AB] mt-4">No credit card required · Setup in 5 minutes</p>
      </div>

      {/* Dashboard mockup */}
      <div className="max-w-5xl mx-auto mt-16 relative">
        <div className="bg-[#0E1117] border border-[#273042] rounded-2xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
          {/* Fake browser chrome */}
          <div className="bg-[#161B26] border-b border-[#273042] px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#F43F5E]/60" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
              <div className="w-3 h-3 rounded-full bg-[#10B981]/60" />
            </div>
            <div className="flex-1 bg-[#0E1117] rounded-md px-3 py-1 text-xs text-[#8896AB]">
              app.waptrix.in/dashboard
            </div>
          </div>
          {/* Fake dashboard */}
          <div className="p-6 grid grid-cols-3 gap-4">
            {[
              { label: "Messages Sent", value: "24,892", color: "#10B981" },
              { label: "Delivered", value: "23,104", color: "#0EA5E9" },
              { label: "Read Rate", value: "78.4%", color: "#F59E0B" },
            ].map((s) => (
              <div key={s.label} className="bg-[#161B26] border border-[#273042] rounded-xl p-4">
                <p className="text-xs text-[#8896AB] mb-1">{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "var(--font-syne)" }}>{s.value}</p>
              </div>
            ))}
            <div className="col-span-3 bg-[#161B26] border border-[#273042] rounded-xl p-4 flex items-end gap-1 h-24">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-[#10B981]/20 rounded-sm relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[#10B981] rounded-sm"
                    style={{ height: `${h}%`, opacity: 0.6 + i * 0.03 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { value: "10M+", label: "Messages sent" },
    { value: "2,500+", label: "Businesses trust us" },
    { value: "99.9%", label: "Platform uptime" },
    { value: "< 2s", label: "Average delivery time" },
  ];

  return (
    <section className="border-y border-white/5 py-14 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-3xl font-bold text-[#10B981] mb-1" style={{ fontFamily: "var(--font-syne)" }}>{s.value}</p>
            <p className="text-sm text-[#8896AB]">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: Send,
      title: "Bulk Campaigns",
      desc: "Reach thousands of customers in minutes with personalised WhatsApp campaigns. Schedule, segment, and track every message.",
    },
    {
      icon: Inbox,
      title: "Unified Inbox",
      desc: "Manage all customer conversations in one place. Assign chats, add internal notes, and never miss a message.",
    },
    {
      icon: Bot,
      title: "Smart Automation",
      desc: "Set up auto-replies, keyword triggers, and drip sequences. Let your business run 24/7 without manual effort.",
    },
    {
      icon: FileText,
      title: "Template Manager",
      desc: "Create and manage WhatsApp-approved message templates with images, buttons, and personalised variables.",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      desc: "Track sent, delivered, read, and reply rates. Understand what works and optimise your campaigns.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      desc: "Invite your sales and support team, assign roles, and collaborate in a shared team chat.",
    },
    {
      icon: Shield,
      title: "Official API",
      desc: "Built on the official Meta WhatsApp Business API — no risk of bans, full compliance guaranteed.",
    },
    {
      icon: Globe,
      title: "Multi-language",
      desc: "Send templates in any language supported by WhatsApp including Hindi, Tamil, Telugu, and more.",
    },
  ];

  return (
    <section id="features" className="py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#10B981] text-sm font-semibold uppercase tracking-wider mb-3">Everything you need</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>
            One platform, every WhatsApp tool
          </h2>
          <p className="text-[#8896AB] mt-4 max-w-xl mx-auto">
            Stop juggling spreadsheets and manual messages. Waptrix brings everything into one clean dashboard.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-[#0E1117] border border-[#273042] hover:border-[#10B981]/30 rounded-2xl p-5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center mb-4 group-hover:bg-[#10B981]/20 transition-colors">
                <f.icon className="w-5 h-5 text-[#10B981]" />
              </div>
              <h3 className="font-semibold text-white mb-2 text-sm" style={{ fontFamily: "var(--font-syne)" }}>{f.title}</h3>
              <p className="text-xs text-[#8896AB] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Connect your WhatsApp",
      desc: "Link your WhatsApp Business number using the official Meta API. Setup takes under 5 minutes.",
    },
    {
      num: "02",
      title: "Import your contacts",
      desc: "Upload your contact list via CSV or add contacts manually. Segment them for targeted campaigns.",
    },
    {
      num: "03",
      title: "Create & send campaigns",
      desc: "Design a message template, select your audience, and launch. Track results in real time.",
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 bg-[#0E1117]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#10B981] text-sm font-semibold uppercase tracking-wider mb-3">Simple setup</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Up and running in minutes
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#10B981]/40 to-transparent z-0" />
              )}
              <div className="relative z-10">
                <div className="text-4xl font-bold text-[#10B981]/20 mb-4" style={{ fontFamily: "var(--font-syne)" }}>{s.num}</div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: "var(--font-syne)" }}>{s.title}</h3>
                <p className="text-sm text-[#8896AB] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const reviews = [
    {
      name: "Ravi Mehta",
      role: "Owner, Mehta Electronics",
      review: "We send 5,000 messages every week for our offers. Waptrix made it effortless. Our sales jumped 35% in the first month.",
      stars: 5,
    },
    {
      name: "Priya Sharma",
      role: "Marketing Head, FreshBasket",
      review: "The inbox feature is a game changer. Our support team now handles 3x more queries with the same headcount.",
      stars: 5,
    },
    {
      name: "Ajay Nair",
      role: "Founder, TravelEasy",
      review: "Campaign analytics are crystal clear. We know exactly which messages convert and which don't. Best ROI tool we've used.",
      stars: 5,
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#10B981] text-sm font-semibold uppercase tracking-wider mb-3">Loved by businesses</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-syne)" }}>
            What our customers say
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div key={r.name} className="bg-[#0E1117] border border-[#273042] rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: r.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <p className="text-sm text-[#8896AB] leading-relaxed mb-5">"{r.review}"</p>
              <div>
                <p className="text-sm font-semibold text-white">{r.name}</p>
                <p className="text-xs text-[#8896AB]">{r.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-gradient-to-br from-[#10B981]/10 to-[#0EA5E9]/5 border border-[#10B981]/20 rounded-3xl p-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-syne)" }}>
            Ready to grow with WhatsApp?
          </h2>
          <p className="text-[#8896AB] mb-8 leading-relaxed">
            Join 2,500+ Indian businesses already using Waptrix to reach their customers directly on WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-[#10B981] hover:bg-[#34D399] text-[#080A0F] font-bold px-8 py-3.5 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] text-sm"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="text-sm text-[#8896AB] hover:text-white transition-colors px-4 py-3.5"
            >
              Talk to sales →
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8">
            {["No credit card required", "14-day free trial", "Cancel anytime"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-[#8896AB]">
                <CheckCircle className="w-3 h-3 text-[#10B981]" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
    </>
  );
}
