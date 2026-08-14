import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | WhatsApp Marketing Tips & Guides — Waptrix",
  description:
    "Actionable WhatsApp marketing guides, bulk messaging tips, and Business API tutorials for Indian businesses. Learn how to grow with WhatsApp from the Waptrix team.",
  alternates: { canonical: "https://waptrix.in/blog" },
  openGraph: {
    title: "Blog | WhatsApp Marketing Tips & Guides — Waptrix",
    description:
      "Actionable WhatsApp marketing guides, bulk messaging tips, and Business API tutorials for Indian businesses.",
    url: "https://waptrix.in/blog",
    images: [{ url: "/featured.png", width: 1200, height: 630, alt: "Waptrix Blog" }],
  },
  twitter: {
    title: "Blog | WhatsApp Marketing Tips & Guides — Waptrix",
    description: "Actionable WhatsApp marketing guides, bulk messaging tips, and Business API tutorials for Indian businesses.",
    images: ["/featured.png"],
  },
};

const POSTS = [
  { slug: "whatsapp-marketing-tips-2024", title: "10 WhatsApp Marketing Tips That Actually Work in 2024", excerpt: "Most businesses use WhatsApp the wrong way. Here are 10 proven strategies that drive real results.", date: "August 5, 2026", readTime: "5 min", tag: "Strategy" },
  { slug: "whatsapp-bulk-messaging-guide", title: "The Complete Guide to WhatsApp Bulk Messaging", excerpt: "Everything you need to know about sending bulk messages legally — using the official Business API.", date: "July 28, 2026", readTime: "8 min", tag: "Guide" },
  { slug: "whatsapp-vs-email-marketing", title: "WhatsApp vs Email Marketing: Which Works Better in India?", excerpt: "Open rates of 98% vs 20%. A detailed comparison for Indian businesses.", date: "July 15, 2026", readTime: "6 min", tag: "Comparison" },
  { slug: "setup-whatsapp-business-api", title: "How to Set Up WhatsApp Business API (Step-by-Step)", excerpt: "A no-fluff guide to getting your API approved and sending messages using Waptrix.", date: "July 1, 2026", readTime: "10 min", tag: "Tutorial" },
  { slug: "whatsapp-template-messages", title: "How to Create Templates That Get Approved Fast", excerpt: "Meta rejects many templates. Here's exactly how to write ones that get approved first time.", date: "June 20, 2026", readTime: "7 min", tag: "Templates" },
  { slug: "whatsapp-automation-ecommerce", title: "WhatsApp Automation for E-commerce: The Complete Playbook", excerpt: "How Indian stores use WhatsApp automation to reduce support load and recover abandoned carts.", date: "June 10, 2026", readTime: "6 min", tag: "Automation" },
];

const TAG_COLORS: Record<string, string> = {
  Strategy: "bg-[#D9FDD3] text-[#075E54]",
  Guide: "bg-blue-50 text-blue-700",
  Comparison: "bg-amber-50 text-amber-700",
  Tutorial: "bg-purple-50 text-purple-700",
  Templates: "bg-red-50 text-red-700",
  Automation: "bg-[#D9FDD3] text-[#075E54]",
};

export default function BlogPage() {
  return (
    <div className="bg-[#EDE8DE]">
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">Resources</p>
            <h1 className="text-5xl font-extrabold text-[#111B21] tracking-tight mb-4">The Waptrix Blog</h1>
            <p className="text-[#667781] max-w-md mx-auto">WhatsApp marketing strategies, tutorials, and product updates to help your business grow.</p>
          </div>

          {/* Featured */}
          <div className="bg-[#075E54] rounded-3xl p-8 mb-8">
            <span className="inline-block bg-[#25D366] text-[#111B21] text-xs font-bold px-3 py-1 rounded-full mb-4">{POSTS[0].tag}</span>
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">{POSTS[0].title}</h2>
            <p className="text-[#D9FDD3] mb-5 leading-relaxed">{POSTS[0].excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-[#D9FDD3]">
                <span>{POSTS[0].date}</span><span>·</span>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{POSTS[0].readTime}</div>
              </div>
              <Link href={`/blog/${POSTS[0].slug}`} className="flex items-center gap-1 bg-[#25D366] text-[#111B21] text-sm font-bold px-4 py-2 rounded-full hover:bg-white transition-all">
                Read <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 gap-5">
            {POSTS.slice(1).map((post) => (
              <div key={post.slug} className="bg-white rounded-2xl p-6 border border-[#E9EDEF] flex flex-col">
                <span className={`self-start text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${TAG_COLORS[post.tag]}`}>{post.tag}</span>
                <h3 className="font-extrabold text-[#111B21] mb-2 text-sm leading-snug">{post.title}</h3>
                <p className="text-xs text-[#667781] leading-relaxed flex-1 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[#667781]">
                    <span>{post.date}</span><span>·</span>
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</div>
                  </div>
                  <Link href={`/blog/${post.slug}`} className="text-[#25D366] text-xs font-bold flex items-center gap-1 hover:underline">
                    Read <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
