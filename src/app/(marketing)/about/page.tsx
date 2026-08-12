import Link from "next/link";
import { MessageSquare, Shield, Zap, Heart, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            Our story
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6" style={{ fontFamily: "var(--font-syne)" }}>
            Built in India, for Indian businesses
          </h1>
          <p className="text-[#8896AB] text-lg leading-relaxed max-w-2xl mx-auto">
            Waptrix was born out of frustration. We watched thousands of businesses miss out on WhatsApp's
            power because the tools were too complex, too expensive, or too unreliable.
            We decided to build something better.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-gradient-to-br from-[#10B981]/10 to-[#0EA5E9]/5 border border-[#10B981]/20 rounded-3xl p-10 mb-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-syne)" }}>Our mission</h2>
          <p className="text-[#8896AB] text-lg leading-relaxed max-w-2xl mx-auto">
            To make professional WhatsApp marketing accessible to every Indian business — from a 5-person
            team to a 500-person enterprise.
          </p>
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-2 gap-6 mb-20">
          {[
            {
              icon: Shield,
              title: "Official & Compliant",
              desc: "We only use the official Meta WhatsApp Business API. No grey-market methods, no risk of bans.",
            },
            {
              icon: Zap,
              title: "Built for Speed",
              desc: "Campaign delivery, inbox responses, and analytics all happen in real time — no delays.",
            },
            {
              icon: Heart,
              title: "Customer First",
              desc: "Every feature we build comes from a real customer request. We listen before we build.",
            },
            {
              icon: MessageSquare,
              title: "Transparent Pricing",
              desc: "No hidden fees, no surprise charges. What you see is what you pay.",
            },
          ].map((v) => (
            <div key={v.title} className="bg-[#0E1117] border border-[#273042] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center mb-4">
                <v.icon className="w-5 h-5 text-[#10B981]" />
              </div>
              <h3 className="font-semibold text-white mb-2" style={{ fontFamily: "var(--font-syne)" }}>{v.title}</h3>
              <p className="text-sm text-[#8896AB] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-syne)" }}>Want to work with us?</h2>
          <p className="text-[#8896AB] mb-6">We're always looking for passionate people who believe in what we're building.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#34D399] text-[#080A0F] font-bold px-6 py-3 rounded-xl transition-all text-sm"
          >
            Get in touch <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
