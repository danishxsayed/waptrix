"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize inside handler to avoid prerender issues (Fix 5)
      const supabase = createClient();
      
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: Content */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 z-10">
        <div className="max-w-md w-full mx-auto space-y-10">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-8 group">
              <div className="w-10 h-10 bg-jade rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
                <span className="text-background font-bold text-2xl">W</span>
              </div>
              <span className="text-3xl font-bold font-syne tracking-tight text-jade">Waptrix</span>
            </Link>
            <h1 className="text-4xl font-bold font-syne tracking-tight text-text-primary">Welcome Back</h1>
            <p className="text-text-muted mt-3 font-medium">Power up your WhatsApp marketing machine.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Work Email</label>
              <div className="relative group">
                <Mail className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="name@company.com" 
                  className="w-full bg-surface border border-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50 transition-all" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Password</label>
                <Link href="/forgot-password" id="forgot-password-link" className="text-[10px] font-bold text-jade hover:underline">Forgot password?</Link>
              </div>
              <div className="relative group">
                <Lock className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••" 
                  className="w-full bg-surface border border-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50 transition-all" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2 group text-lg"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-background border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Connect <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted">
            New to Waptrix? <Link href="/signup" className="text-jade font-bold hover:underline">Create an account</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-surface relative overflow-hidden items-center justify-center border-l border-border">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-jade/10 rounded-full blur-[120px]"></div>
        
        <div className="z-10 text-center space-y-6 max-w-lg p-12">
          <div className="w-24 h-24 bg-jade/20 border-2 border-jade/30 rounded-[40px] flex items-center justify-center mx-auto mb-12 shadow-[0_0_50px_rgba(16,185,129,0.3)] rotate-12">
            <Mail className="w-12 h-12 text-jade" />
          </div>
          <h2 className="text-4xl font-bold font-syne text-text-primary leading-tight">Scale your reach with official WhatsApp APIs.</h2>
          <p className="text-text-muted text-lg leading-relaxed">
            The professional choice for mid-to-large scale businesses who want reliable delivery and higher read rates.
          </p>
        </div>
        
        <div className="absolute bottom-20 right-20 bg-card/80 backdrop-blur-md border border-border p-4 rounded-2xl shadow-2xl animate-bounce duration-[3000ms]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-jade/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-jade" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">99.8% Delivered</p>
              <p className="text-[10px] text-text-muted">Real-time tracking active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
