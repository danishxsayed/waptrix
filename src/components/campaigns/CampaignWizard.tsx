"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Send, Users, FileText, Calendar, CheckCircle2 } from "lucide-react";
import axios from "axios";

export default function CampaignWizard({ onClose, onLaunch }: { onClose: () => void, onLaunch: () => void }) {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  
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
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get("/api/templates").catch(() => ({ data: [] })),
        axios.get("/api/contacts/segments").catch(() => ({ data: [] }))
      ]);

      let fetchedTemplates = tRes.data.filter((t: any) => t.meta_status === 'APPROVED');
      let fetchedSegments = sRes.data;

      // DEMO: Inject placeholder data if database is empty so the wizard flow can be tested
      if (fetchedTemplates.length === 0) {
        fetchedTemplates = [
          {
            id: 'dummy-tpl-1',
            name: 'Welcome Offer',
            category: 'MARKETING',
            body: 'Hey {{1}}! Welcome to Waptrix. We\'re giving you 50% off your first software integration. Use code: START',
            meta_status: 'APPROVED'
          }
        ];
      }

      if (fetchedSegments.length === 0) {
        fetchedSegments = [
          {
            id: 'dummy-seg-1',
            name: 'All Subscribers',
          },
          {
            id: 'dummy-seg-2',
            name: 'VIP Customers',
          }
        ];
      }

      setTemplates(fetchedTemplates);
      setSegments(fetchedSegments);
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  const handleLaunch = async () => {
    setIsSubmitting(true);
    try {
      await axios.post("/api/campaigns", formData);
      onLaunch();
      onClose();
    } catch (err) {
      console.error("Launch failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === formData.template_id);
  const selectedSegment = segments.find(s => s.id === formData.segment_id);

  // Extract variables from template body e.g. {{1}}
  const variables = selectedTemplate ? selectedTemplate.body.match(/{{\d+}}/g) || [] : [];

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
              className={`flex-1 h-full transition-all duration-500 ${s <= step ? 'bg-jade shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-transparent'}`}
            />
          ))}
        </div>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
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
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Campaign Name</label>
                  <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. April Flash Sale"
                    className="input-field w-full text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">WhatsApp Template</label>
                  <div className="grid grid-cols-1 gap-3">
                    {templates.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setFormData({...formData, template_id: t.id})}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          formData.template_id === t.id 
                            ? 'bg-jade/5 border-jade' 
                            : 'bg-card border-border hover:border-jade/30'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm">{t.name}</span>
                          <span className="text-[10px] font-bold text-text-muted uppercase px-2 py-0.5 border border-border rounded">{t.category}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-2 line-clamp-1 italic">"{t.body}"</p>
                      </button>
                    ))}
                    {templates.length === 0 && (
                      <div className="p-8 text-center bg-card border border-dashed border-border rounded-xl">
                        <AlertCircle className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-text-muted">No approved templates found. Go to Templates to create one.</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTemplate && variables.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Map Variables</label>
                    {variables.map((v: string) => {
                      const num = v.replace('{{', '').replace('}}', '');
                      return (
                        <div key={v} className="flex gap-4 items-center">
                          <span className="text-sm font-mono text-jade bg-jade/10 w-10 py-1 text-center rounded">{v}</span>
                          <select 
                            className="input-field flex-1 text-xs"
                            onChange={e => setFormData({
                              ...formData, 
                              variable_mapping: {...formData.variable_mapping, [num]: e.target.value}
                            })}
                          >
                            <option value="">Select Contact Field</option>
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

              <div className="grid grid-cols-1 gap-4">
                {segments.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => setFormData({...formData, segment_id: s.id})}
                    className={`p-6 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      formData.segment_id === s.id 
                        ? 'bg-jade/5 border-jade' 
                        : 'bg-card border-border hover:border-jade/30'
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
                  onClick={() => setFormData({...formData, send_now: true})}
                  className={`p-6 rounded-2xl border text-left transition-all ${
                    formData.send_now 
                      ? 'bg-jade/5 border-jade' 
                      : 'bg-card border-border hover:border-jade/30'
                  }`}
                >
                  <h4 className="font-bold text-sm mb-1">Send Immediately</h4>
                  <p className="text-[11px] text-text-muted">Broadcast will start as soon as you launch.</p>
                </button>
                <button 
                  onClick={() => setFormData({...formData, send_now: false})}
                  className={`p-6 rounded-2xl border text-left transition-all ${
                    !formData.send_now 
                      ? 'bg-jade/5 border-jade' 
                      : 'bg-card border-border hover:border-jade/30'
                  }`}
                >
                  <h4 className="font-bold text-sm mb-1">Schedule for Later</h4>
                  <p className="text-[11px] text-text-muted">Choose a specific date and time.</p>
                </button>
              </div>

              {!formData.send_now && (
                <div className="pt-4 animate-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Date & Time</label>
                  <input 
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={e => setFormData({...formData, scheduled_at: e.target.value})}
                    className="input-field w-full text-sm"
                  />
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
                <h3 className="text-2xl font-bold font-syne">Review Campaign</h3>
                <p className="text-sm text-text-muted max-w-sm">Almost ready! Please double check your campaign details before launching.</p>
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
            </div>
          )}
        </div>

        <div className="h-20 border-t border-border bg-card px-8 flex items-center justify-between">
          <button 
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className={`flex items-center gap-1 text-sm font-bold ${step === 1 ? 'text-text-muted opacity-30' : 'text-text-primary hover:text-jade transition-colors'}`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          
          {step < 4 ? (
            <button 
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && (!formData.name || !formData.template_id)) || (step === 2 && !formData.segment_id)}
              className="btn-primary flex items-center gap-1"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleLaunch}
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2 px-8"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
              Launch Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
