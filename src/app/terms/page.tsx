import Link from "next/link";
import { ArrowLeft, FileText, Scale, UserCheck, AlertTriangle, CreditCard, Ban, Gavel, Mail } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Waptrix",
  description: "Read the Terms of Service for using Waptrix WhatsApp marketing platform.",
};

export default function TermsPage() {
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
              Terms of <span className="text-jade">Service</span>
            </h1>
            <p className="text-text-muted mt-2">Last updated: {lastUpdated}</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-jade/10 rounded-2xl flex items-center justify-center border border-jade/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Scale className="w-8 h-8 text-jade" />
            </div>
          </div>
        </div>

        {/* Agreement */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-jade" />
            1. Agreement to Terms
          </h2>
          <p className="text-text-muted leading-relaxed">
            By accessing or using Waptrix, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service. These terms apply to all visitors, users, and others who access or use the Service.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-jade" />
              2. Account Registration
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
            <p className="text-text-muted leading-relaxed">
              You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
            </p>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-jade" />
              3. Acceptable Use & Anti-Spam
            </h2>
            <p className="text-text-muted leading-relaxed mb-4 font-bold text-text-primary">
              Waptrix is a platform for legitimate business communication. We have a zero-tolerance policy for spam.
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted leading-relaxed">
              <li>You must comply with all WhatsApp Business Policies and Meta Terms.</li>
              <li>You shall not use the service to send unsolicited messages (spam).</li>
              <li>You must have explicit consent from recipients before sending messages.</li>
              <li>You are prohibited from using the service for any illegal or unauthorized purpose.</li>
            </ul>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-jade" />
              4. Subscriptions & Payments
            </h2>
            <p className="text-text-muted leading-relaxed">
              Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis. At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you cancel it or Waptrix cancels it.
            </p>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <Ban className="w-5 h-5 text-jade" />
              5. Limitation of Liability
            </h2>
            <p className="text-text-muted leading-relaxed">
              In no event shall Waptrix, nor its directors, employees, or partners, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service (including WhatsApp/Meta platform outages).
            </p>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-jade" />
              6. Governing Law
            </h2>
            <p className="text-text-muted leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-bold font-syne mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-jade" />
              7. Contact Us
            </h2>
            <p className="text-text-muted leading-relaxed">
              If you have any questions about these Terms, please contact us at:
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
            <Link href="/privacy" className="hover:text-jade transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-jade transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
