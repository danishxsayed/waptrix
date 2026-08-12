import Link from "next/link";
import { BookOpen, MessageSquare, Send, Users, BarChart3, Bot, Settings, ArrowRight, Zap } from "lucide-react";

const SECTIONS = [
  {
    icon:  Zap,
    title: "Getting Started",
    desc:  "Connect your WhatsApp number and send your first message in under 5 minutes.",
    articles: [
      "Create your Waptrix account",
      "Connect your WhatsApp Business number",
      "Verify your business with Meta",
      "Send your first test message",
    ],
  },
  {
    icon:  Send,
    title: "Campaigns",
    desc:  "Send bulk messages to thousands of contacts at once.",
    articles: [
      "Creating your first campaign",
      "Importing contacts via CSV",
      "Scheduling campaigns",
      "Understanding campaign analytics",
    ],
  },
  {
    icon:  MessageSquare,
    title: "Inbox",
    desc:  "Manage all inbound and outbound conversations in one place.",
    articles: [
      "Using the unified inbox",
      "Adding internal notes",
      "Assigning conversations to team members",
      "Using quick replies",
    ],
  },
  {
    icon:  BookOpen,
    title: "Templates",
    desc:  "Create and manage WhatsApp-approved message templates.",
    articles: [
      "What are message templates?",
      "Creating a template",
      "Adding images and buttons",
      "Getting template approved by Meta",
    ],
  },
  {
    icon:  Bot,
    title: "Automation",
    desc:  "Set up keyword triggers and auto-reply rules.",
    articles: [
      "Creating an automation rule",
      "Keyword-based auto-replies",
      "Out-of-hours auto-reply",
      "Drip message sequences",
    ],
  },
  {
    icon:  Users,
    title: "Team",
    desc:  "Invite your team and manage roles.",
    articles: [
      "Inviting team members",
      "Understanding roles (Owner / Admin / Agent)",
      "Using team chat",
      "Removing a team member",
    ],
  },
  {
    icon:  BarChart3,
    title: "Analytics",
    desc:  "Track message delivery, read rates, and campaign performance.",
    articles: [
      "Reading the analytics dashboard",
      "Campaign-level analytics",
      "Delivery vs read rates explained",
      "Exporting analytics data",
    ],
  },
  {
    icon:  Settings,
    title: "Settings & Billing",
    desc:  "Manage your account, subscription, and WhatsApp connection.",
    articles: [
      "Updating your profile",
      "Changing your subscription plan",
      "Managing payment methods",
      "Disconnecting WhatsApp",
    ],
  },
];

export default function DocsPage() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <BookOpen className="w-3 h-3" />
            Documentation
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-syne)" }}>
            Waptrix Help Centre
          </h1>
          <p className="text-[#8896AB] max-w-xl mx-auto">
            Everything you need to get the most out of Waptrix — step-by-step guides, tutorials, and FAQs.
          </p>
        </div>

        {/* Quick start banner */}
        <div className="bg-gradient-to-r from-[#10B981]/10 to-transparent border border-[#10B981]/20 rounded-2xl p-6 mb-12 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white mb-1" style={{ fontFamily: "var(--font-syne)" }}>New to Waptrix?</p>
            <p className="text-sm text-[#8896AB]">Follow our quick-start guide and be sending messages in under 5 minutes.</p>
          </div>
          <Link
            href="/signup"
            className="flex-shrink-0 flex items-center gap-2 bg-[#10B981] hover:bg-[#34D399] text-[#080A0F] font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            Get started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Doc sections grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="bg-[#0E1117] border border-[#273042] hover:border-[#273042]/60 rounded-2xl p-6 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-4 h-4 text-[#10B981]" />
                </div>
                <h3 className="font-semibold text-white text-sm" style={{ fontFamily: "var(--font-syne)" }}>{s.title}</h3>
              </div>
              <p className="text-xs text-[#8896AB] mb-4 leading-relaxed">{s.desc}</p>
              <ul className="flex flex-col gap-2">
                {s.articles.map((a) => (
                  <li key={a}>
                    <span className="text-xs text-[#8896AB] hover:text-[#10B981] cursor-pointer transition-colors flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#273042] flex-shrink-0" />
                      {a}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact support */}
        <div className="mt-16 text-center bg-[#0E1117] border border-[#273042] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-syne)" }}>Can't find what you're looking for?</h2>
          <p className="text-sm text-[#8896AB] mb-6">Our support team is available Monday–Saturday, 10am–7pm IST.</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/contact"
              className="flex items-center gap-2 bg-[#10B981] hover:bg-[#34D399] text-[#080A0F] font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Contact support
            </Link>
            <a
              href="mailto:support@waptrix.in"
              className="text-sm text-[#8896AB] hover:text-white transition-colors"
            >
              support@waptrix.in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
