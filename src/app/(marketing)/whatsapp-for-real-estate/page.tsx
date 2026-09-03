import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home, Users, Bell, BarChart3, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "WhatsApp Marketing for Real Estate Agents | Waptrix",
  description:
    "Share property listings, follow up with leads, and send site visit reminders on WhatsApp. India's best WhatsApp broadcast tool for real estate agents and developers.",
  alternates: { canonical: "https://waptrix.in/whatsapp-for-real-estate" },
  openGraph: {
    title: "WhatsApp Marketing for Real Estate Agents | Waptrix",
    description:
      "Share property listings, follow up with leads, and send site visit reminders on WhatsApp. India's WhatsApp broadcast tool for real estate.",
    url: "https://waptrix.in/whatsapp-for-real-estate",
    images: [{ url: "/featured.png", width: 1200, height: 630, alt: "WhatsApp marketing for real estate agents India" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WhatsApp Marketing for Real Estate",
  url: "https://waptrix.in/whatsapp-for-real-estate",
  description: "Share property listings, send site visit reminders, and follow up with leads via WhatsApp Business API.",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://waptrix.in" },
      { "@type": "ListItem", position: 2, name: "WhatsApp for Real Estate", item: "https://waptrix.in/whatsapp-for-real-estate" },
    ],
  },
};

const useCases = [
  {
    icon: Home,
    title: "Property Listing Broadcasts",
    desc: "Send new listing alerts with images, price, and location to your entire lead database in one click. Reach 10,000 buyers instantly.",
  },
  {
    icon: Users,
    title: "Lead Follow-up Automation",
    desc: "Auto-follow-up with enquiries 24 hours after they contact you. Never let a hot lead go cold again.",
  },
  {
    icon: Bell,
    title: "Site Visit Reminders",
    desc: "Confirm site visit appointments and send a WhatsApp reminder the morning of the visit. Reduce no-shows by 40%.",
  },
  {
    icon: BarChart3,
    title: "Project Launch Campaigns",
    desc: "Send a high-impact launch message with images and a CTA button to your full database when a new project goes live.",
  },
];

const results = [
  ["5×", "More replies vs cold calling"],
  ["98%", "Message open rate"],
  ["40%", "Fewer site visit no-shows"],
  ["1 click", "Send to your full database"],
];

export default function RealEstatePage() {
  return (
    <div className="bg-[#EDE8DE]">
      {/* Hero */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-4">Real Estate</p>
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#111B21] leading-tight tracking-tight mb-6">
          WhatsApp marketing for real estate agents and developers in India.
        </h1>
        <p className="text-lg text-[#667781] max-w-2xl mx-auto leading-relaxed mb-10">
          Share property listings, follow up with leads, and send site visit reminders  all via the official <strong className="text-[#111B21]">WhatsApp Business API</strong>. Used by brokers, builders, and property consultants across India.
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
              Everything a real estate business needs on WhatsApp
            </h2>
            <p className="text-[#667781] mt-4 max-w-xl mx-auto">
              Waptrix is the <strong>WhatsApp broadcast tool</strong> that Indian real estate teams use to close more deals without cold calling.
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

      {/* Sample message */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-[#111B21] mb-10 tracking-tight">
            What your property listing message looks like
          </h2>
          <div className="bg-[#EDE8DE] rounded-2xl p-6 text-left max-w-sm mx-auto">
            <p className="text-xs font-bold text-[#25D366] uppercase tracking-wider mb-3">New Listing Alert</p>
            <div className="bg-[#D9FDD3] rounded-xl p-4 text-sm text-[#111B21] leading-relaxed">
              <p className="font-bold mb-1">🏡 New 3BHK in Whitefield, Bengaluru</p>
              <p className="text-[#667781] text-xs mb-3">₹85 Lakhs · Ready to move · 1,450 sq ft</p>
              <p className="mb-3">Hi Suresh! We have a new listing that matches your requirement. 3BHK, Whitefield, ₹85L. Site visits this weekend.</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="text-[10px] font-bold text-[#128C7E] border border-[#25D366]/30 rounded-lg py-1.5">View Details</button>
                <button className="text-[10px] font-bold text-[#128C7E] border border-[#25D366]/30 rounded-lg py-1.5">Book Visit</button>
              </div>
              <p className="text-[#667781] text-[10px] mt-2 text-right">11:59 ✓✓</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#075E54] py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
            Close more deals with WhatsApp.
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
