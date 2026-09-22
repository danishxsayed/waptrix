"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import {
  Webhook,
  RefreshCcw,
  Copy,
  Trash2,
  CheckCircle2,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function IntegrationsPage() {
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // GHL integration state
  const [ghlToken, setGhlToken] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");
  const [ghlConnected, setGhlConnected] = useState(false);
  const [ghlSaving, setGhlSaving] = useState(false);
  const [ghlMsg, setGhlMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // CRM Outbound Webhook state
  const [crmWebhookUrl, setCrmWebhookUrl] = useState("");
  const [crmWebhookSecret, setCrmWebhookSecret] = useState("");
  const [crmWebhookSaving, setCrmWebhookSaving] = useState(false);
  const [crmWebhookMsg, setCrmWebhookMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [crmSecretVisible, setCrmSecretVisible] = useState(false);
  const [crmSecretCopied, setCrmSecretCopied] = useState(false);

  useEffect(() => {
    // Load GHL config
    fetch("/api/settings/ghl")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.connected) setGhlConnected(true);
        if (d?.ghl_location_id) setGhlLocationId(d.ghl_location_id);
      })
      .catch(() => {});

    // Load CRM webhook config
    fetch("/api/settings/webhook")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.webhook_url) setCrmWebhookUrl(d.webhook_url);
        if (d?.webhook_secret) setCrmWebhookSecret(d.webhook_secret);
      })
      .catch(() => {});
  }, []);

  const copyCallbackUrl = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const copyVerifyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">

      {/* ── Webhook Configuration ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
            <Webhook className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne">Webhook Configuration</h2>
            <p className="text-sm text-text-muted">Point Meta&apos;s webhooks to this URL to receive status events.</p>
          </div>
        </div>

        <div className="glass-card space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Callback URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${process.env.NEXT_PUBLIC_APP_URL || "https://waptrix.in"}/api/webhooks/meta`}
                className="input-field flex-1 text-sm bg-surface font-mono"
              />
              <button
                onClick={() =>
                  copyCallbackUrl(
                    `${process.env.NEXT_PUBLIC_APP_URL || "https://waptrix.in"}/api/webhooks/meta`
                  )
                }
                className="btn-secondary p-2.5 flex items-center gap-2 text-xs"
              >
                {copiedCallback ? <CheckCircle2 className="w-4 h-4 text-jade" /> : <Copy className="w-4 h-4" />}
                Copy
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Verify Token</label>
              <button className="text-[10px] font-bold text-jade flex items-center gap-1 hover:underline">
                <RefreshCcw className="w-3 h-3" /> Regenerate Secret
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                readOnly
                value={process.env.NEXT_PUBLIC_META_VERIFY_TOKEN || "waptrix_v_882930219"}
                className="input-field flex-1 text-sm bg-surface font-mono"
              />
              <button
                onClick={() =>
                  copyVerifyToken(process.env.NEXT_PUBLIC_META_VERIFY_TOKEN || "waptrix_v_882930219")
                }
                className="btn-secondary p-2.5 flex items-center gap-2 text-xs"
              >
                {copiedToken ? <CheckCircle2 className="w-4 h-4 text-jade" /> : <Copy className="w-4 h-4" />}
                Copy
              </button>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              * This token must match the &apos;Verify Token&apos; field in your Meta App Webhook configuration.
            </p>
          </div>
        </div>
      </section>

      {/* ── CRM / Outbound Webhook ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-jade/10 rounded-xl flex items-center justify-center">
            <Webhook className="w-5 h-5 text-jade" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne">CRM Integration</h2>
            <p className="text-sm text-text-muted">Send real-time WhatsApp events to your CRM or any HTTP endpoint.</p>
          </div>
        </div>

        <div className="glass-card space-y-5">
          <div className="bg-jade/5 border border-jade/20 rounded-xl p-4 text-sm text-text-muted leading-relaxed">
            Waptrix will POST a signed JSON payload to your URL for these events:
            <span className="font-mono text-xs text-jade ml-1">
              message.received · message.sent · message.status · conversation.created · contact.opted_out · contact.opted_in
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Your CRM Webhook URL</label>
            <input
              type="url"
              value={crmWebhookUrl}
              onChange={(e) => setCrmWebhookUrl(e.target.value)}
              placeholder="https://your-crm.com/webhooks/waptrix"
              className="input-field w-full text-sm font-mono"
            />
          </div>

          {crmWebhookSecret && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Signing Secret</label>
              <div className="flex gap-2">
                <input
                  type={crmSecretVisible ? "text" : "password"}
                  readOnly
                  value={crmWebhookSecret}
                  className="input-field flex-1 text-sm bg-surface font-mono"
                />
                <button
                  onClick={() => setCrmSecretVisible((v) => !v)}
                  className="btn-secondary p-2.5 text-xs"
                  title={crmSecretVisible ? "Hide" : "Show"}
                >
                  {crmSecretVisible ? "🙈" : "👁️"}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(crmWebhookSecret);
                    setCrmSecretCopied(true);
                    setTimeout(() => setCrmSecretCopied(false), 2000);
                  }}
                  className="btn-secondary p-2.5 flex items-center gap-1 text-xs"
                >
                  {crmSecretCopied ? <CheckCircle2 className="w-4 h-4 text-jade" /> : <Copy className="w-4 h-4" />}
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-text-muted">
                Verify incoming requests using the <span className="font-mono">X-Waptrix-Signature</span> header
                (HMAC-SHA256).
              </p>
            </div>
          )}

          {crmWebhookMsg && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                crmWebhookMsg.type === "success" ? "bg-jade/10 text-jade" : "bg-red-50 text-red-600"
              }`}
            >
              {crmWebhookMsg.type === "success" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {crmWebhookMsg.text}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              disabled={crmWebhookSaving || !crmWebhookUrl}
              onClick={async () => {
                setCrmWebhookSaving(true);
                setCrmWebhookMsg(null);
                try {
                  const res = await fetch("/api/settings/webhook", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ webhook_url: crmWebhookUrl }),
                  });
                  const d = await res.json();
                  if (!res.ok) throw new Error(d.error);
                  if (d.webhook_secret) setCrmWebhookSecret(d.webhook_secret);
                  setCrmWebhookMsg({ type: "success", text: "Webhook saved! Events will now be sent to your CRM." });
                } catch (e: any) {
                  setCrmWebhookMsg({ type: "error", text: e.message });
                } finally {
                  setCrmWebhookSaving(false);
                }
              }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {crmWebhookSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Webhook
            </button>

            {crmWebhookSecret && (
              <button
                disabled={crmWebhookSaving}
                onClick={async () => {
                  if (!confirm("Regenerate signing secret? Your CRM will need to be updated with the new secret."))
                    return;
                  setCrmWebhookSaving(true);
                  setCrmWebhookMsg(null);
                  try {
                    const res = await fetch("/api/settings/webhook", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ webhook_url: crmWebhookUrl, regenerate_secret: true }),
                    });
                    const d = await res.json();
                    if (!res.ok) throw new Error(d.error);
                    setCrmWebhookSecret(d.webhook_secret);
                    setCrmWebhookMsg({ type: "success", text: "Secret regenerated. Update your CRM immediately." });
                  } catch (e: any) {
                    setCrmWebhookMsg({ type: "error", text: e.message });
                  } finally {
                    setCrmWebhookSaving(false);
                  }
                }}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <RefreshCcw className="w-4 h-4" /> Regenerate Secret
              </button>
            )}

            {crmWebhookUrl && (
              <button
                disabled={crmWebhookSaving}
                onClick={async () => {
                  if (!confirm("Remove webhook? Events will stop being sent to your CRM.")) return;
                  await fetch("/api/settings/webhook", { method: "DELETE" });
                  setCrmWebhookUrl("");
                  setCrmWebhookSecret("");
                  setCrmWebhookMsg({ type: "success", text: "Webhook removed." });
                }}
                className="btn-secondary flex items-center gap-2 text-sm text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── GoHighLevel Integration ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne">GoHighLevel Integration</h2>
            <p className="text-sm text-text-muted">
              Sync inbound WhatsApp messages to GHL contacts &amp; conversations — free, no workflow triggers needed.
            </p>
          </div>
        </div>

        <div className="glass-card space-y-5">
          {ghlConnected ? (
            <div className="flex items-center gap-3 p-4 bg-jade/5 border border-jade/20 rounded-xl">
              <CheckCircle className="w-5 h-5 text-jade shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-jade">GoHighLevel Connected</p>
                <p className="text-xs text-text-muted mt-0.5">Location ID: {ghlLocationId}</p>
                <p className="text-xs text-text-muted">
                  Inbound WhatsApp messages are being synced to GHL automatically.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setGhlSaving(true);
                    setGhlMsg(null);
                    try {
                      const res = await fetch("/api/settings/ghl/test", { method: "POST" });
                      const d = await res.json();
                      setGhlMsg({
                        type: d.success ? "success" : "error",
                        text: d.message || (d.success ? "Test passed!" : JSON.stringify(d.steps)),
                      });
                    } catch (e: any) {
                      setGhlMsg({ type: "error", text: e.message });
                    } finally {
                      setGhlSaving(false);
                    }
                  }}
                  disabled={ghlSaving}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  {ghlSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                  Test
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Disconnect GoHighLevel? Messages will no longer sync.")) return;
                    await fetch("/api/settings/ghl", { method: "DELETE" });
                    setGhlConnected(false);
                    setGhlToken("");
                    setGhlLocationId("");
                    setGhlMsg({ type: "success", text: "GoHighLevel disconnected." });
                  }}
                  className="btn-secondary text-xs text-red-500 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-sm text-text-muted leading-relaxed">
                Connect using a{" "}
                <span className="font-bold text-text-primary">GoHighLevel Private Integration token</span>. Go to
                GHL → Settings → Private Integrations → Create new Integration. Select scopes:{" "}
                <span className="font-mono text-xs text-orange-500">
                  contacts.write · conversations.write · conversations/message.write
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Private Integration Token
                </label>
                <input
                  type="password"
                  value={ghlToken}
                  onChange={(e) => setGhlToken(e.target.value)}
                  placeholder="Paste your GHL Private Integration token"
                  className="input-field w-full text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Location ID (Sub-Account ID)
                </label>
                <input
                  type="text"
                  value={ghlLocationId}
                  onChange={(e) => setGhlLocationId(e.target.value)}
                  placeholder="e.g. ve9EPM428h8vShlRW1KT"
                  className="input-field w-full text-sm font-mono"
                />
                <p className="text-[10px] text-text-muted">
                  Find it in GHL → Settings → Business Profile → Location ID
                </p>
              </div>
            </>
          )}

          {ghlMsg && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                ghlMsg.type === "success" ? "bg-jade/10 text-jade" : "bg-red-50 text-red-600"
              }`}
            >
              {ghlMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {ghlMsg.text}
            </div>
          )}

          {!ghlConnected && (
            <button
              disabled={ghlSaving || !ghlToken || !ghlLocationId}
              onClick={async () => {
                setGhlSaving(true);
                setGhlMsg(null);
                try {
                  const res = await fetch("/api/settings/ghl", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ghl_token: ghlToken, ghl_location_id: ghlLocationId }),
                  });
                  const d = await res.json();
                  if (!res.ok) throw new Error(d.error);
                  setGhlConnected(true);
                  setGhlToken("");
                  setGhlMsg({
                    type: "success",
                    text: "GoHighLevel connected! Inbound messages will now sync automatically.",
                  });
                } catch (e: any) {
                  setGhlMsg({ type: "error", text: e.message });
                } finally {
                  setGhlSaving(false);
                }
              }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {ghlSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {ghlSaving ? "Connecting..." : "Connect GoHighLevel"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
