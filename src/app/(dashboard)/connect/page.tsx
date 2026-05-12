"use client";
export const dynamic = "force-dynamic";


import { useState, useEffect } from "react";
import { Link2, Shield, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
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

  useEffect(() => {
    fetchConnection();
    loadMetaSDK();
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
      handlePostSignup("MOCK_DEV_CODE");
      return;
    }

    try {
      if (!window.FB) throw new Error("FB not loaded");
      
      window.FB.login(function(response: any) {
        console.log('FB.login response:', JSON.stringify(response))
        
        if (response.authResponse) {
          const code = response.authResponse.code
          console.log('Auth code received:', code)
          
          if (!code) {
            alert('No authorization code received from Meta')
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
            } else {
              alert('WhatsApp connected!')
              fetchConnection()
            }
          })
          .catch(err => alert('Connection failed: ' + err.message))
        } else {
          alert('Facebook login cancelled or failed')
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
    }
  };

  const handlePostSignup = async (code: string) => {
    setIsLoading(true);
    try {
      await axios.post("/api/whatsapp/connect", { code });
      fetchConnection();
    } catch (err: any) {
      console.error("Signup failed", err);
      alert("Failed to connect: " + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

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
            <button onClick={launchEmbeddedSignup} className="btn-primary flex items-center gap-2 mt-4">Connect WhatsApp Account</button>
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
