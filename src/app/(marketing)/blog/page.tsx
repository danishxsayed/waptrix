import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { POSTS, TAG_COLORS } from "./posts";

export const metadata: Metadata = {
  title: "Blog | WhatsApp Marketing Tips & Guides — Waptrix",
  description:
    "Actionable WhatsApp marketing guides, bulk messaging tips, and Business API tutorials for Indian businesses. Learn how to grow with WhatsApp.",
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

export default function BlogPage() {
  const featured = POSTS[0];
  const rest = POSTS.slice(1);

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
          <Link href={`/blog/${featured.slug}`} className="block group">
            <div className="bg-[#075E54] rounded-3xl overflow-hidden mb-8 hover:shadow-xl transition-shadow">
              <img
                src={featured.image}
                alt={featured.imageAlt}
                className="w-full h-56 object-cover opacity-60 group-hover:opacity-70 transition-opacity"
                loading="eager"
              />
              <div className="p-8">
                <span className="inline-block bg-[#25D366] text-[#111B21] text-xs font-bold px-3 py-1 rounded-full mb-4">{featured.tag}</span>
                <h2 className="text-3xl font-extrabold text-white leading-tight mb-3 group-hover:text-[#D9FDD3] transition-colors">{featured.title}</h2>
                <p className="text-[#D9FDD3] mb-5 leading-relaxed">{featured.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-[#D9FDD3]">
                    <span>{featured.date}</span><span>·</span>
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{featured.readTime}</div>
                  </div>
                  <span className="flex items-center gap-1 bg-[#25D366] text-[#111B21] text-sm font-bold px-4 py-2 rounded-full group-hover:bg-white transition-all">
                    Read <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Grid */}
          <div className="grid md:grid-cols-2 gap-5">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
                <div className="bg-white rounded-2xl border border-[#E9EDEF] flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
                  <img
                    src={post.image}
                    alt={post.imageAlt}
                    className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="p-6 flex flex-col flex-1">
                    <span className={`self-start text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${TAG_COLORS[post.tag] || "bg-gray-100 text-gray-700"}`}>{post.tag}</span>
                    <h3 className="font-extrabold text-[#111B21] mb-2 text-sm leading-snug group-hover:text-[#075E54] transition-colors">{post.title}</h3>
                    <p className="text-xs text-[#667781] leading-relaxed flex-1 mb-4">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-[#667781]">
                        <span>{post.date}</span><span>·</span>
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</div>
                      </div>
                      <span className="text-[#25D366] text-xs font-bold flex items-center gap-1 group-hover:underline">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
