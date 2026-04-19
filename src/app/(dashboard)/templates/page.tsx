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
  Trash2
} from "lucide-react";
import axios from "axios";
import TemplateBuilder from "@/components/templates/TemplateBuilder";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async (quiet = false) => {
    if (quiet) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await axios.get("/api/templates");
      const data = res.data || [];
      console.log('templates loaded:', data[0]);
      setTemplates(data);
    } catch (err: any) {
      console.error('API Error:', err?.response?.status, err?.response?.data);
      console.error("Failed to fetch templates", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      console.error('Template id is missing');
      return;
    }
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await axios.delete(`/api/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('API Error:', err?.response?.status, err?.response?.data);
      const msg = err.response?.data?.error || err.message || "Failed to delete template";
      console.error("Delete failed:", msg);
      alert(msg);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsBuilderOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge-jade flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'PENDING':
        return <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-xs font-semibold border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3 animate-pulse" /> Pending</span>;
      case 'REJECTED':
        return <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-xs font-semibold border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="bg-card text-text-muted px-2 py-0.5 rounded-full text-xs font-semibold border border-border flex items-center gap-1">Draft</span>;
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

      {templates.length === 0 ? (
        <div className="glass-card py-20 flex flex-col items-center gap-4 text-center">
          <FileText className="w-12 h-12 text-text-muted opacity-20" />
          <div>
            <p className="text-sm font-semibold text-text-muted">No templates yet</p>
            <p className="text-xs text-text-muted mt-1">Create your first WhatsApp message template</p>
          </div>
          <button onClick={() => setIsBuilderOpen(true)} className="btn-primary flex items-center gap-2 mt-2">
            <Plus className="w-4 h-4" /> Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {templates.map((template) => (
            <div key={template.id} className="glass-card flex flex-col group cursor-pointer hover:border-jade/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg border transition-all ${
                  template.meta_status === 'APPROVED' 
                    ? 'bg-jade/10 border-jade/20' 
                    : template.meta_status === 'PENDING'
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-surface border-border group-hover:border-jade/20'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    template.meta_status === 'APPROVED' ? 'text-jade' 
                    : template.meta_status === 'PENDING' ? 'text-amber-500'
                    : 'text-text-muted group-hover:text-jade'
                  } transition-colors`} />
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === template.id ? null : template.id); }}
                    className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {activeMenu === template.id && (
                    <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-xl z-10 py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(template.id); setActiveMenu(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Template
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <h3 className="font-bold font-syne group-hover:text-jade transition-colors">{template.name}</h3>
                <div className="flex gap-2 flex-wrap">
                  {getStatusBadge(template.meta_status)}
                  <span className="bg-surface text-text-muted px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-border flex items-center">
                    {template.category}
                  </span>
                </div>
                <p className="text-xs text-text-muted line-clamp-2 leading-relaxed italic">
                  &ldquo;{template.body}&rdquo;
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  {new Date(template.updated_at).toLocaleDateString()}
                </span>
                <button 
                  onClick={() => handleEdit(template)}
                  className="p-1 px-3 rounded-lg hover:bg-jade/10 text-jade transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
                >
                  Edit <ChevronRight className="w-3 h-3" />
                </button>
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
