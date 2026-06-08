"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Link2, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function ConnectPage() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // On mount: check existing connection, then check if Meta redirected back with code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const wabaId = params.get('waba_id');
    const phoneNumberId = params.get('phone_number_id');
    const errorCode = params.get('error');

    // Clean URL immediately
    if (params.toString()) {
      window.history.replaceState({}, '', '/connect');
    }

    if (errorCode) {
      // User cancelled or Meta returned error
      setStatus('idle');
      return;
    }

    if (code && wabaId && phoneNumberId) {
      // Meta redirected back after Embedded Signup — exchange code and save
      handleOAuthCallback(code, wabaId, phoneNumberId);
    } else {
      checkConnection();
    }
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch('/api/whatsapp/connection');
      const data = await res.json();
      if (data?.connected && data.wabaId && data.wabaId !== 'pending') {
        setStatus('connected');
        setConnectionInfo({ phoneNumber: data.phoneNumber, businessName: data.businessName });
      } else {
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
    }
  }

  async function handleOAuthCallback(code: string, wabaId: string, phoneNumberId: string) {
    setStatus('connecting');
    try {
      const res = await fetch('/api/whatsapp/oauth-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, wabaId, phoneNumberId }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.error);
      } else {
        setStatus('connected');
        setConnectionInfo({ phoneNumber: data.phoneNumber, businessName: data.businessName });
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Connection failed');
    }
  }

  function launchSignup() {
    // Build Meta OAuth redirect URL — this is the reliable Embedded Signup flow.
    // Meta will redirect back to /connect with ?code=xxx&waba_id=xxx&phone_number_id=xxx
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/connect`);
    const scope = 'whatsapp_business_management,whatsapp_business_messaging,public_profile';
    const extras = encodeURIComponent(JSON.stringify({ feature: 'whatsapp_embedded_signup', setup: {} }));

    const url = `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&extras=${extras}`;

    // Redirect the full page (not popup) — most reliable for Embedded Signup
    window.location.href = url;
  }

  async function handleDisconnect() {
    try {
      await fetch('/api/whatsapp/connection', { method: 'DELETE' });
      setStatus('idle');
      setConnectionInfo(null);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to disconnect');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="glass-card">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${status === 'connected' ? 'bg-jade/10' : 'bg-surface border border-border'}`}>
              <Link2 className={`w-7 h-7 ${status === 'connected' ? 'text-jade' : 'text-text-muted'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-syne">WhatsApp Connection</h2>
              <p className="text-sm text-text-muted">Connect your official WhatsApp Business Account</p>
            </div>
          </div>
          {status === 'connected' && (
            <div className="badge-jade flex items-center gap-1.5 py-1 px-3">Connected</div>
          )}
        </div>

        {status === 'connected' && connectionInfo && (
          <div className="p-6 bg-jade/5 border border-jade/10 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-jade" />
              <p className="text-jade font-bold font-syne text-lg">WhatsApp Connected Successfully!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-sm">
              <div className="p-4 bg-surface border border-border rounded-xl">
                <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Display Phone Number</span>
                <p className="font-semibold text-text-primary mt-1">{connectionInfo.phoneNumber || '—'}</p>
              </div>
              <div className="p-4 bg-surface border border-border rounded-xl">
                <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Business Name</span>
                <p className="font-semibold text-text-primary mt-1">{connectionInfo.businessName || '—'}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleDisconnect}
                className="text-xs font-bold text-red-500 hover:text-red-400 hover:underline transition-all"
              >
                Disconnect Account
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <p className="text-red-500 font-bold font-syne text-lg">Something went wrong</p>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{errorMsg}</p>
            <div className="flex justify-start pt-2">
              <button onClick={() => setStatus('idle')} className="btn-secondary text-xs">
                Try Again
              </button>
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div className="p-8 bg-jade/5 border border-jade/10 rounded-2xl flex flex-col items-center text-center space-y-4">
            <Shield className="w-10 h-10 text-jade opacity-50" />
            <div className="max-w-md">
              <h3 className="font-bold text-lg font-syne">Your number belongs to you.</h3>
              <p className="text-xs text-text-muted mt-2">
                We use Meta's official Cloud API. We never own your phone number. Your messages remain private and secure.
              </p>
            </div>
            <button
              onClick={launchSignup}
              className="btn-primary flex items-center gap-2 mt-4"
            >
              Connect WhatsApp Business
            </button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="p-8 bg-surface border border-border rounded-2xl flex flex-col items-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-jade animate-spin" />
            <div className="max-w-md">
              <h3 className="font-bold text-lg font-syne">Completing your WhatsApp connection...</h3>
              <p className="text-xs text-text-muted mt-2">
                Saving your WhatsApp Business Account. Please wait.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
