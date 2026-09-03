import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Waptrix Support & Sales",
  description:
    "Get in touch with Waptrix for pricing questions, technical support, or a live demo. We're here to help Indian businesses grow on WhatsApp.",
  alternates: { canonical: "https://waptrix.in/contact" },
  openGraph: {
    title: "Contact Us | Waptrix Support & Sales",
    description:
      "Get in touch with Waptrix for support, pricing questions, or a live demo. We're here to help.",
    url: "https://waptrix.in/contact",
    images: [{ url: "/featured.png", width: 1200, height: 630, alt: "Contact Waptrix" }],
  },
  twitter: {
    title: "Contact Us | Waptrix Support & Sales",
    description: "Get in touch with Waptrix for support, pricing questions, or a live demo.",
    images: ["/featured.png"],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
