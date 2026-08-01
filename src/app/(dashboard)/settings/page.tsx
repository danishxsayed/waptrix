"use client";
export const dynamic = "force-dynamic";


import { useState, useEffect, useRef, useMemo } from "react";
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
  Loader2,
  Camera,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import axios from "axios";

interface WhatsAppProfile {
  about: string;
  description: string;
  profile_picture_url: string | null;
  vertical: string;
  email: string;
  websites: string[];
  phone_number: string;
  business_name: string;
  last_sync: string | null;
}

export default function SettingsPage() {
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: ""
  });

  // WhatsApp Profile state
  const [waProfile, setWaProfile] = useState<WhatsAppProfile | null>(null);
  const [waProfileLoading, setWaProfileLoading] = useState(true);
  const [waProfileError, setWaProfileError] = useState<string | null>(null);
  const [waProfileNeedsRegistration, setWaProfileNeedsRegistration] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [registrationDone, setRegistrationDone] = useState(false);
  // Migration flow (for numbers on personal WhatsApp)
  const [showMigration, setShowMigration] = useState(false);
  const [migrationStep, setMigrationStep] = useState<'request' | 'verify'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [waAbout, setWaAbout] = useState("");
  const [waIsSaving, setWaIsSaving] = useState(false);
  const [waMessage, setWaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [picUploading, setPicUploading] = useState(false);
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => createClient(), []);

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

  useEffect(() => {
    fetchWaProfile();
  }, []);

  async function fetchWaProfile() {
    setWaProfileLoading(true);
    setWaProfileError(null);
    setWaProfileNeedsRegistration(false);
    try {
      const res = await axios.get('/api/whatsapp/profile');
      setWaProfile(res.data);
      setWaAbout(res.data.about || '');
    } catch (err: any) {
      const resData = err.response?.data;
      if (resData?.needs_registration) {
        setWaProfileNeedsRegistration(true);
      }
      setWaProfileError(resData?.error || 'Failed to load WhatsApp profile');
    } finally {
      setWaProfileLoading(false);
    }
  }

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

  const handleWaSave = async () => {
    setWaIsSaving(true);
    setWaMessage(null);
    try {
      await axios.post('/api/whatsapp/profile', { about: waAbout });
      setWaMessage({ type: 'success', text: 'WhatsApp profile updated!' });
      fetchWaProfile();
    } catch (err: any) {
      setWaMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update WhatsApp profile' });
    } finally {
      setWaIsSaving(false);
    }
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPicPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setPicUploading(true);
    setWaMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await axios.post('/api/whatsapp/profile/picture', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setWaMessage({ type: 'success', text: 'Profile picture updated on WhatsApp!' });
      // Refresh profile to get new picture URL from Meta
      setTimeout(() => fetchWaProfile(), 3000);
    } catch (err: any) {
      setWaMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload picture' });
      setPicPreview(null);
    } finally {
      setPicUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  async function handleRequestOtp() {
    setIsMigrating(true);
    setMigrationMsg(null);
    try {
      await axios.post('/api/whatsapp/request-verification-code', { codeMethod: 'SMS' });
      setMigrationStep('verify');
      setMigrationMsg({ type: 'success', text: 'Code sent! Check your SMS (or WhatsApp if still active).' });
    } catch (err: any) {
      setMigrationMsg({ type: 'error', text: err.response?.data?.error || 'Failed to send code' });
    } finally {
      setIsMigrating(false);
    }
  }

  async function handleVerifyOtp() {
    if (!/^\d{6}$/.test(otpCode)) {
      setMigrationMsg({ type: 'error', text: 'Enter the 6-digit code you received' });
      return;
    }
    setIsMigrating(true);
    setMigrationMsg(null);
    try {
      await axios.post('/api/whatsapp/verify-code', { code: otpCode });
      setRegistrationDone(true);
      setShowMigration(false);
      setMigrationMsg(null);
      // Poll for profile to load
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const profileRes = await axios.get('/api/whatsapp/profile');
          setWaProfile(profileRes.data);
          setWaAbout(profileRes.data.about || '');
          setWaProfileError(null);
          setWaProfileNeedsRegistration(false);
          clearInterval(poll);
        } catch {
          if (attempts >= 12) clearInterval(poll);
        }
      }, 10000);
    } catch (err: any) {
      setMigrationMsg({ type: 'error', text: err.response?.data?.error || 'Verification failed. Check the code and try again.' });
    } finally {
      setIsMigrating(false);
    }
  }

  async function handleAutoRegister() {
    setIsRegistering(true);
    setRegisterMsg(null);
    try {
      const res = await axios.post('/api/whatsapp/register-phone', {});
      if (res.data.success) {
        setRegistrationDone(true);
        setRegisterMsg({ type: 'success', text: 'Phone registered with Meta! WhatsApp profile will load in ~60 seconds as Meta activates your number.' });
        // Poll until profile loads — Meta takes 30–90s to activate
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const profileRes = await axios.get('/api/whatsapp/profile');
            setWaProfile(profileRes.data);
            setWaAbout(profileRes.data.about || '');
            setWaProfileError(null);
            setWaProfileNeedsRegistration(false);
            clearInterval(poll);
          } catch {
            if (attempts >= 12) clearInterval(poll); // stop after ~2 mins
          }
        }, 10000); // retry every 10s
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please try disconnecting and reconnecting your WhatsApp account.';
      setRegisterMsg({ type: 'error', text: msg });
    } finally {
      setIsRegistering(false);
    }
  }

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

      {/* WhatsApp Business Profile Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-syne">WhatsApp Business Profile</h2>
              <p className="text-sm text-text-muted">Synced directly from your connected WhatsApp account.</p>
            </div>
          </div>
          {waProfile && (
            <button
              onClick={fetchWaProfile}
              className="text-xs font-bold text-jade flex items-center gap-1.5 hover:underline"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </div>

        {waMessage && (
          <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
            waMessage.type === 'success'
              ? 'bg-jade/10 border border-jade/20 text-jade'
              : 'bg-red-500/10 border border-red-500/20 text-red-500'
          }`}>
            {waMessage.type === 'success'
              ? <CheckCircle className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {waMessage.text}
          </div>
        )}

        {waProfileLoading ? (
          <div className="glass-card flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-jade animate-spin" />
          </div>
        ) : waProfileError ? (
          <div className="glass-card flex flex-col items-center justify-center py-12 space-y-3 text-center">
            <AlertCircle className="w-8 h-8 text-text-muted" />
            {waProfileNeedsRegistration ? (
              <>
                {registrationDone ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-jade" />
                    <p className="text-sm font-bold text-jade">Registration Sent!</p>
                    <p className="text-sm text-text-muted max-w-sm text-center">
                      Meta is activating your number. This takes 30–90 seconds.
                      This page will update automatically — please wait.
                    </p>
                    <Loader2 className="w-5 h-5 text-jade animate-spin" />
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-text-primary">Phone Number Not Registered</p>
                    <p className="text-sm text-text-muted max-w-sm">
                      Your WhatsApp number was connected but hasn&apos;t been registered with the Cloud API yet.
                      Click below to complete setup automatically.
                    </p>
                    {/* Migration flow */}
                    {showMigration ? (
                      <div className="w-full max-w-sm space-y-3">
                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-text-muted text-left">
                          <p className="font-bold text-amber-500 mb-1">Your number is on personal WhatsApp</p>
                          <p>Meta will send a 6-digit code to verify you own this number. This will deactivate personal WhatsApp on the number and activate it for business use.</p>
                        </div>
                        {migrationStep === 'request' ? (
                          <button
                            onClick={handleRequestOtp}
                            disabled={isMigrating}
                            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-jade text-background text-sm font-bold hover:bg-jade/90 transition-colors disabled:opacity-50"
                          >
                            {isMigrating ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Verification Code (SMS)'}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={otpCode}
                              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="Enter 6-digit code"
                              className="input-field w-full text-center text-lg font-mono tracking-widest"
                              maxLength={6}
                            />
                            <button
                              onClick={handleVerifyOtp}
                              disabled={isMigrating || otpCode.length !== 6}
                              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-jade text-background text-sm font-bold hover:bg-jade/90 transition-colors disabled:opacity-50"
                            >
                              {isMigrating ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify & Activate'}
                            </button>
                            <button onClick={() => setMigrationStep('request')} className="w-full text-xs text-text-muted hover:underline">
                              Resend code
                            </button>
                          </div>
                        )}
                        {migrationMsg && (
                          <p className={`text-xs text-center ${migrationMsg.type === 'error' ? 'text-red-500' : 'text-jade'}`}>
                            {migrationMsg.text}
                          </p>
                        )}
                        <button onClick={() => { setShowMigration(false); setMigrationStep('request'); setOtpCode(''); }} className="w-full text-xs text-text-muted hover:underline">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {registerMsg?.type === 'error' ? (
                          <div className="space-y-3 w-full max-w-sm text-center">
                            <div className="text-xs px-4 py-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 leading-relaxed">
                              {registerMsg.text}
                            </div>
                            {registerMsg.text.includes('personal WhatsApp') && (
                              <button
                                onClick={() => { setShowMigration(true); setRegisterMsg(null); }}
                                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-jade text-background text-sm font-bold hover:bg-jade/90 transition-colors"
                              >
                                Start Migration (OTP)
                              </button>
                            )}
                            <a
                              href="/connect"
                              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-jade/10 border border-jade/20 text-jade text-sm font-bold hover:bg-jade/20 transition-colors"
                            >
                              Go to Connect → Reconnect
                            </a>
                          </div>
                        ) : (
                          <button
                            onClick={handleAutoRegister}
                            disabled={isRegistering}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-jade text-background text-sm font-bold hover:bg-jade/90 transition-colors disabled:opacity-50"
                          >
                            {isRegistering
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</>
                              : 'Register Phone Number Now'}
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (waProfileError.includes('session has been invalidated') || waProfileError.includes('Error validating access token') || waProfileError.includes('Invalid OAuth')) ? (
              <>
                <p className="text-sm text-text-muted max-w-sm">
                  Your WhatsApp session has expired. Please reconnect your account to restore access.
                </p>
                <a href="/connect" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-jade/10 border border-jade/20 text-jade text-sm font-bold hover:bg-jade/20 transition-colors">
                  Reconnect WhatsApp <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <>
                <p className="text-sm text-text-muted">{waProfileError}</p>
                {(waProfileError.includes('No WhatsApp') || waProfileError.includes('reconnect')) && (
                  <a href="/connect" className="text-jade text-xs font-bold hover:underline flex items-center gap-1">
                    Connect WhatsApp <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </>
            )}
          </div>
        ) : waProfile ? (
          <div className="glass-card space-y-8">
            {/* Profile Picture + Identity */}
            <div className="flex items-start gap-6">
              {/* Avatar with upload overlay */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-surface border-2 border-border">
                  {picUploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-surface">
                      <Loader2 className="w-6 h-6 text-jade animate-spin" />
                    </div>
                  ) : (picPreview || waProfile.profile_picture_url) ? (
                    <img
                      src={picPreview || waProfile.profile_picture_url!}
                      alt="WhatsApp profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#25D366]/10">
                      <span className="text-3xl font-bold text-[#25D366]">
                        {waProfile.business_name?.[0]?.toUpperCase() || 'W'}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={picUploading}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-jade rounded-full flex items-center justify-center shadow-lg hover:bg-jade/90 transition-colors disabled:opacity-50"
                  title="Change profile picture"
                >
                  <Camera className="w-4 h-4 text-background" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handlePictureChange}
                />
              </div>

              {/* Business info */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Business Name</p>
                  <p className="font-bold text-lg font-syne">{waProfile.business_name || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-text-muted" />
                  <p className="text-sm text-text-muted">{waProfile.phone_number || '—'}</p>
                  <span className="badge-jade text-[10px] py-0.5 px-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Connected
                  </span>
                </div>
                {waProfile.last_sync && (
                  <p className="text-[10px] text-text-muted">
                    Last synced: {new Date(waProfile.last_sync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* About / Bio */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">About / Status</label>
              <textarea
                value={waAbout}
                onChange={(e) => setWaAbout(e.target.value)}
                maxLength={139}
                rows={3}
                placeholder="Tell customers what your business does..."
                className="input-field w-full text-sm resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-text-muted">{waAbout.length}/139 characters</p>
                <button
                  onClick={handleWaSave}
                  disabled={waIsSaving || waAbout === (waProfile.about || '')}
                  className="btn-primary text-xs px-5 flex items-center gap-1.5 disabled:opacity-40"
                >
                  {waIsSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {waIsSaving ? 'Saving...' : 'Save to WhatsApp'}
                </button>
              </div>
            </div>

            {/* Upload tip */}
            <div className="p-4 bg-surface border border-border rounded-xl flex gap-3">
              <Camera className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-muted leading-relaxed">
                Profile picture changes sync directly to WhatsApp. Supported formats: JPEG, PNG. Max size: 5MB.
                It may take a few minutes for the new picture to appear in WhatsApp.
              </p>
            </div>
          </div>
        ) : null}
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
                onClick={() => copyCallbackUrl(`${process.env.NEXT_PUBLIC_APP_URL || 'https://waptrix.in'}/api/webhooks/meta`)}
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
                value={process.env.NEXT_PUBLIC_META_VERIFY_TOKEN || 'waptrix_v_882930219'}
                className="input-field flex-1 text-sm bg-surface font-mono"
              />
              <button
                onClick={() => copyVerifyToken(process.env.NEXT_PUBLIC_META_VERIFY_TOKEN || 'waptrix_v_882930219')}
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
