"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen, Send, MessageSquare, FileText, Bot, Users,
  BarChart3, Settings, ChevronRight, ChevronDown, Info,
  CheckCircle2, AlertTriangle, ExternalLink, Search
} from "lucide-react";

// ─── Sidebar structure ───────────────────────────────────────────────────────

const NAV = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    items: [
      { id: "gs-overview",       label: "Overview" },
      { id: "gs-create-account", label: "Create Your Account" },
      { id: "gs-connect-wa",     label: "Connect WhatsApp Number" },
      { id: "gs-first-message",  label: "Send Your First Message" },
      { id: "gs-trial",          label: "Free Trial & Billing" },
    ],
  },
  {
    id: "templates",
    icon: FileText,
    title: "Message Templates",
    items: [
      { id: "tpl-what",     label: "What Are Templates?" },
      { id: "tpl-create",   label: "Create a Template" },
      { id: "tpl-media",    label: "Header Images & Videos" },
      { id: "tpl-buttons",  label: "Buttons (URL / Quick Reply)" },
      { id: "tpl-submit",   label: "Submit to Meta for Approval" },
      { id: "tpl-rejected", label: "Why Templates Get Rejected" },
    ],
  },
  {
    id: "campaigns",
    icon: Send,
    title: "Campaigns",
    items: [
      { id: "camp-create",   label: "Create a Campaign" },
      { id: "camp-contacts", label: "Import Contacts" },
      { id: "camp-segments", label: "Segments" },
      { id: "camp-schedule", label: "Schedule a Campaign" },
      { id: "camp-analytics",label: "Campaign Analytics" },
      { id: "camp-limits",   label: "Sending Limits (Tiers)" },
    ],
  },
  {
    id: "inbox",
    icon: MessageSquare,
    title: "Inbox",
    items: [
      { id: "inbox-overview",  label: "Unified Inbox Overview" },
      { id: "inbox-reply",     label: "Replying to Messages" },
      { id: "inbox-notes",     label: "Internal Notes" },
      { id: "inbox-assign",    label: "Assigning Conversations" },
      { id: "inbox-qr",        label: "Quick Replies" },
      { id: "inbox-contact",   label: "Contact Profile" },
    ],
  },
  {
    id: "automation",
    icon: Bot,
    title: "Automation",
    items: [
      { id: "auto-overview",  label: "How Automation Works" },
      { id: "auto-create",    label: "Create an Automation Rule" },
      { id: "auto-keywords",  label: "Keyword Triggers" },
      { id: "auto-ooh",       label: "Out-of-Hours Replies" },
    ],
  },
  {
    id: "team",
    icon: Users,
    title: "Team Management",
    items: [
      { id: "team-invite",    label: "Invite Team Members" },
      { id: "team-roles",     label: "Admin vs Agent Roles" },
      { id: "team-chat",      label: "Team Chat" },
      { id: "team-remove",    label: "Remove a Member" },
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics",
    items: [
      { id: "ana-dashboard",  label: "Dashboard Overview" },
      { id: "ana-campaign",   label: "Campaign Reports" },
      { id: "ana-delivery",   label: "Delivery vs Read Rates" },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings & Billing",
    items: [
      { id: "set-profile",    label: "Update Your Profile" },
      { id: "set-plan",       label: "Manage Your Plan" },
      { id: "set-disconnect", label: "Disconnect WhatsApp" },
      { id: "set-password",   label: "Change Password" },
    ],
  },
  {
    id: "integrations",
    icon: ExternalLink,
    title: "Integrations",
    items: [
      { id: "int-crm-overview",  label: "CRM Integration Overview" },
      { id: "int-crm-setup",     label: "Set Up the Webhook" },
      { id: "int-crm-events",    label: "Webhook Events & Payload" },
      { id: "int-crm-security",  label: "Verifying Signatures" },
      { id: "int-crm-examples",  label: "CRM Examples" },
    ],
  },
];

// ─── Doc content ──────────────────────────────────────────────────────────────

function Callout({ type, children }: { type: "info" | "warning" | "success"; children: React.ReactNode }) {
  const styles = {
    info:    { bg: "bg-blue-50 border-blue-200",   icon: <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /> },
    warning: { bg: "bg-amber-50 border-amber-200", icon: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> },
    success: { bg: "bg-[#D9FDD3] border-[#25D366]",icon: <CheckCircle2 className="w-4 h-4 text-[#075E54] flex-shrink-0 mt-0.5" /> },
  };
  return (
    <div className={`flex gap-3 border rounded-xl p-4 my-4 text-sm ${styles[type].bg}`}>
      {styles[type].icon}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 my-5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#075E54] text-white text-sm font-bold flex items-center justify-center">{n}</div>
      <div className="flex-1">
        <p className="font-semibold text-[#111B21] mb-1">{title}</p>
        <div className="text-sm text-[#667781] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function DocH2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-[#111B21] mt-10 mb-3 pb-2 border-b border-[#E9EDEF]">{children}</h2>;
}
function DocH3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-[#111B21] mt-6 mb-2">{children}</h3>;
}
function DocP({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#444] leading-relaxed my-3">{children}</p>;
}
function DocUl({ items }: { items: string[] }) {
  return (
    <ul className="my-3 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-[#444]">
          <span className="text-[#25D366] flex-shrink-0 mt-0.5">•</span>{item}
        </li>
      ))}
    </ul>
  );
}

function DOCS() {
  return {
    // ── Getting Started ──────────────────────────────────────────────────────
    "gs-overview": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Welcome to Waptrix</h1>
        <p className="text-[#667781] text-sm mb-6">Everything you need to send WhatsApp campaigns, manage conversations, and grow your business.</p>
        <Callout type="success">You can be sending your first WhatsApp campaign in under 15 minutes. Follow the steps in this guide.</Callout>
        <DocH2>What is Waptrix?</DocH2>
        <DocP>Waptrix is a WhatsApp Business API platform built for Indian businesses. It lets you send bulk messages to thousands of contacts, manage all incoming conversations in one inbox, build automated reply rules, and track delivery and read rates — all from one dashboard.</DocP>
        <DocH2>How It Works</DocH2>
        <DocP>Waptrix connects to the official Meta WhatsApp Business API. This means:</DocP>
        <DocUl items={[
          "Messages are sent and received via Meta's official infrastructure — not a third-party hack",
          "Your WhatsApp number is fully verified and business-branded",
          "Delivery rates are significantly higher than unofficial senders",
          "You get read receipts, delivery confirmations, and full analytics",
        ]} />
        <DocH2>Quick Setup Checklist</DocH2>
        <div className="space-y-3 my-4">
          {["Create a Waptrix account","Connect your WhatsApp Business number via Meta OAuth","Create and submit your first message template","Import your contacts","Launch your first campaign"].map((item, i) => (
            <div key={i} className="flex gap-3 items-center p-3 bg-[#f8f8f8] rounded-xl text-sm">
              <div className="w-6 h-6 rounded-full bg-[#EDE8DE] border-2 border-[#25D366] flex-shrink-0" />
              <span className="text-[#111B21] font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),

    "gs-create-account": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Create Your Account</h1>
        <DocP>Creating a Waptrix account takes less than 2 minutes.</DocP>
        <Step n={1} title="Go to the signup page">Visit <a href="/signup" className="text-[#25D366] underline">waptrix.in/signup</a> and enter your full name, business email, and a password. Click <strong>Create Account</strong>.</Step>
        <Step n={2} title="Verify your email">Check your inbox for a verification email from Waptrix. Click the link in the email to confirm your address.</Step>
        <Step n={3} title="Log in to your dashboard">Once verified, log in at <a href="/login" className="text-[#25D366] underline">waptrix.in/login</a>. You'll land on your dashboard.</Step>
        <Callout type="info">Your account starts with a 7-day free trial. No credit card required to start.</Callout>
        <DocH2>Forgot Password?</DocH2>
        <DocP>If you forget your password, go to the login page and click <strong>Forgot password?</strong> Enter your email and we'll send a reset link within a minute.</DocP>
      </div>
    ),

    "gs-connect-wa": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Connect Your WhatsApp Number</h1>
        <Callout type="warning">The phone number you connect must NOT be currently registered on WhatsApp (personal or WhatsApp Business app). If it is, you must delete that account first.</Callout>
        <DocH2>What You Need</DocH2>
        <DocUl items={[
          "A Facebook Business Manager account (free at business.facebook.com)",
          "A phone number not already registered on WhatsApp",
          "Your business name, address, and category",
        ]} />
        <DocH2>Step-by-Step</DocH2>
        <Step n={1} title="Open Settings → Connect WhatsApp">In your Waptrix dashboard, go to Settings from the left sidebar and click the Connect WhatsApp button.</Step>
        <Step n={2} title="Click 'Connect via Meta'">This opens Meta's official OAuth flow in a popup. Log in with the Facebook account that owns your Business Manager.</Step>
        <Step n={3} title="Create or select your WhatsApp Business Account">If you already have a WABA, select it. Otherwise, create a new one and give it your business name.</Step>
        <Step n={4} title="Add and verify your phone number">Enter the phone number you want to use. Meta will send a 6-digit OTP via SMS or voice call. Enter it to verify.</Step>
        <Step n={5} title="Authorize Waptrix">Click Authorize to grant Waptrix permission to send and receive messages on behalf of your number.</Step>
        <Callout type="success">Once connected, your number appears in Settings with a green "Connected" badge. Incoming messages will start appearing in your Inbox immediately.</Callout>
        <DocH2>Troubleshooting</DocH2>
        <DocH3>Error: Number already registered</DocH3>
        <DocP>Go to WhatsApp on your phone → Settings → Account → Delete My Account. After deletion, wait 5 minutes before retrying the connection in Waptrix.</DocP>
        <DocH3>Connection shows "Pending"</DocH3>
        <DocP>Go to Settings → Connect WhatsApp and click the "Fix Inbox (Subscribe Webhook)" button. This re-registers Waptrix's webhook with Meta.</DocP>
      </div>
    ),

    "gs-first-message": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Send Your First Message</h1>
        <DocP>Before you can send a bulk campaign, you need at least one approved template. Here's the fastest path to your first message:</DocP>
        <Step n={1} title="Create a template">Go to Templates → New Template. Choose the Marketing category. Write a simple body like: "Hi &#123;&#123;1&#125;&#125;, thanks for connecting with us! Reply to this message anytime." Click Submit to Meta.</Step>
        <Step n={2} title="Wait for approval">Meta usually approves Marketing templates within 1–24 hours. You'll get an email when it's approved.</Step>
        <Step n={3} title="Add a contact">Go to Contacts → Add Contact. Enter a name and a WhatsApp number (with country code, e.g., 919876543210).</Step>
        <Step n={4} title="Create a campaign">Go to Campaigns → Create Campaign. Select your approved template. Choose the contact you added. Click Launch Now.</Step>
        <Callout type="success">Your first message is sent! Check the Campaign Analytics tab to see delivery and read status.</Callout>
      </div>
    ),

    "gs-trial": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Free Trial & Billing</h1>
        <DocH2>7-Day Free Trial</DocH2>
        <DocP>Every new Waptrix account gets a 7-day free trial with full access to all features. No credit card is required to start.</DocP>
        <DocH2>After the Trial</DocH2>
        <DocP>After 7 days, you'll need to subscribe to continue sending messages. Go to Billing in your dashboard to choose a plan.</DocP>
        <DocH2>Plans</DocH2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Billing Cycle</th><th className="px-4 py-2 text-left">Price</th><th className="px-4 py-2 text-left">Saving</th></tr></thead>
            <tbody>
              {[["Monthly","₹1,999/month","—"],["Quarterly","₹4,998 total (₹1,666/mo)","Save 17%"],["Annual","₹17,988 total (₹1,499/mo)","Save 25%"]].map(([cycle,price,saving],i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{cycle}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] font-medium">{price}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] text-[#25D366]">{saving}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout type="info">All plans include unlimited contacts, campaigns, inbox messages, team members, and automations. Meta conversation charges are included in the plan.</Callout>
      </div>
    ),

    // ── Templates ─────────────────────────────────────────────────────────────
    "tpl-what": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">What Are Templates?</h1>
        <DocP>WhatsApp templates (officially called Message Templates) are pre-approved message formats that businesses must use when sending the first message to a customer, or when messaging a customer who hasn't contacted you in the last 24 hours.</DocP>
        <Callout type="info">Templates must be submitted to Meta for approval before use. Once approved, you can use them in campaigns and automations.</Callout>
        <DocH2>Template Categories</DocH2>
        <div className="space-y-3 my-4">
          {[
            { name: "Marketing", color: "bg-amber-50 border-amber-200", desc: "For promotions, offers, product launches, and engagement campaigns. Most businesses use this category." },
            { name: "Utility", color: "bg-blue-50 border-blue-200", desc: "For transactional messages like order confirmations, shipping updates, appointment reminders, and payment receipts." },
            { name: "Authentication", color: "bg-purple-50 border-purple-200", desc: "For sending OTPs and verification codes. Meta provides a standardized format for these." },
          ].map((cat) => (
            <div key={cat.name} className={`border rounded-xl p-4 ${cat.color}`}>
              <p className="font-semibold text-[#111B21] text-sm mb-1">{cat.name}</p>
              <p className="text-xs text-[#667781]">{cat.desc}</p>
            </div>
          ))}
        </div>
        <DocH2>Template Variables</DocH2>
        <DocP>Use {"&#123;&#123;1&#125;&#125;"}, {"&#123;&#123;2&#125;&#125;"}, {"&#123;&#123;3&#125;&#125;"} etc. as placeholders in your template body. When you send the message, these are replaced with real values like the customer's name, order number, or tracking link.</DocP>
        <DocP>Example: "Hi {"&#123;&#123;1&#125;&#125;"}, your order {"&#123;&#123;2&#125;&#125;"} has been shipped! Track here: {"&#123;&#123;3&#125;&#125;"}" → becomes → "Hi Rahul, your order #4521 has been shipped! Track here: [link]"</DocP>
      </div>
    ),

    "tpl-create": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Create a Template</h1>
        <Step n={1} title="Go to Templates">In your dashboard, click Templates in the left sidebar. Then click New Template.</Step>
        <Step n={2} title="Enter a template name">Use lowercase letters, numbers, and underscores only. No spaces. Example: order_shipped_v1. This name is used internally by Meta and cannot be changed after submission.</Step>
        <Step n={3} title="Select category">Choose Marketing, Utility, or Authentication based on your message purpose.</Step>
        <Step n={4} title="Select language">Choose your language. For India, select English (en_US) or your regional language if available.</Step>
        <Step n={5} title="Write the body">Keep it under 1,024 characters. Use {"&#123;&#123;1&#125;&#125;"}, {"&#123;&#123;2&#125;&#125;"} for dynamic values. Don't start or end with a variable — add text before and after.</Step>
        <Step n={6} title="Add header and footer (optional)">You can add a text header, image header, or video header. The footer is a small grey text at the bottom (often used for opt-out instructions).</Step>
        <Step n={7} title="Add buttons (optional)">Add URL buttons (links to your website) or Quick Reply buttons (like "Yes / No").</Step>
        <Step n={8} title="Submit to Meta">Click Submit to Meta. Approval usually takes 1–24 hours for Marketing templates.</Step>
        <Callout type="warning">Template names cannot contain reserved words or be overly promotional in the name itself. Keep names descriptive: order_update, diwali_offer_2026, appointment_reminder.</Callout>
      </div>
    ),

    "tpl-media": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Header Images & Videos</h1>
        <DocP>Adding an image or video header to your template significantly increases engagement — messages with images get up to 40% higher open rates.</DocP>
        <DocH2>Supported Header Types</DocH2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Format</th><th className="px-4 py-2 text-left">Max Size</th></tr></thead>
            <tbody>
              {[["Image","JPG, PNG","5 MB"],["Video","MP4","16 MB"],["Document","PDF","100 MB"]].map(([t,f,s],i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{t}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{f}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DocH2>Adding a Header Image</DocH2>
        <Step n={1} title="In the template editor, select 'Image' as the header type">The image header option appears in the Header section.</Step>
        <Step n={2} title="Upload or paste a URL">Upload an image from your computer, or paste a public HTTPS URL. Waptrix will upload it to Meta's servers when you submit.</Step>
        <Step n={3} title="Submit the template">Meta reviews templates with media headers the same way as text templates. The image is uploaded to Meta during submission.</Step>
        <Callout type="info">When using the template in a campaign, you can optionally override the header image with a different image for each send — useful for seasonal variations of the same template.</Callout>
      </div>
    ),

    "tpl-buttons": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Buttons (URL / Quick Reply)</h1>
        <DocP>Template buttons let customers take action directly from the message. You can add up to 3 buttons per template.</DocP>
        <DocH2>Button Types</DocH2>
        <DocH3>URL Button</DocH3>
        <DocP>Opens a URL in the customer's browser. Use this for: "Shop Now", "Track Order", "Book Appointment", "View Invoice". You can use a dynamic URL with a variable: https://yourstore.com/track/{"&#123;&#123;1&#125;&#125;"}.</DocP>
        <DocH3>Quick Reply Button</DocH3>
        <DocP>Shows a tappable reply button. When the customer taps it, their reply is sent back to your inbox. Use for: "Yes", "No", "Interested", "Not Now". Quick replies make it easy for customers to respond without typing.</DocP>
        <DocH3>Phone Number Button</DocH3>
        <DocP>Opens the phone dialer with your number pre-filled. Use for customer support contact.</DocP>
        <Callout type="info">You can combine different button types in one template — e.g., one URL button + one Quick Reply button.</Callout>
      </div>
    ),

    "tpl-submit": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Submit to Meta for Approval</h1>
        <DocP>All templates must be reviewed and approved by Meta before use. Here's what to expect:</DocP>
        <DocH2>Approval Timeline</DocH2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-left">Typical Approval Time</th></tr></thead>
            <tbody>
              {[["Marketing","6–24 hours"],["Utility","2–12 hours"],["Authentication","Under 1 hour"]].map(([c,t],i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{c}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{t}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DocH2>Checking Status</DocH2>
        <DocP>Go to Templates in your dashboard. Each template shows its status: Pending, Approved, or Rejected. You'll also receive an email from Meta when a template is approved or rejected.</DocP>
        <Callout type="info">Waptrix automatically syncs template statuses from Meta. If a status looks stale, use the "Sync Templates" button in the Templates section.</Callout>
      </div>
    ),

    "tpl-rejected": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Why Templates Get Rejected</h1>
        <DocH2>Most Common Rejection Reasons</DocH2>
        <div className="space-y-3 my-4">
          {[
            { reason: "Variable at start or end of body", fix: "Add plain text before &#123;&#123;1&#125;&#125; and after the last variable. E.g., 'Hi &#123;&#123;1&#125;&#125;, ...' not '&#123;&#123;1&#125;&#125;, hi there'" },
            { reason: "Excessive capitalization/punctuation", fix: "Avoid ALL CAPS words and multiple exclamation marks!!!! — they trigger spam filters" },
            { reason: "Promotional language in Utility template", fix: "Move to the Marketing category, or remove the promotional content" },
            { reason: "Requesting sensitive info", fix: "Never ask for passwords, PINs, OTPs, or bank details in Marketing/Utility templates" },
            { reason: "Template name contains reserved words", fix: "Rename the template. Avoid generic words like 'test', 'spam', 'default'" },
            { reason: "Misleading content", fix: "The template content must accurately describe what the business does" },
          ].map((item, i) => (
            <div key={i} className="border border-[#E9EDEF] rounded-xl p-4 bg-white">
              <p className="text-sm font-semibold text-red-600 mb-1">{item.reason}</p>
              <p className="text-xs text-[#667781]"><span className="font-medium text-[#111B21]">Fix: </span>{item.fix}</p>
            </div>
          ))}
        </div>
        <Callout type="success">You can edit and resubmit a rejected template without penalty. Fix the issue and click Submit to Meta again.</Callout>
      </div>
    ),

    // ── Campaigns ────────────────────────────────────────────────────────────
    "camp-create": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Create a Campaign</h1>
        <DocP>A campaign lets you send one message to hundreds or thousands of contacts at once, using an approved template.</DocP>
        <Step n={1} title="Go to Campaigns → Create Campaign">Click the blue Create Campaign button in the top right.</Step>
        <Step n={2} title="Name your campaign">Give it an internal name for your reference. Customers won't see this name.</Step>
        <Step n={3} title="Select a template">Only Approved templates appear here. Select the one you want to use.</Step>
        <Step n={4} title="Map template variables">If your template has variables ({"&#123;&#123;1&#125;&#125;"}, {"&#123;&#123;2&#125;&#125;"}), map each one to a contact field: name, phone, email, or custom field.</Step>
        <Step n={5} title="Select contacts or segment">Choose which contacts to send to. You can select a saved segment or pick individual contacts.</Step>
        <Step n={6} title="Set send time">Choose Send Now or schedule for a future date and time.</Step>
        <Step n={7} title="Review and launch">Review the preview and estimated reach. Click Launch Campaign.</Step>
        <Callout type="info">Waptrix sends messages in batches to stay within Meta's rate limits and ensure high delivery rates. For large campaigns (10,000+), sending may take 15–30 minutes to complete.</Callout>
      </div>
    ),

    "camp-contacts": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Import Contacts</h1>
        <DocP>You can add contacts one by one, or import thousands at once via a CSV file.</DocP>
        <DocH2>CSV Import</DocH2>
        <Step n={1} title="Go to Contacts → Import CSV">Click the Import button in the top right of the Contacts page.</Step>
        <Step n={2} title="Download the sample CSV">Download the sample file to see the required format. Required columns: name, phone. Optional: email.</Step>
        <Step n={3} title="Prepare your file">Phone numbers must include the country code without the + sign. For India: 919876543210 (not +91 9876543210).</Step>
        <Step n={4} title="Upload and map columns">Upload your CSV. Waptrix will auto-detect columns. Verify the mapping is correct.</Step>
        <Step n={5} title="Import">Click Import Contacts. Duplicates are automatically skipped.</Step>
        <Callout type="warning">Only import contacts who have explicitly opted in to receive WhatsApp messages from your business. Sending to unverified contacts will increase your block rate and can result in your number being restricted by Meta.</Callout>
      </div>
    ),

    "camp-segments": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Segments</h1>
        <DocP>Segments are groups of contacts. Use them to target specific audiences with relevant campaigns instead of blasting everyone the same message.</DocP>
        <DocH2>Creating a Segment</DocH2>
        <Step n={1} title="Go to Contacts → Segments">Click New Segment.</Step>
        <Step n={2} title="Name the segment">Example: "Mumbai Customers", "VIP Buyers", "Inactive 60 Days".</Step>
        <Step n={3} title="Add contacts">Select contacts manually, or import a CSV directly into the segment.</Step>
        <DocH2>Using Segments in Campaigns</DocH2>
        <DocP>When creating a campaign, select a segment in the "Select contacts" step. All contacts in that segment will receive the campaign.</DocP>
        <Callout type="success">Segmented campaigns get 3x higher click-through rates than unsegmented ones. Always target a specific audience with relevant content.</Callout>
      </div>
    ),

    "camp-schedule": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Schedule a Campaign</h1>
        <DocP>Schedule campaigns to send at the optimal time — even when you're not at your computer.</DocP>
        <Step n={1} title="In the campaign wizard, select 'Schedule for later'">This option appears in the final step of campaign creation.</Step>
        <Step n={2} title="Select date and time">Pick the exact date and time. Waptrix uses Indian Standard Time (IST) by default.</Step>
        <Step n={3} title="Save the scheduled campaign">The campaign will appear in your Campaigns list with a Scheduled badge. It will send automatically at the specified time.</Step>
        <DocH2>Best Times to Send in India</DocH2>
        <DocUl items={[
          "Morning: 8 AM – 10 AM (commute + morning break)",
          "Lunch: 12 PM – 1 PM (phone break)",
          "Evening: 7 PM – 9 PM (relaxed browsing at home)",
          "Avoid: 10 PM – 7 AM (intrusive, hurts your brand)",
        ]} />
      </div>
    ),

    "camp-analytics": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Campaign Analytics</h1>
        <DocP>After a campaign is sent, click on it in the Campaigns list to view detailed analytics.</DocP>
        <DocH2>Key Metrics</DocH2>
        <div className="space-y-3 my-4">
          {[
            { metric: "Sent", desc: "Total messages sent from Waptrix to Meta's API. Should always be 100%." },
            { metric: "Delivered", desc: "Messages that reached the recipient's device. Target: 85%+. Lower means contact list quality issues." },
            { metric: "Read", desc: "Messages opened by the recipient. WhatsApp industry average: 60–70%." },
            { metric: "Failed", desc: "Messages that could not be delivered. Click to see per-contact failure reasons." },
          ].map((m) => (
            <div key={m.metric} className="flex gap-3 p-3 bg-[#f8f8f8] rounded-xl border border-[#E9EDEF]">
              <div className="w-2 h-2 rounded-full bg-[#25D366] flex-shrink-0 mt-1.5" />
              <div><p className="text-sm font-semibold text-[#111B21]">{m.metric}</p><p className="text-xs text-[#667781]">{m.desc}</p></div>
            </div>
          ))}
        </div>
        <DocH2>Delivery Logs</DocH2>
        <DocP>The Delivery Logs tab shows the status of each individual message in the campaign. Status updates (delivered, read) arrive via webhook from Meta when the recipient opens their phone — they are not real-time if the recipient is offline.</DocP>
      </div>
    ),

    "camp-limits": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Sending Limits (Tiers)</h1>
        <DocP>Meta enforces sending limits per 24-hour period based on your account's quality tier.</DocP>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Tier</th><th className="px-4 py-2 text-left">Daily Limit</th><th className="px-4 py-2 text-left">How to Reach</th></tr></thead>
            <tbody>
              {[
                ["Tier 1","1,000 unique contacts","New accounts start here"],
                ["Tier 2","10,000 unique contacts","Maintain good quality for 7+ days"],
                ["Tier 3","100,000 unique contacts","Consistent sending, low block rate"],
                ["Tier 4","Unlimited","Enterprise-level volume"],
              ].map(([tier,limit,how],i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] font-medium">{tier}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{limit}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] text-xs text-[#667781]">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout type="info">Tiers increase automatically. To reach Tier 2 faster, start by sending to 200–300 engaged contacts and gradually increase volume over 7 days.</Callout>
      </div>
    ),

    // ── Inbox ─────────────────────────────────────────────────────────────────
    "inbox-overview": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Unified Inbox Overview</h1>
        <DocP>The Waptrix Inbox shows all incoming WhatsApp conversations in one place. Every message from every customer appears here, whether it's a reply to a campaign or a new conversation.</DocP>
        <DocH2>Inbox Layout</DocH2>
        <DocUl items={[
          "Left panel: List of all conversations, with unread count badges",
          "Middle panel: The active conversation thread",
          "Right panel: Contact profile, notes, and activity timeline",
        ]} />
        <DocH2>Conversation Filters</DocH2>
        <DocUl items={[
          "All: Every conversation",
          "Assigned to me: Conversations assigned to you",
          "Unassigned: Conversations no one has taken yet",
          "Resolved: Closed conversations",
        ]} />
        <Callout type="info">Messages arrive in real-time via Meta's webhook. If a customer's phone is offline, their message status will update as soon as they come online.</Callout>
      </div>
    ),

    "inbox-reply": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Replying to Messages</h1>
        <DocP>You can reply to any customer conversation in the inbox. Replies are sent as free-form messages within the 24-hour conversation window.</DocP>
        <DocH2>The 24-Hour Window</DocH2>
        <DocP>When a customer messages you, you have 24 hours to send free-form replies. After 24 hours of inactivity, you can only send an approved template message to restart the conversation.</DocP>
        <DocH2>Sending a Template from Inbox</DocH2>
        <DocP>To send a template (e.g., to a customer who hasn't replied in over 24 hours), click the template icon in the message input area. Select an approved template and fill in the variables.</DocP>
        <DocH2>Media Messages</DocH2>
        <DocP>You can send images, documents, and audio from the inbox using the attachment icon. Supported formats: JPG, PNG, PDF, MP3, MP4.</DocP>
      </div>
    ),

    "inbox-notes": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Internal Notes</h1>
        <DocP>Internal notes let you leave private comments on a conversation that customers cannot see. Use them to communicate with your team or record context about a customer.</DocP>
        <Step n={1} title="Open a conversation">Click any conversation in the inbox.</Step>
        <Step n={2} title="Switch to Note mode">Click the Note button (pencil icon) above the message input area.</Step>
        <Step n={3} title="Type your note and send">Your note appears in the conversation thread with a yellow background, clearly marked as an internal note.</Step>
        <Callout type="success">Notes are visible to all team members but never to the customer.</Callout>
      </div>
    ),

    "inbox-assign": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Assigning Conversations</h1>
        <DocP>Conversations can be assigned to specific team members so they know who is responsible for each customer.</DocP>
        <Step n={1} title="Open a conversation">Click the conversation in the inbox.</Step>
        <Step n={2} title="Click 'Assign'">In the right panel (contact profile), click the Assign button.</Step>
        <Step n={3} title="Select a team member">Choose from the list of active team members. The assigned agent will see this conversation in their 'Assigned to me' filter.</Step>
        <Callout type="info">Agents can also click "Assign to me" to self-assign a conversation when they pick it up.</Callout>
      </div>
    ),

    "inbox-qr": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Quick Replies</h1>
        <DocP>Quick Replies are saved message shortcuts. Type / in the message box to trigger them — saves time on common responses.</DocP>
        <DocH2>Creating Quick Replies</DocH2>
        <Step n={1} title="Go to Settings → Quick Replies">Click Add Quick Reply.</Step>
        <Step n={2} title="Set a shortcode and message">Shortcode: the trigger phrase (e.g., /price). Message: the full text that sends when you use this shortcode.</Step>
        <DocH2>Using Quick Replies in Inbox</DocH2>
        <DocP>In any conversation, type / in the message box. A dropdown will appear with all your quick replies. Click one to insert it — then edit if needed before sending.</DocP>
      </div>
    ),

    "inbox-contact": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Contact Profile</h1>
        <DocP>The right panel in the inbox shows the full profile of the contact you're talking to.</DocP>
        <DocH2>What's in the Profile</DocH2>
        <DocUl items={[
          "Name and phone number",
          "Email (if added)",
          "Tags and custom fields",
          "Notes section — add private notes about this contact",
          "Activity timeline — history of all conversations and campaigns with this contact",
          "Assign conversation button",
        ]} />
        <DocH2>Editing a Contact</DocH2>
        <DocP>Click the Edit button in the contact profile to update the name, email, or other fields. Changes are saved immediately.</DocP>
      </div>
    ),

    // ── Automation ────────────────────────────────────────────────────────────
    "auto-overview": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">How Automation Works</h1>
        <DocP>Waptrix automations let you automatically send replies when certain conditions are met — without any manual effort from your team.</DocP>
        <DocH2>How It Works</DocH2>
        <DocUl items={[
          "A trigger happens (customer sends a keyword, outside business hours, etc.)",
          "Waptrix detects the trigger",
          "The automation sends the configured reply automatically",
        ]} />
        <DocH2>Use Cases</DocH2>
        <DocUl items={[
          "Auto-reply when someone messages 'PRICE' — send your pricing",
          "Out-of-hours reply when someone messages at night",
          "Welcome message for new conversations",
          "FAQ replies for common questions like 'How do I track my order?'",
        ]} />
      </div>
    ),

    "auto-create": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Create an Automation Rule</h1>
        <Step n={1} title="Go to Automations in the sidebar">Click New Automation.</Step>
        <Step n={2} title="Set the trigger">Choose what triggers this automation: a specific keyword, any message, or out-of-hours message.</Step>
        <Step n={3} title="Write the reply message">This is what Waptrix will automatically send. You can use plain text or select an approved template.</Step>
        <Step n={4} title="Set conditions (optional)">Optionally restrict when this automation fires — e.g., only between certain hours, or only if the contact hasn't been replied to in 24 hours.</Step>
        <Step n={5} title="Save and activate">Toggle the automation to Active. It will start firing immediately for new incoming messages.</Step>
        <Callout type="warning">Don't create too many overlapping automations. If multiple rules match the same message, only the first matching rule fires.</Callout>
      </div>
    ),

    "auto-keywords": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Keyword Triggers</h1>
        <DocP>Keyword automations fire when an incoming message contains a specific word or phrase.</DocP>
        <DocH2>Examples</DocH2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Keyword</th><th className="px-4 py-2 text-left">Auto-Reply</th></tr></thead>
            <tbody>
              {[
                ["PRICE / PRICING","Sends your pricing card template"],
                ["STOP","Marks contact as opted out"],
                ["TRACK","Asks for order number, then sends tracking link"],
                ["HOURS","Sends your business hours"],
              ].map(([kw,reply],i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] font-mono text-xs">{kw}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] text-xs text-[#667781]">{reply}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout type="info">Keywords are case-insensitive. "price", "PRICE", and "Price" all trigger the same automation.</Callout>
      </div>
    ),

    "auto-ooh": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Out-of-Hours Replies</h1>
        <DocP>Set up an automatic reply for messages received outside your business hours, so customers always get a response even when your team is offline.</DocP>
        <Step n={1} title="Create a new automation">Set the trigger to 'Out-of-hours message'.</Step>
        <Step n={2} title="Set your business hours">Define your working hours (e.g., Mon–Sat, 10am–7pm IST).</Step>
        <Step n={3} title="Write your out-of-hours message">Example: "Hi! We're currently offline. Our team is available Mon–Sat, 10am–7pm IST. We'll get back to you first thing tomorrow morning!"</Step>
        <Step n={4} title="Activate the automation">Toggle to Active. The reply fires automatically when messages arrive outside your set hours.</Step>
      </div>
    ),

    // ── Team ──────────────────────────────────────────────────────────────────
    "team-invite": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Invite Team Members</h1>
        <Step n={1} title="Go to Settings → Team">Click Invite Member.</Step>
        <Step n={2} title="Enter email and select role">Enter your team member's email address. Choose Admin or Agent role.</Step>
        <Step n={3} title="Send invitation">Click Send Invite. The team member receives an email with a link to join your Waptrix workspace.</Step>
        <Step n={4} title="Member accepts invite">They click the link, set a password, and are added to your team immediately.</Step>
        <Callout type="info">There's no limit to the number of team members you can invite on any plan.</Callout>
      </div>
    ),

    "team-roles": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Admin vs Agent Roles</h1>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Feature</th><th className="px-4 py-2 text-left">Admin</th><th className="px-4 py-2 text-left">Agent</th></tr></thead>
            <tbody>
              {[
                ["Inbox (all conversations)","✓","✓"],
                ["Reply to messages","✓","✓"],
                ["View contacts","✓","✓ (read-only)"],
                ["Team chat","✓","✓"],
                ["Create campaigns","✓","✗"],
                ["Create templates","✓","✗"],
                ["View analytics","✓","✗"],
                ["Manage billing","✓","✗"],
                ["Invite/remove team members","✓","✗"],
                ["Settings & integrations","✓","✗"],
              ].map(([feat,admin,agent],i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{feat}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] text-[#25D366] font-bold">{admin}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] text-[#667781]">{agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),

    "team-chat": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Team Chat</h1>
        <DocP>Team Chat is a private group chat for your Waptrix team — separate from customer conversations. Use it to coordinate, share updates, and discuss tickets.</DocP>
        <DocH2>Accessing Team Chat</DocH2>
        <DocP>Click the Team Chat icon in the left sidebar (speech bubble with people icon). All team members can see and post in Team Chat.</DocP>
        <DocH2>Features</DocH2>
        <DocUl items={[
          "Real-time messaging with instant delivery",
          "Unread message count badge on the sidebar icon",
          "Notification sound for new messages",
          "Visible to all team members (admin and agents)",
        ]} />
      </div>
    ),

    "team-remove": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Remove a Member</h1>
        <Step n={1} title="Go to Settings → Team">Find the member you want to remove in the team list.</Step>
        <Step n={2} title="Click the Remove button">Confirm the removal in the dialog.</Step>
        <Step n={3} title="Member is removed immediately">They lose access to your Waptrix workspace instantly. Any conversations previously assigned to them become unassigned.</Step>
        <Callout type="warning">Removed members cannot re-join unless you send a new invitation.</Callout>
      </div>
    ),

    // ── Analytics ────────────────────────────────────────────────────────────
    "ana-dashboard": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Dashboard Overview</h1>
        <DocP>The Analytics dashboard gives you a bird's-eye view of your WhatsApp messaging performance over any time period.</DocP>
        <DocH2>Metrics Shown</DocH2>
        <DocUl items={[
          "Total messages sent in the selected period",
          "Total messages delivered",
          "Total messages read",
          "Delivery rate and read rate trends over time (line chart)",
          "Messages by day",
        ]} />
        <DocH2>Date Range Filter</DocH2>
        <DocP>Use the date picker in the top right of the analytics page to select a custom date range — last 7 days, last 30 days, or a custom start/end date.</DocP>
      </div>
    ),

    "ana-campaign": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Campaign Reports</h1>
        <DocP>Each campaign has its own detailed analytics page. Click on any campaign in the Campaigns list to view it.</DocP>
        <DocH2>Campaign Stats Card</DocH2>
        <DocUl items={[
          "Total contacts: How many contacts were in the campaign",
          "Sent: How many messages were successfully sent",
          "Delivered: How many reached the device",
          "Read: How many were opened",
          "Failed: How many couldn't be delivered",
        ]} />
        <DocH2>Delivery Logs</DocH2>
        <DocP>The Delivery Logs tab shows per-message status. Click any row to expand and see the exact WhatsApp delivery status and any error codes if delivery failed.</DocP>
        <DocH2>Common Error Codes</DocH2>
        <div className="space-y-2 my-3">
          {[
            { code: "131026", desc: "Phone number not on WhatsApp or opted out" },
            { code: "132001", desc: "Template language mismatch — the language saved in Waptrix doesn't match what Meta has" },
            { code: "131049", desc: "Number blocked due to low quality score" },
          ].map((e) => (
            <div key={e.code} className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs">
              <code className="font-mono font-bold text-red-600">{e.code}</code>
              <span className="text-[#667781]">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),

    "ana-delivery": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Delivery vs Read Rates</h1>
        <DocH2>What's the Difference?</DocH2>
        <DocP><strong>Delivered</strong> means the message reached the recipient's device. <strong>Read</strong> means they opened WhatsApp and the message showed blue ticks.</DocP>
        <DocH2>Industry Benchmarks (India)</DocH2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Metric</th><th className="px-4 py-2 text-left">Target</th><th className="px-4 py-2 text-left">If Lower</th></tr></thead>
            <tbody>
              {[
                ["Delivery Rate","85%+","Contact list has stale/invalid numbers"],
                ["Read Rate","60–70%","Message timing or content not engaging"],
                ["Reply Rate","10–20%","CTA not compelling enough"],
              ].map(([m,t,l],i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE]">{m}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] font-medium text-[#25D366]">{t}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] text-xs text-[#667781]">{l}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout type="info">Read status is only updated when the recipient opens WhatsApp. If they have read receipts (blue ticks) disabled, you won't see read status even if they read the message.</Callout>
      </div>
    ),

    // ── Settings ──────────────────────────────────────────────────────────────
    "set-profile": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Update Your Profile</h1>
        <Step n={1} title="Go to Settings in the sidebar">Click on your avatar or the Settings icon.</Step>
        <Step n={2} title="Update your name, business name, or email">Make changes and click Save Profile.</Step>
        <Callout type="info">Changing your email requires re-verification. A confirmation link will be sent to your new email address.</Callout>
      </div>
    ),

    "set-plan": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Manage Your Plan</h1>
        <DocP>Go to Settings → Billing to view your current plan, expiry date, and payment history.</DocP>
        <DocH2>Upgrading or Renewing</DocH2>
        <Step n={1} title="Click 'Upgrade' or 'Renew' in the Billing section">Choose your billing cycle: Monthly, Quarterly, or Annual.</Step>
        <Step n={2} title="Complete payment via Cashfree">Payments are processed securely via Cashfree. UPI, net banking, and credit/debit cards are accepted.</Step>
        <Step n={3} title="Plan activates instantly">Your plan is extended immediately upon successful payment. A receipt is emailed to you.</Step>
      </div>
    ),

    "set-disconnect": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Disconnect WhatsApp</h1>
        <DocP>If you need to disconnect your WhatsApp number from Waptrix (e.g., to use a different number), go to Settings → Connect WhatsApp and click Disconnect.</DocP>
        <Callout type="warning">Disconnecting removes Waptrix's access to your WhatsApp number. Incoming messages will stop appearing in the inbox. You can reconnect the same or a different number at any time.</Callout>
        <DocH2>To Use a Different Number</DocH2>
        <Step n={1} title="Disconnect the current number">Go to Settings → Connect WhatsApp → Disconnect.</Step>
        <Step n={2} title="Connect the new number">Follow the standard connection flow with the new phone number.</Step>
      </div>
    ),

    "set-password": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Change Password</h1>
        <Step n={1} title="Go to Settings → Security">Scroll to the Change Password section.</Step>
        <Step n={2} title="Enter your current password and new password">Confirm the new password by typing it twice.</Step>
        <Step n={3} title="Click Save Password">Your password is updated immediately. You'll need to use the new password on your next login.</Step>
        <DocH2>Forgot Your Password?</DocH2>
        <DocP>Go to the <a href="/login" className="text-[#25D366] underline">login page</a> and click Forgot password? We'll send a reset link to your registered email within a minute.</DocP>
      </div>
    ),

    // ── Integrations ─────────────────────────────────────────────────────────
    "int-crm-overview": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">CRM Integration Overview</h1>
        <DocP>Waptrix can push real-time WhatsApp events to any CRM, helpdesk, or automation tool via outbound webhooks. Whenever a customer messages you, a delivery status changes, or a contact opts out, Waptrix instantly sends a structured JSON payload to your configured URL.</DocP>
        <Callout type="success">This works with any CRM that accepts HTTP webhooks — HubSpot, Zoho, Salesforce, Pipedrive, Freshdesk, n8n, Make (Integromat), Zapier, and custom-built systems.</Callout>
        <DocH2>What You Can Do</DocH2>
        <DocUl items={[
          "Create or update a CRM contact automatically when a customer sends a WhatsApp message",
          "Log all WhatsApp conversations as activities in your CRM",
          "Trigger CRM workflows when a customer replies to a campaign",
          "Mark contacts as unsubscribed in your CRM when they send STOP",
          "Sync delivery and read status back to your CRM records",
        ]} />
        <DocH2>How It Works</DocH2>
        <div className="space-y-3 my-4">
          {[
            { step: "1", label: "Customer sends a WhatsApp message", desc: "Meta delivers it to Waptrix via webhook" },
            { step: "2", label: "Waptrix processes and stores the message", desc: "Appears in your inbox as usual" },
            { step: "3", label: "Waptrix fires your CRM webhook", desc: "POST request with signed JSON payload sent to your URL" },
            { step: "4", label: "Your CRM receives and processes the event", desc: "Create contact, log activity, trigger workflow — whatever your CRM does" },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-4 bg-[#f8f8f8] rounded-xl border border-[#E9EDEF]">
              <div className="w-8 h-8 rounded-full bg-[#075E54] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{s.step}</div>
              <div><p className="text-sm font-semibold text-[#111B21]">{s.label}</p><p className="text-xs text-[#667781] mt-0.5">{s.desc}</p></div>
            </div>
          ))}
        </div>
        <Callout type="info">Webhook failures never affect message delivery or inbox functionality. If your CRM endpoint is down, Waptrix silently skips the webhook and continues normally.</Callout>
      </div>
    ),

    "int-crm-setup": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Set Up the Webhook</h1>
        <DocP>Setting up your CRM webhook takes less than 2 minutes.</DocP>
        <Step n={1} title="Get your CRM's webhook URL">In your CRM (HubSpot, Zoho, n8n, etc.), create a new webhook endpoint or workflow trigger. Copy the URL it gives you. It looks like: https://hooks.zapier.com/hooks/catch/xxx or https://your-crm.com/webhooks/waptrix</Step>
        <Step n={2} title="Go to Waptrix Settings → CRM Integration">In your Waptrix dashboard, go to Settings from the left sidebar. Scroll to the CRM Integration section.</Step>
        <Step n={3} title="Paste your webhook URL">Paste the URL into the 'Your CRM Webhook URL' field.</Step>
        <Step n={4} title="Click Save Webhook">Waptrix will save your URL and auto-generate a signing secret. Copy and store the signing secret — you'll use it to verify incoming payloads in your CRM.</Step>
        <Callout type="success">That's it! From this point, every new WhatsApp message, status update, and opt-out event will be sent to your CRM in real-time.</Callout>
        <DocH2>Regenerating the Signing Secret</DocH2>
        <DocP>If your signing secret is ever compromised, click Regenerate Secret in the CRM Integration section. Update the new secret in your CRM immediately — the old secret stops working right away.</DocP>
        <DocH2>Removing the Webhook</DocH2>
        <DocP>Click Remove in the CRM Integration section to stop sending events to your CRM. You can re-add a webhook URL at any time.</DocP>
      </div>
    ),

    "int-crm-events": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Webhook Events & Payload</h1>
        <DocP>Waptrix sends a POST request with a JSON body for each event. All events follow the same base structure.</DocP>
        <DocH2>Event Types</DocH2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Event</th><th className="px-4 py-2 text-left">When It Fires</th></tr></thead>
            <tbody>
              {[
                ["message.received","Customer sends a WhatsApp message to you"],
                ["conversation.created","First-ever message from a new contact (new conversation)"],
                ["message.status","Message delivery status changes: delivered, read, or failed"],
                ["contact.opted_out","Customer sends STOP or an opt-out keyword"],
                ["contact.opted_in","Customer sends START after previously opting out"],
              ].map(([event, desc], i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] font-mono text-xs text-[#075E54]">{event}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] text-xs text-[#667781]">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DocH2>Payload Structure</DocH2>
        <DocP>All events share this base structure:</DocP>
        <div className="bg-[#111B21] rounded-xl p-4 my-4 overflow-x-auto">
          <pre className="text-xs text-[#25D366] leading-relaxed">{`{
  "event": "message.received",
  "timestamp": "2026-08-31T10:30:00.000Z",
  "tenant_id": "your-waptrix-tenant-id",

  "contact": {
    "phone": "+919876543210",
    "name": "Rahul Sharma"
  },

  "conversation_id": "uuid-of-conversation",

  "message": {
    "id": "wamid.HBgN...",
    "type": "text",
    "content": "Hello, I want to know the price",
    "direction": "inbound",
    "timestamp": "2026-08-31T10:30:00.000Z"
  }
}`}</pre>
        </div>
        <DocH2>message.status Payload</DocH2>
        <div className="bg-[#111B21] rounded-xl p-4 my-4 overflow-x-auto">
          <pre className="text-xs text-[#25D366] leading-relaxed">{`{
  "event": "message.status",
  "timestamp": "2026-08-31T10:31:00.000Z",
  "tenant_id": "your-waptrix-tenant-id",
  "message": {
    "id": "wamid.HBgN...",
    "type": "status",
    "content": "delivered",
    "direction": "outbound",
    "status": "delivered"
  }
}`}</pre>
        </div>
        <DocH2>Request Headers</DocH2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-[#075E54] text-white"><th className="px-4 py-2 text-left">Header</th><th className="px-4 py-2 text-left">Value</th></tr></thead>
            <tbody>
              {[
                ["Content-Type","application/json"],
                ["X-Waptrix-Event","The event name (e.g. message.received)"],
                ["X-Waptrix-Signature","sha256=HMAC-SHA256 signature of the body"],
                ["X-Waptrix-Tenant","Your tenant ID"],
                ["User-Agent","Waptrix-Webhook/1.0"],
              ].map(([h, v], i) => (
                <tr key={i} className={i%2===0?"bg-white":"bg-[#f5f0e8]"}>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] font-mono text-xs">{h}</td>
                  <td className="px-4 py-2 border-b border-[#EDE8DE] text-xs text-[#667781]">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout type="info">Your endpoint must respond with any 2xx HTTP status within 8 seconds. If it times out or returns an error, Waptrix skips that event silently — it does not retry.</Callout>
      </div>
    ),

    "int-crm-security": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">Verifying Signatures</h1>
        <DocP>Every webhook request from Waptrix includes an <code className="font-mono text-xs bg-[#EDE8DE] px-1 py-0.5 rounded">X-Waptrix-Signature</code> header. Verify this in your CRM to ensure requests are genuinely from Waptrix and not from a third party.</DocP>
        <DocH2>How the Signature Works</DocH2>
        <DocP>Waptrix computes an HMAC-SHA256 hash of the raw request body using your signing secret, then prefixes it with <code className="font-mono text-xs bg-[#EDE8DE] px-1 py-0.5 rounded">sha256=</code>. You compute the same hash on your side and compare.</DocP>
        <DocH2>Verification Examples</DocH2>
        <DocH3>Node.js</DocH3>
        <div className="bg-[#111B21] rounded-xl p-4 my-3 overflow-x-auto">
          <pre className="text-xs text-[#25D366] leading-relaxed">{`const crypto = require('crypto');

function verifyWaptrixWebhook(rawBody, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// Express example
app.post('/webhooks/waptrix', express.raw({ type: '*/*' }), (req, res) => {
  const sig = req.headers['x-waptrix-signature'];
  if (!verifyWaptrixWebhook(req.body, sig, process.env.WAPTRIX_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  const payload = JSON.parse(req.body);
  console.log('Event:', payload.event);
  res.sendStatus(200);
});`}</pre>
        </div>
        <DocH3>Python</DocH3>
        <div className="bg-[#111B21] rounded-xl p-4 my-3 overflow-x-auto">
          <pre className="text-xs text-[#25D366] leading-relaxed">{`import hmac, hashlib

def verify_waptrix_webhook(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# Flask example
@app.route('/webhooks/waptrix', methods=['POST'])
def waptrix_webhook():
    sig = request.headers.get('X-Waptrix-Signature', '')
    if not verify_waptrix_webhook(request.data, sig, WAPTRIX_SECRET):
        return 'Unauthorized', 401
    payload = request.json
    print('Event:', payload['event'])
    return '', 200`}</pre>
        </div>
        <Callout type="warning">Always use <strong>timing-safe comparison</strong> (timingSafeEqual / hmac.compare_digest) to prevent timing attacks. Never use == for signature comparison.</Callout>
      </div>
    ),

    "int-crm-examples": (
      <div>
        <h1 className="text-2xl font-extrabold text-[#111B21] mb-2">CRM Examples</h1>
        <DocP>Here's how to connect Waptrix to popular tools using the outbound webhook.</DocP>

        <DocH2>Zapier</DocH2>
        <Step n={1} title="Create a new Zap">Choose 'Webhooks by Zapier' as the trigger. Select 'Catch Hook'.</Step>
        <Step n={2} title="Copy the Zapier webhook URL">Paste it into Waptrix Settings → CRM Integration and click Save.</Step>
        <Step n={3} title="Set up the action">Choose your CRM app (HubSpot, Salesforce, etc.) and map the fields: contact.phone → Phone, contact.name → Name, message.content → Note Body.</Step>
        <Callout type="success">Zapier will now create or update a CRM contact every time a customer messages you on WhatsApp.</Callout>

        <DocH2>n8n / Make (Integromat)</DocH2>
        <Step n={1} title="Create a Webhook node">In n8n, add a 'Webhook' node. Copy the production webhook URL.</Step>
        <Step n={2} title="Paste into Waptrix">Go to Settings → CRM Integration, paste the URL, click Save.</Step>
        <Step n={3} title="Add downstream nodes">Connect CRM nodes (HubSpot, Zoho CRM, Pipedrive, etc.) to create contacts, log activities, or trigger automations based on the event type.</Step>
        <Step n={4} title="Filter by event">Use an IF node to branch by payload.event: handle message.received differently from contact.opted_out.</Step>

        <DocH2>HubSpot (Direct)</DocH2>
        <DocP>HubSpot's workflows support incoming webhooks on the Operations Hub plan. Set up a workflow trigger with the Waptrix webhook URL, then map the payload fields to HubSpot contact properties.</DocP>

        <DocH2>Zoho CRM</DocH2>
        <DocP>In Zoho CRM, go to Setup → Developer Space → Functions. Create a custom function to parse the Waptrix payload and use Zoho's CRM API to create/update records. Expose it as a REST API and use that URL as your webhook endpoint.</DocP>

        <DocH2>Custom Backend</DocH2>
        <div className="bg-[#111B21] rounded-xl p-4 my-4 overflow-x-auto">
          <pre className="text-xs text-[#25D366] leading-relaxed">{`// Minimal Express receiver
app.post('/waptrix', express.raw({ type: '*/*' }), (req, res) => {
  const payload = JSON.parse(req.body);

  if (payload.event === 'message.received') {
    // Upsert contact in your DB
    db.contacts.upsert({
      phone: payload.contact.phone,
      name: payload.contact.name,
    });
    // Log the message
    db.activities.create({
      phone: payload.contact.phone,
      type: 'whatsapp_message',
      content: payload.message.content,
      timestamp: payload.timestamp,
    });
  }

  if (payload.event === 'contact.opted_out') {
    db.contacts.update(
      { phone: payload.contact.phone },
      { whatsapp_opted_out: true }
    );
  }

  res.sendStatus(200);
});`}</pre>
        </div>
        <Callout type="info">Always respond with 200 immediately, even if your processing is async. Use a queue (Redis, BullMQ, etc.) for heavy processing to avoid timeout errors.</Callout>
      </div>
    ),
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("gs-overview");
  const [expandedSections, setExpandedSections] = useState<string[]>(["getting-started"]);
  const [searchQuery, setSearchQuery] = useState("");

  const docs = DOCS();

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const filteredNav = searchQuery.trim()
    ? NAV.map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((section) => section.items.length > 0)
    : NAV;

  const currentDoc = docs[activeSection as keyof ReturnType<typeof DOCS>];

  return (
    <div className="min-h-screen bg-[#EDE8DE]">
      <div className="max-w-7xl mx-auto flex" style={{ minHeight: "calc(100vh - 68px)" }}>

        {/* ── Sidebar ── */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-[#E9EDEF] flex flex-col sticky top-[68px] h-[calc(100vh-68px)] overflow-y-auto">
          {/* Search */}
          <div className="p-4 border-b border-[#E9EDEF]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667781]" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#f5f5f5] border border-[#E9EDEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3">
            {filteredNav.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSections.includes(section.id) || !!searchQuery;
              return (
                <div key={section.id} className="mb-1">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#EDE8DE] transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-[#25D366] flex-shrink-0" />
                    <span className="text-sm font-semibold text-[#111B21] flex-1">{section.title}</span>
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-[#667781]" />
                      : <ChevronRight className="w-3.5 h-3.5 text-[#667781]" />}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 pl-3 border-l-2 border-[#EDE8DE] mt-1 mb-2 space-y-0.5">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => { setActiveSection(item.id); if (!expandedSections.includes(section.id)) setExpandedSections(prev => [...prev, section.id]); }}
                          className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                            activeSection === item.id
                              ? "bg-[#D9FDD3] text-[#075E54] font-semibold"
                              : "text-[#667781] hover:text-[#111B21] hover:bg-[#f5f5f5]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Support box */}
          <div className="p-4 border-t border-[#E9EDEF]">
            <div className="bg-[#075E54] rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-white mb-1">Need help?</p>
              <p className="text-[10px] text-[#D9FDD3] mb-2">Mon–Sat, 10am–7pm IST</p>
              <Link href="/contact" className="text-xs bg-[#25D366] text-white font-bold px-3 py-1.5 rounded-full hover:bg-white hover:text-[#075E54] transition-colors inline-block">
                Contact Support
              </Link>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[#667781] mb-6">
              <span>Docs</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#111B21] font-medium">
                {NAV.flatMap(s => s.items).find(i => i.id === activeSection)?.label || ""}
              </span>
            </div>

            {/* Doc content */}
            <div className="bg-white rounded-2xl border border-[#E9EDEF] p-8 shadow-sm">
              {currentDoc || (
                <div className="text-center py-12 text-[#667781]">
                  <p className="text-lg font-semibold">Page not found</p>
                  <p className="text-sm mt-1">Select a topic from the sidebar.</p>
                </div>
              )}
            </div>

            {/* Prev/Next navigation */}
            <div className="flex justify-between mt-6">
              {(() => {
                const allItems = NAV.flatMap(s => s.items);
                const idx = allItems.findIndex(i => i.id === activeSection);
                const prev = allItems[idx - 1];
                const next = allItems[idx + 1];
                return (
                  <>
                    <div>
                      {prev && (
                        <button onClick={() => setActiveSection(prev.id)} className="flex items-center gap-2 text-sm text-[#667781] hover:text-[#075E54] transition-colors">
                          <ChevronRight className="w-4 h-4 rotate-180" /> {prev.label}
                        </button>
                      )}
                    </div>
                    <div>
                      {next && (
                        <button onClick={() => setActiveSection(next.id)} className="flex items-center gap-2 text-sm text-[#667781] hover:text-[#075E54] transition-colors">
                          {next.label} <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Edit on GitHub / feedback */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#667781]">
              <a href="mailto:support@waptrix.in" className="flex items-center gap-1 hover:text-[#25D366] transition-colors">
                <ExternalLink className="w-3 h-3" /> Was this helpful? Email us
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
