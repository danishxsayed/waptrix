"use client";
export const dynamic = "force-dynamic";


import { useState, useEffect, useRef } from "react";
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  Filter, 
  Mail,
  Phone,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  FileText,
  Plus
} from "lucide-react";
import axios from "axios";


// ─── Add Contact Modal ────────────────────────────────────────────────────────
function AddContactModal({ 
  segments, 
  onClose, 
  onSuccess 
}: { 
  segments: any[]; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", segment_id: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone number are required.");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(
        "/api/contacts/import",
        {
          contacts: [{ name: form.name, phone: form.phone, email: form.email }],
          segment_id: form.segment_id || null,
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add contact. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-jade/10 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-jade" />
            </div>
            <div>
              <h2 className="text-base font-bold font-syne">Add Contact</h2>
              <p className="text-xs text-text-muted">Add a single contact manually</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ahmed Khan"
              className="input-field w-full text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Phone Number *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+923001234567"
              className="input-field w-full text-sm"
            />
            <p className="text-[10px] text-text-muted">Include country code, e.g. +92...</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="ahmed@company.com"
              className="input-field w-full text-sm"
            />
          </div>

          {segments.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Segment (optional)</label>
              <select
                value={form.segment_id}
                onChange={e => setForm({ ...form, segment_id: e.target.value })}
                className="input-field w-full text-sm"
              >
                <option value="">No segment</option>
                {segments.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {isLoading ? "Adding..." : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Import CSV Modal ─────────────────────────────────────────────────────────
function ImportCSVModal({ 
  segments, 
  onClose, 
  onSuccess 
}: { 
  segments: any[]; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [file, setFile] = useState<File | null>(null);
  const [segmentId, setSegmentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/['"]/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return { name: obj.name || "", phone: obj.phone || "", email: obj.email || "", custom1: obj.custom1 || "", custom2: obj.custom2 || "", custom3: obj.custom3 || "" };
    }).filter(r => r.name || r.phone);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target?.result as string);
        setPreview(parsed.slice(0, 5));
      } catch {
        setError("Could not parse file. Make sure it's a valid CSV.");
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) { setError("Please select a CSV file."); return; }
    setIsLoading(true);
    setError("");
    try {
      const text = await file.text();
      const contacts = parseCSV(text);
      if (contacts.length === 0) { setError("No valid contacts found in the file."); setIsLoading(false); return; }
      const res = await axios.post(
        "/api/contacts/import",
        { contacts, segment_id: segmentId || null }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Import failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-info/10 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-info" />
            </div>
            <div>
              <h2 className="text-base font-bold font-syne">Import CSV</h2>
              <p className="text-xs text-text-muted">Bulk import contacts from a spreadsheet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Format hint */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Expected CSV Format
            </p>
            <code className="text-[11px] text-jade font-mono block">name, phone, email, custom1, custom2, custom3</code>
            <p className="text-[10px] text-text-muted">Only <strong>name</strong> and <strong>phone</strong> are required. Phone must include country code.</p>
          </div>

          {/* File drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              file ? "border-jade/50 bg-jade/5" : "border-border hover:border-jade/30 hover:bg-jade/5"
            }`}
          >
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            {file ? (
              <div className="space-y-1">
                <CheckCircle2 className="w-8 h-8 text-jade mx-auto" />
                <p className="text-sm font-semibold text-jade">{file.name}</p>
                <p className="text-xs text-text-muted">{preview.length}+ contacts detected (showing preview)</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-sm font-semibold text-text-primary">Click to upload CSV</p>
                <p className="text-xs text-text-muted">or drag and drop</p>
              </div>
            )}
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="px-3 py-2 text-left text-text-muted font-bold uppercase tracking-widest text-[10px]">Name</th>
                    <th className="px-3 py-2 text-left text-text-muted font-bold uppercase tracking-widest text-[10px]">Phone</th>
                    <th className="px-3 py-2 text-left text-text-muted font-bold uppercase tracking-widest text-[10px]">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-text-primary">{row.name || "—"}</td>
                      <td className="px-3 py-2 font-mono text-text-muted">{row.phone || "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{row.email || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {segments.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Add to Segment (optional)</label>
              <select
                value={segmentId}
                onChange={e => setSegmentId(e.target.value)}
                className="input-field w-full text-sm"
              >
                <option value="">No segment</option>
                {segments.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3">Cancel</button>
            <button onClick={handleImport} disabled={!file || isLoading} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isLoading ? "Importing..." : "Import Contacts"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({
  contact,
  onClose,
  onSuccess,
}: {
  contact: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await axios.delete(`/api/contacts?id=${contact.id}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-danger/10 rounded-xl flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h2 className="text-base font-bold font-syne">Delete Contact</h2>
            <p className="text-xs text-text-muted">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-text-muted">
          Are you sure you want to delete <span className="text-text-primary font-semibold">{contact.name}</span>?
        </p>
        {error && (
          <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">Cancel</button>
          <button onClick={handleDelete} disabled={isLoading} className="flex-1 bg-danger text-white px-4 py-3 rounded-lg font-semibold transition-all hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-50">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [activeSegment, setActiveSegment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchContacts();
    fetchSegments();
  }, []);

  // Reset to page 1 whenever search or segment filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeSegment]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/contacts", { timeout: 10000 });
      setContacts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch contacts", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSegments = async () => {
    try {
      const res = await axios.get("/api/contacts/segments");
      setSegments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch segments", err);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || "").includes(searchQuery);
    const matchesSegment = activeSegment === "all" || c.segment_id === activeSegment;
    return matchesSearch && matchesSegment;
  });

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all ${
          toast.type === "success"
            ? "bg-jade/10 border-jade/30 text-jade"
            : "bg-danger/10 border-danger/30 text-danger"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddContactModal
          segments={segments}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { fetchContacts(); showToast("Contact added successfully!"); }}
        />
      )}
      {showImportModal && (
        <ImportCSVModal
          segments={segments}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { fetchContacts(); showToast("Contacts imported successfully!"); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          contact={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => { fetchContacts(); showToast("Contact deleted."); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-syne">Contacts &amp; Segments</h2>
          <p className="text-sm text-text-muted">Manage your audience and subscriber lists.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 md:flex-none btn-secondary flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none btn-primary flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Segments Sidebar */}
        <div className="space-y-4">
          <div className="glass-card !p-4">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Segments</h3>
            <div className="space-y-1">
              <button
                onClick={() => setActiveSegment("all")}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeSegment === "all"
                    ? "bg-jade/10 text-jade shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]"
                    : "text-text-muted hover:bg-surface hover:text-text-primary"
                }`}
              >
                All Contacts ({contacts.length})
              </button>
              {segments.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSegment(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeSegment === s.id
                      ? "bg-jade/10 text-jade shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]"
                      : "text-text-muted hover:bg-surface hover:text-text-primary"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card !p-0 overflow-hidden">
            <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name or phone..."
                  className="input-field w-full pl-10 text-xs"
                />
              </div>
              <div className="text-xs text-text-muted">
                {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
                {totalPages > 1 && (
                  <span className="ml-1 text-text-muted/60">
                    &nbsp;· Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-jade animate-spin" />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Contact</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Phone</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedContacts.map((contact, i) => (
                    <tr key={contact.id || i} className="hover:bg-card/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-jade/10 flex items-center justify-center text-jade font-bold text-xs uppercase">
                            {(contact.name || "?")[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{contact.name}</p>
                            <p className="text-[10px] text-text-muted">{contact.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted font-mono">{contact.phone}</td>
                      <td className="px-6 py-4">
                        <span className="badge-jade flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Opted-in
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="p-1.5 hover:bg-surface rounded-lg text-text-muted transition-colors"
                              title="Send email"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          <a
                            href={`tel:${contact.phone}`}
                            className="p-1.5 hover:bg-surface rounded-lg text-text-muted transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setDeleteTarget(contact)}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination controls */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-xs text-text-muted">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredContacts.length)} of {filteredContacts.length}
                </p>
                <div className="flex items-center gap-1">
                  {/* Prev */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-text-muted hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>

                  {/* Page numbers — show up to 7 slots */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 2) return true;
                      return false;
                    })
                    .reduce((acc: (number | "...")[], page, idx, arr) => {
                      if (idx > 0 && (page as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-text-muted text-xs select-none">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                            currentPage === item
                              ? "bg-jade text-background shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                              : "border border-border text-text-muted hover:bg-surface"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )
                  }

                  {/* Next */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-text-muted hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {!isLoading && filteredContacts.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <Users className="w-12 h-12 text-text-muted opacity-20" />
                <div>
                  <p className="text-sm font-semibold text-text-muted">No contacts found</p>
                  <p className="text-xs text-text-muted mt-1">
                    {searchQuery ? "Try a different search" : "Click \"Add Contact\" or \"Import CSV\" to get started"}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2 mt-2"
                  >
                    <Plus className="w-4 h-4" /> Add your first contact
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
