import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Waptrix Pro — WhatsApp Marketing Plans",
  description:
    "Simple, transparent pricing for Waptrix Pro. Unlimited WhatsApp campaigns, inbox, and automation. Start with a 7-day free trial — no card required.",
  alternates: { canonical: "https://waptrix.in/pricing" },
  openGraph: {
    title: "Pricing | Waptrix Pro — WhatsApp Marketing Plans",
    description:
      "Simple, transparent pricing for Waptrix Pro. 7-day free trial. No card required. Monthly, quarterly, and yearly billing available.",
    url: "https://waptrix.in/pricing",
    images: [{ url: "/featured.png", width: 1200, height: 630, alt: "Waptrix Pricing" }],
  },
  twitter: {
    title: "Pricing | Waptrix Pro — WhatsApp Marketing Plans",
    description:
      "Simple, transparent pricing for Waptrix Pro. 7-day free trial. No card required.",
    images: ["/featured.png"],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
