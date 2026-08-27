import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation | Waptrix — WhatsApp Business API Guides",
  description:
    "Step-by-step guides for campaigns, inbox management, templates, automation, and team management on Waptrix.",
  alternates: { canonical: "https://waptrix.in/docs" },
  openGraph: {
    title: "Documentation | Waptrix — WhatsApp Business API Guides",
    description: "Step-by-step guides for campaigns, inbox, templates, automation, and billing on Waptrix.",
    url: "https://waptrix.in/docs",
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
