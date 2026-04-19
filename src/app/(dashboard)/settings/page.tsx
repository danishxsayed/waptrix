"use client";
export const dynamic = "force-dynamic";


import { useState, useEffect } from "react";
import { 
  User, 
  Building, 
  Mail, 
  CreditCard, 
  Webhook, 
  RefreshCcw, 
  Copy,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import axios from "axios";

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: ""
  });

  const supabase = createClient();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setFormData({
            name: user.user_metadata?.full_name || "",
            email: user.email || "",
            company: user.user_metadata?.company || ""
          });

          // Also try to fetch from tenants table if company is missing from metadata
          if (!user.user_metadata?.company) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('company')
              .eq('id', user.id)
              .single();
            
            if (tenant) {
              setFormData(prev => ({ ...prev, company: tenant.company }));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [supabase]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await axios.post('/api/user/profile', {
        name: formData.name,
        company: formData.company
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-jade animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Profile Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-jade/10 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-jade" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne">Profile Settings</h2>
            <p className="text-sm text-text-muted">Manage your personal and company information.</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium ${
            message.type === 'success' 
              ? 'bg-jade/10 border border-jade/20 text-jade' 
              : 'bg-red-500/10 border border-red-500/20 text-red-500'
          }`}>
            {message.text}
          </div>
        )}

        <div className="glass-card grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field w-full pl-10 text-sm" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="email" 
                value={formData.email} 
                disabled 
                className="input-field w-full pl-10 text-sm opacity-50 cursor-not-allowed" 
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Company Name</label>
            <div className="relative">
              <Building className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={formData.company} 
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="input-field w-full pl-10 text-sm" 
              />
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary px-8 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      {/* Plan & Usage Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-info" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-syne">Plan & Usage</h2>
            <p className="text-sm text-text-muted">Manage your subscription and monitor message limits.</p>
          </div>
        </div>

        <div className="glass-card space-y-8">
          <div className="flex items-center justify-between p-6 bg-surface rounded-2xl border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-jade rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-6 h-6 text-background" />
              </div>
              <div>
                <h4 className="font-bold text-lg font-syne">Pro Growth Plan</h4>
                <p className="text-xs text-text-muted">Billed monthly at $49/mo</p>
              </div>
            </div>
            <button className="btn-secondary text-xs">Upgrade Plan</button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h4 className="text-sm font-bold">Message Usage</h4>
                <p className="text-xs text-text-muted mt-1">You have used 75% of your monthly limit.</p>
              </div>
              <span className="text-sm font-bold text-text-primary">7,500 / 10,000</span>
            </div>
            <div className="w-full bg-surface rounded-full h-3 border border-border overflow-hidden">
              <div className="bg-jade h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Webhook Settings Section */}
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
                value={`${process.env.NEXT_PUBLIC_APP_URL || 'https://waptrix.in'}/api/webhooks/meta`} 
                className="input-field flex-1 text-sm bg-surface font-mono" 
              />
              <button 
                onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL || 'https://waptrix.in'}/api/webhooks/meta`)}
                className="btn-secondary p-2.5 flex items-center gap-2 text-xs"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-jade" /> : <Copy className="w-4 h-4" />}
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
                value={process.env.NEXT_PUBLIC_META_VERIFY_TOKEN || 'waptrix_v_882930219'} 
                className="input-field flex-1 text-sm bg-surface font-mono" 
              />
              <button 
                onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_META_VERIFY_TOKEN || 'waptrix_v_882930219')}
                className="btn-secondary p-2.5 flex items-center gap-2 text-xs"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-jade" /> : <Copy className="w-4 h-4" />}
                Copy
              </button>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              * This token must match the &apos;Verify Token&apos; field in your Meta App Webhook configuration.
            </p>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="pt-8 border-t border-border">
        <div className="glass-card border-danger/20 bg-danger/5 flex items-center justify-between p-8">
          <div>
            <h3 className="text-lg font-bold font-syne text-danger">Danger Zone</h3>
            <p className="text-sm text-text-muted mt-1">Permanently delete your account and all associated data.</p>
          </div>
          <button className="bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 transition-all font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}
