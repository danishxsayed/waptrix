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
  Folder,
  Send,
  MessageCircle
} from "lucide-react";

// WhatsApp SVG icon (lucide doesn't include it)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
import axios from "axios";
import * as XLSX from "xlsx";
import ContactProfileDrawer from "@/components/contacts/ContactProfileDrawer";

const COUNTRY_CODES = [
  // South Asia
  { code: "+91", label: "🇮🇳 India (+91)" },
  { code: "+92", label: "🇵🇰 Pakistan (+92)" },
  { code: "+880", label: "🇧🇩 Bangladesh (+880)" },
  { code: "+94", label: "🇱🇰 Sri Lanka (+94)" },
  { code: "+977", label: "🇳🇵 Nepal (+977)" },
  // Middle East
  { code: "+971", label: "🇦🇪 UAE (+971)" },
  { code: "+966", label: "🇸🇦 Saudi Arabia (+966)" },
  { code: "+974", label: "🇶🇦 Qatar (+974)" },
  { code: "+973", label: "🇧🇭 Bahrain (+973)" },
  { code: "+968", label: "🇴🇲 Oman (+968)" },
  { code: "+965", label: "🇰🇼 Kuwait (+965)" },
  { code: "+972", label: "🇮🇱 Israel (+972)" },
  { code: "+90", label: "🇹🇷 Turkey (+90)" },
  { code: "+964", label: "🇮🇶 Iraq (+964)" },
  { code: "+20", label: "🇪🇬 Egypt (+20)" },
  // Southeast Asia
  { code: "+62", label: "🇮🇩 Indonesia (+62)" },
  { code: "+60", label: "🇲🇾 Malaysia (+60)" },
  { code: "+65", label: "🇸🇬 Singapore (+65)" },
  { code: "+63", label: "🇵🇭 Philippines (+63)" },
  { code: "+66", label: "🇹🇭 Thailand (+66)" },
  { code: "+84", label: "🇻🇳 Vietnam (+84)" },
  // East Asia
  { code: "+86", label: "🇨🇳 China (+86)" },
  { code: "+81", label: "🇯🇵 Japan (+81)" },
  { code: "+82", label: "🇰🇷 South Korea (+82)" },
  // Americas
  { code: "+1", label: "🇺🇸 United States / Canada (+1)" },
  { code: "+55", label: "🇧🇷 Brazil (+55)" },
  { code: "+52", label: "🇲🇽 Mexico (+52)" },
  { code: "+57", label: "🇨🇴 Colombia (+57)" },
  { code: "+54", label: "🇦🇷 Argentina (+54)" },
  // Europe
  { code: "+44", label: "🇬🇧 United Kingdom (+44)" },
  { code: "+49", label: "🇩🇪 Germany (+49)" },
  { code: "+33", label: "🇫🇷 France (+33)" },
  { code: "+39", label: "🇮🇹 Italy (+39)" },
  { code: "+34", label: "🇪🇸 Spain (+34)" },
  { code: "+31", label: "🇳🇱 Netherlands (+31)" },
  { code: "+48", label: "🇵🇱 Poland (+48)" },
  { code: "+7", label: "🇷🇺 Russia (+7)" },
  // Africa
  { code: "+234", label: "🇳🇬 Nigeria (+234)" },
  { code: "+27", label: "🇿🇦 South Africa (+27)" },
  { code: "+254", label: "🇰🇪 Kenya (+254)" },
  { code: "+233", label: "🇬🇭 Ghana (+233)" },
  { code: "+255", label: "🇹🇿 Tanzania (+255)" },
  { code: "+251", label: "🇪🇹 Ethiopia (+251)" },
  // Oceania
  { code: "+61", label: "🇦🇺 Australia (+61)" },
  { code: "+64", label: "🇳🇿 New Zealand (+64)" },
];

// ─── Phone Parser ─────────────────────────────────────────────────────────────
function parsePhone(phone: string): { code: string; local: string } {
  if (!phone) return { code: "", local: "" };
  const normalized = phone.startsWith("+") ? phone : "+" + phone;
  // Try longest match first so +971 beats +97
  const uniqueCodes = Array.from(new Set(COUNTRY_CODES.map(c => c.code)))
    .sort((a, b) => b.length - a.length);
  for (const cc of uniqueCodes) {
    if (normalized.startsWith(cc)) {
      return { code: cc, local: normalized.slice(cc.length) };
    }
  }
  // fallback: first char is +, next 1-3 digits
  const m = normalized.match(/^(\+\d{1,3})(.*)/);
  return m ? { code: m[1], local: m[2] } : { code: "", local: normalized };
}

// ─── WhatsApp Send Modal ───────────────────────────────────────────────────────
function WhatsAppSendModal({ contact, onClose }: { contact: any; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const phoneClean = (contact.phone || "").replace(/^\+/, "");

  const handleOpen = () => {
    const encoded = encodeURIComponent(message.trim());
    window.open(`https://wa.me/${phoneClean}${encoded ? "?text=" + encoded : ""}`, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 flex items-center justify-center text-[#25D366]">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Send WhatsApp Message</p>
              <p className="text-[10px] text-text-muted">{contact.name} · {contact.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface rounded-lg text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Message (Optional)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a pre-filled message or leave blank to open empty chat…"
            rows={4}
            className="input-field w-full text-sm resize-none"
            autoFocus
          />
          <p className="text-[10px] text-text-muted">Opens WhatsApp in a new tab.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
          <button
            onClick={handleOpen}
            className="flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 text-white transition-all hover:brightness-110"
            style={{ backgroundColor: "#25D366" }}
          >
            <WhatsAppIcon className="w-4 h-4" />
            Open Chat
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Column Mapper States
  const [uploadStep, setUploadStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawFileRows, setRawFileRows] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({
    name: "",
    phone: "",
    country_code: "",
    email: "",
    custom1: "",
    custom2: "",
    whatsapp_opted: "",
    appointment_time: "",
    location: ""
  });
  const [defaultBulkCountryCode, setDefaultBulkCountryCode] = useState("+91");
  
  // Ingestion Progress States
  const [importProgress, setImportProgress] = useState(0);
  const [importStepMsg, setImportStepMsg] = useState("");

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
    const rows = [
      "Ahmed Khan,+923001234567,ahmed@example.com,USR001,VIP,Yes,2026-06-26 14:00,Karachi",
      "John Doe,+14155552671,john@example.com,USR002,\"Lead, VIP\",Yes,2026-06-27 10:30,San Francisco",
      "Fatima Ali,+971501234567,fatima@example.com,USR003,Client,Yes,2026-06-28 09:00,Dubai",
      "Ravi Kumar,+919876543210,ravi@example.com,USR004,\"Lead, Newsletter\",Yes,,Mumbai",
      "Sarah Jones,+447911123456,sarah@example.com,USR005,VIP,No,,London",
      "Mohammed Zayed,+966501234567,,USR006,Client,Yes,2026-06-30 11:00,Riyadh",
    ].join("\n");
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

    const guessMapping = (hdrs: string[]) => {
      const guess = (keys: string[]) => {
        const match = hdrs.find(h => keys.includes(h.toLowerCase().trim()));
        return match || "";
      };
      
      return {
        name: guess(['name', 'full name', 'fullname', 'contact name', 'customer name']),
        phone: guess(['phone', 'phone number', 'phonenumber', 'mobile', 'cell', 'whatsapp', 'contact phone', 'mob', 'number']),
        country_code: guess(['country code', 'country_code', 'countrycode', 'dial code', 'dialcode', 'country dial', 'isd code', 'isd']),
        email: guess(['email', 'email address', 'emailaddress']),
        custom1: guess(['user id', 'userid', 'user_id', 'id', 'customer id', 'uid']),
        custom2: guess(['tags', 'tag', 'labels', 'label', 'segments']),
        whatsapp_opted: guess(['whatsapp opted', 'opted', 'whatsapp_opted', 'opted_in', 'opted in', 'subscribed']),
        appointment_time: guess(['appointment time', 'appointment_time', 'time', 'appointment', 'booking time', 'booking']),
        location: guess(['location', 'address', 'city', 'clinic', 'branch'])
      };
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
          
          if (jsonData.length === 0) {
            setBulkError("Spreadsheet file is empty.");
            return;
          }
          
          const rawHdrs = jsonData[0].map((h: any) => String(h || "").trim()).filter(Boolean);
          
          const rawRows = jsonData.slice(1).map((row: any[]) => {
            const obj: any = {};
            rawHdrs.forEach((h: string, idx: number) => {
              obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : "";
            });
            return obj;
          });

          setFileHeaders(rawHdrs);
          setRawFileRows(rawRows);
          setColumnMappings(guessMapping(rawHdrs));
          setUploadStep("mapping");
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
          const rawHdrs = lines[0].split(separator).map(h => h.trim().replace(/['"]/g, "")).filter(Boolean);
          
          const rawRows = lines.slice(1).map(line => {
            const values = line.split(separator).map(v => v.trim().replace(/['"]/g, ""));
            const obj: any = {};
            rawHdrs.forEach((h, i) => { obj[h] = values[i] || ""; });
            return obj;
          });

          setFileHeaders(rawHdrs);
          setRawFileRows(rawRows);
          setColumnMappings(guessMapping(rawHdrs));
          setUploadStep("mapping");
        } catch (err: any) {
          console.error("CSV parse error:", err);
          setBulkError("Could not parse CSV. Make sure it is a valid CSV format.");
        }
      };
      reader.readAsText(f);
    }
  };

  const handleGeneratePreview = () => {
    if (!columnMappings.name || !columnMappings.phone) {
      setBulkError("Please map the required Full Name and Phone Number columns.");
      return;
    }
    setBulkError("");

    const mapped = rawFileRows.map(row => {
      const nameVal = row[columnMappings.name] || "";
      const phoneVal = row[columnMappings.phone] || "";
      const emailVal = columnMappings.email ? row[columnMappings.email] : "";
      const custom1Val = columnMappings.custom1 ? row[columnMappings.custom1] : "";
      const custom2Val = columnMappings.custom2 ? row[columnMappings.custom2] : "";
      const optedInText = columnMappings.whatsapp_opted ? (row[columnMappings.whatsapp_opted] || "").toLowerCase().trim() : "";
      
      const appointment_time = columnMappings.appointment_time ? row[columnMappings.appointment_time] : "";
      const location = columnMappings.location ? row[columnMappings.location] : "";
      
      const custom3 = (appointment_time || location) 
        ? JSON.stringify({ appointment_time, location }) 
        : "";

      // Resolve per-row country code: mapped column > default bulk dropdown
      let rowCountryCode = "";
      if (columnMappings.country_code && row[columnMappings.country_code]) {
        const raw = String(row[columnMappings.country_code]).trim().replace(/[^\d+]/g, "");
        rowCountryCode = raw.startsWith("+") ? raw : "+" + raw;
      }
      const fallbackCode = (rowCountryCode || defaultBulkCountryCode).replace(/^\+/, "");

      let normalizedPhone = phoneVal.replace(/[^\d+]/g, "");
      if (normalizedPhone && !normalizedPhone.startsWith("+")) {
        // Strip leading zeros then prepend resolved country code
        const digits = normalizedPhone.replace(/^0+/, "");
        normalizedPhone = "+" + fallbackCode + digits;
      }

      const opted_in = optedInText 
        ? !(optedInText === 'no' || optedInText === 'false' || optedInText === '0' || optedInText === 'optout')
        : true;

      return {
        name: nameVal || "Unnamed Contact",
        phone: normalizedPhone,
        email: emailVal || null,
        custom1: custom1Val || "",
        custom2: custom2Val || "",
        custom3,
        opted_in
      };
    }).filter(r => r.phone);

    if (mapped.length === 0) {
      setBulkError("No valid contacts containing phone numbers were found after mapping.");
      return;
    }

    setParsedContacts(mapped);
    setPreview(mapped.slice(0, 5));
    setUploadStep("preview");
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
    setImportProgress(0);
    
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    try {
      setImportStepMsg("Analyzing mapped columns and checking structure...");
      setImportProgress(15);
      await wait(600);
      
      setImportStepMsg("Formatting contact numbers & resolving country codes...");
      setImportProgress(40);
      await wait(900);
      
      setImportStepMsg("Identifying unique records and duplicates...");
      setImportProgress(68);
      await wait(800);
      
      setImportStepMsg("Saving records to database and synchronizing segments...");
      setImportProgress(90);
      
      await axios.post(
        "/api/contacts/import",
        {
          contacts: parsedContacts,
          segment_id: segmentId || null
        }
      );
      
      setImportStepMsg("Import completed successfully!");
      setImportProgress(100);
      await wait(500);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setBulkError(err.response?.data?.error || "Bulk upload failed. Please try again.");
      setImportProgress(0);
      setImportStepMsg("");
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

            {/* ════════════════ Step 1: Upload File ════════════════ */}
            {uploadStep === "upload" && (
              <div className="space-y-4">
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
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-surface border border-border rounded-2xl flex items-center justify-center mx-auto text-text-muted group-hover:text-text-primary transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Select a CSV / Excel file to upload</p>
                      <p className="text-xs text-text-muted mt-1">or drag and drop it here</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end px-1">
                  <button 
                    type="button" 
                    onClick={downloadSampleCSV} 
                    className="text-xs text-jade hover:text-emerald-400 font-bold flex items-center gap-1.5 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download sample CSV
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════ Step 2: Interactive Column Mapper ════════════════ */}
            {uploadStep === "mapping" && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-jade" /> Map File Columns to Waptrix Fields
                  </h4>
                  <button 
                    type="button"
                    onClick={() => { setFile(null); setUploadStep("upload"); setBulkError(""); }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider underline cursor-pointer"
                  >
                    Clear File
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3.5 p-4 bg-surface/30 rounded-2xl border border-border">
                  {/* Name Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-primary uppercase tracking-wide">Full Name <span className="text-rose-500">*</span></label>
                      {columnMappings.name && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.name] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.name}
                      onChange={e => setColumnMappings({ ...columnMappings, name: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border"
                    >
                      <option value="">Select column...</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Phone Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-primary uppercase tracking-wide">Phone Number <span className="text-rose-500">*</span></label>
                      {columnMappings.phone && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.phone] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.phone}
                      onChange={e => setColumnMappings({ ...columnMappings, phone: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border"
                    >
                      <option value="">Select column...</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Country Code Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide">
                        Country Code Column <span className="text-text-muted/60 normal-case font-normal">(if separate column in file)</span>
                      </label>
                      {columnMappings.country_code && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.country_code] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.country_code}
                      onChange={e => setColumnMappings({ ...columnMappings, country_code: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border text-text-muted"
                    >
                      <option value="">-- No separate country code column --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    {/* Default fallback country code when no column is mapped */}
                    {!columnMappings.country_code && (
                      <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-jade/5 border border-jade/20 rounded-xl">
                        <span className="text-[10px] text-text-muted shrink-0">Default for numbers without country code:</span>
                        <select
                          value={defaultBulkCountryCode}
                          onChange={e => setDefaultBulkCountryCode(e.target.value)}
                          className="input-field flex-1 text-xs py-1.5 bg-background border-jade/30 text-jade font-bold"
                        >
                          {COUNTRY_CODES.map(c => (
                            <option key={c.code + c.label} value={c.code}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {columnMappings.country_code && (
                      <p className="text-[10px] text-jade mt-1">
                        ✓ Country code will be read per-row from the mapped column. Accepted formats: <code className="bg-jade/10 px-1 rounded">+91</code>, <code className="bg-jade/10 px-1 rounded">91</code>, <code className="bg-jade/10 px-1 rounded">971</code>
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-border/40 my-1"></div>

                  {/* Email Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Email (Optional)</label>
                      {columnMappings.email && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.email] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.email}
                      onChange={e => setColumnMappings({ ...columnMappings, email: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border text-text-muted"
                    >
                      <option value="">-- Don't Map / Skip --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* User ID Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide font-mono">User ID (Optional)</label>
                      {columnMappings.custom1 && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.custom1] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.custom1}
                      onChange={e => setColumnMappings({ ...columnMappings, custom1: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border text-text-muted font-mono"
                    >
                      <option value="">-- Don't Map / Skip --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tags Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Tags (Optional)</label>
                      {columnMappings.custom2 && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.custom2] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.custom2}
                      onChange={e => setColumnMappings({ ...columnMappings, custom2: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border text-text-muted"
                    >
                      <option value="">-- Don't Map / Skip --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* WhatsApp Opted Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide">WhatsApp Consent (Optional)</label>
                      {columnMappings.whatsapp_opted && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.whatsapp_opted] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.whatsapp_opted}
                      onChange={e => setColumnMappings({ ...columnMappings, whatsapp_opted: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border text-text-muted"
                    >
                      <option value="">-- Don't Map / Skip --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Appointment Time Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Appointment Time (Optional)</label>
                      {columnMappings.appointment_time && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.appointment_time] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.appointment_time}
                      onChange={e => setColumnMappings({ ...columnMappings, appointment_time: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border text-text-muted"
                    >
                      <option value="">-- Don't Map / Skip --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location Mapping */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Location (Optional)</label>
                      {columnMappings.location && (
                        <span className="text-[9px] text-text-muted italic truncate max-w-[200px]">
                          Preview: "{rawFileRows[0]?.[columnMappings.location] || "Empty"}"
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMappings.location}
                      onChange={e => setColumnMappings({ ...columnMappings, location: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-background border-border text-text-muted"
                    >
                      <option value="">-- Don't Map / Skip --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
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
                  onClick={handleGeneratePreview}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
                >
                  Configure &amp; Generate Preview
                </button>
              </div>
            )}

            {/* ════════════════ Step 3: Preview List & Ingestion Progress ════════════════ */}
            {uploadStep === "preview" && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Spreadsheet Preview (First 5 Rows)</p>
                  {!isBulkLoading && (
                    <button
                      type="button"
                      onClick={() => setUploadStep("mapping")}
                      className="text-[10px] text-jade hover:text-emerald-400 font-bold uppercase tracking-wider underline cursor-pointer"
                    >
                      Change Column Mappings
                    </button>
                  )}
                </div>

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
                            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded truncate max-w-[80px] block font-bold uppercase">
                              {row.custom2 || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 pt-3 border-t border-border/40">
                  {/* Segment Assign Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Target Segment (Optional)</label>
                    <div className="flex gap-2">
                      <select
                        disabled={isBulkLoading}
                        value={segmentId}
                        onChange={e => setSegmentId(e.target.value)}
                        className="input-field flex-1 text-sm bg-background border-border disabled:opacity-50"
                      >
                        <option value="">No segment</option>
                        {segments.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isBulkLoading}
                        onClick={() => setShowQuickCreate(true)}
                        className="btn-secondary px-3 py-2 flex items-center justify-center gap-1 hover:border-jade/30 disabled:opacity-50"
                        title="Create new segment"
                      >
                        <Plus className="w-4 h-4 text-jade" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Panel */}
                  {isBulkLoading && (
                    <div className="p-4 bg-surface/50 border border-jade/20 rounded-2xl space-y-2 animate-in zoom-in-95 duration-250">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-jade font-bold flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {importStepMsg}
                        </span>
                        <span className="text-text-primary font-bold font-mono">{importProgress}%</span>
                      </div>
                      <div className="w-full bg-surface border border-border rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-jade h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {bulkError && (
                    <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {bulkError}
                    </div>
                  )}

                  {!isBulkLoading && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleBulkImportSubmit}
                        className="flex-1 btn-primary py-3.5 flex items-center justify-center gap-2 text-sm font-bold shadow-[0_4px_20px_rgba(16,185,129,0.2)]"
                      >
                        <Upload className="w-4 h-4" />
                        Bulk Import {parsedContacts.length} Contacts
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFile(null); setUploadStep("upload"); setParsedContacts([]); setPreview([]); setBulkError(""); }}
                        className="btn-secondary py-3.5 px-5 text-sm font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
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
  onContactsUpdated,
}: {
  segments: any[];
  contacts: any[];
  onClose: () => void;
  onSegmentCreated: (seg: any) => void;
  onSegmentUpdated: (seg: any) => void;
  onSegmentDeleted: (id: string) => void;
  onContactsUpdated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"segments" | "tags">("segments");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Tag manager states
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);

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

  const handleTagRename = async (oldTag: string) => {
    if (!editTagName.trim() || editTagName.trim() === oldTag) {
      setEditingTag(null);
      return;
    }
    setIsTagSaving(true);
    try {
      await axios.put("/api/contacts", {
        tagAction: "rename",
        oldTag,
        newTag: editTagName.trim()
      });
      onContactsUpdated();
      setEditingTag(null);
    } catch (err) {
      console.error("Tag rename failed", err);
      alert("Failed to rename tag.");
    } finally {
      setIsTagSaving(false);
    }
  };

  const handleTagDelete = async (tagName: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${tagName}" from all contacts?`)) return;
    setDeletingTag(tagName);
    try {
      await axios.put("/api/contacts", {
        tagAction: "delete",
        oldTag: tagName
      });
      onContactsUpdated();
    } catch (err) {
      console.error("Tag delete failed", err);
      alert("Failed to delete tag.");
    } finally {
      setDeletingTag(null);
    }
  };

  const filtered = segments.filter(s =>
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const tagsList = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    contacts.forEach(c => {
      if (c.custom2) {
        c.custom2.split(',').forEach((t: string) => {
          const clean = t.trim();
          if (clean) {
            tagCounts[clean] = (tagCounts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [contacts]);

  const filteredTags = tagsList.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
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
              <h2 className="text-lg font-bold font-syne">Manage Library</h2>
              <p className="text-xs text-text-muted">Rename, delete, and control your contact segments and tags</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg text-text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border bg-surface/30 px-6">
          <button
            onClick={() => { setActiveTab("segments"); setSearch(""); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider flex items-center gap-1.5 ${
              activeTab === "segments"
                ? "border-jade text-jade"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <Folder className="w-4 h-4" /> Niches &amp; Lists
          </button>
          <button
            onClick={() => { setActiveTab("tags"); setSearch(""); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider flex items-center gap-1.5 ${
              activeTab === "tags"
                ? "border-jade text-jade"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <Tag className="w-4 h-4" /> Tags Manager
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="p-4 border-b border-border flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === "segments" ? "Search segments..." : "Search tags..."}
              className="input-field w-full pl-10 text-xs py-2.5 bg-background border-border"
            />
          </div>
          {activeTab === "segments" && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New List
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {activeTab === "segments" ? (
            <>
              {showCreate && (
                <div className="bg-surface border border-border rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
                  <QuickCreateSegmentModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={(seg) => {
                      onSegmentCreated(seg);
                      setShowCreate(false);
                    }}
                  />
                </div>
              )}
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-xs">No lists found matching your search.</div>
              ) : (
                filtered.map(s => {
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
                })
              )}
            </>
          ) : (
            <div className="space-y-3">
              {filteredTags.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-xs">No tags found. Create some tags by editing or importing contacts.</div>
              ) : (
                filteredTags.map(t => {
                  const isEditing = editingTag === t.name;
                  return (
                    <div key={t.name} className="bg-surface border border-border/60 hover:border-jade/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/25 rounded-xl flex items-center justify-center text-purple-400 shadow-sm">
                          <Tag className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          {isEditing ? (
                            <div className="flex gap-2 items-center">
                              <input
                                value={editTagName}
                                onChange={e => setEditTagName(e.target.value)}
                                className="input-field py-1 px-2 text-xs flex-1 max-w-[250px] bg-background border-border font-bold uppercase tracking-wider"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleTagRename(t.name);
                                  if (e.key === 'Escape') setEditingTag(null);
                                }}
                              />
                              <button
                                onClick={() => handleTagRename(t.name)}
                                disabled={isTagSaving}
                                className="text-xs text-jade font-bold hover:underline"
                              >
                                {isTagSaving ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingTag(null)}
                                className="text-xs text-text-muted hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                              <span className="inline-block bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                {t.name}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingTag(t.name);
                                  setEditTagName(t.name);
                                }}
                                className="text-[10px] font-medium text-text-muted hover:text-jade transition-colors"
                              >
                                (Rename)
                              </button>
                            </h4>
                          )}
                          <p className="text-xs text-text-muted">Assigned to {t.count} contact{t.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleTagDelete(t.name)}
                          disabled={deletingTag === t.name}
                          className="btn-secondary !border-rose-500/20 hover:!bg-rose-500/10 !text-rose-500 py-1.5 px-3 text-xs flex items-center gap-1"
                        >
                          {deletingTag === t.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Remove Tag Globally
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
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
  const [selectedContactIdForProfile, setSelectedContactIdForProfile] = useState<string | null>(null);
  const [waSendTarget, setWaSendTarget] = useState<any | null>(null);
  const [activeSegmentFilter, setActiveSegmentFilter] = useState<string>("all");

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
    if (activeSegmentFilter === id) {
      setActiveSegmentFilter("all");
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
  }, [searchQuery, activeSegmentFilter]);

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
    const matchesSegment = activeSegmentFilter === "all" || c.segment_id === activeSegmentFilter;

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
          onContactsUpdated={fetchContacts}
        />
      )}
      {showQuickCreateSegment && (
        <QuickCreateSegmentModal
          onClose={() => setShowQuickCreateSegment(false)}
          onSuccess={handleSegmentCreated}
        />
      )}
      {selectedContactIdForProfile && (
        <ContactProfileDrawer
          contactId={selectedContactIdForProfile}
          onClose={() => setSelectedContactIdForProfile(null)}
          onUpdate={fetchContacts}
          segments={segments}
        />
      )}
      {waSendTarget && (
        <WhatsAppSendModal contact={waSendTarget} onClose={() => setWaSendTarget(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-syne">Contacts &amp; Segments</h2>
          <p className="text-sm text-text-muted">Manage your audience and subscriber lists.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <a
            href={activeSegmentFilter !== "all" ? `/campaigns?new=true&segmentId=${activeSegmentFilter}` : "/campaigns?new=true"}
            className="flex-1 md:flex-none btn-secondary flex items-center justify-center gap-2 hover:border-jade/30 text-xs font-bold font-dm-sans"
          >
            <Send className="w-4 h-4 text-jade" />
            Send Campaign
          </a>
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

      {/* Full-width Contacts Table */}
      <div className="space-y-4">
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
                
                {/* Segment Filter Dropdown */}
                <div className="relative w-full sm:w-48 flex items-center">
                  <Folder className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={activeSegmentFilter}
                    onChange={e => setActiveSegmentFilter(e.target.value)}
                    className="input-field w-full pl-9 pr-8 text-xs h-9 appearance-none bg-surface border-border focus:border-jade text-text-primary rounded-lg focus:outline-none"
                  >
                    <option value="all">All Segments</option>
                    {segments.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({contacts.filter(c => c.segment_id === s.id).length})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Tag Filter Dropdown */}
                <div className="relative w-full sm:w-40 flex items-center">
                  <Tag className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

                {/* Manage Segments button */}
                <button
                  onClick={() => setShowLibraryModal(true)}
                  className="shrink-0 h-9 px-3 btn-secondary text-xs flex items-center gap-1.5 border-border/60"
                >
                  <FileText className="w-3.5 h-3.5 text-jade" /> Manage
                </button>
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
                      <th className="px-3 py-4 text-center">
                        <span className="flex items-center justify-center gap-1 text-[9px]">
                          Code
                        </span>
                      </th>
                      <th className="px-4 py-4 cursor-pointer hover:text-text-primary transition-colors select-none" onClick={() => toggleSort("phone")}>
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
                        <tr 
                          key={contact.id || i} 
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.tagName === 'INPUT' || 
                              target.tagName === 'BUTTON' || 
                              target.tagName === 'A' || 
                              target.closest('button') || 
                              target.closest('a') ||
                              target.closest('input')
                            ) {
                              return;
                            }
                            setSelectedContactIdForProfile(contact.id);
                          }}
                          className={`hover:bg-card/50 transition-all group duration-200 cursor-pointer ${isSelected ? 'bg-jade/5 border-l-2 border-l-jade' : ''}`}
                        >
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
                          {(() => {
                            const { code, local } = parsePhone(contact.phone || "");
                            return (
                              <>
                                <td className="px-3 py-4 text-center">
                                  <span className="inline-block bg-surface border border-border px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-jade">
                                    {code || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-xs text-text-muted font-mono">{local || contact.phone}</td>
                              </>
                            );
                          })()}
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
                              <button
                                onClick={() => setWaSendTarget(contact)}
                                className="w-8 h-8 rounded-lg bg-surface border border-border/40 hover:border-[#25D366]/40 flex items-center justify-center text-text-muted hover:text-[#25D366] hover:bg-[#25D366]/5 hover:scale-105 active:scale-95 transition-all shadow-sm"
                                title="Send WhatsApp message"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                              </button>
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
