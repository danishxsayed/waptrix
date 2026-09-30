"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Workflow,
  ExternalLink,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Users,
  MessageSquare,
} from "lucide-react";

interface Flow {
  id: string;
  name: string;
  status: string;
  categories: string[];
  updated_at: string;
  preview_url: string | null;
  has_errors: boolean;
  response_count: number;
}

interface FlowResponse {
  id: string;
  contact_phone: string;
  contact_id: string | null;
  response_data: Record<string, any>;
  flow_token: string | null;
  created_at: string;
  contacts?: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED:  "bg-jade/10 text-jade border-jade/20",
  DRAFT:      "bg-warning/10 text-warning border-warning/20",
  DEPRECATED: "bg-text-muted/10 text-text-muted border-text-muted/20",
  BLOCKED:    "bg-danger/10 text-danger border-danger/20",
  THROTTLED:  "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Selected flow for responses panel
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [responses, setResponses] = useState<FlowResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);

  // Send flow modal
  const [sendModal, setSendModal] = useState<Flow | null>(null);
  const [sendPhone, setSendPhone] = useState("");
  const [sendHeader, setSendHeader] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendCta, setSendCta] = useState("Open Form");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  const fetchFlows = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await axios.get("/api/flows");
      setFlows(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load flows");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const fetchResponses = useCallback(async (flowId: string) => {
    setLoadingResponses(true);
    setResponses([]);
    try {
      const res = await axios.get(`/api/flows/${flowId}/responses`);
      setResponses(res.data);
    } catch {
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  }, []);

  const openResponses = (flow: Flow) => {
    setSelectedFlow(flow);
    setExpandedResponseId(null);
    fetchResponses(flow.id);
  };

  const handleSend = async () => {
    if (!sendModal || !sendPhone.trim()) return;
    setSending(true);
    setSendError("");
    setSendSuccess(false);
    try {
      await axios.post("/api/flows/send", {
        flow_id: sendModal.id,
        flow_name: sendModal.name,
        phone: sendPhone.trim(),
        header_text: sendHeader || undefined,
        body_text: sendBody || undefined,
        cta_text: sendCta || "Open Form",
      });
      setSendSuccess(true);
      setSendPhone("");
      setSendHeader("");
      setSendBody("");
      setSendCta("Open Form");
      // refresh response count
      fetchFlows(true);
    } catch (err: any) {
      setSendError(err.response?.data?.error || "Failed to send flow");
    } finally {
      setSending(false);
    }
  };

  const closeSendModal = () => {
    setSendModal(null);
    setSendPhone("");
    setSendHeader("");
    setSendBody("");
    setSendCta("Open Form");
    setSendError("");
    setSendSuccess(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-jade border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm font-medium animate-pulse font-syne">Loading flows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-bold font-syne flex items-center gap-2">
            <Workflow className="w-5 h-5 text-jade" /> WhatsApp Flows
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            Interactive forms built in Meta's Flow Builder — send them to contacts and collect responses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://business.facebook.com/wa/manage/flows/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Open Flow Builder
          </a>
          <button
            onClick={() => fetchFlows(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Empty state */}
      {!error && flows.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-14 h-14 bg-jade/10 border border-jade/20 rounded-2xl flex items-center justify-center">
            <Workflow className="w-7 h-7 text-jade" />
          </div>
          <div>
            <p className="font-bold text-text-primary font-syne">No flows found</p>
            <p className="text-sm text-text-muted mt-1 max-w-sm">
              Create your first flow in Meta's Flow Builder, then come back here to send it to contacts.
            </p>
          </div>
          <a
            href="https://business.facebook.com/wa/manage/flows/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Create a Flow in Meta
          </a>
        </div>
      )}

      {/* Flows list + responses panel */}
      {flows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Flows list */}
          <div className={`${selectedFlow ? "lg:col-span-2" : "lg:col-span-5"} space-y-3`}>
            {flows.map((flow) => (
              <div
                key={flow.id}
                className={`glass-card cursor-pointer transition-all hover:border-jade/30 ${selectedFlow?.id === flow.id ? "border-jade/40 bg-jade/5" : ""}`}
                onClick={() => openResponses(flow)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-text-primary truncate">{flow.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${STATUS_STYLES[flow.status] || STATUS_STYLES.DRAFT}`}>
                        {flow.status}
                      </span>
                      {flow.has_errors && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-danger/10 text-danger border-danger/20 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Errors
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {flow.categories.length > 0 && (
                        <span className="text-[10px] text-text-muted font-medium">{flow.categories.join(", ")}</span>
                      )}
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(flow.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold font-syne text-jade">{flow.response_count}</p>
                      <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Responses</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSendModal(flow); }}
                      disabled={flow.status !== "PUBLISHED"}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-jade text-background text-xs font-bold hover:bg-jade/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title={flow.status !== "PUBLISHED" ? "Flow must be Published to send" : "Send this flow"}
                    >
                      <Send className="w-3 h-3" /> Send
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Responses panel */}
          {selectedFlow && (
            <div className="lg:col-span-3 glass-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm font-syne flex items-center gap-2">
                    <FileText className="w-4 h-4 text-jade" /> {selectedFlow.name}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">Responses ({responses.length})</p>
                </div>
                <button onClick={() => setSelectedFlow(null)} className="text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingResponses ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-jade border-t-transparent rounded-full animate-spin" />
                </div>
              ) : responses.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <MessageSquare className="w-8 h-8 text-text-muted opacity-20 mx-auto" />
                  <p className="text-sm font-semibold text-text-muted">No responses yet</p>
                  <p className="text-xs text-text-muted opacity-60">Send this flow to contacts and responses will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {responses.map((r) => {
                    const isExpanded = expandedResponseId === r.id;
                    const name = (r.contacts as any)?.name || null;
                    const fields = Object.entries(r.response_data).filter(
                      ([k]) => !["flow_token", "flow_id", "status", "version"].includes(k)
                    );
                    return (
                      <div key={r.id} className="border border-border/50 rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors text-left"
                          onClick={() => setExpandedResponseId(isExpanded ? null : r.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-jade/10 border border-jade/20 flex items-center justify-center shrink-0">
                              <Users className="w-3.5 h-3.5 text-jade" />
                            </div>
                            <div>
                              {name && <p className="text-xs font-semibold text-text-primary">{name}</p>}
                              <p className="text-[11px] font-mono text-text-muted">{r.contact_phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-text-muted">
                              {new Date(r.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-jade bg-jade/10 border border-jade/20 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> {fields.length} {fields.length === 1 ? "field" : "fields"}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border/40 px-4 py-3 bg-surface/30 space-y-2">
                            {fields.length === 0 ? (
                              <p className="text-xs text-text-muted italic">No field data in response</p>
                            ) : (
                              fields.map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3">
                                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider w-32 shrink-0 pt-0.5">{key.replace(/_/g, " ")}</span>
                                  <span className="text-xs text-text-primary break-all">{String(value)}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Send Flow Modal */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSendModal} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold font-syne">Send Flow</h3>
                <p className="text-xs text-text-muted mt-0.5 truncate max-w-[280px]">{sendModal.name}</p>
              </div>
              <button onClick={closeSendModal} className="text-text-muted hover:text-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {sendSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <div className="w-12 h-12 bg-jade/10 border border-jade/20 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-jade" />
                </div>
                <p className="font-semibold text-text-primary">Flow sent successfully!</p>
                <p className="text-xs text-text-muted">The contact will see the flow in their WhatsApp.</p>
                <button onClick={closeSendModal} className="btn-primary mt-2">Done</button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                      Phone Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +919970939342"
                      value={sendPhone}
                      onChange={(e) => setSendPhone(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                    <p className="text-[10px] text-text-muted mt-1">Include country code (e.g. +91 for India)</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Header Text</label>
                    <input
                      type="text"
                      placeholder="Please fill out the form"
                      value={sendHeader}
                      onChange={(e) => setSendHeader(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Body Text</label>
                    <textarea
                      rows={2}
                      placeholder="Tap the button below to open the form."
                      value={sendBody}
                      onChange={(e) => setSendBody(e.target.value)}
                      className="input-field w-full text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Button Label</label>
                    <input
                      type="text"
                      placeholder="Open Form"
                      value={sendCta}
                      onChange={(e) => setSendCta(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                  </div>
                </div>

                {sendError && (
                  <div className="bg-danger/10 border border-danger/20 rounded-xl px-3 py-2 text-xs text-danger flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {sendError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={closeSendModal} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !sendPhone.trim()}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <><div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Flow</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
