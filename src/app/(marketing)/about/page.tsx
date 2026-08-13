import Link from "next/link";
import { Shield, Zap, Heart, MessageSquare, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-[#EDE8DE]">
      {/* Hero */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-4">Our story</p>
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#111B21] leading-tight tracking-tight mb-6">
          Built in India, for Indian businesses.
        </h1>
        <p className="text-lg text-[#667781] max-w-2xl mx-auto leading-relaxed">
          Waptrix was born out of frustration. We watched thousands of businesses miss WhatsApp's power because the tools were too complex, too expensive, or too unreliable. We decided to build something better.
        </p>
      </section>

      {/* Mission */}
      <section className="bg-[#075E54] py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-4">Our mission</p>
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Make professional WhatsApp marketing accessible to every Indian business — from 5 people to 500.
          </h2>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">
          {[
            { icon: Shield,       title: "Official & Compliant",  desc: "Only the official Meta WhatsApp Business API. No grey-market methods, zero ban risk." },
            { icon: Zap,          title: "Built for Speed",       desc: "Campaign delivery, inbox, and analytics all happen in real time." },
            { icon: Heart,        title: "Customer First",        desc: "Every feature comes from a real customer request. We listen before we build." },
            { icon: MessageSquare, title: "Transparent Pricing",  desc: "No hidden fees, no surprise charges. What you see is what you pay." },
          ].map((v) => (
            <div key={v.title} className="bg-[#EDE8DE] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4">
                <v.icon className="w-5 h-5 text-[#25D366]" />
              </div>
              <h3 className="font-bold text-[#111B21] mb-2">{v.title}</h3>
              <p className="text-sm text-[#667781] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-extrabold text-[#111B21] mb-4 tracking-tight">Want to work with us?</h2>
          <p className="text-[#667781] mb-8">We're always looking for passionate people who believe in what we're building.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-7 py-3.5 rounded-full hover:bg-[#128C7E] hover:text-white transition-all text-sm">
            Get in touch <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
