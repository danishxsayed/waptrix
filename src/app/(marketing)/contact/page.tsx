"use client";
import { useState } from "react";
import { Mail, MessageSquare, Phone, CheckCircle, AlertCircle } from "lucide-react";

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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send.");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#EDE8DE]">
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">Get in touch</p>
            <h1 className="text-5xl font-extrabold text-[#111B21] tracking-tight mb-4">We'd love to hear from you</h1>
            <p className="text-[#667781] max-w-md mx-auto">Question, demo request, or enterprise pricing? We reply within a few hours.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="flex flex-col gap-5 mb-8">
                {[
                  { icon: Mail,          label: "Email",     value: "support@waptrix.in",   href: "mailto:support@waptrix.in" },
                  { icon: MessageSquare, label: "WhatsApp",  value: "+91 80883 65856",       href: "https://wa.me/918088365856" },
                  { icon: Phone,         label: "Phone",     value: "+91 80883 65856",       href: "tel:+918088365856" },
                ].map((c) => (
                  <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="flex items-center gap-4 group">
                    <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:bg-[#D9FDD3] transition-colors border border-[#E9EDEF]">
                      <c.icon className="w-5 h-5 text-[#25D366]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#667781] font-medium">{c.label}</p>
                      <p className="text-sm font-bold text-[#111B21]">{c.value}</p>
                    </div>
                  </a>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-[#E9EDEF] p-5">
                <p className="text-xs font-bold text-[#111B21] uppercase tracking-wider mb-2">Office hours</p>
                <p className="text-sm text-[#667781]">Monday – Saturday · 10:00 AM – 7:00 PM IST</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E9EDEF] p-7 shadow-sm">
              {sent ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="w-14 h-14 bg-[#D9FDD3] rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-7 h-7 text-[#25D366]" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[#111B21] mb-2">Message sent!</h3>
                  <p className="text-sm text-[#667781]">We'll get back to you within a few hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#667781] mb-1.5 block">Name</label>
                      <input required type="text" placeholder="Ravi Mehta" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full bg-[#EDE8DE] border border-[#E9EDEF] rounded-xl px-3 py-2.5 text-sm text-[#111B21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#667781] mb-1.5 block">Phone</label>
                      <input type="tel" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                        className="w-full bg-[#EDE8DE] border border-[#E9EDEF] rounded-xl px-3 py-2.5 text-sm text-[#111B21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#667781] mb-1.5 block">Email</label>
                    <input required type="email" placeholder="ravi@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-[#EDE8DE] border border-[#E9EDEF] rounded-xl px-3 py-2.5 text-sm text-[#111B21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#667781] mb-1.5 block">Message</label>
                    <textarea required rows={5} placeholder="Tell us about your business and what you need…" value={form.message} onChange={e => setForm({...form, message: e.target.value})}
                      className="w-full bg-[#EDE8DE] border border-[#E9EDEF] rounded-xl px-3 py-2.5 text-sm text-[#111B21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 resize-none" />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-[#111B21] hover:text-white font-bold py-3 rounded-full text-sm transition-all">
                    {loading ? "Sending…" : "Send message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
