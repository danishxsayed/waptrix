"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  X,
  Smartphone,
  Users,
  FileText,
  Send,
  Sparkles,
} from "lucide-react";
import axios from "axios";

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  cta: string;
  href: string;
  done: boolean;
}

interface Props {
  /** Pass real stats so we avoid a second fetch */
  stats: {
    totalContacts: number;
    activeTemplates: number;
    totalSent: number;
  } | null;
}

const DISMISSED_KEY = "waptrix_onboarding_dismissed";

export default function OnboardingChecklist({ stats }: Props) {
  const router = useRouter();
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [dismissed, setDismissed]     = useState(false);

  // Check WhatsApp connection status
  useEffect(() => {
    axios.get("/api/whatsapp/connection")
      .then(r => setWaConnected(r.data?.connected === true))
      .catch(() => setWaConnected(false));
  }, []);

  // Check if user previously dismissed
  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY) === "1") setDismissed(true);
    } catch {}
  }, []);

  const steps: Step[] = [
    {
      id: "connect",
      label: "Connect WhatsApp",
      description: "Link your Meta-approved WhatsApp Business number to start sending.",
      icon: Smartphone,
      cta: "Connect now",
      href: "/connect",
      done: waConnected === true,
    },
    {
      id: "contacts",
      label: "Import your contacts",
      description: "Upload a CSV or Excel file with your customer phone numbers.",
      icon: Users,
      cta: "Import contacts",
      href: "/contacts?import=true",
      done: (stats?.totalContacts ?? 0) > 0,
    },
    {
      id: "template",
      label: "Create a message template",
      description: "Draft and submit a WhatsApp-approved template for your first campaign.",
      icon: FileText,
      cta: "Create template",
      href: "/templates",
      done: (stats?.activeTemplates ?? 0) > 0,
    },
    {
      id: "campaign",
      label: "Send your first campaign",
      description: "Blast your approved template to contacts and track delivery in real time.",
      icon: Send,
      cta: "Launch campaign",
      href: "/campaigns?new=true",
      done: (stats?.totalSent ?? 0) > 0,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone        = completedCount === steps.length;
  const currentStep    = steps.find(s => !s.done);
  const progressPct    = (completedCount / steps.length) * 100;

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
  };

  // Auto-dismiss when all steps complete (after brief delay so user sees it)
  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => {
        handleDismiss();
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  // Don't render until we know WA status
  if (waConnected === null) return null;

  // Don't render if dismissed
  if (dismissed) return null;

  return (
    <div className="glass-card border border-jade/20 relative overflow-hidden mb-2">
      {/* Subtle green glow top-left */}
      <div className="absolute -top-10 -left-10 w-48 h-48 bg-jade/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-jade/10 border border-jade/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-jade" />
          </div>
          <div>
            {allDone ? (
              <>
                <h3 className="text-base font-bold font-syne text-jade">🎉 You're all set!</h3>
                <p className="text-xs text-text-muted mt-0.5">Your Waptrix account is fully configured. Closing in a moment…</p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold font-syne">Get started with Waptrix</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {completedCount} of {steps.length} steps complete
                  {currentStep ? ` · Next: ${currentStep.label}` : ""}
                </p>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors flex-shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-jade rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, idx) => {
          const isCurrent = !step.done && currentStep?.id === step.id;
          const isPending = !step.done && !isCurrent;

          return (
            <div
              key={step.id}
              className={`
                relative rounded-xl border p-4 flex flex-col gap-3 transition-all
                ${step.done
                  ? "border-jade/20 bg-jade/5"
                  : isCurrent
                    ? "border-jade/40 bg-jade/8 shadow-[0_0_16px_rgba(16,185,129,0.08)]"
                    : "border-border bg-surface opacity-60"
                }
              `}
            >
              {/* Step number + status */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${step.done ? "text-jade" : isCurrent ? "text-jade" : "text-text-muted"}`}>
                  Step {idx + 1}
                </span>
                {step.done
                  ? <CheckCircle2 className="w-4 h-4 text-jade" />
                  : <Circle className={`w-4 h-4 ${isCurrent ? "text-jade" : "text-border"}`} />
                }
              </div>

              {/* Icon + label */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${step.done ? "bg-jade/10" : isCurrent ? "bg-jade/10" : "bg-card"}`}>
                  <step.icon className={`w-4 h-4 ${step.done ? "text-jade" : isCurrent ? "text-jade" : "text-text-muted"}`} />
                </div>
                <p className={`text-sm font-semibold leading-tight ${step.done ? "text-jade line-through decoration-jade/40" : "text-text-primary"}`}>
                  {step.label}
                </p>
              </div>

              {/* Description */}
              <p className="text-[11px] text-text-muted leading-relaxed flex-1">
                {step.description}
              </p>

              {/* CTA */}
              {!step.done && (
                <button
                  onClick={() => router.push(step.href)}
                  disabled={isPending}
                  className={`
                    w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all
                    ${isCurrent
                      ? "bg-jade text-bg hover:bg-jade/90"
                      : "bg-card text-text-muted cursor-not-allowed"
                    }
                  `}
                >
                  {step.cta}
                  {isCurrent && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              )}

              {step.done && (
                <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-jade bg-jade/10">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
