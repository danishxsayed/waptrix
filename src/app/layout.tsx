import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-dm-sans",   // reuse the existing CSS var name so dashboard still works
  weight: ["300", "400", "500", "600", "700", "800"],
});

const BASE_URL = "https://waptrix.in";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Waptrix | WhatsApp Business Marketing Platform",
  description: "Send bulk WhatsApp campaigns, manage conversations, and grow your business with Waptrix — the official WhatsApp Business API platform for India.",
  icons: {
    icon: "/favicon.ico",
  },

  // Open Graph — Facebook, WhatsApp, Instagram, LinkedIn, Telegram
  openGraph: {
    type:        "website",
    url:         BASE_URL,
    siteName:    "Waptrix",
    title:       "Waptrix | WhatsApp Business Marketing Platform",
    description: "Send bulk WhatsApp campaigns, manage conversations, and grow your business with Waptrix — the official WhatsApp Business API platform for India.",
    images: [
      {
        url:    "/featured.png",
        width:  1200,
        height: 630,
        alt:    "Waptrix — WhatsApp Business Marketing Platform",
      },
    ],
  },

  // Twitter / X card
  twitter: {
    card:        "summary_large_image",
    site:        "@waptrix",
    title:       "Waptrix | WhatsApp Business Marketing Platform",
    description: "Send bulk WhatsApp campaigns, manage conversations, and grow your business with Waptrix.",
    images:      ["/featured.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
