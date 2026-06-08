"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Link2, Shield, AlertTriangle, CheckCircle, Loader2, RefreshCcw } from "lucide-react";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

export default function ConnectPage() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'syncing' | 'connected' | 'error'>('idle');
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (window.FB) {
      setSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function() {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v19.0'
      });
      console.log('FB SDK initialized');
      setSdkLoaded(true);
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('facebook-jssdk');
      if (existing) existing.remove();
    };
  }, []);

  // Listen for FINISH event from Meta popup
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.origin.includes('facebook.com') && !event.origin.includes('waptrix.in')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log('Meta message:', data);

        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH') {
            const { waba_id, phone_number_id } = data.data || {};
            console.log('FINISH event:', { waba_id, phone_number_id });

            if (waba_id && phone_number_id) {
              // FINISH event delivered IDs — use them directly
              saveConnection(waba_id, phone_number_id);
            } else {
              // FINISH event fired but no IDs — fall back to API sync
              console.warn('FINISH event missing IDs, falling back to sync-connection');
              syncConnection();
            }
          } else if (data.event === 'CANCEL') {
            setStatus('idle');
          } else if (data.event === 'ERROR') {
            setStatus('error');
            setErrorMsg(JSON.stringify(data.data));
          }
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Also check URL params on redirect back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wabaId = params.get('waba_id') || params.get('wabaId');
    const phoneNumberId = params.get('phone_number_id') || params.get('phoneNumberId');

    if (wabaId && phoneNumberId) {
      saveConnection(wabaId, phoneNumberId);
      window.history.replaceState({}, '', '/connect');
    }
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch('/api/whatsapp/connection');
      const data = await res.json();
      // API returns camelCase: wabaId, phoneNumberId, phoneNumber, businessName
      if (data?.connected && data.wabaId && data.wabaId !== 'pending') {
        setStatus('connected');
        setConnectionInfo({
          phoneNumber: data.phoneNumber,
          businessName: data.businessName
        });
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error('Check connection error:', err);
      setStatus('idle');
    }
  }

  async function syncConnection() {
    setStatus('syncing');
    try {
      const res = await fetch('/api/whatsapp/sync-connection', { method: 'POST' });
      const data = await res.json();
      console.log('Sync response:', data);
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.error);
      } else {
        setStatus('connected');
        setConnectionInfo({
          phoneNumber: data.phoneNumber || data.phone_number,
          businessName: data.businessName || data.business_name
        });
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Sync failed');
    }
  }

  async function saveConnection(wabaId: string, phoneNumberId: string) {
    setStatus('connecting');
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wabaId, phoneNumberId }),
      });
      const data = await res.json();
      console.log('Connect response:', data);

      if (data.error) {
        // If connect fails, try sync as fallback
        console.warn('saveConnection failed, trying syncConnection fallback:', data.error);
        syncConnection();
      } else {
        setStatus('connected');
        setConnectionInfo({
          phoneNumber: data.phoneNumber || data.phone_number,
          businessName: data.businessName || data.business_name
        });
      }
    } catch (err: any) {
      // Network error — try sync as fallback
      syncConnection();
    }
  }

  function launchSignup() {
    console.log('launchSignup clicked, FB available:', !!window.FB, 'sdkLoaded:', sdkLoaded);

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.warn("Running on localhost. Bypassing Meta SDK directly.");
      setStatus('connecting');
      fetch('/api/whatsapp/store-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: 'MOCK_TOKEN' })
      })
      .then(() => saveConnection('MOCK_WABA', 'MOCK_PHONE'))
      .catch(err => { setStatus('error'); setErrorMsg(err.message); });
      return;
    }

    if (!window.FB) {
      alert('Facebook SDK not loaded yet. Please wait a moment and try again.');
      return;
    }

    setStatus('connecting');

    window.FB.login(function(response: any) {
      console.log('FB.login response:', JSON.stringify(response));

      if (response.authResponse?.accessToken) {
        const accessToken = response.authResponse.accessToken;

        fetch('/api/whatsapp/store-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken })
        })
        .then(r => r.json())
        .then(result => {
          console.log('Token stored, waiting for FINISH event:', result);
          // FINISH event handler will call saveConnection or syncConnection.
          // If popup closes without firing FINISH, user can click "Sync manually".
        })
        .catch(err => {
          console.error('store-token error:', err);
          setStatus('error');
          setErrorMsg(err.message);
        });
      } else {
        console.log('No auth response — user cancelled FB.login');
        setStatus('idle');
      }
    }, {
      scope: 'whatsapp_business_management,whatsapp_business_messaging,public_profile',
      extras: {
        feature: 'whatsapp_embedded_signup',
        setup: {}
      }
    });
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
          {status === 'connected' && <div className="badge-jade flex items-center gap-1.5 py-1 px-3">Connected</div>}
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
            <p className="text-sm text-text-muted leading-relaxed">
              {errorMsg}
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStatus('idle')} className="btn-secondary text-xs">Try Again</button>
              <button onClick={syncConnection} className="btn-primary text-xs flex items-center gap-1.5">
                <RefreshCcw className="w-3.5 h-3.5" /> Sync Manually
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
              disabled={!sdkLoaded}
              className="btn-primary flex items-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sdkLoaded ? "Connect WhatsApp Business" : <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>}
            </button>
          </div>
        )}

        {(status === 'connecting' || status === 'syncing') && (
          <div className="p-8 bg-surface border border-border rounded-2xl flex flex-col items-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-jade animate-spin" />
            <div className="max-w-md">
              <h3 className="font-bold text-lg font-syne">
                {status === 'syncing' ? 'Syncing your WhatsApp account...' : 'Complete the WhatsApp setup in the popup'}
              </h3>
              <p className="text-xs text-text-muted mt-2">
                {status === 'syncing'
                  ? 'Fetching your WhatsApp Business Account details from Meta.'
                  : 'Select your WhatsApp Business Account and phone number in the Facebook popup window. This page will update automatically once you finish.'}
              </p>
              {status === 'connecting' && (
                <p className="text-[11px] text-text-muted mt-4">
                  Finished the popup but nothing happened?{' '}
                  <button onClick={syncConnection} className="text-jade font-bold hover:underline">
                    Click here to sync manually
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
