"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Send, Users, FileText, Calendar, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";

export default function CampaignWizard({ onClose, onLaunch }: { onClose: () => void, onLaunch: () => void }) {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [launchError, setLaunchError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    template_id: "",
    segment_id: "",
    variable_mapping: {} as any,
    send_now: true,
    scheduled_at: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoadingData(true);
    setLoadError("");
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get("/api/templates"),
        axios.get("/api/contacts/segments"),
      ]);

      const approvedTemplates = (tRes.data || []).filter((t: any) => t.meta_status === "APPROVED");
      setTemplates(approvedTemplates);
      setSegments(sRes.data || []);
    } catch (err: any) {
      setLoadError(err.response?.data?.error || "Failed to load templates and segments. Please try again.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLaunch = async () => {
    setLaunchError("");
    setIsSubmitting(true);
    try {
      await axios.post("/api/campaigns", formData);
      // Close immediately — sending runs in background via waitUntil
      onLaunch();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Failed to launch campaign. Please try again.";
      setLaunchError(msg);
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === formData.template_id);
  const selectedSegment = segments.find(s => s.id === formData.segment_id);
  const variables = selectedTemplate ? selectedTemplate.body.match(/{{\d+}}/g) || [] : [];

  const canProceedStep1 = formData.name.trim().length > 0 && formData.template_id !== "";
  const canProceedStep2 = formData.segment_id !== "";
  const canProceedStep3 = formData.send_now || (!!formData.scheduled_at && new Date(formData.scheduled_at) > new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-card">
          <h2 className="text-xl font-bold font-syne">New Campaign</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg text-text-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-surface flex">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-full transition-all duration-500 ${s <= step ? "bg-jade shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-transparent"}`}
            />
          ))}
        </div>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {/* Loading state */}
          {isLoadingData && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 text-jade animate-spin" />
              <p className="text-sm text-text-muted">Loading templates and segments...</p>
            </div>
          )}

          {/* Load error */}
          {!isLoadingData && loadError && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="w-10 h-10 text-danger opacity-70" />
              <p className="text-sm text-danger">{loadError}</p>
              <button onClick={fetchData} className="btn-secondary text-sm">Retry</button>
            </div>
          )}

          {!isLoadingData && !loadError && (
            <>
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-jade/10 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-jade" />
                    </div>
                    <div>
                      <h3 className="font-bold font-syne text-lg">Select Template</h3>
                      <p className="text-xs text-text-muted">Choose an approved message template</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Campaign Name *</label>
                      <input
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. April Flash Sale"
                        className="input-field w-full text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">WhatsApp Template *</label>
                      {templates.length === 0 ? (
                        <div className="p-8 text-center bg-card border border-dashed border-border rounded-xl">
                          <FileText className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-semibold text-text-muted">No approved templates</p>
                          <p className="text-xs text-text-muted mt-1">Go to Templates → Create and submit one for Meta approval first.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {templates.map(t => (
                            <button
                              key={t.id}
                              onClick={() => setFormData({ ...formData, template_id: t.id })}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                formData.template_id === t.id
                                  ? "bg-jade/5 border-jade"
                                  : "bg-card border-border hover:border-jade/30"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-sm">{t.name}</span>
                                <span className="text-[10px] font-bold text-text-muted uppercase px-2 py-0.5 border border-border rounded">{t.category}</span>
                              </div>
                              <p className="text-xs text-text-muted mt-2 line-clamp-1 italic">&ldquo;{t.body}&rdquo;</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedTemplate && variables.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-border">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Map Template Variables</label>
                        <p className="text-[11px] text-text-muted">Tell us which contact field to use for each variable in your template.</p>
                        {variables.map((v: string) => {
                          const num = v.replace("{{", "").replace("}}", "");
                          return (
                            <div key={v} className="flex gap-4 items-center">
                              <span className="text-sm font-mono text-jade bg-jade/10 w-10 py-1 text-center rounded shrink-0">{v}</span>
                              <select
                                className="input-field flex-1 text-xs"
                                value={formData.variable_mapping[num] || ""}
                                onChange={e =>
                                  setFormData({
                                    ...formData,
                                    variable_mapping: { ...formData.variable_mapping, [num]: e.target.value },
                                  })
                                }
                              >
                                <option value="">Select contact field</option>
                                <option value="name">Contact Name</option>
                                <option value="phone">Phone Number</option>
                                <option value="email">Email</option>
                                <option value="custom1">Custom Field 1</option>
                                <option value="custom2">Custom Field 2</option>
                                <option value="custom3">Custom Field 3</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-jade/10 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-jade" />
                    </div>
                    <div>
                      <h3 className="font-bold font-syne text-lg">Target Audience</h3>
                      <p className="text-xs text-text-muted">Select who should receive this campaign</p>
                    </div>
                  </div>

                  {segments.length === 0 ? (
                    <div className="p-8 text-center bg-card border border-dashed border-border rounded-xl">
                      <Users className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-semibold text-text-muted">No segments found</p>
                      <p className="text-xs text-text-muted mt-1">Go to Contacts → create a segment and import your contacts first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {segments.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setFormData({ ...formData, segment_id: s.id })}
                          className={`p-6 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            formData.segment_id === s.id
                              ? "bg-jade/5 border-jade"
                              : "bg-card border-border hover:border-jade/30"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-text-muted">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-bold text-sm block">{s.name}</span>
                              <span className="text-xs text-text-muted">All contacts in this segment</span>
                            </div>
                          </div>
                          {formData.segment_id === s.id && <CheckCircle2 className="w-5 h-5 text-jade" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-jade/10 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-jade" />
                    </div>
                    <div>
                      <h3 className="font-bold font-syne text-lg">Schedule Campaign</h3>
                      <p className="text-xs text-text-muted">When should we start sending?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setFormData({ ...formData, send_now: true })}
                      className={`p-6 rounded-2xl border text-left transition-all ${
                        formData.send_now ? "bg-jade/5 border-jade" : "bg-card border-border hover:border-jade/30"
                      }`}
                    >
                      <h4 className="font-bold text-sm mb-1">Send Immediately</h4>
                      <p className="text-[11px] text-text-muted">Broadcast starts as soon as you launch.</p>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, send_now: false })}
                      className={`p-6 rounded-2xl border text-left transition-all ${
                        !formData.send_now ? "bg-jade/5 border-jade" : "bg-card border-border hover:border-jade/30"
                      }`}
                    >
                      <h4 className="font-bold text-sm mb-1">Schedule for Later</h4>
                      <p className="text-[11px] text-text-muted">Choose a specific date and time.</p>
                    </button>
                  </div>

                  {!formData.send_now && (
                    <div className="pt-4 animate-in slide-in-from-top-2">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={formData.scheduled_at}
                        min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                        className="input-field w-full text-sm"
                      />
                      {formData.scheduled_at && new Date(formData.scheduled_at) <= new Date() && (
                        <p className="text-xs text-danger mt-1.5">Please choose a future date and time.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex flex-col items-center text-center space-y-4 mb-8">
                    <div className="w-20 h-20 bg-jade/10 rounded-full flex items-center justify-center border-4 border-jade/5">
                      <CheckCircle2 className="w-10 h-10 text-jade" />
                    </div>
                    <h3 className="text-2xl font-bold font-syne">Review &amp; Launch</h3>
                    <p className="text-sm text-text-muted max-w-sm">Double check your campaign details before launching.</p>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-sm text-text-muted">Campaign Name</span>
                      <span className="text-sm font-bold text-text-primary">{formData.name}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-sm text-text-muted">Template</span>
                      <span className="text-sm font-bold text-text-primary">{selectedTemplate?.name}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-sm text-text-muted">Audience</span>
                      <span className="text-sm font-bold text-jade">{selectedSegment?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-muted">Start Time</span>
                      <span className="text-sm font-bold text-text-primary">
                        {formData.send_now ? "Immediately" : new Date(formData.scheduled_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {launchError && (
                    <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Launch failed</p>
                        <p className="text-xs mt-0.5 opacity-80">{launchError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="h-20 border-t border-border bg-card px-8 flex items-center justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1 || isLoadingData}
            className={`flex items-center gap-1 text-sm font-bold ${step === 1 || isLoadingData ? "text-text-muted opacity-30" : "text-text-primary hover:text-jade transition-colors"}`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => { setLaunchError(""); setStep(s => s + 1); }}
              disabled={
                isLoadingData ||
                !!loadError ||
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              className="btn-primary flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2 px-8 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSubmitting ? "Launching..." : "Launch Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
