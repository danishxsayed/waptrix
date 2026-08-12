import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

const POSTS = [
  {
    slug:    "whatsapp-marketing-tips-2024",
    title:   "10 WhatsApp Marketing Tips That Actually Work in 2024",
    excerpt: "Most businesses use WhatsApp the wrong way. Here are 10 proven strategies that drive real results — from campaign timing to personalisation.",
    date:    "August 5, 2026",
    readTime: "5 min read",
    tag:     "Strategy",
  },
  {
    slug:    "whatsapp-bulk-messaging-guide",
    title:   "The Complete Guide to WhatsApp Bulk Messaging for Indian Businesses",
    excerpt: "Everything you need to know about sending bulk messages on WhatsApp legally — using the official Business API, without getting banned.",
    date:    "July 28, 2026",
    readTime: "8 min read",
    tag:     "Guide",
  },
  {
    slug:    "whatsapp-vs-email-marketing",
    title:   "WhatsApp vs Email Marketing: Which Works Better for India?",
    excerpt: "Open rates of 98% vs 20%. We compare WhatsApp and email marketing across cost, reach, and conversion rates for Indian businesses.",
    date:    "July 15, 2026",
    readTime: "6 min read",
    tag:     "Comparison",
  },
  {
    slug:    "setup-whatsapp-business-api",
    title:   "How to Set Up WhatsApp Business API in 2024 (Step-by-Step)",
    excerpt: "A no-fluff guide to getting your WhatsApp Business API approved, verified, and sending messages — using Waptrix.",
    date:    "July 1, 2026",
    readTime: "10 min read",
    tag:     "Tutorial",
  },
  {
    slug:    "whatsapp-template-messages",
    title:   "How to Create WhatsApp Template Messages That Get Approved Fast",
    excerpt: "Meta rejects a lot of templates. Here's exactly how to write and format templates that get approved on the first try.",
    date:    "June 20, 2026",
    readTime: "7 min read",
    tag:     "Templates",
  },
  {
    slug:    "whatsapp-automation-for-ecommerce",
    title:   "WhatsApp Automation for E-commerce: Order Updates, Abandoned Carts & More",
    excerpt: "How Indian e-commerce stores are using WhatsApp automation to reduce support load and recover abandoned carts.",
    date:    "June 10, 2026",
    readTime: "6 min read",
    tag:     "Automation",
  },
];

const TAG_COLORS: Record<string, string> = {
  Strategy:   "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
  Guide:      "bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/20",
  Comparison: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
  Tutorial:   "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20",
  Templates:  "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/20",
  Automation: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
};

export default function BlogPage() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-syne)" }}>
            The Waptrix Blog
          </h1>
          <p className="text-[#8896AB] max-w-xl mx-auto">
            WhatsApp marketing strategies, tutorials, and product updates to help your business grow.
          </p>
        </div>

        {/* Featured post */}
        <div className="bg-gradient-to-br from-[#10B981]/10 to-[#0EA5E9]/5 border border-[#10B981]/20 rounded-2xl p-8 mb-10">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${TAG_COLORS[POSTS[0].tag]}`}>
            {POSTS[0].tag}
          </span>
          <h2 className="text-2xl font-bold text-white mt-3 mb-3" style={{ fontFamily: "var(--font-syne)" }}>
            {POSTS[0].title}
          </h2>
          <p className="text-[#8896AB] mb-4 leading-relaxed">{POSTS[0].excerpt}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[#8896AB]">
              <span>{POSTS[0].date}</span>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {POSTS[0].readTime}
              </div>
            </div>
            <Link
              href={`/blog/${POSTS[0].slug}`}
              className="flex items-center gap-1 text-[#10B981] text-sm font-semibold hover:gap-2 transition-all"
            >
              Read more <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Post grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {POSTS.slice(1).map((post) => (
            <div
              key={post.slug}
              className="bg-[#0E1117] border border-[#273042] hover:border-[#273042]/60 rounded-2xl p-6 flex flex-col transition-all group"
            >
              <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full border mb-3 ${TAG_COLORS[post.tag]}`}>
                {post.tag}
              </span>
              <h3 className="font-bold text-white mb-2 text-sm leading-snug" style={{ fontFamily: "var(--font-syne)" }}>
                {post.title}
              </h3>
              <p className="text-xs text-[#8896AB] leading-relaxed flex-1 mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#8896AB]">
                  <span>{post.date}</span>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </div>
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-[#10B981] text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  Read <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
