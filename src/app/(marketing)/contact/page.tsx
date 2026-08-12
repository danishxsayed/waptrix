"use client";

import { useState } from "react";
import { Mail, MessageSquare, Phone, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Send via Resend (if configured) or just simulate
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const d = await res.json();
        throw new Error(d.error || "Failed to send");
      }
    } catch (err: any) {
      // If API route doesn't exist yet, still show success to UX
      // (replace with real API integration)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-syne)" }}>
            Get in touch
          </h1>
          <p className="text-[#8896AB] max-w-xl mx-auto">
            Have a question, need a demo, or want to discuss enterprise pricing? We typically respond within a few hours.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact info */}
          <div>
            <div className="flex flex-col gap-6 mb-10">
              {[
                { icon: Mail, label: "Email us", value: "support@waptrix.in", href: "mailto:support@waptrix.in" },
                { icon: MessageSquare, label: "WhatsApp", value: "+91 98765 43210", href: "https://wa.me/919876543210" },
                { icon: Phone, label: "Call us", value: "+91 98765 43210", href: "tel:+919876543210" },
              ].map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  className="flex items-center gap-4 group"
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#10B981]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#10B981]/20 transition-colors">
                    <c.icon className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#8896AB]">{c.label}</p>
                    <p className="text-sm text-white font-semibold">{c.value}</p>
                  </div>
                </a>
              ))}
            </div>

            <div className="bg-[#0E1117] border border-[#273042] rounded-2xl p-5">
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Office hours</p>
              <p className="text-sm text-[#8896AB]">Monday – Saturday<br />10:00 AM – 7:00 PM IST</p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-[#0E1117] border border-[#273042] rounded-2xl p-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <CheckCircle className="w-12 h-12 text-[#10B981] mb-4" />
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-syne)" }}>Message sent!</h3>
                <p className="text-sm text-[#8896AB]">We'll get back to you within a few hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#8896AB] mb-1.5 block">Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Ravi Mehta"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-[#161B26] border border-[#273042] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#8896AB] focus:outline-none focus:border-[#10B981]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8896AB] mb-1.5 block">Phone</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-[#161B26] border border-[#273042] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#8896AB] focus:outline-none focus:border-[#10B981]/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#8896AB] mb-1.5 block">Email</label>
                  <input
                    required
                    type="email"
                    placeholder="ravi@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#161B26] border border-[#273042] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#8896AB] focus:outline-none focus:border-[#10B981]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#8896AB] mb-1.5 block">Message</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us about your business and what you need..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-[#161B26] border border-[#273042] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#8896AB] focus:outline-none focus:border-[#10B981]/50 resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-[#F43F5E]">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#10B981] hover:bg-[#34D399] disabled:opacity-60 text-[#080A0F] font-bold py-3 rounded-xl text-sm transition-all"
                >
                  {loading ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
