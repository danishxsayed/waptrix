import Link from "next/link";
import {
  Send, MessageSquare, Users, BarChart3, Bot, Shield,
  CheckCircle, ArrowRight, Inbox, FileText, Zap
} from "lucide-react";

/* ── Hero ── full-width campaign-style section like WA.com ─────────────────── */
function Hero() {
  return (
    <section className="relative bg-[#EDE8DE] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-32">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: text */}
          <div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[#111B21] leading-[1.05] mb-6 tracking-tight">
              Reach every customer on WhatsApp.
            </h1>
            <p className="text-lg text-[#667781] mb-10 leading-relaxed max-w-md">
              Send bulk campaigns, manage inbound conversations, automate responses, and track every message all in one platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-7 py-3.5 rounded-full hover:bg-[#128C7E] hover:text-white transition-all text-sm shadow-lg shadow-[#25D366]/25"
              >
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-2 border-2 border-[#111B21] text-[#111B21] font-bold px-7 py-3.5 rounded-full hover:bg-[#111B21] hover:text-white transition-all text-sm"
              >
                View pricing
              </Link>
            </div>
            <p className="text-xs text-[#667781] mt-4">No credit card required · Setup in 5 minutes</p>
          </div>

          {/* Right: person image + floating chat bubbles */}
          <div className="relative h-[340px] sm:h-[420px] md:h-[520px]">

            {/* Person photo — behind everything */}
            <img
              src="/hero-bg.png"
              alt="Waptrix user"
              className="absolute bottom-0 right-0 h-full w-auto object-contain object-bottom select-none pointer-events-none"
              style={{ zIndex: 0 }}
            />

            {/* ── Outbound bubbles (green) — left column ── */}
            {[
              { text: "Order confirmed! ✅", time: "11:59", x: "18%", y: "6%", delay: 0 },
              { text: "Your AMC is due 📅", time: "11:59", x: "0%", y: "27%", delay: 0.5 },
              { text: "50% off this week 🎉", time: "11:59", x: "0%", y: "50%", delay: 1 },
              { text: "Campaign sent to 5,000 🚀", time: "11:59", x: "0%", y: "72%", delay: 1.5 },
            ].map((b, i) => (
              <div
                key={`out-${i}`}
                className="absolute animate-float"
                style={{ left: b.x, top: b.y, zIndex: 10, animationDelay: `${b.delay}s`, animationDuration: `${3.2 + i * 0.4}s` }}
              >
                <div className="bg-[#D9FDD3] text-[#111B21] px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl shadow-md text-[10px] md:text-xs font-medium flex items-end gap-1 md:gap-1.5 whitespace-nowrap">
                  <span>{b.text}</span>
                  <span className="text-[#667781] text-[9px] md:text-[10px] flex-shrink-0">{b.time}</span>
                </div>
              </div>
            ))}

            {/* ── Inbound bubbles (white) — right of center, near person ── */}
            {[
              { text: "Hello! How can I help?", time: "11:59", x: "68%", y: "30%", delay: 0.3 },
              { text: "Message delivered ✓✓", time: "11:59", x: "68%", y: "58%", delay: 0.9 },
            ].map((b, i) => (
              <div
                key={`in-${i}`}
                className="absolute animate-float"
                style={{ left: b.x, top: b.y, zIndex: 10, animationDelay: `${b.delay}s`, animationDuration: `${3.5 + i * 0.6}s` }}
              >
                <div className="bg-white text-[#111B21] px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl shadow-md text-[10px] md:text-xs font-medium flex items-end gap-1 md:gap-1.5 whitespace-nowrap">
                  <span>{b.text}</span>
                  <span className="text-[#667781] text-[9px] md:text-[10px] flex-shrink-0">{b.time}</span>
                </div>
              </div>
            ))}

            {/* ── Stats card — top-right, clear of all bubbles ── */}
            <div
              className="absolute top-3 right-0 bg-white rounded-xl md:rounded-2xl shadow-xl p-3 md:p-4 w-40 md:w-52"
              style={{ zIndex: 20 }}
            >
              <p className="text-[10px] md:text-[11px] text-[#667781] mb-1.5 md:mb-2 font-semibold uppercase tracking-wide">Campaign sent</p>
              <div className="flex justify-between text-center mb-2 md:mb-3">
                {[["5,000", "Sent"], ["4,823", "Delivered"], ["78%", "Read"]].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-xs md:text-sm font-bold text-[#111B21]">{v}</p>
                    <p className="text-[9px] md:text-[10px] text-[#667781]">{l}</p>
                  </div>
                ))}
              </div>
              <div className="h-1 md:h-1.5 bg-[#EDE8DE] rounded-full overflow-hidden">
                <div className="h-full w-[78%] bg-[#25D366] rounded-full" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Stats ── centered big numbers, cream bg ────────────────────────────────── */
function Stats() {
  return (
    <section className="bg-white border-y border-[#E9EDEF] py-16">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          ["Official", "WhatsApp Business API"],
          ["5 min", "Setup time"],
          ["Free", "Trial no card needed"],
          ["24/7", "Support & onboarding"],
        ].map(([v, l]) => (
          <div key={l}>
            <p className="text-4xl font-extrabold text-[#25D366] mb-1 tracking-tight">{v}</p>
            <p className="text-sm text-[#667781] font-medium">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Section: floating bubbles + big text (like WA.com second section) ──────── */
function FloatingTextSection() {
  return (
    <section className="bg-[#EDE8DE] py-28 px-6 relative overflow-hidden">
      {/* Scattered profile circles + bubbles */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {[
          { img: "/waptrix%20profiles/1.png", r: 48, x: "8%", y: "12%" },
          { img: "/waptrix%20profiles/2.png", r: 40, x: "82%", y: "8%" },
          { img: "/waptrix%20profiles/3.png", r: 44, x: "5%", y: "72%" },
          { img: "/waptrix%20profiles/4.png", r: 36, x: "88%", y: "68%" },
          { img: "/waptrix%20profiles/5.png", r: 32, x: "45%", y: "5%" },
          { img: "/waptrix%20profiles/6.png", r: 38, x: "78%", y: "85%" },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full overflow-hidden border-2 border-white shadow-md bg-white"
            style={{ width: c.r, height: c.r, left: c.x, top: c.y }}
          >
            <img
              src={c.img}
              alt={`Profile ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Mini chat bubbles */}
        {[
          { msg: "नमस्ते! 👋", x: "12%", y: "30%", green: false },
          { msg: "مرحبا", x: "74%", y: "20%", green: true },
          { msg: "Hello! 👋", x: "60%", y: "72%", green: true },
          { msg: "Hola! 😊", x: "18%", y: "65%", green: false },
          { msg: "வணக்கம்", x: "40%", y: "82%", green: true },
        ].map((b, i) => (
          <div
            key={i}
            className="absolute px-3 py-1.5 rounded-xl shadow text-xs font-medium flex items-end gap-1"
            style={{
              left: b.x, top: b.y,
              background: b.green ? "#D9FDD3" : "white",
              color: "#111B21",
            }}
          >
            {b.msg}
            <span className="text-[#667781] text-[10px]">11:59</span>
          </div>
        ))}
      </div>

      {/* Central text */}
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-6xl font-extrabold text-[#111B21] leading-tight tracking-tight">
          With Waptrix, your business never misses a customer message.
        </h2>
      </div>
    </section>
  );
}

/* ── Feature split sections ─────────────────────────────────────────────────── */
function FeatureSection({
  tag, title, desc, learnMore, mockup, reverse = false,
}: {
  tag: string; title: string; desc: string; learnMore: string;
  mockup: React.ReactNode; reverse?: boolean;
}) {
  return (
    <section className={`bg-[#EDE8DE] py-28 px-6`}>
      <div className={`max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center ${reverse ? "md:flex-row-reverse" : ""}`}>
        <div className={reverse ? "md:order-2" : ""}>
          {mockup}
        </div>
        <div className={reverse ? "md:order-1" : ""}>
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">{tag}</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#111B21] leading-tight mb-5 tracking-tight">
            {title}
          </h2>
          <p className="text-[#667781] text-base leading-relaxed mb-6">{desc}</p>
          <Link
            href={learnMore}
            className="inline-flex items-center gap-1 text-[#111B21] font-bold text-sm border-b-2 border-[#25D366] pb-0.5 hover:text-[#25D366] transition-colors"
          >
            Learn more <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Campaign Mockup ─────────────────────────────────────────────────────────── */
function CampaignMockup() {
  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E9EDEF]">
      <div className="bg-[#075E54] px-5 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
          <Send className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white text-xs font-semibold">Summer Sale Campaign</p>
          <p className="text-[#D9FDD3] text-[10px]">5,000 recipients</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="bg-[#EDE8DE] rounded-xl p-3">
          <p className="text-xs text-[#111B21] font-medium mb-1">📢 Big Sale Alert!</p>
          <p className="text-xs text-[#667781]">Hello Rahul, get 50% off on all products this weekend only. Use code SAVE50 at checkout!</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button className="text-[10px] font-bold text-[#128C7E] border border-[#25D366]/30 rounded-lg py-1.5">Shop Now</button>
            <button className="text-[10px] font-bold text-[#128C7E] border border-[#25D366]/30 rounded-lg py-1.5">Learn More</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center pt-2">
          {[["4,823", "✓✓ Delivered", "#25D366"], ["3,920", "👁 Read", "#128C7E"], ["342", "↩ Replied", "#075E54"]].map(([v, l, c]) => (
            <div key={l} className="bg-[#EDE8DE] rounded-xl p-2">
              <p className="text-sm font-bold" style={{ color: c }}>{v}</p>
              <p className="text-[10px] text-[#667781]">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Inbox Mockup ────────────────────────────────────────────────────────────── */
function InboxMockup() {
  const chats = [
    { name: "Rahul M.", msg: "Thanks for the update!", time: "11:59", unread: 2 },
    { name: "Priya S.", msg: "When will my order arrive?", time: "11:45", unread: 0 },
    { name: "Ajay N.", msg: "Great service! 👍", time: "10:32", unread: 1 },
    { name: "Meera K.", msg: "Can I reschedule?", time: "09:15", unread: 0 },
  ];
  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E9EDEF]">
      <div className="bg-[#075E54] px-5 py-3">
        <p className="text-white font-bold text-sm">Waptrix Inbox</p>
        <p className="text-[#D9FDD3] text-[10px]">4 active conversations</p>
      </div>
      <div className="divide-y divide-[#E9EDEF]">
        {chats.map((c) => (
          <div key={c.name} className="flex items-center gap-3 px-4 py-3 hover:bg-[#EDE8DE] cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {c.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-[#111B21] truncate">{c.name}</p>
                <p className="text-[10px] text-[#667781] flex-shrink-0 ml-2">{c.time}</p>
              </div>
              <p className="text-[10px] text-[#667781] truncate">{c.msg}</p>
            </div>
            {c.unread > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#25D366] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                {c.unread}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Features grid ───────────────────────────────────────────────────────────── */
function Features() {
  const feats = [
    { icon: Send, title: "Bulk Campaigns", desc: "Reach thousands with personalised WhatsApp messages in one click." },
    { icon: Inbox, title: "Unified Inbox", desc: "All conversations in one place. Assign, reply, and resolve." },
    { icon: Bot, title: "Automation", desc: "Keyword triggers, auto-replies, and drip sequences — 24/7." },
    { icon: FileText, title: "Template Manager", desc: "Create Meta-approved templates with images, variables, and buttons." },
    { icon: BarChart3, title: "Live Analytics", desc: "Sent, delivered, read, replied — tracked in real time." },
    { icon: Users, title: "Team Access", desc: "Invite your team, set roles, collaborate in team chat." },
    { icon: Shield, title: "Official API", desc: "Built on Meta's official WhatsApp Business API. Zero ban risk." },
    { icon: Zap, title: "Instant Setup", desc: "Connect your number and send your first campaign in 5 minutes." },
  ];

  return (
    <section id="features" className="bg-white py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#111B21] tracking-tight">One platform for all of WhatsApp</h2>
          <p className="text-[#667781] mt-4 max-w-xl mx-auto">Stop managing conversations in your phone. Waptrix brings every WhatsApp business tool into your browser.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {feats.map((f) => (
            <div key={f.title} className="bg-[#EDE8DE] hover:bg-[#D9FDD3] rounded-2xl p-5 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[#25D366]" />
              </div>
              <h3 className="font-bold text-[#111B21] mb-1.5 text-sm">{f.title}</h3>
              <p className="text-xs text-[#667781] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works ────────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n: "01", title: "Connect your number", desc: "Link your WhatsApp Business account via the official Meta API in under 5 minutes." },
    { n: "02", title: "Import your contacts", desc: "Upload via CSV or add contacts manually. Segment by any criteria." },
    { n: "03", title: "Launch campaigns", desc: "Pick a template, choose your audience, and hit send. Track results live." },
  ];

  return (
    <section className="bg-[#EDE8DE] py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">Simple setup</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#111B21] tracking-tight">Up and running in minutes</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              {i < 2 && <div className="hidden md:block absolute top-7 left-full w-full h-px bg-[#25D366]/30" />}
              <div className="text-6xl font-extrabold text-[#25D366]/20 mb-4 tracking-tight">{s.n}</div>
              <h3 className="font-bold text-[#111B21] text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-[#667781] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ────────────────────────────────────────────────────────────── */
function Testimonials() {
  const reviews = [
    { name: "Ravi Mehta", role: "Owner, Mehta Electronics", text: "We send 5,000 messages every week for our offers. Waptrix made it effortless. Sales jumped 35% in the first month." },
    { name: "Priya Sharma", role: "Marketing Head, FreshBasket", text: "The inbox is a game changer. Our support team handles 3x more queries with the same headcount." },
    { name: "Ajay Nair", role: "Founder, TravelEasy", text: "Campaign analytics are crystal clear. Best ROI tool we've used. Know exactly what converts." },
  ];

  return (
    <section className="bg-white py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">Loved by businesses</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#111B21] tracking-tight">What our customers say</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div key={r.name} className="bg-[#EDE8DE] rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-[#25D366] text-sm">★</span>
                ))}
              </div>
              <p className="text-sm text-[#111B21] leading-relaxed mb-5">"{r.text}"</p>
              <div>
                <p className="text-sm font-bold text-[#111B21]">{r.name}</p>
                <p className="text-xs text-[#667781]">{r.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges in Cards format */}
        <div className="mt-16 grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="bg-[#D9FDD3]/30 border-2 border-[#25D366]/30 rounded-2xl p-6 flex flex-col items-center text-center hover:-translate-y-1.5 hover:shadow-lg hover:shadow-[#25D366]/10 transition-all duration-300 cursor-default">
            <img
              src="/meta.png"
              alt="Meta Business Partners"
              className="h-7 object-contain mb-3 select-none"
            />
            <h3 className="font-extrabold text-[#111B21] text-sm mb-1">Meta Business Partners</h3>
            <p className="text-xs text-[#667781] leading-relaxed">
              Official integration complying with Meta's developer security and quality standards.
            </p>
          </div>
          <div className="bg-[#D9FDD3]/30 border-2 border-[#25D366]/30 rounded-2xl p-6 flex flex-col items-center text-center hover:-translate-y-1.5 hover:shadow-lg hover:shadow-[#25D366]/10 transition-all duration-300 cursor-default">
            <img
              src="/Whatsapp.png"
              alt="Official WhatsApp Business API"
              className="h-12 object-contain mb-3 select-none"
            />
            <h3 className="font-extrabold text-[#111B21] text-sm mb-1">Official WhatsApp Business API</h3>
            <p className="text-xs text-[#667781] leading-relaxed">
              Direct connection with Meta Cloud API for high throughput and zero subscription ban risk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA ─────────────────────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className="bg-[#075E54] py-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6" style={{ color: 'white' }}>
          Ready to grow with WhatsApp?
        </h2>
        <p className="text-[#D9FDD3] text-lg mb-10 leading-relaxed">
          Start reaching your customers directly on WhatsApp with Waptrix.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-8 py-4 rounded-full hover:bg-white transition-all text-base shadow-lg"
          >
            Start free trial <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/contact"
            className="text-[#D9FDD3] hover:text-white font-medium transition-colors text-sm"
          >
            Talk to sales →
          </Link>
        </div>
        <div className="flex items-center justify-center gap-8 mt-10">
          {["No credit card", "14-day free trial", "Cancel anytime"].map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-xs text-[#D9FDD3]">
              <CheckCircle className="w-3.5 h-3.5" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Stats />
      <FloatingTextSection />

      <FeatureSection
        tag="Campaigns"
        title="Send to thousands. Feel like one."
        desc="Design personalised WhatsApp campaigns with images, buttons, and custom variables. Schedule ahead, track every metric live."
        learnMore="/#features"
        mockup={<CampaignMockup />}
      />

      <FeatureSection
        tag="Inbox"
        title="Every conversation, one place."
        desc="Manage all inbound and outbound WhatsApp messages in a unified inbox. Assign to team members, add internal notes, and never miss a customer."
        learnMore="/#features"
        mockup={<InboxMockup />}
        reverse
      />

      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
    </>
  );
}
