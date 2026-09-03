import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingCart, Package, RotateCcw, Star, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "WhatsApp Marketing for E-commerce | Waptrix",
  description:
    "Send order confirmations, abandoned cart reminders, and promotional campaigns on WhatsApp. Boost e-commerce sales with Waptrix  India's bulk WhatsApp marketing software.",
  alternates: { canonical: "https://waptrix.in/whatsapp-for-ecommerce" },
  openGraph: {
    title: "WhatsApp Marketing for E-commerce | Waptrix",
    description:
      "Send order confirmations, abandoned cart reminders, and promotional campaigns on WhatsApp. Boost e-commerce sales with Waptrix.",
    url: "https://waptrix.in/whatsapp-for-ecommerce",
    images: [{ url: "/featured.png", width: 1200, height: 630, alt: "WhatsApp marketing for e-commerce stores India" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WhatsApp Marketing for E-commerce",
  url: "https://waptrix.in/whatsapp-for-ecommerce",
  description: "Send order confirmations, abandoned cart reminders, and bulk promotional campaigns on WhatsApp for your e-commerce store.",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://waptrix.in" },
      { "@type": "ListItem", position: 2, name: "WhatsApp for E-commerce", item: "https://waptrix.in/whatsapp-for-ecommerce" },
    ],
  },
};

const useCases = [
  {
    icon: ShoppingCart,
    title: "Abandoned Cart Recovery",
    desc: "Automatically message customers who left items in their cart. A personalised WhatsApp nudge converts 3-5× better than email.",
  },
  {
    icon: Package,
    title: "Order Confirmations & Tracking",
    desc: "Send instant order confirmed, shipped, and out-for-delivery notifications. Reduce customer support calls by 60%.",
  },
  {
    icon: RotateCcw,
    title: "Return & Refund Updates",
    desc: "Keep buyers informed at every step of their return. Build trust and drive repeat purchases.",
  },
  {
    icon: Star,
    title: "Post-Purchase Review Requests",
    desc: "Trigger a WhatsApp message 2 days after delivery asking for a review. Increase your Google and marketplace ratings.",
  },
];

const results = [
  ["98%", "WhatsApp open rate vs 20% for email"],
  ["3×", "Higher cart recovery than SMS"],
  ["60%", "Drop in 'where is my order?' calls"],
  ["5 min", "Setup time  no developers needed"],
];

export default function EcommercePage() {
  return (
    <div className="bg-[#EDE8DE]">
      {/* Hero */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-4">E-commerce</p>
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#111B21] leading-tight tracking-tight mb-6">
          WhatsApp marketing for e-commerce stores in India.
        </h1>
        <p className="text-lg text-[#667781] max-w-2xl mx-auto leading-relaxed mb-10">
          Recover abandoned carts, send order updates, and run promotional broadcasts  all via the official <strong className="text-[#111B21]">WhatsApp Business API</strong>. Used by Shopify, WooCommerce, and direct-to-consumer brands across India.
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
              Everything an e-commerce store needs on WhatsApp
            </h2>
            <p className="text-[#667781] mt-4 max-w-xl mx-auto">
              Waptrix is the <strong>bulk WhatsApp marketing software</strong> built for Indian online sellers. Set up once, automate forever.
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

      {/* How it works */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-[#111B21] text-center mb-12 tracking-tight">
            Set up WhatsApp for your store in 3 steps
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { n: "01", t: "Connect your number", d: "Link your WhatsApp Business number via the official Meta Cloud API. No technical skills needed." },
              { n: "02", t: "Create message templates", d: "Build order confirmation, cart recovery, and promo templates. Get Meta approval in 24 hours." },
              { n: "03", t: "Automate & broadcast", d: "Set triggers for cart abandonment and order events, or send bulk promotional campaigns to your list." },
            ].map((s) => (
              <div key={s.n}>
                <div className="text-5xl font-extrabold text-[#25D366]/20 mb-3">{s.n}</div>
                <h3 className="font-bold text-[#111B21] text-lg mb-2">{s.t}</h3>
                <p className="text-sm text-[#667781] leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#075E54] py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
            Start recovering carts on WhatsApp today.
          </h2>
          <p className="text-[#D9FDD3] mb-8">7-day free trial. No credit card. Setup in 5 minutes.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-8 py-4 rounded-full hover:bg-white transition-all text-base">
            Get started free <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-8">
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
