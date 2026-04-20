import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, FileText, Mail, Globe } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Waptrix",
  description: "Learn how Waptrix collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  const lastUpdated = "April 20, 2026";

  return (
    <div className="min-h-screen bg-background text-text-primary px-6 py-12 md:py-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-jade hover:text-jade-hover transition-colors mb-6 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-semibold">Back to Dashboard</span>
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold font-syne tracking-tight">
              Privacy <span className="text-jade">Policy</span>
            </h1>
            <p className="text-text-muted mt-2">Last updated: {lastUpdated}</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-jade/10 rounded-2xl flex items-center justify-center border border-jade/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Shield className="w-8 h-8 text-jade" />
            </div>
          </div>
        </div>

        {/* Introduction */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-jade" />
            1. Introduction
          </h2>
          <p className="text-text-muted leading-relaxed">
            At Waptrix, we respect your privacy and are committed to protecting it. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our WhatsApp marketing platform. 
            By using Waptrix, you agree to the collection and use of information in accordance with this policy.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-jade" />
              2. Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-text-primary mb-2">Personal Information</h3>
                <p className="text-text-muted leading-relaxed">
                  When you register for an account, we collect information such as your name, email address, company name, and billing information.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-text-primary mb-2">WhatsApp Data</h3>
                <p className="text-text-muted leading-relaxed">
                  To provide our services, we process data through the Meta Business API, including phone numbers, message templates, sent/received messages, and delivery statuses.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-text-primary mb-2">Usage Data</h3>
                <p className="text-text-muted leading-relaxed">
                  We automatically collect information about how you interact with our platform, including IP addresses, browser types, and dashboard activity.
                </p>
              </div>
            </div>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-jade" />
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2 text-text-muted leading-relaxed">
              <li>To provide, maintain, and improve our WhatsApp messaging services.</li>
              <li>To manage your account and provide customer support.</li>
              <li>To process payments and send administrative notifications.</li>
              <li>To analyze usage patterns for performance optimization and feature development.</li>
              <li>To ensure compliance with WhatsApp/Meta policies.</li>
            </ul>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-jade" />
              4. WhatsApp & Meta Compliance
            </h2>
            <p className="text-text-muted leading-relaxed">
              Waptrix operates using official Meta Business APIs. Your use of our platform is also subject to 
              <span className="text-jade mx-1 cursor-pointer hover:underline">WhatsApp&apos;s Business Policy</span> and 
              <span className="text-jade mx-1 cursor-pointer hover:underline">Meta&apos;s Terms of Service</span>. 
              We do not support or allow spamming or unauthorized messaging practices.
            </p>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-jade" />
              5. Data Security
            </h2>
            <p className="text-text-muted leading-relaxed">
              We implement industry-standard security measures to protect your data. All communications between your server and our platform are encrypted via SSL. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-jade" />
              6. Contact Us
            </h2>
            <p className="text-text-muted leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-surface rounded-xl border border-border inline-block">
              <p className="text-jade font-bold">support@waptrix.in</p>
            </div>
          </section>
        </div>

        {/* Footer Link */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
          <p>© 2026 Waptrix. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-jade transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-jade transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
