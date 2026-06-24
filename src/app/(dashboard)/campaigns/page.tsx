"use client";
export const dynamic = "force-dynamic";


import { useState, useEffect } from "react";
import {
  Plus,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  BarChart2,
  MoreVertical,
  Activity,
  Trash2,
  X,
  Info,
  Eye,
  PackageCheck,
  Calendar
} from "lucide-react";
import axios from "axios";
import CampaignWizard from "@/components/campaigns/CampaignWizard";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Interactive options and logs state
  const [activeMenuCampaignId, setActiveMenuCampaignId] = useState<string | null>(null);
  const [selectedCampaignForLogs, setSelectedCampaignForLogs] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCampaignForLogs) {
      fetchLogs(selectedCampaignForLogs.id);
    }
  }, [selectedCampaignForLogs]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("new") === "true") {
        setIsWizardOpen(true);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  const fetchCampaigns = async () => {
    setFetchError("");
    try {
      const res = await axios.get("/api/campaigns");
      setCampaigns(res.data || []);
    } catch (err: any) {
      setFetchError(err.response?.data?.error || "Failed to load campaigns. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async (campaignId: string) => {
    setIsLoadingLogs(true);
    try {
      const res = await axios.get(`/api/campaigns/${campaignId}/logs`);
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign? This will also delete all associated logs.")) return;
    setDeleteError("");
    try {
      await axios.delete(`/api/campaigns/${campaignId}`);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || "Failed to delete campaign. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sending':
        return <span className="bg-jade/10 text-jade px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-jade/20 flex items-center gap-1 animate-pulse"><Activity className="w-3 h-3" /> Sending</span>;
      case 'sent':
        return <span className="bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-sky-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</span>;
      case 'queued':
        return <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> Queued</span>;
      case 'scheduled':
        return <span className="bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-violet-500/20 flex items-center gap-1"><Calendar className="w-3 h-3" /> Scheduled</span>;
      case 'failed':
        return <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-rose-500/20 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className="bg-card text-text-muted px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-border">Draft</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-jade border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium transition-all
          ${toast.type === 'success'
            ? 'bg-jade text-white border border-jade/30'
            : 'bg-danger text-white border border-danger/30'}`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Error banners */}
      {fetchError && (
        <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{fetchError}</span>
          <button onClick={fetchCampaigns} className="btn-secondary text-xs shrink-0">Retry</button>
        </div>
      )}
      {deleteError && (
        <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{deleteError}</span>
          <button onClick={() => setDeleteError("")} className="text-xs opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-syne">Marketing Campaigns</h2>
          <p className="text-sm text-text-muted font-dm-sans">Track and manage your bulk message blasts.</p>
        </div>
        <button 
          onClick={() => setIsWizardOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="glass-card flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 flex flex-col md:flex-row gap-6 items-center w-full">
              <div className="w-14 h-14 bg-surface border border-border rounded-2xl flex items-center justify-center shrink-0">
                <Send className="w-6 h-6 text-jade" />
              </div>
              
              <div className="flex-1 space-y-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <h3 className="font-bold font-syne text-lg">{campaign.name}</h3>
                  {getStatusBadge(campaign.status)}
                </div>
                <div className="flex items-center justify-center md:justify-start gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {campaign.segment?.name || "All Contacts"}</span>
                  <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {campaign.template?.name}</span>
                  {campaign.status === 'scheduled' && campaign.scheduled_at && (
                    <span className="flex items-center gap-1 text-violet-400 font-semibold">
                      <Calendar className="w-3 h-3" />
                      Launches {new Date(campaign.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-text-muted">Progress</span>
                <span className="text-text-primary">{Math.round((campaign.sent_count / (campaign.total_contacts || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border">
                <div 
                  className="bg-jade h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  style={{ width: `${(campaign.sent_count / (campaign.total_contacts || 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <span>{campaign.sent_count} Sent</span>
                <span>{campaign.total_contacts} Total</span>
              </div>
            </div>

            <div className="flex items-center gap-4 border-l border-border/50 pl-8 h-12 relative">
              <div className="text-center">
                <p className="text-xs font-bold text-text-primary">{campaign.delivered_count}</p>
                <p className="text-[10px] text-text-muted uppercase">Delivered</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-jade">{campaign.read_count}</p>
                <p className="text-[10px] text-text-muted uppercase">Read</p>
              </div>
              <div className="relative shrink-0">
                <button 
                  onClick={() => setActiveMenuCampaignId(activeMenuCampaignId === campaign.id ? null : campaign.id)}
                  className="p-2 hover:bg-card rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-border"
                >
                  <MoreVertical className="w-4 h-4 text-text-muted hover:text-text-primary" />
                </button>
                {activeMenuCampaignId === campaign.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setActiveMenuCampaignId(null)}
                    />
                    <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-card border border-border p-1.5 shadow-xl z-20 space-y-0.5 backdrop-blur-md">
                      <button
                        onClick={() => {
                          setSelectedCampaignForLogs(campaign);
                          setActiveMenuCampaignId(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-dm-sans flex items-center gap-2 text-text-primary hover:bg-surface transition-all"
                      >
                        <Activity className="w-3.5 h-3.5 text-jade" />
                        View Delivery Logs
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteCampaign(campaign.id);
                          setActiveMenuCampaignId(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-dm-sans flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Campaign
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl space-y-4">
            <Send className="w-12 h-12 text-text-muted opacity-20" />
            <div className="text-center">
              <h3 className="font-bold font-syne">No campaigns yet</h3>
              <p className="text-xs text-text-muted mt-2">Launch your first message blast to reach your customers.</p>
            </div>
          </div>
        )}
      </div>

      {isWizardOpen && (
        <CampaignWizard
          onClose={() => setIsWizardOpen(false)}
          onLaunch={() => {
            fetchCampaigns();
            showToast("🚀 Campaign launched! Messages are being sent in the background.");
          }}
        />
      )}

      {/* Campaign Logs Modal */}
      {selectedCampaignForLogs && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-card/90 border border-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] backdrop-blur-md">
            {/* Header */}
            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-surface/50">
              <div>
                <span className="text-[10px] font-bold text-jade uppercase tracking-wider">Campaign Logs</span>
                <h3 className="text-lg font-bold font-syne mt-0.5">{selectedCampaignForLogs.name}</h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedCampaignForLogs(null);
                  setLogs([]);
                }}
                className="p-1.5 hover:bg-card border border-border/40 rounded-xl transition-all text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 border-b border-border/30 bg-surface/20 divide-x divide-border/30 text-center py-4">
              <div>
                <p className="text-xs font-bold text-text-primary">{selectedCampaignForLogs.total_contacts || 0}</p>
                <p className="text-[10px] text-text-muted uppercase mt-0.5">Total Contacts</p>
              </div>
              <div>
                <p className="text-xs font-bold text-sky-500">{selectedCampaignForLogs.sent_count || 0}</p>
                <p className="text-[10px] text-text-muted uppercase mt-0.5">Sent Success</p>
              </div>
              <div>
                <p className="text-xs font-bold text-rose-500">{selectedCampaignForLogs.failed_count || 0}</p>
                <p className="text-[10px] text-text-muted uppercase mt-0.5">Failed</p>
              </div>
              <div>
                <p className="text-xs font-bold text-jade">{selectedCampaignForLogs.read_count || 0}</p>
                <p className="text-[10px] text-text-muted uppercase mt-0.5">Read</p>
              </div>
            </div>

            {/* Body / Logs List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-6 h-6 border-2 border-jade border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-text-muted font-dm-sans">Loading campaign logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Info className="w-8 h-8 text-text-muted opacity-30 mx-auto" />
                  <p className="text-sm font-semibold font-syne text-text-primary">No logs recorded yet</p>
                  <p className="text-xs text-text-muted font-dm-sans max-w-sm mx-auto">
                    This campaign might be queued, draft, or hasn't started sending yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {logs.map((log) => (
                    <div key={log.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold font-dm-sans text-text-primary">{log.phone}</p>
                          <p className="text-[10px] text-text-muted font-dm-sans">
                            {log.sent_at ? `Sent at: ${new Date(log.sent_at).toLocaleString()}` : `Logged at: ${new Date(log.created_at).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {(() => {
                            const s = (log.status || '').toLowerCase();
                            if (s === 'read') return (
                              <span className="bg-jade/10 text-jade px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-jade/20 flex items-center gap-1">
                                <Eye className="w-2.5 h-2.5" /> Read
                              </span>
                            );
                            if (s === 'delivered') return (
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-emerald-500/20 flex items-center gap-1">
                                <PackageCheck className="w-2.5 h-2.5" /> Delivered
                              </span>
                            );
                            if (s === 'sent') return (
                              <span className="bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-sky-500/20 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Sent
                              </span>
                            );
                            if (s === 'failed') return (
                              <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-rose-500/20 flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5" /> Failed
                              </span>
                            );
                            // queued / unknown
                            return (
                              <span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-yellow-500/20 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {s || 'Queued'}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      {(log.status || '').toLowerCase() === 'failed' && (
                        <div className="mt-2 p-2.5 bg-rose-500/5 border border-rose-500/15 rounded-lg text-[11px] font-mono text-rose-400 break-words">
                          <span className="font-bold uppercase tracking-wider mr-1 text-[9px] bg-rose-500/15 text-rose-300 px-1 py-0.5 rounded">Error Detail</span>
                          {log.error || log.error_message || log.error_detail || '⚠️ No error captured — check if the message_logs table has an "error" column. Common cause: number not on WhatsApp, or Meta app in Development mode (number not whitelisted).'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
