"use client";
export const dynamic = "force-dynamic";


import { useState, useEffect, useRef, useMemo } from "react";
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
  Plus,
  Calendar,
  MapPin,
  Tag,
  ChevronDown,
  ChevronUp,
  Download,
  HelpCircle,
  User,
  Hash,
  Folder
} from "lucide-react";
import axios from "axios";
import * as XLSX from "xlsx";

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 India (+91)" },
  { code: "+1", label: "🇺🇸 United States (+1)" },
  { code: "+44", label: "🇬🇧 United Kingdom (+44)" },
  { code: "+92", label: "🇵🇰 Pakistan (+92)" },
  { code: "+62", label: "🇮🇩 Indonesia (+62)" },
  { code: "+971", label: "🇦🇪 UAE (+971)" },
  { code: "+60", label: "🇲🇾 Malaysia (+60)" },
  { code: "+65", label: "🇸🇬 Singapore (+65)" },
  { code: "+61", label: "🇦🇺 Australia (+61)" },
  { code: "+966", label: "🇸🇦 Saudi Arabia (+966)" },
];

function CreateContactsDrawer({
  segments,
  onClose,
  onSuccess,
  onSegmentCreated,
  initialFocusSection = "upload"
}: {
  segments: any[];
  onClose: () => void;
  onSuccess: () => void;
  onSegmentCreated: (seg: any) => void;
  initialFocusSection?: "upload" | "manual";
}) {
  const [file, setFile] = useState<File | null>(null);
  const [segmentId, setSegmentId] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual Form States
  const [form, setForm] = useState({
    name: "",
    countryCode: "+91",
    phonePart: "",
    userId: "",
    email: "",
    optedIn: true,
    appointmentTime: "",
    location: "",
    segment_id: ""
  });
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showQuickCreateManual, setShowQuickCreateManual] = useState(false);

  const manualSectionRef = useRef<HTMLDivElement>(null);
  const drawerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFocusSection === "manual" && manualSectionRef.current) {
      setTimeout(() => {
        manualSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [initialFocusSection]);

  // Download Sample CSV helper
  const downloadSampleCSV = () => {
    const headers = "Name,Phone,Email,User ID,Tags,WhatsApp Opted,Appointment Time,Location";
    const rows = "Ahmed Khan,+923001234567,ahmed@example.com,USR001,VIP,Yes,2026-06-26 14:00,Karachi\nJohn Doe,+14155552671,john@example.com,USR002,\"Lead, VIP\",Yes,2026-06-27 10:30,San Francisco";
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "waptrix_contacts_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Header Auto-Mapper
  const resolveColumn = (obj: any, keys: string[]) => {
    for (const k of keys) {
      const match = Object.keys(obj).find(x => x.trim().toLowerCase() === k.trim().toLowerCase());
      if (match && obj[match] !== undefined) return String(obj[match]).trim();
    }
    return "";
  };

  const processFile = (f: File) => {
    setFile(f);
    setBulkError("");
    const ext = f.name.split('.').pop()?.toLowerCase();

    const parseJSONRows = (jsonData: any[]) => {
      if (jsonData.length === 0) return [];
      const headers = jsonData[0].map((h: any) => String(h || "").trim().toLowerCase());
      return jsonData.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((h: string, idx: number) => {
          obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : "";
        });
        return obj;
      });
    };

    const mapParsedRows = (rawRows: any[]) => {
      return rawRows.map(row => {
        const name = resolveColumn(row, ['name', 'full name', 'fullname', 'contact name', 'customer name']);
        const phoneVal = resolveColumn(row, ['phone', 'phone number', 'phonenumber', 'mobile', 'cell', 'whatsapp', 'contact phone']);
        const email = resolveColumn(row, ['email', 'email address', 'emailaddress']);
        const custom1 = resolveColumn(row, ['user id', 'userid', 'user_id', 'id', 'customer id']);
        const custom2 = resolveColumn(row, ['tags', 'tag', 'labels', 'label', 'segments']);
        const optedInText = resolveColumn(row, ['whatsapp opted', 'opted', 'whatsapp_opted', 'opted_in', 'opted in', 'subscribed']).toLowerCase();
        
        const appointment_time = resolveColumn(row, ['appointment time', 'appointment_time', 'time', 'appointment', 'booking time']);
        const location = resolveColumn(row, ['location', 'address', 'city', 'clinic', 'branch']);
        
        // Serialize metadata fields to custom3 JSON
        const custom3 = (appointment_time || location) 
          ? JSON.stringify({ appointment_time, location }) 
          : "";

        // Normalize Phone: ensure it has country code prefix
        let normalizedPhone = phoneVal.replace(/[^\d+]/g, "");
        if (normalizedPhone && !normalizedPhone.startsWith("+")) {
          if (normalizedPhone.length === 10) {
            normalizedPhone = "+" + form.countryCode.replace("+", "") + normalizedPhone;
          } else {
            normalizedPhone = "+" + normalizedPhone;
          }
        }

        const opted_in = !(optedInText === 'no' || optedInText === 'false' || optedInText === '0' || optedInText === 'optout');

        return {
          name: name || "Unnamed Contact",
          phone: normalizedPhone,
          email: email || null,
          custom1: custom1 || "",
          custom2: custom2 || "",
          custom3,
          opted_in
        };
      }).filter(r => r.phone);
    };

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const rawRows = parseJSONRows(jsonData);
          const mapped = mapParsedRows(rawRows);

          if (mapped.length === 0) {
            setBulkError("No valid contacts containing phone numbers were found.");
            return;
          }

          setParsedContacts(mapped);
          setPreview(mapped.slice(0, 5));
        } catch (err: any) {
          console.error("Excel parse error:", err);
          setBulkError("Failed to parse Excel file. Make sure it's valid.");
        }
      };
      reader.readAsArrayBuffer(f);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const lines = text.trim().split("\n");
          if (lines.length === 0) {
            setBulkError("Spreadsheet file is empty.");
            return;
          }
          const separator = lines[0].includes(";") ? ";" : ",";
          const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
          
          const rawRows = lines.slice(1).map(line => {
            const values = line.split(separator).map(v => v.trim().replace(/['"]/g, ""));
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ""; });
            return obj;
          });

          const mapped = mapParsedRows(rawRows);
          if (mapped.length === 0) {
            setBulkError("No valid contacts containing phone numbers were found.");
            return;
          }
          setParsedContacts(mapped);
          setPreview(mapped.slice(0, 5));
        } catch {
          setBulkError("Could not parse CSV. Make sure it is a valid CSV format.");
        }
      };
      reader.readAsText(f);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    processFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;

    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setBulkError("Please upload a valid CSV or Excel (.xlsx/.xls) file.");
      return;
    }
    processFile(f);
  };

  const handleBulkImportSubmit = async () => {
    if (parsedContacts.length === 0) {
      setBulkError("No valid contacts loaded. Please upload a spreadsheet.");
      return;
    }
    setIsBulkLoading(true);
    setBulkError("");
    try {
      await axios.post(
        "/api/contacts/import",
        {
          contacts: parsedContacts,
          segment_id: segmentId || null
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setBulkError(err.response?.data?.error || "Bulk upload failed. Please try again.");
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Manual Form Handlers
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/,/g, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");
    if (!form.name.trim() || !form.phonePart.trim()) {
      setManualError("Name and Phone Number are required.");
      return;
    }

    setIsManualLoading(true);

    // Normalize phone number
    let rawPhone = form.phonePart.replace(/[^\d+]/g, "");
    let finalPhone = "";
    if (rawPhone.startsWith("+")) {
      finalPhone = rawPhone;
    } else {
      const strippedDigits = rawPhone.replace(/^0+/, "");
      finalPhone = form.countryCode + strippedDigits;
    }

    // Serialize appointment time & location to custom3 JSON
    let custom3Payload = null;
    if (form.appointmentTime || form.location) {
      custom3Payload = JSON.stringify({
        appointment_time: form.appointmentTime,
        location: form.location
      });
    }

    try {
      await axios.post("/api/contacts", {
        name: form.name.trim(),
        phone: finalPhone,
        email: form.email.trim() || null,
        custom1: form.userId.trim() || null,
        custom2: tags.join(", ") || null, // tags
        custom3: custom3Payload,
        opted_in: form.optedIn,
        segment_id: form.segment_id || null
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setManualError(err.response?.data?.error || "Failed to create contact.");
    } finally {
      setIsManualLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>
      
      {/* Click-outside backdrop closer */}
      <div className="absolute inset-0 z-40" onClick={onClose} />

      {/* Drawer Panel */}
      <div 
        ref={drawerContainerRef}
        className="relative z-50 w-full max-w-xl h-full flex flex-col bg-card border-l border-border shadow-2xl overflow-hidden animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card/65 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-jade/10 rounded-2xl flex items-center justify-center border border-jade/25 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <UserPlus className="w-5 h-5 text-jade" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-syne text-text-primary">Create Contacts</h2>
              <p className="text-xs text-text-muted">Import spreadsheet files or create manually</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl transition-colors text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* ════════════════ Bulk Upload Section ════════════════ */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-syne text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-jade" /> Create Contacts Via Bulk Upload
            </h3>

            {/* Expandable Instructions */}
            <div className="border border-border rounded-2xl overflow-hidden bg-surface/40">
              <button 
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between p-4 text-xs font-bold text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider"
              >
                <span>Instructions to upload CSV / Excel</span>
                {showInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showInstructions && (
                <div className="p-4 pt-0 border-t border-border/40 text-xs text-text-muted space-y-2.5 leading-relaxed">
                  <p className="font-semibold text-text-primary">Upload a spreadsheet file (.csv, .xlsx, .xls) to bulk upload contacts to Waptrix:</p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>Max file size <strong className="text-text-primary">50 MB</strong> (up to 500,000 contacts).</li>
                    <li>
                      File columns should contain a <strong className="text-text-primary">Phone Number</strong> column (supported headers: <code className="text-jade font-mono bg-jade/5 px-1 rounded">Phone</code>, <code className="text-jade font-mono bg-jade/5 px-1 rounded">Mobile</code>, <code className="text-jade font-mono bg-jade/5 px-1 rounded">WhatsApp</code>, etc.).
                    </li>
                    <li>
                      Phone numbers must include a country code. If a 10-digit number is provided without a country code, Waptrix automatically prepends your selected default country code (<strong className="text-text-primary">{form.countryCode}</strong>).
                    </li>
                    <li>
                      Optional headers: <code className="text-text-primary">Name</code>, <code className="text-text-primary">Email</code>, <code className="text-text-primary">User ID</code>, <code className="text-text-primary">Tags</code> (comma-separated), <code className="text-text-primary">WhatsApp Opted</code> (yes/no), <code className="text-text-primary">Appointment Time</code>, and <code className="text-text-primary">Location</code>.
                    </li>
                    <li>If multiple rows in the file contain the same phone number, the last row will be processed.</li>
                    <li>If a contact already exists in your Waptrix list, their traits (Name, Email, User ID, Tags, Appointment &amp; Location, and Opted status) will be updated in-place automatically.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                file 
                  ? "border-jade bg-jade/5" 
                  : isDragging
                    ? "border-jade bg-jade/5 scale-[1.01]"
                    : "border-border hover:border-jade/30 hover:bg-jade/5"
              }`}
            >
              <input 
                ref={fileRef} 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              {file ? (
                <div className="space-y-2 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-jade/10 rounded-full flex items-center justify-center mx-auto border border-jade/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-6 h-6 text-jade animate-pulse" />
                  </div>
                  <p className="text-sm font-semibold text-jade">{file.name}</p>
                  <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB • {parsedContacts.length} contacts found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-surface border border-border rounded-2xl flex items-center justify-center mx-auto text-text-muted group-hover:text-text-primary transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">Select a CSV / Excel file to upload</p>
                    <p className="text-xs text-text-muted mt-1">or drag and drop it here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sample File and Watch Link Row */}
            <div className="flex justify-end px-1">
              <button 
                type="button" 
                onClick={downloadSampleCSV} 
                className="text-xs text-jade hover:text-emerald-400 font-bold flex items-center gap-1.5 hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download sample CSV
              </button>
            </div>

            {/* Parsed Contacts Preview */}
            {preview.length > 0 && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-300">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Spreadsheet Preview (First 5 Rows)</p>
                <div className="overflow-x-auto rounded-xl border border-border bg-surface/30">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-surface border-b border-border text-text-muted">
                        <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px]">Name</th>
                        <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px]">Phone</th>
                        <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px]">Email</th>
                        <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[10px]">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {preview.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface/50 text-text-primary">
                          <td className="px-3 py-2 font-medium">{row.name || "—"}</td>
                          <td className="px-3 py-2 font-mono text-text-muted">{row.phone || "—"}</td>
                          <td className="px-3 py-2 text-text-muted">{row.email || "—"}</td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 rounded truncate max-w-[80px] block">
                              {row.custom2 || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bulk Upload Options */}
            {parsedContacts.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-border/40 animate-in slide-in-from-top-3 duration-250">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Target Segment (Optional)</label>
                  <div className="flex gap-2">
                    <select
                      value={segmentId}
                      onChange={e => setSegmentId(e.target.value)}
                      className="input-field flex-1 text-sm bg-background border-border"
                    >
                      <option value="">No segment</option>
                      {segments.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowQuickCreate(true)}
                      className="btn-secondary px-3 py-2 flex items-center justify-center gap-1 hover:border-jade/30"
                      title="Create new segment"
                    >
                      <Plus className="w-4 h-4 text-jade" />
                    </button>
                  </div>
                </div>

                {bulkError && (
                  <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {bulkError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBulkImportSubmit}
                  disabled={isBulkLoading}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-sm font-bold shadow-[0_4px_20px_rgba(16,185,129,0.2)]"
                >
                  {isBulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isBulkLoading ? "Uploading Contacts..." : `Bulk Import ${parsedContacts.length} Contacts`}
                </button>
              </div>
            )}

            {bulkError && parsedContacts.length === 0 && (
              <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {bulkError}
              </div>
            )}
          </div>

          {/* ════════════════ OR Separator ════════════════ */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border/50"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-text-muted uppercase tracking-widest font-syne">OR</span>
            <div className="flex-grow border-t border-border/50"></div>
          </div>

          {/* ════════════════ Manual Form Section ════════════════ */}
          <div ref={manualSectionRef} className="space-y-4 pt-2">
            <h3 className="text-sm font-bold font-syne text-text-primary uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-jade" /> Create Contact Individually
            </h3>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter input here"
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Phone Number with country dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Phone Number *</label>
                <div className="flex gap-2">
                  <select
                    value={form.countryCode}
                    onChange={e => setForm({ ...form, countryCode: e.target.value })}
                    className="input-field max-w-[130px] bg-background border-border text-sm font-medium"
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={form.phonePart}
                    onChange={e => setForm({ ...form, phonePart: e.target.value })}
                    placeholder="Enter input here"
                    className="input-field flex-1 text-sm font-mono"
                  />
                </div>
                <p className="text-[10px] text-text-muted">Provide the local subscriber number, e.g. 9876543210 (omit leading 0s)</p>
              </div>

              {/* User ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">User Id</label>
                <input
                  type="text"
                  value={form.userId}
                  onChange={e => setForm({ ...form, userId: e.target.value })}
                  placeholder="Enter input here"
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Tags Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Add Tag</label>
                <div className="relative">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Type tag and press Enter or comma"
                    className="input-field w-full text-sm"
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 p-2 bg-surface/30 border border-border/40 rounded-xl">
                      {tags.map((t, idx) => (
                        <span 
                          key={idx} 
                          className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 animate-in zoom-in-95"
                        >
                          <Tag className="w-3 h-3 shrink-0" />
                          {t}
                          <button 
                            type="button" 
                            onClick={() => removeTag(idx)} 
                            className="hover:text-purple-200 focus:outline-none opacity-60 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter input here"
                  className="input-field w-full text-sm"
                />
              </div>

              {/* WhatsApp Opted */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest block">WhatsApp Opted</label>
                <div className="flex items-center gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
                    <input 
                      type="radio" 
                      name="optedInRadio"
                      checked={form.optedIn === true} 
                      onChange={() => setForm({ ...form, optedIn: true })}
                      className="w-4 h-4 accent-jade border-border"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
                    <input 
                      type="radio" 
                      name="optedInRadio"
                      checked={form.optedIn === false} 
                      onChange={() => setForm({ ...form, optedIn: false })}
                      className="w-4 h-4 accent-jade border-border"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Appointment Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" /> Appointment Time
                </label>
                <input
                  type="datetime-local"
                  value={form.appointmentTime}
                  onChange={e => setForm({ ...form, appointmentTime: e.target.value })}
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-text-muted" /> Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="Enter input here"
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Target Segment for Manual */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Add to Segment (Optional)</label>
                <div className="flex gap-2">
                  <select
                    value={form.segment_id}
                    onChange={e => setForm({ ...form, segment_id: e.target.value })}
                    className="input-field flex-1 text-sm bg-background border-border"
                  >
                    <option value="">No segment</option>
                    {segments.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowQuickCreateManual(true)}
                    className="btn-secondary px-3 py-2 flex items-center justify-center gap-1 hover:border-jade/30"
                    title="Create new segment"
                  >
                    <Plus className="w-4 h-4 text-jade" />
                  </button>
                </div>
              </div>

              {manualError && (
                <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {manualError}
                </div>
              )}

              {/* Manual Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-border/40">
                <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3.5 text-sm font-bold">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isManualLoading} 
                  className="flex-1 btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                >
                  {isManualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {isManualLoading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Quick Segment Modals */}
      {showQuickCreate && (
        <QuickCreateSegmentModal
          onClose={() => setShowQuickCreate(false)}
          onSuccess={(newSeg) => {
            onSegmentCreated(newSeg);
            setSegmentId(newSeg.id);
          }}
        />
      )}

      {showQuickCreateManual && (
        <QuickCreateSegmentModal
          onClose={() => setShowQuickCreateManual(false)}
          onSuccess={(newSeg) => {
            onSegmentCreated(newSeg);
            setForm({ ...form, segment_id: newSeg.id });
          }}
        />
      )}
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

function QuickCreateSegmentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (newSegment: any) => void;
}) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/contacts/segments", { name: name.trim() });
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create segment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-syne">Create New Segment</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface rounded-lg text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Segment Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. HIV Clinic, Dentist, VIPs"
              className="input-field w-full text-sm bg-background border-border"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-2 text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SegmentsLibraryModal({
  segments,
  contacts,
  onClose,
  onSegmentCreated,
  onSegmentUpdated,
  onSegmentDeleted,
}: {
  segments: any[];
  contacts: any[];
  onClose: () => void;
  onSegmentCreated: (seg: any) => void;
  onSegmentUpdated: (seg: any) => void;
  onSegmentDeleted: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      const res = await axios.put("/api/contacts/segments", { id, name: editName.trim() });
      onSegmentUpdated(res.data);
      setEditingId(null);
    } catch (err) {
      console.error("Rename failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this segment? The contacts in it will not be deleted, but will be removed from this segment.")) return;
    setIsDeletingId(id);
    try {
      await axios.delete(`/api/contacts/segments?id=${id}`);
      onSegmentDeleted(id);
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filtered = segments.filter(s =>
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-jade/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-jade" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-syne">Niche &amp; List Library</h2>
              <p className="text-xs text-text-muted">Manage your separate customer segments and upload sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg text-text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="p-4 border-b border-border flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search segments..."
              className="input-field w-full pl-10 text-xs py-2.5 bg-background border-border"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New List
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filtered.map(s => {
            const count = contacts.filter(c => c.segment_id === s.id).length;
            const isEditing = editingId === s.id;
            return (
              <div key={s.id} className="bg-surface border border-border/60 hover:border-jade/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-card border border-border rounded-xl flex flex-col items-center justify-center text-text-muted shadow-sm">
                    <FileText className="w-5 h-5 text-jade" />
                    <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider text-text-muted/60">list</span>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    {isEditing ? (
                      <div className="flex gap-2 items-center">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="input-field py-1 px-2 text-xs flex-1 max-w-[250px] bg-background border-border"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(s.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          onClick={() => handleRename(s.id)}
                          disabled={isSaving}
                          className="text-xs text-jade font-bold hover:underline"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-text-muted hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        {s.name}
                        <button
                          onClick={() => {
                            setEditingId(s.id);
                            setEditName(s.name);
                          }}
                          className="text-[10px] font-medium text-text-muted hover:text-jade transition-colors"
                        >
                          (Rename)
                        </button>
                      </h4>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                      <span>{count} contact{count !== 1 ? 's' : ''}</span>
                      <span className="text-text-muted/40">•</span>
                      <span>Created {new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={isDeletingId === s.id}
                    className="btn-secondary !border-rose-500/20 hover:!bg-rose-500/10 !text-rose-500 py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    {isDeletingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete List
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-12 h-12 text-text-muted opacity-25 mx-auto" />
              <p className="text-sm font-semibold text-text-muted">No separate lists found</p>
              <p className="text-xs text-text-muted">Create your first sheet/niche segment by clicking "New List"</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <QuickCreateSegmentModal
          onClose={() => setShowCreate(false)}
          onSuccess={onSegmentCreated}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

const getAvatarGradient = (char: string) => {
  const code = char.charCodeAt(0) % 5;
  const gradients = [
    "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20",
    "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/20",
    "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/20",
    "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/20",
    "from-cyan-500/20 to-sky-500/10 text-cyan-400 border-cyan-500/20"
  ];
  return gradients[code];
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [activeSegment, setActiveSegment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showQuickCreateSegment, setShowQuickCreateSegment] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSegmentCreated = (newSeg: any) => {
    setSegments(prev => [newSeg, ...prev]);
    showToast(`Segment "${newSeg.name}" created!`);
  };

  const handleSegmentUpdated = (updatedSeg: any) => {
    setSegments(prev => prev.map(s => s.id === updatedSeg.id ? updatedSeg : s));
    showToast(`Segment renamed to "${updatedSeg.name}"!`);
  };

  const handleSegmentDeleted = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
    setContacts(prev => prev.map(c => c.segment_id === id ? { ...c, segment_id: null } : c));
    if (activeSegment === id) {
      setActiveSegment("all");
    }
    showToast("Segment deleted successfully!");
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleBulkUpdate = async (payload: { segment_id?: string | null; opted_in?: boolean }) => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await axios.patch("/api/contacts", {
        ids: selectedIds,
        ...payload
      });
      showToast("Selected contacts updated successfully!");
      setSelectedIds([]);
      fetchContacts();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Bulk update failed.", "error");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} contacts?`)) return;
    setIsBulkUpdating(true);
    try {
      await axios.delete(`/api/contacts?ids=${selectedIds.join(",")}`);
      showToast("Selected contacts deleted successfully!");
      setSelectedIds([]);
      fetchContacts();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Bulk delete failed.", "error");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleSelectRowToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    fetchContacts();
    fetchSegments();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("import") === "true") {
        setShowImportModal(true);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  // Reset to page 1 and reset tag filter whenever search or segment filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedTag("");
    setSelectedIds([]);
  }, [searchQuery, activeSegment]);

  const fetchContacts = async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const res = await axios.get("/api/contacts", { timeout: 15000 });
      setContacts(res.data || []);
    } catch (err: any) {
      setFetchError(err.response?.data?.error || "Failed to load contacts. Please try again.");
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

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    contacts.forEach(c => {
      if (c.custom2) {
        c.custom2.split(',').forEach((t: string) => {
          const trimmed = t.trim();
          if (trimmed) tagsSet.add(trimmed);
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [contacts]);

  const handleExportContacts = () => {
    if (filteredContacts.length === 0) {
      showToast("No contacts to export.", "error");
      return;
    }
    
    const headers = ["Name", "Phone", "Email", "User ID", "Tags", "WhatsApp Opted", "Appointment Time", "Location"];
    const csvRows = [headers.join(",")];
    
    filteredContacts.forEach(c => {
      let appointment_time = "";
      let location = "";
      if (c.custom3) {
        try {
          const parsed = JSON.parse(c.custom3);
          appointment_time = parsed.appointment_time || "";
          location = parsed.location || "";
        } catch {
          location = c.custom3;
        }
      }
      
      const row = [
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${(c.phone || "").replace(/"/g, '""')}"`,
        `"${(c.email || "").replace(/"/g, '""')}"`,
        `"${(c.custom1 || "").replace(/"/g, '""')}"`,
        `"${(c.custom2 || "").replace(/"/g, '""')}"`,
        c.opted_in ? "yes" : "no",
        `"${appointment_time.replace(/"/g, '""')}"`,
        `"${location.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `waptrix_contacts_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Contacts exported successfully!");
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || "").includes(searchQuery);
    const matchesSegment = activeSegment === "all" || c.segment_id === activeSegment;
    
    const matchesTag = !selectedTag || 
      (c.custom2 || "")
        .split(',')
        .map((t: string) => t.trim().toLowerCase())
        .includes(selectedTag.toLowerCase());

    return matchesSearch && matchesSegment && matchesTag;
  });

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      
      if (sortField === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      } else if (sortField === "phone") {
        valA = a.phone || "";
        valB = b.phone || "";
      } else if (sortField === "custom1") {
        valA = (a.custom1 || "").toLowerCase();
        valB = (b.custom1 || "").toLowerCase();
      } else if (sortField === "custom2") {
        valA = (a.custom2 || "").toLowerCase();
        valB = (b.custom2 || "").toLowerCase();
      } else if (sortField === "appointment") {
        let timeA = 0;
        let timeB = 0;
        try {
          if (a.custom3) timeA = new Date(JSON.parse(a.custom3).appointment_time || 0).getTime();
        } catch {}
        try {
          if (b.custom3) timeB = new Date(JSON.parse(b.custom3).appointment_time || 0).getTime();
        } catch {}
        valA = timeA;
        valB = timeB;
      } else if (sortField === "opted_in") {
        valA = a.opted_in ? 1 : 0;
        valB = b.opted_in ? 1 : 0;
      } else {
        valA = new Date(a.created_at || 0).getTime();
        valB = new Date(b.created_at || 0).getTime();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredContacts, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedContacts.length / PAGE_SIZE));
  const paginatedContacts = sortedContacts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all ${
          toast.type === "success" ? "bg-jade/10 border-jade/30 text-jade" : "bg-danger/10 border-danger/30 text-danger"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {showAddModal && (
        <CreateContactsDrawer
          segments={segments}
          initialFocusSection="manual"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { fetchContacts(); showToast("Contact created successfully!"); }}
          onSegmentCreated={handleSegmentCreated}
        />
      )}
      {showImportModal && (
        <CreateContactsDrawer
          segments={segments}
          initialFocusSection="upload"
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { fetchContacts(); showToast("Contacts imported successfully!"); }}
          onSegmentCreated={handleSegmentCreated}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          contact={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => { fetchContacts(); showToast("Contact deleted."); }}
        />
      )}
      {showLibraryModal && (
        <SegmentsLibraryModal
          segments={segments}
          contacts={contacts}
          onClose={() => setShowLibraryModal(false)}
          onSegmentCreated={handleSegmentCreated}
          onSegmentUpdated={handleSegmentUpdated}
          onSegmentDeleted={handleSegmentDeleted}
        />
      )}
      {showQuickCreateSegment && (
        <QuickCreateSegmentModal
          onClose={() => setShowQuickCreateSegment(false)}
          onSuccess={handleSegmentCreated}
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
            onClick={handleExportContacts}
            className="flex-1 md:flex-none btn-secondary flex items-center justify-center gap-2 hover:border-jade/30"
          >
            <Download className="w-4 h-4 text-jade" />
            Export CSV
          </button>
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

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card flex items-center justify-between !p-4 bg-gradient-to-br from-card/30 to-card/10 hover:border-jade/30 transition-all group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Contacts</p>
            <p className="text-2xl font-bold text-text-primary tracking-tight font-syne">{contacts.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-jade/10 flex items-center justify-center text-jade border border-jade/20 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between !p-4 bg-gradient-to-br from-card/30 to-card/10 hover:border-jade/30 transition-all group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Opted-in Rate</p>
            <p className="text-2xl font-bold text-jade tracking-tight font-syne">
              {contacts.length ? Math.round((contacts.filter(c => c.opted_in).length / contacts.length) * 100) : 0}%
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-jade/10 flex items-center justify-center text-jade border border-jade/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between !p-4 bg-gradient-to-br from-card/30 to-card/10 hover:border-jade/30 transition-all group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Active Segments</p>
            <p className="text-2xl font-bold text-text-primary tracking-tight font-syne">{segments.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info border border-info/20 group-hover:scale-110 transition-transform">
            <Folder className="w-5 h-5 text-info" />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between !p-4 bg-gradient-to-br from-card/30 to-card/10 hover:border-jade/30 transition-all group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Filtered View</p>
            <p className="text-2xl font-bold text-text-primary tracking-tight font-syne">{filteredContacts.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning border border-warning/20 group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Segments Sidebar */}
        <div className="space-y-4">
          <div className="glass-card !p-4 border-border/80 shadow-[0_4px_20px_rgba(0,0,0,0.15)] bg-gradient-to-b from-card/60 to-card/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-jade" />
                Segments
              </h3>
              <button
                onClick={() => setShowLibraryModal(true)}
                className="text-[9px] font-bold text-jade hover:text-jade-hover transition-colors hover:underline uppercase tracking-wider flex items-center gap-1"
              >
                Manage Library
              </button>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => setActiveSegment("all")}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                  activeSegment === "all"
                    ? "bg-jade/10 border-jade/30 text-jade shadow-[0_0_15px_rgba(16,185,129,0.05)] font-extrabold"
                    : "border-transparent text-text-muted hover:bg-surface hover:text-text-primary hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>All Contacts</span>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                  activeSegment === "all" ? 'bg-jade/20 text-jade' : 'bg-surface text-text-muted border border-border/50'
                }`}>
                  {contacts.length}
                </span>
              </button>
              {segments.map(s => {
                const count = contacts.filter(c => c.segment_id === s.id).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSegment(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-between items-center border ${
                      activeSegment === s.id
                        ? "bg-jade/10 border-jade/30 text-jade shadow-[0_0_15px_rgba(16,185,129,0.05)] font-extrabold"
                        : "border-transparent text-text-muted hover:bg-surface hover:text-text-primary hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Tag className="w-3.5 h-3.5 shrink-0 text-text-muted/60" />
                      <span className="truncate">{s.name}</span>
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                      activeSegment === s.id ? 'bg-jade/20 text-jade' : 'bg-surface text-text-muted border border-border/50'
                    }`}>
                  {count}
                </span>
              </button>
                );
              })}
              
              <button
                onClick={() => setShowQuickCreateSegment(true)}
                className="w-full mt-2 border border-dashed border-border/60 hover:border-jade/40 rounded-xl px-3 py-2.5 text-xs font-bold text-text-muted hover:text-jade flex items-center justify-center gap-1.5 transition-all hover:bg-jade/5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Niche
              </button>
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card !p-0 overflow-hidden">
            <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center w-full">
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name or phone..."
                    className="input-field w-full pl-10 text-xs h-9"
                  />
                </div>
                
                {/* Tag Filter Dropdown */}
                <div className="relative w-full sm:w-48 flex items-center">
                  <Filter className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedTag}
                    onChange={e => setSelectedTag(e.target.value)}
                    className="input-field w-full pl-9 pr-8 text-xs h-9 appearance-none bg-surface border-border focus:border-jade text-text-primary rounded-lg focus:outline-none"
                  >
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
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
            ) : fetchError ? (
              <div className="py-16 flex flex-col items-center gap-4 text-center px-6">
                <AlertCircle className="w-10 h-10 text-danger opacity-70" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Failed to load contacts</p>
                  <p className="text-xs text-text-muted mt-1">{fetchError}</p>
                </div>
                <button onClick={fetchContacts} className="btn-primary text-sm">Retry</button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-card/25 backdrop-blur-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface/60 border-b border-border text-[9px] font-bold text-text-muted uppercase tracking-widest">
                      <th className="pl-6 pr-2 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.includes(c.id))}
                          onChange={() => {
                            const isAllSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.includes(c.id));
                            if (isAllSelected) {
                              const pageIds = paginatedContacts.map(c => c.id);
                              setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
                            } else {
                              const pageIds = paginatedContacts.map(c => c.id);
                              setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
                            }
                          }}
                          className="accent-jade w-3.5 h-3.5 rounded border-border bg-surface text-jade focus:ring-jade/30 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => toggleSort("name")}>
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-text-muted/60" /> Contact
                          {sortField === "name" && (sortDirection === "asc" ? " ↑" : " ↓")}
                        </span>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => toggleSort("phone")}>
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-text-muted/60" /> Phone
                          {sortField === "phone" && (sortDirection === "asc" ? " ↑" : " ↓")}
                        </span>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => toggleSort("custom1")}>
                        <span className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-text-muted/60" /> User ID
                          {sortField === "custom1" && (sortDirection === "asc" ? " ↑" : " ↓")}
                        </span>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => toggleSort("custom2")}>
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-text-muted/60" /> Tags
                          {sortField === "custom2" && (sortDirection === "asc" ? " ↑" : " ↓")}
                        </span>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => toggleSort("appointment")}>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-text-muted/60" /> Appointment &amp; Location
                          {sortField === "appointment" && (sortDirection === "asc" ? " ↑" : " ↓")}
                        </span>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => toggleSort("opted_in")}>
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-text-muted/60" /> Status
                          {sortField === "opted_in" && (sortDirection === "asc" ? " ↑" : " ↓")}
                        </span>
                      </th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {paginatedContacts.map((contact, i) => {
                      const char = (contact.name || "?")[0].toUpperCase();
                      const avatarClass = getAvatarGradient(char);
                      const isSelected = selectedIds.includes(contact.id);
                      return (
                        <tr key={contact.id || i} className={`hover:bg-card/50 transition-all group duration-200 ${isSelected ? 'bg-jade/5 border-l-2 border-l-jade' : ''}`}>
                          <td className="pl-6 pr-2 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRowToggle(contact.id)}
                              className="accent-jade w-3.5 h-3.5 rounded border-border bg-surface text-jade focus:ring-jade/30 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-xs uppercase border shadow-sm ${avatarClass}`}>
                                {char}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-text-primary group-hover:text-jade transition-colors duration-200">{contact.name}</p>
                                {contact.email ? (
                                  <p className="text-[10px] text-text-muted font-medium">{contact.email}</p>
                                ) : (
                                  <p className="text-[10px] text-text-muted/40 italic">No email</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-text-muted font-mono">{contact.phone}</td>
                          <td className="px-6 py-4 text-xs">
                            {contact.custom1 ? (
                              <span className="px-2 py-0.5 rounded bg-surface border border-border text-text-muted font-mono font-bold text-[9px] tracking-wide shadow-sm">
                                {contact.custom1}
                              </span>
                            ) : (
                              <span className="text-text-muted/30">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {contact.custom2 ? (
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {contact.custom2.split(',').map((tag: string, idx: number) => (
                                  <span key={idx} className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-300 border border-purple-500/25 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm transition-all hover:bg-purple-500/20">
                                    <Tag className="w-2 h-2 text-purple-400" />
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-text-muted/30 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {(() => {
                              if (!contact.custom3) return <span className="text-text-muted/30">—</span>;
                              try {
                                const parsed = JSON.parse(contact.custom3);
                                return (
                                  <div className="space-y-1 text-[11px]">
                                    {parsed.appointment_time && (
                                      <p className="text-text-primary font-bold flex items-center gap-1.5 bg-jade/5 border border-jade/10 w-fit px-2 py-0.5 rounded-md">
                                        <Calendar className="w-3.5 h-3.5 text-jade shrink-0" /> {new Date(parsed.appointment_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                      </p>
                                    )}
                                    {parsed.location && (
                                      <p className="text-text-muted text-[10px] flex items-center gap-1.5 pl-0.5">
                                        <MapPin className="w-3.5 h-3.5 text-text-muted/70 shrink-0" /> <span className="truncate max-w-[160px]" title={parsed.location}>{parsed.location}</span>
                                      </p>
                                    )}
                                    {!parsed.appointment_time && !parsed.location && (
                                      <p className="text-text-muted">{contact.custom3}</p>
                                    )}
                                  </div>
                                );
                              } catch {
                                return <span className="text-text-muted/70 bg-surface border border-border px-2 py-0.5 rounded text-[10px]">{contact.custom3}</span>;
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            {contact.opted_in ? (
                              <span className="inline-flex items-center gap-1.5 bg-jade/10 text-jade border border-jade/25 text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jade opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-jade"></span>
                                </span>
                                Opted-in
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-danger/10 text-danger border border-danger/25 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-danger"></span>
                                Opted-out
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {contact.email && (
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="w-8 h-8 rounded-lg bg-surface border border-border/40 hover:border-info/30 flex items-center justify-center text-text-muted hover:text-info hover:bg-info/5 hover:scale-105 active:scale-95 transition-all shadow-sm"
                                  title="Send email"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <a
                                href={`tel:${contact.phone}`}
                                className="w-8 h-8 rounded-lg bg-surface border border-border/40 hover:border-jade/30 flex items-center justify-center text-text-muted hover:text-jade hover:bg-jade/5 hover:scale-105 active:scale-95 transition-all shadow-sm"
                                title="Call"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => setDeleteTarget(contact)}
                                className="w-8 h-8 rounded-lg bg-surface border border-border/40 hover:border-danger/30 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/5 hover:scale-105 active:scale-95 transition-all shadow-sm"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/90 border border-jade/30 backdrop-blur-lg px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex items-center gap-6 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jade opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-jade"></span>
            </span>
            <span className="text-xs font-bold text-text-primary">
              {selectedIds.length} contact{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="h-6 w-px bg-border/80"></div>

          <div className="flex items-center gap-3">
            {/* Bulk Opt-in */}
            <button
              onClick={() => handleBulkUpdate({ opted_in: true })}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-jade/30 hover:bg-jade/5 text-xs font-bold text-text-primary disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-jade" />
              Opt-in
            </button>

            {/* Bulk Opt-out */}
            <button
              onClick={() => handleBulkUpdate({ opted_in: false })}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-danger/30 hover:bg-danger/5 text-xs font-bold text-text-primary disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-danger" />
              Opt-out
            </button>

            {/* Bulk Assign Niche Dropdown */}
            <div className="relative flex items-center group/bulk">
              <select
                disabled={isBulkUpdating}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") return;
                  handleBulkUpdate({ segment_id: val === "unassigned" ? null : val });
                  e.target.value = "";
                }}
                className="px-3 py-1.5 pr-8 rounded-lg border border-border bg-surface hover:border-info/30 hover:bg-info/5 text-xs font-bold text-text-primary disabled:opacity-40 transition-all appearance-none cursor-pointer focus:outline-none"
              >
                <option value="">Move Niche...</option>
                <option value="unassigned">Remove from Niche</option>
                {segments.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Bulk Delete */}
            <button
              onClick={handleBulkDelete}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedIds([])}
              className="text-[10px] font-bold text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider pl-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
