"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase automatically handles the session when clicking the email link
    // We just need to make sure the user is actually authenticated
    const supabase = createClient();
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery flow active");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setIsDone(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card text-center space-y-8 py-12">
          <div className="w-20 h-20 bg-jade/10 rounded-full flex items-center justify-center mx-auto border border-jade/20">
            <CheckCircle2 className="w-10 h-10 text-jade" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-syne tracking-tight">Password Updated</h1>
            <p className="text-text-muted px-4">
              Your password has been reset successfully. Redirecting you to login...
            </p>
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
          <h1 className="text-4xl font-bold font-syne tracking-tight text-text-primary">New Password</h1>
          <p className="text-text-muted mt-3 font-medium">Create a strong, secure password for your account.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">New Password</label>
            <div className="relative group">
              <Lock className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
              <input 
                type="password" 
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-surface border border-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-jade/50 transition-all" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Confirm New Password</label>
            <div className="relative group">
              <Lock className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-jade transition-colors" />
              <input 
                type="password" 
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Update Password <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
