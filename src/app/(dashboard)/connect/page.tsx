"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Link2, Shield, AlertTriangle, CheckCircle, Loader2, ExternalLink, KeyRound } from "lucide-react";

export default function ConnectPage() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'need-phone-id' | 'connected' | 'error'>('idle');
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [pendingCode, setPendingCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Phone registration state
  const [showRegister, setShowRegister] = useState(false);
  const [registerPin, setRegisterPin] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Webhook subscription state
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState("");
  const [showWabaInput, setShowWabaInput] = useState(false);
  const [manualWabaId, setManualWabaId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const wabaId = params.get('waba_id');
    const phoneId = params.get('phone_number_id');
    const errorCode = params.get('error');

    if (params.toString()) {
      window.history.replaceState({}, '', '/connect');
    }

    if (errorCode) {
      setStatus('idle');
      return;
    }

    if (code && wabaId && phoneId) {
      handleOAuthCallback(code, wabaId, phoneId);
    } else if (code) {
      setPendingCode(code);
      setStatus('need-phone-id');
    } else {
      checkConnection();
    }
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch('/api/whatsapp/connection');
      const data = await res.json();
      if (data?.connected && data.phoneNumberId && data.phoneNumberId !== 'pending') {
        setStatus('connected');
        setConnectionInfo({ phoneNumber: data.phoneNumber, businessName: data.businessName });
      } else {
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
    }
  }

  async function handleOAuthCallback(code: string, wabaId: string, phoneId: string) {
    setStatus('connecting');
    try {
      const res = await fetch('/api/whatsapp/oauth-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, wabaId, phoneNumberId: phoneId }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.error);
      } else {
        setStatus('connected');
        if (data.phoneNumber || data.businessName) {
          setConnectionInfo({ phoneNumber: data.phoneNumber, businessName: data.businessName });
        } else {
          const conn = await fetch('/api/whatsapp/connection').then(r => r.json()).catch(() => null);
          setConnectionInfo({ phoneNumber: conn?.phoneNumber || '', businessName: conn?.businessName || '' });
        }
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Connection failed');
    }
  }

  async function handleManualConnect() {
    if (!phoneNumberId.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/whatsapp/oauth-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pendingCode, wabaId: 'from-phone-id', phoneNumberId: phoneNumberId.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setStatus('connected');
        if (data.phoneNumber || data.businessName) {
          setConnectionInfo({ phoneNumber: data.phoneNumber, businessName: data.businessName });
        } else {
          const conn = await fetch('/api/whatsapp/connection').then(r => r.json()).catch(() => null);
          setConnectionInfo({ phoneNumber: conn?.phoneNumber || '', businessName: conn?.businessName || '' });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  function launchSignup() {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/connect`);
    const scope = 'whatsapp_business_management,whatsapp_business_messaging,business_management,public_profile';
    const extras = encodeURIComponent(JSON.stringify({ feature: 'whatsapp_embedded_signup', setup: {} }));
    window.location.href = `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&extras=${extras}`;
  }

  async function handleDisconnect() {
    try {
      await fetch('/api/whatsapp/connection', { method: 'DELETE' });
      setStatus('idle');
      setConnectionInfo(null);
      setShowRegister(false);
      setRegisterSuccess(false);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to disconnect');
    }
  }

  async function handleSubscribeWebhook(wabaIdOverride?: string) {
    setIsSubscribing(true);
    setSubscribeMsg('');
    try {
      const body = wabaIdOverride ? { wabaId: wabaIdOverride } : {};
      const res = await fetch('/api/whatsapp/subscribe-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 422 && data.error === 'needs-waba-id') {
        setShowWabaInput(true);
        setSubscribeMsg('');
      } else if (!res.ok) {
        setSubscribeMsg(`Error: ${data.error || 'Subscription failed'}`);
      } else {
        setSubscribeMsg('Webhook subscribed! Messages will now appear in your inbox.');
        setShowWabaInput(false);
        setManualWabaId('');
      }
    } catch (err: any) {
      setSubscribeMsg(`Error: ${err.message}`);
    } finally {
      setIsSubscribing(false);
    }
  }

  async function handleRegisterPhone() {
    if (!/^\d{6}$/.test(registerPin)) {
      setRegisterError('Enter a 6-digit PIN');
      return;
    }
    setIsRegistering(true);
    setRegisterError('');
    try {
      const res = await fetch('/api/whatsapp/register-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: registerPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || 'Registration failed');
      } else {
        setRegisterSuccess(true);
        setShowRegister(false);
        setRegisterPin('');
      }
    } catch (err: any) {
      setRegisterError(err.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
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

        {/* Connected */}
        {status === 'connected' && connectionInfo && (
          <div className="space-y-4">
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
              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    onClick={() => { setShowRegister(!showRegister); setRegisterError(''); }}
                    className="text-xs font-bold text-jade hover:text-jade/80 hover:underline transition-all flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {registerSuccess ? 'Phone Registered ✓' : 'Register Phone Number (fix Pending status)'}
                  </button>
                  <button
                    onClick={() => handleSubscribeWebhook()}
                    disabled={isSubscribing}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {isSubscribing ? 'Subscribing...' : 'Subscribe Webhook (fix inbox)'}
                  </button>
                </div>
                <button onClick={handleDisconnect} className="text-xs font-bold text-red-500 hover:text-red-400 hover:underline transition-all">
                  Disconnect Account
                </button>
              </div>
              {subscribeMsg && (
                <p className={`text-xs mt-1 ${subscribeMsg.startsWith('Error') ? 'text-red-400' : 'text-jade'}`}>
                  {subscribeMsg}
                </p>
              )}

            {showWabaInput && (
              <div className="mt-4 p-4 bg-surface border border-border rounded-xl space-y-3">
                <p className="text-xs font-bold text-text-primary">Enter your WhatsApp Business Account (WABA) ID</p>
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-text-muted space-y-1">
                  <p className="font-bold text-amber-400">How to find your WABA ID:</p>
                  <p>1. Go to <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noopener noreferrer" className="text-jade hover:underline inline-flex items-center gap-0.5">Meta Business Settings <ExternalLink className="w-3 h-3" /></a></p>
                  <p>2. Click your WhatsApp Business Account</p>
                  <p>3. Copy the numeric ID shown (e.g. 123456789012345)</p>
                  <p className="text-text-muted/60">Note: This is different from your Phone Number ID</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualWabaId}
                    onChange={e => setManualWabaId(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 123456789012345"
                    className="input-field flex-1 text-sm font-mono"
                  />
                  <button
                    onClick={() => handleSubscribeWebhook(manualWabaId)}
                    disabled={!manualWabaId.trim() || isSubscribing}
                    className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubscribing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Subscribe
                  </button>
                </div>
              </div>
            )}
            </div>

            {/* Register Phone Panel */}
            {showRegister && !registerSuccess && (
              <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-5 h-5 text-jade" />
                  <p className="font-bold font-syne">Register Phone Number with Meta</p>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-text-muted space-y-1.5">
                  <p className="font-bold text-amber-500 uppercase tracking-wider">Why is this needed?</p>
                  <p>Meta requires phone numbers to be registered via the Cloud API before they can send/receive messages. This fixes the "Pending" status in WhatsApp Manager.</p>
                  <p className="mt-2 font-bold text-text-primary">Set a 6-digit 2FA PIN for your WhatsApp Business number. Remember this PIN — you'll need it if you ever re-register.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">2FA PIN (6 digits)</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={registerPin}
                    onChange={e => setRegisterPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 123456"
                    className="input-field w-full text-sm font-mono tracking-widest"
                  />
                  {registerError && <p className="text-xs text-red-500">{registerError}</p>}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleRegisterPhone}
                    disabled={isRegistering || registerPin.length !== 6}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {isRegistering && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isRegistering ? 'Registering...' : 'Register Phone Number'}
                  </button>
                  <button onClick={() => { setShowRegister(false); setRegisterPin(''); setRegisterError(''); }} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {registerSuccess && (
              <div className="p-4 bg-jade/5 border border-jade/10 rounded-2xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-jade" />
                <p className="text-sm text-jade font-semibold">Phone number registered successfully! The "Pending" status in Meta should update within a few minutes.</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <p className="text-red-500 font-bold font-syne text-lg">Something went wrong</p>
            </div>
            <p className="text-sm text-text-muted">{errorMsg}</p>
            <button onClick={() => { setStatus('idle'); setErrorMsg(''); }} className="btn-secondary text-xs">Try Again</button>
          </div>
        )}

        {/* Idle */}
        {status === 'idle' && (
          <div className="p-8 bg-jade/5 border border-jade/10 rounded-2xl flex flex-col items-center text-center space-y-4">
            <Shield className="w-10 h-10 text-jade opacity-50" />
            <div className="max-w-md">
              <h3 className="font-bold text-lg font-syne">Your number belongs to you.</h3>
              <p className="text-xs text-text-muted mt-2">
                We use Meta's official Cloud API. We never own your phone number. Your messages remain private and secure.
              </p>
            </div>
            <button onClick={launchSignup} className="btn-primary flex items-center gap-2 mt-4">
              Connect WhatsApp Business
            </button>
          </div>
        )}

        {/* Connecting */}
        {status === 'connecting' && (
          <div className="p-8 bg-surface border border-border rounded-2xl flex flex-col items-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-jade animate-spin" />
            <h3 className="font-bold text-lg font-syne">Completing your WhatsApp connection...</h3>
          </div>
        )}

        {/* Manual Phone Number ID entry */}
        {status === 'need-phone-id' && (
          <div className="p-6 bg-surface border border-border rounded-2xl space-y-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-jade" />
              <p className="font-bold font-syne">Facebook account authorised. One more step.</p>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Enter your <strong className="text-text-primary">Phone Number ID</strong> from Meta Business Manager to complete the connection.
            </p>

            <div className="p-4 bg-jade/5 border border-jade/10 rounded-xl space-y-2 text-xs text-text-muted">
              <p className="font-bold text-text-primary text-xs uppercase tracking-wider mb-2">How to find your Phone Number ID</p>
              <p>1. Go to <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noopener noreferrer" className="text-jade hover:underline inline-flex items-center gap-0.5">Meta Business Settings <ExternalLink className="w-3 h-3" /></a></p>
              <p>2. Click on your <strong>WhatsApp Business Account</strong></p>
              <p>3. Click <strong>WhatsApp Manager</strong> → <strong>Phone Numbers</strong></p>
              <p>4. Copy the numeric <strong>Phone number ID</strong> (not the phone number itself)</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Phone Number ID</label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={e => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="input-field w-full text-sm font-mono"
              />
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleManualConnect}
                disabled={!phoneNumberId.trim() || isSaving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? 'Connecting...' : 'Complete Connection'}
              </button>
              <button onClick={() => { setStatus('idle'); setErrorMsg(''); }} className="btn-secondary text-sm">
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
