import Link from "next/link";
import { BookOpen, MessageSquare, Send, Users, BarChart3, Bot, Settings, ArrowRight } from "lucide-react";

const SECTIONS = [
  { icon: BookOpen,    title: "Getting Started",     desc: "Connect your number and send your first message in 5 minutes.", articles: ["Create your account", "Connect your WhatsApp number", "Verify with Meta", "Send your first message"] },
  { icon: Send,        title: "Campaigns",            desc: "Send bulk messages to thousands of contacts at once.", articles: ["Create your first campaign", "Import contacts via CSV", "Schedule campaigns", "Campaign analytics"] },
  { icon: MessageSquare, title: "Inbox",             desc: "Manage all conversations in one place.", articles: ["Using the unified inbox", "Adding internal notes", "Assigning conversations", "Quick replies"] },
  { icon: BookOpen,    title: "Templates",            desc: "Create and manage WhatsApp-approved templates.", articles: ["What are message templates?", "Creating a template", "Adding images & buttons", "Getting Meta approval"] },
  { icon: Bot,         title: "Automation",           desc: "Set up keyword triggers and auto-reply rules.", articles: ["Creating automation rules", "Keyword-based replies", "Out-of-hours replies", "Drip sequences"] },
  { icon: Users,       title: "Team",                 desc: "Invite your team and manage roles.", articles: ["Inviting team members", "Understanding roles", "Using team chat", "Removing a member"] },
  { icon: BarChart3,   title: "Analytics",            desc: "Track delivery, read rates, and performance.", articles: ["Analytics dashboard", "Campaign analytics", "Delivery vs read rates", "Exporting data"] },
  { icon: Settings,    title: "Settings & Billing",   desc: "Manage your account and subscription.", articles: ["Updating your profile", "Changing your plan", "Payment methods", "Disconnecting WhatsApp"] },
];

export default function DocsPage() {
  return (
    <div className="bg-[#EDE8DE]">
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">Help Centre</p>
            <h1 className="text-5xl font-extrabold text-[#111B21] tracking-tight mb-4">Waptrix Documentation</h1>
            <p className="text-[#667781] max-w-lg mx-auto">Step-by-step guides, tutorials, and FAQs to get the most out of Waptrix.</p>
          </div>

          {/* Quick start */}
          <div className="bg-[#075E54] rounded-3xl p-7 mb-10 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <p className="font-extrabold text-white text-lg mb-1">New to Waptrix?</p>
              <p className="text-sm text-[#D9FDD3]">Follow our quick-start guide and be sending messages in under 5 minutes.</p>
            </div>
            <Link href="/signup" className="flex-shrink-0 flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-6 py-3 rounded-full hover:bg-white transition-all text-sm">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Sections */}
          <div className="grid sm:grid-cols-2 gap-5">
            {SECTIONS.map((s) => (
              <div key={s.title} className="bg-white rounded-2xl p-6 border border-[#E9EDEF]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EDE8DE] flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-4.5 h-4.5 text-[#25D366]" />
                  </div>
                  <h3 className="font-bold text-[#111B21] text-sm">{s.title}</h3>
                </div>
                <p className="text-xs text-[#667781] mb-4 leading-relaxed">{s.desc}</p>
                <ul className="flex flex-col gap-2">
                  {s.articles.map((a) => (
                    <li key={a} className="text-xs text-[#667781] hover:text-[#25D366] cursor-pointer transition-colors flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#E9EDEF] flex-shrink-0" />{a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Support */}
          <div className="mt-16 text-center bg-white rounded-3xl border border-[#E9EDEF] p-10">
            <h2 className="text-2xl font-extrabold text-[#111B21] mb-2 tracking-tight">Can't find what you need?</h2>
            <p className="text-sm text-[#667781] mb-6">Our team is available Monday–Saturday, 10am–7pm IST.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/contact" className="flex items-center gap-2 bg-[#25D366] text-[#111B21] font-bold px-6 py-3 rounded-full hover:bg-[#128C7E] hover:text-white transition-all text-sm">
                Contact support
              </Link>
              <a href="mailto:support@waptrix.in" className="text-sm text-[#667781] hover:text-[#25D366] transition-colors font-medium">
                support@waptrix.in
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
