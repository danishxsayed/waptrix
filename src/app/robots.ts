import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/signup", "/login", "/accept-invite"],
      },
    ],
    sitemap: "https://waptrix.in/sitemap.xml",
    host: "https://waptrix.in",
  };
}
