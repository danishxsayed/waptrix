"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  BarChart2,
  Activity,
  Trash2,
  Eye,
  PackageCheck,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Tag,
  TrendingUp,
  MessageSquare,
  X,
  Info,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  total_contacts: number;
  created_at: string;
  scheduled_at: string | null;
  variable_mapping: Record<string, string>;
  template: {
    id: string;
    name: string;
    category: string;
    language: string;
    status: string;
    components?: any[];
  } | null;
  segment: {
    id: string;
    name: string;
    description?: string;
  } | null;
}

interface Log {
  id: string;
  phone: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  error?: string;
  error_message?: string;
  error_detail?: string;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "sent" | "delivered" | "read" | "failed">("all");
  const [logSearch, setLogSearch] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [logsError, setLogsError] = useState("");

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await axios.get(`/api/campaigns/${id}`);
      setCampaign(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load campaign.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchLogs = useCallback(async () => {
    setLogsError("");
    try {
      const res = await axios.get(`/api/campaigns/${id}/logs`);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to fetch logs";
      setLogsError(msg);
      console.error("Failed to fetch logs", msg);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
    fetchLogs();
  }, [fetchCampaign, fetchLogs]);

  // Auto-refresh when campaign is sending
  useEffect(() => {
    if (!campaign) return;
    if (campaign.status === "sending" || campaign.status === "queued") {
      const interval = setInterval(() => {
        fetchCampaign();
        fetchLogs();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [campaign?.status, fetchCampaign, fetchLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCampaign(), fetchLogs()]);
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this campaign and all its logs? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/campaigns/${id}`);
      router.push("/campaigns");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete campaign.");
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string, large = false) => {
    const base = large
      ? "px-3 py-1 rounded-full text-xs font-bold uppercase border flex items-center gap-1.5"
      : "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1";
    switch (status) {
      case "sending":
        return (
          <span className={`${base} bg-jade/10 text-jade border-jade/20 animate-pulse`}>
            <Activity className={large ? "w-3.5 h-3.5" : "w-3 h-3"} /> Sending
          </span>
        );
      case "sent":
        return (
          <span className={`${base} bg-sky-500/10 text-sky-500 border-sky-500/20`}>
            <CheckCircle2 className={large ? "w-3.5 h-3.5" : "w-3 h-3"} /> Sent
          </span>
        );
      case "queued":
        return (
          <span className={`${base} bg-amber-500/10 text-amber-500 border-amber-500/20`}>
            <Clock className={large ? "w-3.5 h-3.5" : "w-3 h-3"} /> Queued
          </span>
        );
      case "scheduled":
        return (
          <span className={`${base} bg-violet-500/10 text-violet-400 border-violet-500/20`}>
            <Calendar className={large ? "w-3.5 h-3.5" : "w-3 h-3"} /> Scheduled
          </span>
        );
      case "failed":
        return (
          <span className={`${base} bg-rose-500/10 text-rose-500 border-rose-500/20`}>
            <AlertCircle className={large ? "w-3.5 h-3.5" : "w-3 h-3"} /> Failed
          </span>
        );
      default:
        return (
          <span className={`${base} bg-card text-text-muted border-border`}>
            Draft
          </span>
        );
    }
  };

  const getLogStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "read")
      return (
        <span className="bg-jade/10 text-jade px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-jade/20 flex items-center gap-1 shrink-0">
          <Eye className="w-2.5 h-2.5" /> Read
        </span>
      );
    if (s === "delivered")
      return (
        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-emerald-500/20 flex items-center gap-1 shrink-0">
          <PackageCheck className="w-2.5 h-2.5" /> Delivered
        </span>
      );
    if (s === "sent")
      return (
        <span className="bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-sky-500/20 flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-2.5 h-2.5" /> Sent
        </span>
      );
    if (s === "failed")
      return (
        <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-rose-500/20 flex items-center gap-1 shrink-0">
          <AlertCircle className="w-2.5 h-2.5" /> Failed
        </span>
      );
    return (
      <span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-yellow-500/20 flex items-center gap-1 shrink-0">
        <Clock className="w-2.5 h-2.5" /> {s || "Queued"}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-jade border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 opacity-50" />
        <p className="text-sm text-text-muted">{error || "Campaign not found."}</p>
        <button onClick={() => router.push("/campaigns")} className="btn-secondary text-xs flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Campaigns
        </button>
      </div>
    );
  }

  const total = campaign.total_contacts || 1;

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = logFilter === "all" || (log.status || "").toLowerCase() === logFilter;
    const matchesSearch = !logSearch || log.phone.includes(logSearch);
    return matchesFilter && matchesSearch;
  });

  const logCounts = {
    all: logs.length,
    sent: logs.filter((l) => (l.status || "").toLowerCase() === "sent").length,
    delivered: logs.filter((l) => (l.status || "").toLowerCase() === "delivered").length,
    read: logs.filter((l) => (l.status || "").toLowerCase() === "read").length,
    failed: logs.filter((l) => (l.status || "").toLowerCase() === "failed").length,
  };

  // Use live log counts when available — they're ground truth vs potentially stale campaign columns
  const logsLoaded = !isLoadingLogs && logs.length > 0;
  const displaySent      = logsLoaded ? logCounts.all - logCounts.failed : campaign.sent_count;
  const displayDelivered = logsLoaded ? logCounts.delivered : campaign.delivered_count;
  const displayRead      = logsLoaded ? logCounts.read : campaign.read_count;
  const displayFailed    = logsLoaded ? logCounts.failed : campaign.failed_count;

  const sentPct      = Math.round((displaySent      / total) * 100);
  const deliveredPct = Math.round((displayDelivered / total) * 100);
  const readPct      = Math.round((displayRead      / total) * 100);
  const failedPct    = Math.round((displayFailed    / total) * 100);

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/campaigns")}
            className="p-2 hover:bg-card border border-transparent hover:border-border rounded-xl transition-all text-text-muted hover:text-text-primary shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold font-syne">{campaign.name}</h2>
              {getStatusBadge(campaign.status, true)}
            </div>
            <p className="text-xs text-text-muted mt-0.5 font-dm-sans">
              Created {new Date(campaign.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-card border border-border rounded-xl transition-all text-text-muted hover:text-text-primary disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? "Deleting…" : "Delete Campaign"}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: campaign.total_contacts, icon: Users, color: "text-text-primary" },
          { label: "Sent", value: displaySent, icon: Send, color: "text-sky-500" },
          { label: "Delivered", value: displayDelivered, icon: PackageCheck, color: "text-emerald-400" },
          { label: "Read", value: displayRead, icon: Eye, color: "text-jade" },
          { label: "Failed", value: displayFailed, icon: AlertCircle, color: "text-rose-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
              <Icon className={`w-4 h-4 ${color} opacity-60`} />
            </div>
            <p className={`text-2xl font-bold font-syne ${color}`}>{value ?? 0}</p>
            <p className="text-[10px] text-text-muted">
              {label !== "Total" ? `${Math.round(((value ?? 0) / total) * 100)}% of total` : `${campaign.status === "sent" ? "Complete" : "Target"}`}
            </p>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      <div className="glass-card space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold font-syne flex items-center gap-2"><TrendingUp className="w-4 h-4 text-jade" /> Delivery Progress</h3>
          <span className="text-xs font-bold text-text-primary">{sentPct}% sent</span>
        </div>
        <div className="space-y-3">
          {[
            { label: "Sent", pct: sentPct, color: "bg-sky-500" },
            { label: "Delivered", pct: deliveredPct, color: "bg-emerald-400" },
            { label: "Read", pct: readPct, color: "bg-jade" },
            { label: "Failed", pct: failedPct, color: "bg-rose-500" },
          ].map(({ label, pct, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider">
                <span>{label}</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
                <div
                  className={`${color} h-full rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Campaign Info + Template ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Campaign Info */}
        <div className="glass-card space-y-4">
          <h3 className="text-sm font-bold font-syne flex items-center gap-2"><Info className="w-4 h-4 text-jade" /> Campaign Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Segment</span>
              <span className="font-semibold text-right">{campaign.segment?.name || "—"}</span>
            </div>
            {campaign.segment?.description && (
              <div className="flex justify-between items-start">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Description</span>
                <span className="text-text-muted text-xs text-right max-w-[200px]">{campaign.segment.description}</span>
              </div>
            )}
            <div className="flex justify-between items-start">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Scheduled</span>
              <span className="font-semibold text-right text-xs">
                {campaign.scheduled_at
                  ? new Date(campaign.scheduled_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                  : "Immediate"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Status</span>
              {getStatusBadge(campaign.status)}
            </div>
          </div>
        </div>

        {/* Template Info */}
        <div className="glass-card space-y-4">
          <h3 className="text-sm font-bold font-syne flex items-center gap-2"><FileText className="w-4 h-4 text-jade" /> Template Used</h3>
          {campaign.template ? (
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Name</span>
                <span className="font-semibold font-mono text-xs text-right">{campaign.template.name}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Category</span>
                <span className="font-semibold text-xs capitalize text-right">{campaign.template.category?.toLowerCase()}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Language</span>
                <span className="font-semibold text-xs text-right">{campaign.template.language}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Approval</span>
                <span className={`text-xs font-bold uppercase ${(!campaign.template.status || campaign.template.status === "APPROVED") ? "text-jade" : "text-amber-400"}`}>
                  {campaign.template.status || "Meta Approved"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">Template not found (may have been deleted).</p>
          )}

          {/* Variable Mapping — skip internal keys like _header_media_url */}
          {campaign.variable_mapping && Object.entries(campaign.variable_mapping).filter(([key]) => !key.startsWith('_')).length > 0 && (
            <div className="pt-3 border-t border-border/50 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Variable Mapping</p>
              <div className="space-y-1.5">
                {Object.entries(campaign.variable_mapping)
                  .filter(([key]) => !key.startsWith('_'))
                  .map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-xs">
                      <span className="font-mono text-jade bg-jade/10 px-1.5 py-0.5 rounded text-[10px]">{`{{${key}}}`}</span>
                      <span className="text-text-muted">→</span>
                      <span className="font-medium">{val}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Logs Table ── */}
      <div className="glass-card space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-sm font-bold font-syne flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-jade" /> Delivery Logs
            <span className="text-[10px] font-bold bg-surface border border-border text-text-muted px-2 py-0.5 rounded-full ml-1">
              {logs.length}
            </span>
          </h3>
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search phone…"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="input-field text-xs pl-3 pr-8 py-1.5 w-44"
            />
            {logSearch && (
              <button onClick={() => setLogSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {(["all", "sent", "delivered", "read", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setLogFilter(f)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border
                ${logFilter === f
                  ? "bg-jade/10 border-jade/30 text-jade"
                  : "bg-surface border-border text-text-muted hover:text-text-primary hover:bg-card"}`}
            >
              {f} <span className="opacity-60">({logCounts[f]})</span>
            </button>
          ))}
        </div>

        {/* Logs error */}
        {logsError && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-xs text-rose-400 font-mono">
            ⚠ {logsError}
          </div>
        )}

        {/* Table */}
        {isLoadingLogs ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-jade border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-muted font-dm-sans">Loading logs…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Activity className="w-8 h-8 text-text-muted opacity-20 mx-auto" />
            <p className="text-sm font-semibold font-syne">
              {logSearch ? "No logs match your search" : "No logs recorded yet"}
            </p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {logSearch
                ? "Try a different phone number."
                : "This campaign might be queued or hasn't started sending yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-surface/60">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Phone</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Sent At</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Error</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredLogs.map((log) => {
                  const hasFailed = (log.status || "").toLowerCase() === "failed";
                  const errorMsg = log.error || log.error_message || log.error_detail;
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`hover:bg-surface/40 transition-colors ${hasFailed ? "bg-rose-500/3" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-text-primary">{log.phone}</td>
                        <td className="px-4 py-3">{getLogStatusBadge(log.status)}</td>
                        <td className="px-4 py-3 text-text-muted">
                          {log.sent_at
                            ? new Date(log.sent_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                            : new Date(log.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3 text-text-muted max-w-[200px] truncate">
                          {hasFailed && errorMsg ? (
                            <span className="font-mono text-rose-400 text-[10px]">{errorMsg.slice(0, 60)}{errorMsg.length > 60 ? "…" : ""}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasFailed && errorMsg && (
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-text-muted hover:text-text-primary transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasFailed && errorMsg && (
                        <tr className="bg-rose-500/5">
                          <td colSpan={5} className="px-4 pb-3 pt-1">
                            <div className="p-3 bg-rose-500/8 border border-rose-500/20 rounded-lg text-[11px] font-mono text-rose-400 break-words">
                              <span className="font-bold uppercase tracking-wider mr-2 text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">Error Detail</span>
                              {errorMsg}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
