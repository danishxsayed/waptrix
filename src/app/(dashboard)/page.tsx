"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Send,
  CheckCircle2,
  Users,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  AlertCircle,
  Calendar,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import { useTenant } from "@/context/TenantContext";

/* ── date helpers ─────────────────────────────────────────── */
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
function today(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function fmtFull(ymd: string): string {
  const [y, m, day] = ymd.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${String(day).padStart(2, '0')}, ${y}`;
}

type Preset = "7d" | "14d" | "30d" | "custom";

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  jade:    { bg: "bg-jade/10",    border: "border-jade/20",    text: "text-jade"    },
  info:    { bg: "bg-info/10",    border: "border-info/20",    text: "text-info"    },
  warning: { bg: "bg-warning/10", border: "border-warning/20", text: "text-warning" },
  danger:  { bg: "bg-danger/10",  border: "border-danger/20",  text: "text-danger"  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { role, isStaff } = useTenant();

  const [data, setData]           = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  /* date range */
  const [preset, setPreset]         = useState<Preset>("30d");
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [fromDate, setFromDate]     = useState(() => toYMD(addDays(today(), -29)));
  const [toDate, setToDate]         = useState(() => toYMD(today()));
  const [pendingFrom, setPendingFrom] = useState(fromDate);
  const [pendingTo, setPendingTo]     = useState(toDate);

  // Agents only have inbox access
  useEffect(() => {
    if (role === "agent") router.replace("/inbox");
  }, [role, router]);

  const fetchAnalytics = useCallback(async (from: string, to: string) => {
    setFetchError("");
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/analytics?from=${from}&to=${to}`);
      setData(res.data);
    } catch (err: any) {
      setFetchError(err.response?.data?.error || "Failed to load dashboard metrics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== "agent") fetchAnalytics(fromDate, toDate);
  }, [role]); // eslint-disable-line

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    setShowPicker(false);
    const t = today();
    let from: Date;
    if      (p === "7d")  from = addDays(t, -6);
    else if (p === "14d") from = addDays(t, -13);
    else                  from = addDays(t, -29);
    const f = toYMD(from);
    const to = toYMD(t);
    setFromDate(f); setToDate(to);
    setPendingFrom(f); setPendingTo(to);
    fetchAnalytics(f, to);
  };

  const applyCustom = () => {
    setPreset("custom");
    setShowPicker(false);
    setFromDate(pendingFrom);
    setToDate(pendingTo);
    fetchAnalytics(pendingFrom, pendingTo);
  };

  const rangeLabel = preset === "7d"  ? "Last 7 days"
    : preset === "14d" ? "Last 14 days"
    : preset === "30d" ? "Last 30 days"
    : `${fmtFull(fromDate)} – ${fmtFull(toDate)}`;

  /* ── initial load only (no data yet) ─────────────────────── */
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-jade border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm font-medium animate-pulse font-syne">
            Loading dashboard metrics...
          </p>
        </div>
      </div>
    );
  }

  if (fetchError && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-danger" />
          </div>
          <div>
            <p className="font-bold text-text-primary font-syne">Failed to load dashboard</p>
            <p className="text-sm text-text-muted mt-1">{fetchError}</p>
          </div>
          <button onClick={() => fetchAnalytics(fromDate, toDate)} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: "Total Messages Sent",
      value: data?.stats?.totalSent?.toLocaleString() ?? "0",
      icon: Send,
      change: data?.stats?.totalSent > 0 ? "+100%" : "+0%",
      trend: "up",
      color: "jade",
    },
    {
      name: "Delivery Rate",
      value: `${data?.stats?.deliveryRate ?? 100}%`,
      icon: CheckCircle2,
      change: data?.stats?.deliveryRate >= 90 ? "+0.5%" : "-1.2%",
      trend: data?.stats?.deliveryRate >= 90 ? "up" : "down",
      color: "info",
    },
    {
      name: "Total Contacts",
      value: data?.stats?.totalContacts?.toLocaleString() ?? "0",
      icon: Users,
      change: data?.stats?.totalContacts > 0 ? `+${data.stats.totalContacts}` : "+0",
      trend: "up",
      color: "warning",
    },
    {
      name: "Active Templates",
      value: data?.stats?.activeTemplates?.toLocaleString() ?? "0",
      icon: MessageSquare,
      change: data?.stats?.activeTemplates > 0 ? `+${data.stats.activeTemplates}` : "+0",
      trend: "up",
      color: "danger",
    },
  ];

  const chartData = (data?.chartData ?? []).map((d: any) => ({
    date: d.date,
    sent: d.sent,
  }));

  const hasChartData = chartData.some((d: any) => d.sent > 0);

  return (
    <div className="space-y-8">
      {/* Onboarding checklist */}
      {!isStaff && <OnboardingChecklist stats={data?.stats ?? null} />}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const colors = colorMap[stat.color] || colorMap.jade;
          return (
            <div key={stat.name} className="glass-card flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg border ${colors.bg} ${colors.border}`}>
                  <stat.icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend === "up" ? "text-jade" : "text-danger"}`}>
                  {stat.change}
                  {stat.trend === "up"
                    ? <ArrowUpRight className="w-3 h-3" />
                    : <ArrowDownRight className="w-3 h-3" />}
                </div>
              </div>
              <div>
                <p className="text-text-muted text-sm font-medium">{stat.name}</p>
                <h3 className="text-3xl font-bold mt-1 font-syne">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-bold font-syne">Message Volume</h3>
              <p className="text-xs text-text-muted">{rangeLabel}</p>
            </div>

            {/* Date range picker */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowPicker(p => !p)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface text-xs font-medium text-text-primary hover:border-jade/40 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-jade" />
                <span>{rangeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${showPicker ? "rotate-180" : ""}`} />
              </button>

              {showPicker && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-2xl p-5 w-72">
                  {/* Presets */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {(["7d", "14d", "30d"] as Preset[]).map(p => (
                      <button
                        key={p}
                        onClick={() => applyPreset(p)}
                        className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                          preset === p
                            ? "bg-jade text-background"
                            : "bg-surface text-text-muted hover:text-text-primary hover:bg-card border border-border"
                        }`}
                      >
                        {p === "7d" ? "7 days" : p === "14d" ? "14 days" : "30 days"}
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Custom</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Date inputs */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">From</label>
                      <input
                        type="date"
                        value={pendingFrom}
                        max={pendingTo}
                        onChange={e => setPendingFrom(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-jade/50 [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">To</label>
                      <input
                        type="date"
                        value={pendingTo}
                        min={pendingFrom}
                        max={toYMD(today())}
                        onChange={e => setPendingTo(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-jade/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={applyCustom}
                    disabled={!pendingFrom || !pendingTo || pendingFrom > pendingTo}
                    className="w-full py-2 rounded-xl bg-jade text-background text-xs font-bold disabled:opacity-40 hover:bg-jade/90 transition-colors"
                  >
                    Apply Range
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-72 w-full relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-xl z-10">
                <div className="w-7 h-7 border-4 border-jade border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {fetchError && data && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <p className="text-xs text-danger">{fetchError}</p>
              </div>
            )}
            {!hasChartData && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <Send className="w-8 h-8 text-text-muted opacity-20" />
                <p className="text-sm font-semibold text-text-muted">No messages in this period</p>
                <p className="text-xs text-text-muted opacity-60">Try a wider date range.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#273042" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#8896AB"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#8896AB"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickFormatter={v => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161B26",
                      border: "1px solid #273042",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#10B981" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    name="Sent"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSent)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card">
          <h3 className="text-lg font-bold mb-6 font-syne">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/campaigns?new=true")}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-jade/10 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-jade" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">New Campaign</p>
                  <p className="text-[10px] text-text-muted">Blast messages to segment</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-jade transition-colors" />
            </button>

            <button
              onClick={() => router.push("/contacts?import=true")}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-info" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Import Contacts</p>
                  <p className="text-[10px] text-text-muted">Upload CSV or XLSX</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-info transition-colors" />
            </button>

            <button
              onClick={() => router.push("/templates")}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-card border border-border rounded-xl group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-warning" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Create Template</p>
                  <p className="text-[10px] text-text-muted">Build a Meta approved template</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-warning transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Close picker on outside click */}
      {showPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
      )}
    </div>
  );
}
