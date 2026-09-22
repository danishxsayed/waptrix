"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Lock, ArrowRight, User, Building, ShieldCheck, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from '@/lib/supabase/client';


function loadCashfree(): Promise<any> {
  const mode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox";
  if ((window as any).Cashfree) return Promise.resolve((window as any).Cashfree({ mode }));
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload  = () => resolve((window as any).Cashfree({ mode }));
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: "", company: "", email: "", password: "" });
  const [showPassword, setShowPassword]   = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [statusMsg, setStatusMsg]         = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const router = useRouter();

  const planParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("plan")
    : null;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/connect`,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:    formData.email,
          password: formData.password,
          name:     formData.name,
          company:  formData.company,
        }),
      });
      const responseData = await res.json();
      if (!res.ok || responseData.error) {
        setError(responseData.error || "Signup failed. Please try again.");
        return;
      }

      // If a plan was pre-selected, log in & initiate payment immediately
      if (planParam && responseData.session) {
        setStatusMsg("Account created! Setting up your payment…");
        const accessToken = responseData.session?.access_token || "";
        const payRes = await fetch("/api/payments/initiate", {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ planId: planParam }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.error || "We couldn't create your payment session. Please try again.");
        const cashfree = await loadCashfree();
        cashfree.checkout({ paymentSessionId: payData.paymentSessionId, redirectTarget: "_self" });
        return;
      }

      // No plan — go to email verification page
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-row-reverse">
      {/* Right: Content */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 z-10">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-8 group">
              <div className="w-10 h-10 bg-jade rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
                <span className="text-background font-bold text-2xl">W</span>
              </div>
              <span className="text-3xl font-bold font-syne tracking-tight text-jade">Waptrix</span>
            </Link>
            <h1 className="text-4xl font-bold font-syne tracking-tight text-text-primary">Start Growing</h1>
            <p className="text-text-muted mt-3 font-medium">
              {planParam ? "Create your account to complete your subscription." : "Create your professional WhatsApp platform in minutes."}
            </p>
          </div>

          {planParam && (
            <div className="bg-jade/10 border border-jade/20 text-jade p-4 rounded-xl text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Plan selected — create your account to proceed to payment.
            </div>
          )}

          {statusMsg && !error && (
            <div className="bg-jade/10 border border-jade/20 text-jade p-4 rounded-xl text-sm font-medium flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              {statusMsg}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Full Name</label>
                <div className="relative group">
                  <User className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe" 
                    className="w-full bg-surface border border-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50 transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Company</label>
                <div className="relative group">
                  <Building className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
                  <input 
                    type="text" 
                    required
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    placeholder="Acme Inc." 
                    className="w-full bg-surface border border-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50 transition-all" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Work Email</label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="name@company.com" 
                  className="w-full bg-surface border border-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50 transition-all" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest">New Password</label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-surface border border-border rounded-2xl py-3.5 pl-11 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-jade transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full btn-primary py-4 flex items-center justify-center gap-2 group text-lg"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-background border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Create Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google Sign Up */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-surface border border-border rounded-2xl text-sm font-semibold text-text-primary hover:bg-card hover:border-jade/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting to Google…' : 'Sign up with Google'}
          </button>

          <div className="p-4 bg-surface border border-border rounded-2xl flex gap-3">
            <ShieldCheck className="w-5 h-5 text-jade shrink-0" />
            <p className="text-[10px] text-text-muted leading-relaxed">
              By signing up, you agree to our Terms of Service and Privacy Policy. Your data is encrypted and stored securely on enterprise-grade infrastructure.
            </p>
          </div>

          <p className="text-center text-sm text-text-muted">
            Already have an account? <Link href="/login" className="text-jade font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-surface relative overflow-hidden items-center justify-center border-r border-border">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-jade/10 rounded-full blur-[120px]"></div>
        
        <div className="z-10 text-center space-y-6 max-w-lg p-12">
          <div className="w-24 h-24 bg-card border-2 border-border/50 rounded-[40px] flex items-center justify-center mx-auto mb-12 shadow-2xl skew-x-3 -rotate-6">
            <Lock className="w-12 h-12 text-jade" />
          </div>
          <h2 className="text-4xl font-bold font-syne text-text-primary leading-tight">Enterprise-grade security, built in.</h2>
          <p className="text-text-muted text-lg leading-relaxed">
            From JWT authentication to Row Level Security, Waptrix ensures your customer data remains your own. 
          </p>
        </div>
      </div>
    </div>
  );
}
