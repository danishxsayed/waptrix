import type { MetadataRoute } from "next";

const BASE = "https://waptrix.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/pricing`,  lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/about`,    lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/contact`,  lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE}/blog`,     lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/docs`,     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/whatsapp-for-ecommerce`,   lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/whatsapp-for-clinics`,    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/whatsapp-for-real-estate`,lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/signup`,   lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/privacy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE}/terms`,    lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];

  // Blog post URLs (static slugs)
  const blogSlugs = [
    "whatsapp-marketing-tips-2024",
    "whatsapp-bulk-messaging-guide",
    "whatsapp-vs-email-marketing",
    "setup-whatsapp-business-api",
    "whatsapp-template-messages",
    "whatsapp-automation-ecommerce",
  ];
  const blogPages: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
