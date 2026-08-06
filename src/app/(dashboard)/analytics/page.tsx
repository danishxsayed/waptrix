"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Send,
  CheckCircle2,
  Eye,
  AlertCircle,
  TrendingUp,
  Download,
  Loader2,
  Calendar,
  ChevronDown,
} from "lucide-react";

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  jade:    { bg: "bg-jade/10",    border: "border-jade/20",    text: "text-jade"    },
  info:    { bg: "bg-info/10",    border: "border-info/20",    text: "text-info"    },
  warning: { bg: "bg-warning/10", border: "border-warning/20", text: "text-warning" },
  danger:  { bg: "bg-danger/10",  border: "border-danger/20",  text: "text-danger"  },
};

type Preset = "7d" | "14d" | "30d" | "custom";

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

/** Format YYYY-MM-DD → "Jun 08, 2025" */
function fmtFull(ymd: string): string {
  const [y, m, day] = ymd.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${String(day).padStart(2, '0')}, ${y}`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData]         = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Date range state
  const [preset, setPreset]     = useState<Preset>("30d");
  const [showPicker, setShowPicker] = useState(false);
  const [fromDate, setFromDate] = useState(() => toYMD(addDays(today(), -29)));
  const [toDate, setToDate]     = useState(() => toYMD(today()));
  const [pendingFrom, setPendingFrom] = useState(fromDate);
  const [pendingTo, setPendingTo]     = useState(toDate);

  const loadData = useCallback(async (from: string, to: string) => {
    setFetchError("");
    setIsLoading(true);
    try {
      const [analyticsRes, campaignsRes] = await Promise.all([
        axios.get(`/api/analytics?from=${from}&to=${to}`),
        axios.get("/api/campaigns"),
      ]);
      setData(analyticsRes.data);
      setCampaigns(campaignsRes.data || []);
    } catch (err: any) {
      setFetchError(err.response?.data?.error || "Failed to load analytics data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(fromDate, toDate); }, []);  // eslint-disable-line

  const applyPreset = (p: Preset) => {
    setPreset(p);
    setShowPicker(false);
    const t = today();
    let from: Date;
    if (p === "7d")  from = addDays(t, -6);
    else if (p === "14d") from = addDays(t, -13);
    else              from = addDays(t, -29); // 30d
    const f = toYMD(from);
    const to = toYMD(t);
    setFromDate(f); setToDate(to);
    setPendingFrom(f); setPendingTo(to);
    loadData(f, to);
  };

  const applyCustom = () => {
    setPreset("custom");
    setShowPicker(false);
    setFromDate(pendingFrom);
    setToDate(pendingTo);
    loadData(pendingFrom, pendingTo);
  };

  /* ── derived stats ───────────────────────────────────────── */
  const totalSent      = data?.stats?.totalSent      ?? 0;
  const totalDelivered = data?.stats?.totalDelivered ?? 0;
  const totalRead      = data?.stats?.totalRead      ?? 0;
  const totalFailed    = data?.stats?.totalFailed    ?? 0;
  const deliveryRate   = data?.stats?.deliveryRate   ?? 100;
  const readRate   = totalSent > 0 ? Number(((totalRead      / totalSent) * 100).toFixed(1)) : 0;
  const failedRate = totalSent > 0 ? Number(((totalFailed    / totalSent) * 100).toFixed(1)) : 0;

  const stats = [
    { name: "Total Sent",  value: totalSent.toLocaleString(),      icon: Send,          color: "jade",    trend: totalSent > 0 ? "+100%" : "+0%" },
    { name: "Delivered",   value: totalDelivered.toLocaleString(), icon: CheckCircle2,  color: "info",    trend: `${deliveryRate}%` },
    { name: "Read Rate",   value: `${readRate}%`,                  icon: Eye,           color: "warning", trend: totalRead > 0 ? "+100%" : "+0%" },
    { name: "Failed",      value: totalFailed.toLocaleString(),    icon: AlertCircle,   color: "danger",  trend: `${failedRate}%` },
  ];

  const statusData = totalSent > 0 ? [
    { name: 'Read',      value: readRate,  color: '#10B981' },
    { name: 'Delivered', value: Math.max(0, Number((((totalDelivered - totalRead) / totalSent) * 100).toFixed(1))), color: '#0EA5E9' },
    { name: 'Failed',    value: failedRate, color: '#F43F5E' },
    { name: 'Sent',      value: Math.max(0, Number((((totalSent - totalDelivered - totalFailed) / totalSent) * 100).toFixed(1))), color: '#F59E0B' },
  ] : [];

  const displayChartData = (data?.chartData ?? []).map((d: any) => ({
    day:  d.date,
    sent: d.sent,
    read: d.read ?? 0,
  }));

  const displayCampaigns = campaigns.slice(0, 5).map((c: any) => {
    const sent = c.sent_count || 0;
    const read = c.read_count || 0;
    const rate = sent > 0 ? Math.round((read / sent) * 100) : 0;
    return {
      name:     c.name,
      date:     new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      sent,
      readRate: `${rate}%`,
    };
  });

  /* ── range label ─────────────────────────────────────────── */
  const rangeLabel = preset === "7d" ? "Last 7 days"
    : preset === "14d" ? "Last 14 days"
    : preset === "30d" ? "Last 30 days"
    : `${fmtFull(fromDate)} – ${fmtFull(toDate)}`;

  /* ── loading / error states ──────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-jade border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm font-medium animate-pulse font-syne">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-danger" />
          </div>
          <div>
            <p className="font-bold text-text-primary font-syne">Failed to load analytics</p>
            <p className="text-sm text-text-muted mt-1">{fetchError}</p>
          </div>
          <button onClick={() => loadData(fromDate, toDate)} className="btn-primary flex items-center gap-2">
            <Loader2 className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-bold font-syne">Analytics Dashboard</h2>
          <p className="text-sm text-text-muted">In-depth performance insights of your WhatsApp campaigns.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range picker */}
          <div className="relative">
            <button
              onClick={() => setShowPicker(p => !p)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-text-primary hover:border-jade/40 transition-colors"
            >
              <Calendar className="w-4 h-4 text-jade" />
              <span>{rangeLabel}</span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showPicker ? "rotate-180" : ""}`} />
            </button>

            {showPicker && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-2xl p-5 w-80">
                {/* Preset buttons */}
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
                      {p === "7d" ? "Last 7 days" : p === "14d" ? "Last 14 days" : "Last 30 days"}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Custom range</span>
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
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-jade/50 [color-scheme:dark]"
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
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-jade/50 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <button
                  onClick={applyCustom}
                  disabled={!pendingFrom || !pendingTo || pendingFrom > pendingTo}
                  className="w-full py-2.5 rounded-xl bg-jade text-background text-sm font-bold disabled:opacity-40 hover:bg-jade/90 transition-colors"
                >
                  Apply Range
                </button>
              </div>
            )}
          </div>

          {/* Export CSV */}
          <button
            onClick={() => {
              const rows = [
                ["Metric", "Value"],
                ["Total Sent", totalSent],
                ["Delivered", totalDelivered],
                ["Read", totalRead],
                ["Failed", totalFailed],
                ["Delivery Rate", `${deliveryRate}%`],
                ["Read Rate", `${readRate}%`],
              ];
              const csv = rows.map(r => r.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `waptrix-analytics-${fromDate}-to-${toDate}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const colors = colorMap[stat.color] || colorMap.jade;
          return (
            <div key={stat.name} className="glass-card flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors.bg} ${colors.border}`}>
                <stat.icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{stat.name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold font-syne">{stat.value}</h3>
                  <span className={`text-xs font-bold ${stat.trend.startsWith('+') || !stat.trend.includes('%') ? 'text-jade' : 'text-text-muted'}`}>
                    {stat.trend}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Chart + Pie ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold font-syne">Daily Performance</h3>
              <p className="text-xs text-text-muted mt-0.5">{rangeLabel}</p>
            </div>
            {totalSent > 0 && (
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-jade" />
                  <span className="text-[10px] font-bold text-text-muted uppercase">Sent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-info" />
                  <span className="text-[10px] font-bold text-text-muted uppercase">Read</span>
                </div>
              </div>
            )}
          </div>

          {displayChartData.every((d: any) => d.sent === 0 && d.read === 0) ? (
            <div className="h-80 flex flex-col items-center justify-center text-center gap-3">
              <Send className="w-10 h-10 text-text-muted opacity-20" />
              <p className="text-sm font-semibold text-text-muted">No messages in this period</p>
              <p className="text-xs text-text-muted opacity-60">Try a wider date range or check that your campaigns completed.</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayChartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#273042" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#8896AB"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#8896AB" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: '#161B26' }}
                    contentStyle={{ backgroundColor: '#161B26', border: '1px solid #273042', borderRadius: '12px' }}
                  />
                  <Bar dataKey="sent" name="Sent" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="read" name="Read" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-bold font-syne mb-8 text-center">Status Breakdown</h3>
          {totalSent === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-text-muted opacity-20" />
              <p className="text-xs text-text-muted opacity-60">No data yet</p>
            </div>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {statusData.map((entry: any, i: number) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#161B26', border: '1px solid #273042', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-4">
                {statusData.map((entry: any) => (
                  <div key={entry.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs text-text-muted">{entry.name}</span>
                    </div>
                    <span className="text-xs font-bold">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Campaign table ───────────────────────────────────── */}
      <div className="glass-card overflow-hidden !p-0">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold font-syne">Campaign Performance</h3>
          <button
            onClick={() => router.push("/campaigns")}
            className="text-xs font-bold text-jade flex items-center gap-1 hover:underline"
          >
            View All <TrendingUp className="w-3 h-3" />
          </button>
        </div>
        {displayCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <TrendingUp className="w-10 h-10 text-text-muted opacity-20" />
            <p className="text-sm font-semibold text-text-muted">No campaigns yet</p>
            <p className="text-xs text-text-muted opacity-60">Campaign stats will appear here once you send your first campaign.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Campaign</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Sent Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Sent</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Read Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {displayCampaigns.map((campaign, i) => (
                <tr key={i} className="hover:bg-card/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-text-primary">{campaign.name}</td>
                  <td className="px-6 py-4 text-xs text-text-muted">{campaign.date}</td>
                  <td className="px-6 py-4 text-xs text-text-muted font-bold">{campaign.sent.toLocaleString()} messages</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="w-24 bg-surface rounded-full h-1.5 overflow-hidden">
                        <div className="bg-jade h-full" style={{ width: campaign.readRate }} />
                      </div>
                      <span className="text-xs font-bold text-jade">{campaign.readRate}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Close picker on outside click */}
      {showPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
      )}
    </div>
  );
}
