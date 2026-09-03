import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, Bell, RefreshCw, MessageSquare, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "WhatsApp for Clinics & AMC Reminders | Waptrix",
  description:
    "Send appointment reminders, AMC renewal alerts, and health tips to patients via WhatsApp. Reduce no-shows by 40%. Built for Indian clinics, hospitals, and service businesses.",
  alternates: { canonical: "https://waptrix.in/whatsapp-for-clinics" },
  openGraph: {
    title: "WhatsApp for Clinics & AMC Reminders | Waptrix",
    description:
      "Send appointment reminders, AMC renewal alerts, and health tips to patients via WhatsApp. Reduce no-shows by 40%.",
    url: "https://waptrix.in/whatsapp-for-clinics",
    images: [{ url: "/featured.png", width: 1200, height: 630, alt: "WhatsApp appointment reminders for clinics India" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WhatsApp for Clinics & AMC Reminders",
  url: "https://waptrix.in/whatsapp-for-clinics",
  description: "Send appointment reminders, AMC renewal alerts, and follow-up messages to patients via WhatsApp Business API.",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://waptrix.in" },
      { "@type": "ListItem", position: 2, name: "WhatsApp for Clinics", item: "https://waptrix.in/whatsapp-for-clinics" },
    ],
  },
};

const useCases = [
  {
    icon: Calendar,
    title: "Appointment Reminders",
    desc: "Auto-send appointment confirmation and a reminder 24 hours before. Reduce no-shows by up to 40%.",
  },
  {
    icon: Bell,
    title: "AMC & Service Renewal Alerts",
    desc: "Remind customers when their Annual Maintenance Contract is due. Works for AC, RO, CCTV, elevator, and any service business.",
  },
  {
    icon: RefreshCw,
    title: "Follow-up Messages",
    desc: "Send post-visit follow-ups and medication reminders. Build patient loyalty and drive repeat visits.",
  },
  {
    icon: MessageSquare,
    title: "Health Tips Broadcast",
    desc: "Send weekly health tips or seasonal alerts to your full patient list. Keep your clinic top-of-mind year-round.",
  },
];

const results = [
  ["40%", "Fewer no-shows with WhatsApp reminders"],
  ["98%", "Open rate  patients actually read it"],
  ["2×", "More AMC renewals vs calling"],
  ["5 min", "Setup  no IT team needed"],
];

export default function ClinicsPage() {
  return (
    <div className="bg-[#EDE8DE]">
      {/* Hero */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-4">Clinics & Service Businesses</p>
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#111B21] leading-tight tracking-tight mb-6">
          WhatsApp appointment reminders and AMC alerts for Indian businesses.
        </h1>
        <p className="text-lg text-[#667781] max-w-2xl mx-auto leading-relaxed mb-10">
          Stop losing patients and service customers to no-shows and missed renewals. Waptrix sends automated WhatsApp reminders via the official <strong className="text-[#111B21]">WhatsApp Business API</strong>  for clinics, diagnostic labs, AC service centres, RO dealers, and more.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-7 py-3.5 rounded-full hover:bg-[#128C7E] hover:text-white transition-all text-sm shadow-lg">
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/pricing" className="inline-flex items-center gap-2 border-2 border-[#111B21] text-[#111B21] font-bold px-7 py-3.5 rounded-full hover:bg-[#111B21] hover:text-white transition-all text-sm">
            View pricing
          </Link>
        </div>
      </section>

      {/* Results strip */}
      <section className="bg-white border-y border-[#E9EDEF] py-14 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {results.map(([v, l]) => (
            <div key={l}>
              <p className="text-3xl font-extrabold text-[#25D366] mb-1">{v}</p>
              <p className="text-sm text-[#667781]">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-[#111B21] tracking-tight">
              WhatsApp automation built for service businesses
            </h2>
            <p className="text-[#667781] mt-4 max-w-xl mx-auto">
              Whether you run a clinic or an AMC-based service business, Waptrix handles your <strong>WhatsApp broadcast</strong> reminders automatically.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {useCases.map((u) => (
              <div key={u.title} className="bg-white rounded-2xl p-6 border border-[#E9EDEF]">
                <div className="w-10 h-10 rounded-xl bg-[#D9FDD3] flex items-center justify-center mb-4">
                  <u.icon className="w-5 h-5 text-[#075E54]" />
                </div>
                <h3 className="font-bold text-[#111B21] mb-2">{u.title}</h3>
                <p className="text-sm text-[#667781] leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample messages */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-[#111B21] text-center mb-12 tracking-tight">
            What your WhatsApp messages look like
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                label: "Appointment Reminder",
                msg: "Hi Ramesh! 👋 Your appointment with Dr. Sharma is confirmed for tomorrow, 11:00 AM. Reply CONFIRM or call us at 9876543210 to reschedule.",
              },
              {
                label: "AMC Renewal Alert",
                msg: "Hello! Your AC Annual Maintenance Contract expires on 15 Oct. Renew now for ₹1,499 and get priority service. Reply YES to confirm your renewal.",
              },
            ].map((m) => (
              <div key={m.label} className="bg-[#EDE8DE] rounded-2xl p-5">
                <p className="text-xs font-bold text-[#25D366] uppercase tracking-wider mb-3">{m.label}</p>
                <div className="bg-[#D9FDD3] rounded-xl p-4 text-sm text-[#111B21] leading-relaxed">
                  {m.msg}
                  <p className="text-[#667781] text-[10px] mt-2 text-right">11:59 ✓✓</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#075E54] py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
            Stop losing customers to missed reminders.
          </h2>
          <p className="text-[#D9FDD3] mb-8">7-day free trial. No credit card. Setup in 5 minutes.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-8 py-4 rounded-full hover:bg-white transition-all text-base">
            Get started free <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {["Official WhatsApp Business API", "Zero ban risk", "Cancel anytime"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-[#D9FDD3]">
                <CheckCircle className="w-3.5 h-3.5" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
