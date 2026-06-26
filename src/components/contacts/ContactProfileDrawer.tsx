"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, Mail, Phone, Hash, Tag, Calendar, MapPin, 
  CheckCircle2, AlertCircle, Loader2, Send, MessageSquare, 
  Activity, Clock, Eye, PackageCheck, Copy, Check
} from "lucide-react";
import axios from "axios";

interface ContactProfileDrawerProps {
  contactId: string;
  onClose: () => void;
  onUpdate: () => void;
  segments: any[];
}

export default function ContactProfileDrawer({
  contactId,
  onClose,
  onUpdate,
  segments
}: ContactProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<"details" | "chat" | "campaigns">("details");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [contact, setContact] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [campaignLogs, setCampaignLogs] = useState<any[]>([]);
  
  // Form states
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    userId: "",
    optedIn: true,
    appointmentTime: "",
    location: "",
    segment_id: ""
  });
  
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchActivity = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.get(`/api/contacts/${contactId}/activity`);
      const data = res.data;
      
      setContact(data.contact);
      setChatMessages(data.chatMessages || []);
      setCampaignLogs(data.campaignLogs || []);
      
      // Parse custom3 JSON if present
      let appTime = "";
      let loc = "";
      if (data.contact.custom3) {
        try {
          const parsed = JSON.parse(data.contact.custom3);
          appTime = parsed.appointment_time || "";
          loc = parsed.location || "";
        } catch {
          loc = data.contact.custom3;
        }
      }
      
      setForm({
        name: data.contact.name || "",
        phone: data.contact.phone || "",
        email: data.contact.email || "",
        userId: data.contact.custom1 || "",
        optedIn: data.contact.opted_in !== false,
        appointmentTime: appTime,
        location: loc,
        segment_id: data.contact.segment_id || ""
      });
      
      if (data.contact.custom2) {
        setTags(data.contact.custom2.split(",").map((t: string) => t.trim()).filter(Boolean));
      } else {
        setTags([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load profile details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [contactId]);

  useEffect(() => {
    if (activeTab === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTab, chatMessages]);

  const handleCopyPhone = () => {
    if (!form.phone) return;
    navigator.clipboard.writeText(form.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const removeTag = (idx: number) => {
    setTags(tags.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      alert("Name and Phone Number are required.");
      return;
    }
    
    setIsSaving(true);
    try {
      // Serialize custom3
      const custom3 = (form.appointmentTime || form.location) 
        ? JSON.stringify({ appointment_time: form.appointmentTime, location: form.location })
        : null;
        
      await axios.put("/api/contacts", {
        id: contactId,
        name: form.name.trim(),
        phone: form.phone.trim().replace(/[^\d+]/g, ""),
        email: form.email.trim() || null,
        custom1: form.userId.trim() || null,
        custom2: tags.length > 0 ? tags.join(", ") : null,
        custom3,
        opted_in: form.optedIn,
        segment_id: form.segment_id || null
      });
      
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const char = (form.name || "?")[0].toUpperCase();
  
  const getAvatarGradient = (c: string) => {
    const code = c.charCodeAt(0) % 5;
    switch (code) {
      case 0: return "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30";
      case 1: return "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30";
      case 2: return "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30";
      case 3: return "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30";
      default: return "from-cyan-500/20 to-sky-500/10 text-cyan-400 border-cyan-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      {/* Click outside closer */}
      <div className="absolute inset-0 z-40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative z-50 w-full max-w-xl h-full flex flex-col bg-card border-l border-border shadow-2xl overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card/65 backdrop-blur-md">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-jade animate-spin" />
              </div>
              <div>
                <div className="h-4 w-24 bg-surface rounded animate-pulse"></div>
                <div className="h-3 w-16 bg-surface rounded mt-1 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br border flex items-center justify-center font-bold text-base shadow-sm ${getAvatarGradient(char)}`}>
                {char}
              </div>
              <div>
                <h2 className="text-base font-bold font-syne text-text-primary">{contact?.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-text-muted font-mono">{form.phone}</span>
                  <button onClick={handleCopyPhone} className="p-1 hover:bg-surface rounded text-text-muted hover:text-text-primary" title="Copy Phone">
                    {copied ? <Check className="w-3 h-3 text-jade" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {form.optedIn ? (
                    <span className="text-[8px] bg-jade/10 text-jade px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Opted In</span>
                  ) : (
                    <span className="text-[8px] bg-danger/10 text-danger px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Opted Out</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs navigation */}
        <div className="flex border-b border-border bg-surface/30 px-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider flex items-center gap-1.5 ${
              activeTab === "details"
                ? "border-jade text-jade"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Details
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider flex items-center gap-1.5 ${
              activeTab === "chat"
                ? "border-jade text-jade"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat history
          </button>
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider flex items-center gap-1.5 ${
              activeTab === "campaigns"
                ? "border-jade text-jade"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Campaigns
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-jade animate-spin" />
              <p className="text-xs text-text-muted">Fetching contact timeline...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
              <button onClick={fetchActivity} className="btn-secondary text-xs font-bold">Retry</button>
            </div>
          ) : activeTab === "details" ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input-field w-full text-sm bg-background border-border"
                    placeholder="Enter name"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Phone (E.164 format)</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="input-field w-full text-sm bg-background border-border font-mono"
                    placeholder="+919876543210"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="input-field w-full text-sm bg-background border-border"
                    placeholder="Enter email"
                  />
                </div>

                {/* User ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">User ID (Custom 1)</label>
                  <input
                    type="text"
                    value={form.userId}
                    onChange={e => setForm({ ...form, userId: e.target.value })}
                    className="input-field w-full text-sm bg-background border-border font-mono"
                    placeholder="e.g. USR009"
                  />
                </div>

                {/* Segment dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Niche / Segment List</label>
                  <select
                    value={form.segment_id}
                    onChange={e => setForm({ ...form, segment_id: e.target.value })}
                    className="input-field w-full text-sm bg-background border-border"
                  >
                    <option value="">No Niche / Unassigned</option>
                    {segments.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Appointment time */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-text-muted/60" /> Appointment Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.appointmentTime}
                    onChange={e => setForm({ ...form, appointmentTime: e.target.value })}
                    className="input-field w-full text-sm bg-background border-border"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-text-muted/60" /> Location / Clinic Branch
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="input-field w-full text-sm bg-background border-border"
                    placeholder="City / Address"
                  />
                </div>

                {/* Tags manager */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-text-muted/60" /> Contact Tags (Custom 2)
                  </label>
                  <div className="p-3 bg-background border border-border rounded-xl space-y-2 focus-within:border-jade/50 transition-all">
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm">
                            {tag}
                            <button type="button" onClick={() => removeTag(idx)} className="hover:bg-purple-500/20 rounded p-0.5 text-purple-400 hover:text-purple-200">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="w-full bg-transparent border-0 outline-0 ring-0 p-0 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-0"
                      placeholder="Type a tag and press Enter or comma..."
                    />
                  </div>
                </div>

                {/* WhatsApp Opted */}
                <div className="space-y-1.5 md:col-span-2 border-t border-border/40 pt-4">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">WhatsApp Consent Status</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-primary">
                      <input
                        type="radio"
                        name="optedIn"
                        checked={form.optedIn === true}
                        onChange={() => setForm({ ...form, optedIn: true })}
                        className="accent-jade"
                      />
                      <span className="flex items-center gap-1 text-jade"><CheckCircle2 className="w-3.5 h-3.5" /> Opted-in</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-primary">
                      <input
                        type="radio"
                        name="optedIn"
                        checked={form.optedIn === false}
                        onChange={() => setForm({ ...form, optedIn: false })}
                        className="accent-danger"
                      />
                      <span className="flex items-center gap-1 text-danger"><X className="w-3.5 h-3.5" /> Opted-out / Blocked</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 border-t border-border/40 pt-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isSaving ? "Saving Updates..." : "Save Contact Info"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary py-3 px-5 text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : activeTab === "chat" ? (
            <div className="flex flex-col h-[60vh] bg-surface/20 border border-border/60 rounded-2xl overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background/40">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-20 space-y-2">
                    <MessageSquare className="w-10 h-10 text-text-muted" />
                    <div>
                      <p className="text-sm font-semibold font-syne text-text-primary">No message history yet</p>
                      <p className="text-xs text-text-muted max-w-[200px] mt-1 mx-auto">There are no WhatsApp messages logged with this customer.</p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isIn = msg.direction === "inbound";
                    return (
                      <div key={msg.id} className={`flex ${isIn ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-xs border transition-all ${
                          isIn 
                            ? "bg-surface border-border text-text-primary rounded-tl-none" 
                            : "bg-jade/10 border-jade/25 text-text-primary rounded-tr-none"
                        }`}>
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-65 text-[9px] font-medium font-mono">
                            <span>{new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                            {!isIn && (
                              <span className="shrink-0 text-text-muted">
                                {(() => {
                                  const status = msg.status?.toLowerCase();
                                  if (status === "read") return <Eye className="w-3 h-3 text-jade" />;
                                  if (status === "delivered") return <PackageCheck className="w-3 h-3 text-emerald-400" />;
                                  if (status === "failed") return <span title="Failed"><AlertCircle className="w-3 h-3 text-rose-500" /></span>;
                                  return <CheckCircle2 className="w-3 h-3 text-sky-400" />;
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          ) : (
            // Campaign logs timeline
            <div className="space-y-6 pt-2">
              {campaignLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center opacity-50 py-20 space-y-2">
                  <Activity className="w-10 h-10 text-text-muted" />
                  <div>
                    <p className="text-sm font-semibold font-syne text-text-primary">No campaign history</p>
                    <p className="text-xs text-text-muted max-w-[200px] mt-1 mx-auto">This contact has not received any automated templates or bulk marketing campaigns.</p>
                  </div>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-border/60 ml-3 space-y-8">
                  {campaignLogs.map((log) => {
                    const status = (log.status || "").toLowerCase();
                    const dateStr = new Date(log.sent_at || log.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                    
                    let dotColor = "bg-yellow-500 ring-yellow-500/20";
                    let icon = <Clock className="w-3 h-3 text-white" />;
                    if (status === "read") {
                      dotColor = "bg-jade ring-jade/20";
                      icon = <Eye className="w-3 h-3 text-white" />;
                    } else if (status === "delivered") {
                      dotColor = "bg-emerald-500 ring-emerald-500/20";
                      icon = <PackageCheck className="w-3 h-3 text-white" />;
                    } else if (status === "sent") {
                      dotColor = "bg-sky-500 ring-sky-500/20";
                      icon = <CheckCircle2 className="w-3 h-3 text-white" />;
                    } else if (status === "failed") {
                      dotColor = "bg-rose-500 ring-rose-500/20";
                      icon = <AlertCircle className="w-3 h-3 text-white" />;
                    }

                    return (
                      <div key={log.id} className="relative">
                        {/* Timeline dot */}
                        <span className={`absolute -left-[31px] top-0.5 flex h-5 w-5 rounded-full items-center justify-center ring-4 ${dotColor} shrink-0`}>
                          {icon}
                        </span>
                        
                        <div className="space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-text-primary">
                              Broadcast: <span className="text-jade">{log.campaign_name}</span>
                            </h4>
                            <span className="text-[10px] text-text-muted font-mono">{dateStr}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Status:</span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              status === "read" ? "bg-jade/10 text-jade" :
                              status === "delivered" ? "bg-emerald-500/10 text-emerald-400" :
                              status === "sent" ? "bg-sky-500/10 text-sky-500" :
                              status === "failed" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                              "bg-yellow-500/10 text-yellow-400"
                            }`}>
                              {status || "queued"}
                            </span>
                          </div>

                          {status === "failed" && log.error && (
                            <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl text-[11px] font-mono text-rose-400 leading-relaxed break-words">
                              <span className="font-bold uppercase tracking-wider mr-1 text-[9px] bg-rose-500/15 text-rose-300 px-1 py-0.5 rounded">Meta Error</span>
                              {log.error}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
