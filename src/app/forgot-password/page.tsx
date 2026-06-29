"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: responseData } = await import('axios').then(m => m.default.post('/api/auth/forgot-password', {
        email: email
      }));

      if (responseData.error) {
        setError(responseData.error);
        return;
      }

      setIsSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card text-center space-y-8 py-12">
          <div className="w-20 h-20 bg-jade/10 rounded-full flex items-center justify-center mx-auto border border-jade/20">
            <CheckCircle2 className="w-10 h-10 text-jade" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-syne tracking-tight">Check your email</h1>
            <p className="text-text-muted px-4">
              We&apos;ve sent a password reset link to <span className="text-text-primary font-semibold">{email}</span>.
            </p>
          </div>
          <div className="pt-4">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-jade font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-8 sm:px-12 lg:px-24 z-10">
      <div className="max-w-md w-full mx-auto space-y-10">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 bg-jade rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
              <span className="text-background font-bold text-2xl">W</span>
            </div>
            <span className="text-3xl font-bold font-syne tracking-tight text-jade">Waptrix</span>
          </Link>
          <h1 className="text-4xl font-bold font-syne tracking-tight text-text-primary">Reset Password</h1>
          <p className="text-text-muted mt-3 font-medium">Enter your email and we&apos;ll send you a recovery link.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Work Email</label>
            <div className="relative group">
              <Mail className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com" 
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
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Send Link <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Remembered your password? <Link href="/login" className="text-jade font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
