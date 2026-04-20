"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, ArrowRight, User, Building, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [formData, setFormData] = useState({ 
    name: "", 
    company: "",
    email: "", 
    password: "" 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: responseData } = await import('axios').then(m => m.default.post('/api/auth/signup', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        company: formData.company
      }));

      if (responseData.error) {
        setError(responseData.error);
        return;
      }

      router.push("/login?message=Signup successful. Please check your email.");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Something went wrong");
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
            <p className="text-text-muted mt-3 font-medium">Create your professional WhatsApp platform in minutes.</p>
          </div>

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
                  type="password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="Minimum 8 characters" 
                  className="w-full bg-surface border border-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50 transition-all" 
                />
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
