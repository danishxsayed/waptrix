"use client";
export const dynamic = "force-dynamic";


import { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ChevronRight,
  RefreshCw,
  Trash2,
  RotateCw,
  Flag,
  Pencil,
} from "lucide-react";
import axios from "axios";
import TemplateBuilder from "@/components/templates/TemplateBuilder";

type StatusTab = 'ALL' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'REJECTED';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [deleteError, setDeleteError] = useState<{ id: string; msg: string } | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [appealModal, setAppealModal] = useState<{ template: any; category: string; submitting: boolean } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchTemplates().then(() => {
      // After templates load, silently sync approved ones in the background
      // so Meta category changes are reflected without manual clicks
      backgroundSyncCategories();
    });
  }, []);

  const backgroundSyncCategories = async () => {
    // Get current approved templates from the latest state via API (state may not be set yet)
    try {
      const res = await axios.get("/api/templates");
      const allTemplates: any[] = res.data || [];
      const approved = allTemplates.filter(t => t.meta_template_id && t.meta_status === 'APPROVED');
      if (approved.length === 0) return;

      // Sync in parallel (fire-and-forget — don't block or show UI)
      const syncs = await Promise.allSettled(
        approved.map(t => axios.post(`/api/templates/${t.id}/sync`))
      );

      // Check if any category changed — if so, refresh the list and show toast
      let anyChanged = false;
      syncs.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.data?.categoryChanged) {
          anyChanged = true;
          const { from, to } = result.value.data.categoryChanged;
          showToast(`Meta changed "${approved[i].name}" category: ${from} → ${to}`, "error");
        }
      });

      if (anyChanged) fetchTemplates(true); // refresh list to show updated categories
    } catch {
      // Silent — don't show errors for background sync
    }
  };

  const fetchTemplates = async (quiet = false) => {
    if (quiet) setIsRefreshing(true);
    else setIsLoading(true);
    setFetchError("");
    try {
      const res = await axios.get("/api/templates");
      setTemplates(res.data || []);
    } catch (err: any) {
      setFetchError(err.response?.data?.error || "Failed to load templates. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this template?")) return;
    setDeleteError(null);
    try {
      await axios.delete(`/api/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast("Template deleted.");
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to delete template.";
      setDeleteError({ id, msg });
      showToast(msg, "error");
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsBuilderOpen(true);
  };

  const handleSync = async (template: any) => {
    if (!template.meta_template_id) {
      showToast("Template hasn't been submitted to Meta yet.", "error");
      return;
    }
    setSyncingId(template.id);
    setActiveMenu(null);
    try {
      const res = await axios.post(`/api/templates/${template.id}/sync`);
      const { metaStatus, categoryChanged } = res.data;

      // Update local state immediately
      setTemplates(prev => prev.map(t =>
        t.id === template.id
          ? {
              ...t,
              meta_status: metaStatus,
              ...(categoryChanged ? { category: categoryChanged.to } : {}),
            }
          : t
      ));

      if (categoryChanged) {
        showToast(`Category updated: ${categoryChanged.from} → ${categoryChanged.to}`);
      } else {
        showToast(`Synced — status: ${metaStatus}`);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Sync failed.", "error");
    } finally {
      setSyncingId(null);
    }
  };

  const handleAppeal = (template: any) => {
    if (!template.meta_template_id) {
      showToast("Template hasn't been submitted to Meta yet.", "error");
      return;
    }
    // Open modal — pre-select the template's current category
    setAppealModal({ template, category: template.category, submitting: false });
    setActiveMenu(null);
  };

  const submitAppeal = async () => {
    if (!appealModal) return;
    setAppealModal(prev => prev ? { ...prev, submitting: true } : null);
    try {
      await axios.post(`/api/templates/${appealModal.template.id}/appeal`, {
        category: appealModal.category,
      });
      setTemplates(prev => prev.map(t =>
        t.id === appealModal.template.id
          ? { ...t, meta_status: 'PENDING', category: appealModal.category }
          : t
      ));
      showToast("Appeal submitted! Meta will review within 24h.");
      setAppealModal(null);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Appeal failed.", "error");
      setAppealModal(prev => prev ? { ...prev, submitting: false } : null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge-jade flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'PENDING':
        return <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-xs font-semibold border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3 animate-pulse" /> Under Review</span>;
      case 'REJECTED':
        return <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-xs font-semibold border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="bg-card text-text-muted px-2 py-0.5 rounded-full text-xs font-semibold border border-border flex items-center gap-1">Draft</span>;
    }
  };

  // Tab definitions with counts
  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'DRAFT', label: 'Draft' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  const getTabCount = (key: StatusTab) => {
    if (key === 'ALL') return templates.length;
    if (key === 'DRAFT') return templates.filter(t => !t.meta_status || t.meta_status === 'DRAFT').length;
    return templates.filter(t => t.meta_status === key).length;
  };

  const filteredTemplates = templates.filter(t => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'DRAFT') return !t.meta_status || t.meta_status === 'DRAFT';
    return t.meta_status === activeTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-jade border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Appeal Category Modal ─────────────────────────────────────────── */}
      {appealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-base">Appeal Template Category</h2>
              </div>
              <button onClick={() => setAppealModal(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface text-text-muted">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-text-muted">
                Appealing <span className="font-semibold text-text-primary">{appealModal.template.name}</span>.
                {appealModal.template.meta_category && appealModal.template.meta_category !== appealModal.template.category && (
                  <> Meta reclassified it as <span className="font-semibold text-amber-400">{appealModal.template.meta_category}</span>.</>
                )}
              </p>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Appeal as category
                </label>
                <div className="flex gap-2">
                  {(['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setAppealModal(prev => prev ? { ...prev, category: cat } : null)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        appealModal.category === cat
                          ? 'bg-jade/15 border-jade text-jade'
                          : 'border-border text-text-muted hover:border-jade/50 hover:text-text-primary'
                      }`}
                    >
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-400 leading-relaxed">
                  Meta will review your appeal within 24 hours. If approved, the template will be re-listed under <strong>{appealModal.category.charAt(0) + appealModal.category.slice(1).toLowerCase()}</strong>. If rejected, no change is made.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setAppealModal(null)}
                className="flex-1 btn-secondary text-sm"
                disabled={appealModal.submitting}
              >
                Cancel
              </button>
              <button
                onClick={submitAppeal}
                disabled={appealModal.submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {appealModal.submitting ? (
                  <><RotateCw className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Flag className="w-4 h-4" /> Submit Appeal</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all ${
          toast.type === "success"
            ? "bg-jade/10 border-jade/30 text-jade"
            : "bg-danger/10 border-danger/30 text-danger"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Fetch error */}
      {fetchError && (
        <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Could not load templates</p>
            <p className="text-xs mt-0.5 opacity-80">{fetchError}</p>
          </div>
          <button onClick={() => fetchTemplates()} className="btn-secondary text-xs shrink-0">Retry</button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-syne">Message Templates</h2>
          <p className="text-sm text-text-muted">Manage and create Meta-approved WhatsApp templates.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchTemplates(true)}
            disabled={isRefreshing}
            className="btn-secondary flex items-center gap-2"
            title="Refresh statuses"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      {templates.length > 0 && (
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
          {tabs.map(({ key, label }) => {
            const count = getTabCount(key);
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? key === 'APPROVED'
                      ? 'bg-jade/20 text-jade border border-jade/30'
                      : key === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : key === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-card text-text-primary border border-border shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-card/50'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? key === 'APPROVED' ? 'bg-jade/30 text-jade'
                        : key === 'PENDING' ? 'bg-amber-500/30 text-amber-300'
                        : key === 'REJECTED' ? 'bg-rose-500/30 text-rose-300'
                        : 'bg-surface text-text-muted'
                      : 'bg-surface text-text-muted'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {filteredTemplates.length === 0 ? (
        <div className="glass-card py-20 flex flex-col items-center gap-4 text-center">
          <FileText className="w-12 h-12 text-text-muted opacity-20" />
          <div>
            {templates.length === 0 ? (
              <>
                <p className="text-sm font-semibold text-text-muted">No templates yet</p>
                <p className="text-xs text-text-muted mt-1">Create your first WhatsApp message template</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-text-muted">No {activeTab.toLowerCase()} templates</p>
                <p className="text-xs text-text-muted mt-1">Templates with this status will appear here</p>
              </>
            )}
          </div>
          {templates.length === 0 && (
            <button onClick={() => setIsBuilderOpen(true)} className="btn-primary flex items-center gap-2 mt-2">
              <Plus className="w-4 h-4" /> Create Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="glass-card flex flex-col hover:border-jade/30 transition-all">
              {/* Card header */}
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg border ${
                  template.meta_status === 'APPROVED' ? 'bg-jade/10 border-jade/20'
                  : template.meta_status === 'PENDING'  ? 'bg-amber-500/10 border-amber-500/20'
                  : template.meta_status === 'REJECTED' ? 'bg-rose-500/10 border-rose-500/20'
                  : 'bg-surface border-border'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    template.meta_status === 'APPROVED' ? 'text-jade'
                    : template.meta_status === 'PENDING' ? 'text-amber-500'
                    : template.meta_status === 'REJECTED' ? 'text-rose-500'
                    : 'text-text-muted'
                  }`} />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                    className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface"
                    disabled={syncingId === template.id}
                  >
                    {syncingId === template.id
                      ? <RotateCw className="w-4 h-4 animate-spin text-jade" />
                      : <MoreVertical className="w-4 h-4" />
                    }
                  </button>
                  {activeMenu === template.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-10 py-1 overflow-hidden">
                      <button
                        onClick={() => { handleSync(template); setActiveMenu(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-jade hover:bg-jade/10 transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> Sync from Meta
                      </button>
                      <div className="h-px bg-border mx-2" />
                      <button
                        onClick={() => { handleDelete(template.id); setActiveMenu(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Template
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-3">
                <h3 className="font-bold font-syne">{template.name}</h3>
                <div className="flex gap-2 flex-wrap">
                  {getStatusBadge(template.meta_status)}
                  <span className="bg-surface text-text-muted px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-border">
                    {template.category}
                  </span>
                  {template.meta_category && template.meta_category !== template.category && (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      Meta: {template.meta_category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted line-clamp-2 leading-relaxed italic">
                  &ldquo;{template.body}&rdquo;
                </p>
                {template.meta_status === 'REJECTED' && template.rejection_reason && (
                  <p className="text-[10px] text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-lg px-2 py-1.5 leading-relaxed">
                    <span className="font-bold">Reason: </span>{template.rejection_reason}
                  </p>
                )}
              </div>

              {/* Footer actions */}
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-full bg-jade/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-jade uppercase">
                    {(template.created_by_name || 'O')[0]}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted truncate">
                  {template.created_by_name || 'Owner'}
                </span>
                <span className="text-[10px] text-text-muted ml-auto flex-shrink-0">
                  {new Date(template.updated_at).toLocaleDateString()}
                </span>
              </div>

              <div className="pt-3 border-t border-border/50">
                {template.meta_status === 'APPROVED' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-jade/10 text-jade hover:bg-jade/20 text-xs font-bold transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit & Resubmit
                    </button>
                    <button
                      onClick={() => handleAppeal(template)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-bold transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" /> Appeal Category
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(template)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-surface text-jade text-xs font-bold transition-colors"
                  >
                    Open <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isBuilderOpen && (
        <TemplateBuilder
          editTemplate={editingTemplate}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingTemplate(null);
          }}
          onSave={() => fetchTemplates(true)}
        />
      )}
    </div>
  );
}
