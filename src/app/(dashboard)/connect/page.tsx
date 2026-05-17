"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Link2, Shield } from "lucide-react";
import axios from "axios";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

export default function ConnectPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchConnection();
    loadMetaSDK();
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Accept messages from Facebook domains only
      if (
        event.origin !== 'https://www.facebook.com' && 
        event.origin !== 'https://web.facebook.com' &&
        event.origin !== 'https://business.facebook.com'
      ) return

      try {
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data
        
        console.log('Message from Meta:', JSON.stringify(data))

        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH') {
            const { waba_id, phone_number_id } = data.data
            console.log('Signup finished:', { waba_id, phone_number_id })
            handleFinish(waba_id, phone_number_id)
          } else if (data.event === 'CANCEL') {
            console.log('Signup cancelled')
            setConnecting(false)
          } else if (data.event === 'ERROR') {
            console.error('Signup error:', data.data)
            setConnecting(false)
            alert('Meta signup error: ' + JSON.stringify(data.data))
          }
        }
      } catch (err) {
        console.log('Could not parse message:', event.data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, []);

  const fetchConnection = async () => {
    try {
      const res = await axios.get("/api/whatsapp/connection", {
        timeout: 10000 // 10s timeout to prevent hanging loop
      });
      if (res.data) {
        setIsConnected(true);
        setConnectionData(res.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch connection", err);
      if (err.code === 'ECONNABORTED') {
        console.error("Request timed out - check backend connectivity");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetaSDK = () => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID || 'YOUR_APP_ID',
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
    };

    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  };

  const launchEmbeddedSignup = () => {
    // Explicit Localhost Bypass because Meta deeply throws async errors on HTTP
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.warn("Running on localhost. Bypassing Meta SDK directly.");
      handleFinish("MOCK_WABA_ID", "MOCK_PHONE_ID");
      return;
    }

    try {
      if (!window.FB) throw new Error("FB not loaded");
      
      setConnecting(true);
      window.FB.login(function(response: any) {
        console.log('FB.login response:', JSON.stringify(response))
        
        if (response.authResponse) {
          const code = response.authResponse.code
          console.log('Auth code received:', code)
          
          if (!code) {
            alert('No authorization code received from Meta')
            setConnecting(false);
            return
          }
          
          // Call exchange-token API
          fetch('/api/whatsapp/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          })
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              alert('Connection failed: ' + data.error)
              setConnecting(false);
            } else {
              console.log('Token exchanged successfully, waiting for FINISH message');
            }
          })
          .catch(err => {
            alert('Connection failed: ' + err.message);
            setConnecting(false);
          })
        } else {
          alert('Facebook login cancelled or failed')
          setConnecting(false)
        }
      }, {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          feature: 'whatsapp_embedded_signup',
          setup: {}
        }
      })
    } catch (err) {
      console.error("Meta SDK failed:", err);
      setConnecting(false);
    }
  };

  async function handleFinish(wabaId: string, phoneNumberId: string) {
    let retries = 5;
    let delay = 1500; // 1.5 seconds

    while (retries > 0) {
      try {
        console.log(`Calling connect API with:`, { wabaId, phoneNumberId }, `(Retries left: ${retries})`)
        
        const res = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wabaId, phoneNumberId })
        })
        
        const data = await res.json()
        console.log('Connect API response:', data)
        
        if (!res.ok) {
          // If it fails because of missing token (race condition), retry
          if (data.error && (data.error.includes('No access token found') || data.error.includes('reconnect'))) {
            throw new Error(data.error)
          }
          throw new Error(data.error || 'Connection failed')
        }
        
        alert('WhatsApp connected successfully!')
        window.location.reload()
        return;
      } catch (err: any) {
        console.warn(`handleFinish attempt failed:`, err.message)
        retries--;
        if (retries === 0) {
          console.error('handleFinish error:', err)
          alert('Failed to connect: ' + err.message)
          setConnecting(false)
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-jade border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="glass-card">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isConnected ? 'bg-jade/10' : 'bg-surface border border-border'}`}>
              <Link2 className={`w-7 h-7 ${isConnected ? 'text-jade' : 'text-text-muted'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-syne">WhatsApp Connection</h2>
              <p className="text-sm text-text-muted">Connect your official WhatsApp Business Account</p>
            </div>
          </div>
          {isConnected && <div className="badge-jade flex items-center gap-1.5 py-1 px-3">Connected</div>}
        </div>
        {!isConnected ? (
          <div className="p-6 bg-jade/5 border border-jade/10 rounded-2xl flex flex-col items-center text-center space-y-4">
            <Shield className="w-10 h-10 text-jade opacity-50" />
            <div className="max-w-md">
              <h3 className="font-bold text-lg font-syne">Your number belongs to you.</h3>
              <p className="text-xs text-text-muted mt-2">We use Meta's official Cloud API. We never own your phone number.</p>
            </div>
            <button 
              onClick={launchEmbeddedSignup} 
              disabled={connecting}
              className="btn-primary flex items-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Connecting...
                </>
              ) : (
                "Connect WhatsApp Account"
              )}
            </button>
          </div>
        ) : (
          <div className="p-6 bg-surface border border-border rounded-2xl">
             <p className="text-sm font-semibold">Business: {connectionData.business_name}</p>
             <p className="text-sm text-text-muted">Number: {connectionData.phone_number}</p>
          </div>
        )}
      </div>
    </div>
  );
}

