import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { POSTS, TAG_COLORS } from "../posts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | Waptrix Blog`,
    description: post.metaDescription,
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      images: [{ url: post.image, alt: post.imageAlt }],
      type: "article",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: [post.image],
    },
    alternates: {
      canonical: `https://waptrix.in/blog/${post.slug}`,
    },
  };
}

function renderContent(content: string) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let tableBuffer: string[] = [];

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return null;
    const rows = tableBuffer.filter((l) => l.trim().startsWith("|"));
    const headers = rows[0]
      ?.split("|")
      .slice(1, -1)
      .map((h) => h.trim());
    const body = rows.slice(2);
    tableBuffer = [];
    return (
      <div key={key} className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#075E54] text-white">
              {headers?.map((h, i) => (
                <th key={i} className="px-4 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => {
              const cells = row
                .split("|")
                .slice(1, -1)
                .map((c) => c.trim());
              return (
                <tr
                  key={ri}
                  className={ri % 2 === 0 ? "bg-white" : "bg-[#f5f0e8]"}
                >
                  {cells.map((c, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-2 border-b border-[#EDE8DE]"
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Table rows
    if (line.trim().startsWith("|")) {
      tableBuffer.push(line);
      i++;
      continue;
    } else if (tableBuffer.length > 0) {
      const el = flushTable(`table-${i}`);
      if (el) elements.push(el);
    }

    // Code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={`code-${i}`}
          className="bg-gray-900 text-green-300 rounded-lg p-4 overflow-x-auto my-4 text-sm font-mono"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // HR
    if (line.trim() === "---") {
      elements.push(<hr key={`hr-${i}`} className="border-[#EDE8DE] my-8" />);
      i++;
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-2xl font-bold text-[#075E54] mt-10 mb-4"
        >
          {inlineMarkdown(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-xl font-semibold text-[#1a1a1a] mt-8 mb-3"
        >
          {inlineMarkdown(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-4 border-[#25D366] pl-4 my-4 text-gray-600 italic bg-[#f5f0e8] py-3 pr-4 rounded-r-lg"
        >
          {inlineMarkdown(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside my-4 space-y-1 text-gray-700">
          {items.map((item, idx) => (
            <li key={idx}>{inlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside my-4 space-y-1 text-gray-700">
          {items.map((item, idx) => (
            <li key={idx}>{inlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph
    if (line.trim() !== "") {
      elements.push(
        <p key={`p-${i}`} className="text-gray-700 leading-relaxed my-4">
          {inlineMarkdown(line)}
        </p>
      );
    }
    i++;
  }

  // flush trailing table
  if (tableBuffer.length > 0) {
    const el = flushTable(`table-end`);
    if (el) elements.push(el);
  }

  return elements;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-gray-100 text-[#075E54] px-1 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} className="text-[#075E54] underline hover:text-[#25D366]">
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const tagColor = TAG_COLORS[post.tag] || "bg-gray-100 text-gray-700";
  const relatedPosts = POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    image: post.image,
    datePublished: post.date,
    author: { "@type": "Organization", name: "Waptrix" },
    publisher: {
      "@type": "Organization",
      name: "Waptrix",
      logo: { "@type": "ImageObject", url: "https://waptrix.in/logo.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://waptrix.in/blog/${post.slug}` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-[#EDE8DE]">
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#EDE8DE] shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#25D366] rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <span className="font-bold text-lg text-[#1a1a1a]">Waptrix</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/blog" className="text-sm text-gray-600 hover:text-[#075E54]">
                ← All Posts
              </Link>
              <Link
                href="/pricing"
                className="bg-[#25D366] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#1ebe5d] transition-colors"
              >
                Start Free
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <div className="bg-[#075E54]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <div className="mb-4">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${tagColor}`}>
                {post.tag}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              {post.title}
            </h1>
            <p className="text-[#D9FDD3] text-lg mb-8 max-w-2xl">{post.excerpt}</p>
            <div className="flex items-center gap-4 text-[#A8D5B5] text-sm">
              <span>{post.author}</span>
              <span>·</span>
              <span>{post.date}</span>
              <span>·</span>
              <span>{post.readTime} read</span>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8">
          <div className="rounded-2xl overflow-hidden shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image}
              alt={post.imageAlt}
              className="w-full h-64 sm:h-80 object-cover"
              loading="eager"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12 prose-container">
            {renderContent(post.content)}
          </div>

          {/* CTA Box */}
          <div className="mt-10 bg-[#075E54] rounded-2xl p-8 text-center shadow-lg">
            <h3 className="text-2xl font-bold text-white mb-3">
              Ready to grow your business with WhatsApp?
            </h3>
            <p className="text-[#D9FDD3] mb-6">
              Join thousands of Indian businesses using Waptrix to send campaigns, automate messages, and manage customer conversations.
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-[#25D366] text-white font-bold px-8 py-3 rounded-full hover:bg-[#1ebe5d] transition-colors text-lg"
            >
              Start Free Trial →
            </Link>
          </div>

          {/* Related Posts */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={related.image}
                    alt={related.imageAlt}
                    className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="p-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[related.tag] || "bg-gray-100 text-gray-700"}`}>
                      {related.tag}
                    </span>
                    <h3 className="mt-2 text-sm font-semibold text-[#1a1a1a] leading-snug group-hover:text-[#075E54] transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">{related.readTime} read</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#075E54] text-[#D9FDD3] py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2026 Waptrix. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <Link href="/blog" className="hover:text-white">Blog</Link>
              <Link href="/pricing" className="hover:text-white">Pricing</Link>
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
