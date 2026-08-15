"use client";

import { useState, useEffect } from "react";
import { Building2, Mail, Phone, MapPin, FileText, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface BillingInfo {
  billing_name: string;
  billing_email: string;
  billing_phone: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  billing_gst: string;
}

const EMPTY: BillingInfo = {
  billing_name: "", billing_email: "", billing_phone: "",
  billing_address: "", billing_city: "", billing_state: "",
  billing_pincode: "", billing_gst: "",
};

export default function BillingDetailsPage() {
  const [form, setForm]     = useState<BillingInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch("/api/billing/details")
      .then(r => r.json())
      .then(d => { setForm(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const set = (key: keyof BillingInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/billing/details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 text-jade animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold font-syne text-text-primary">Billing Details</h1>
        <p className="text-sm text-text-muted mt-1">Used on your invoices and GST receipts.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Business info */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-jade" />
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Business Information</p>
          </div>
          <Field label="Business / Company Name">
            <Input icon={Building2} value={form.billing_name} onChange={set("billing_name")} placeholder="Acme Pvt Ltd" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Billing Email">
              <Input icon={Mail} type="email" value={form.billing_email} onChange={set("billing_email")} placeholder="billing@company.com" />
            </Field>
            <Field label="Phone Number">
              <Input icon={Phone} value={form.billing_phone} onChange={set("billing_phone")} placeholder="+91 98765 43210" />
            </Field>
          </div>
          <Field label="GST Number (optional)">
            <Input icon={FileText} value={form.billing_gst} onChange={set("billing_gst")} placeholder="22AAAAA0000A1Z5" />
          </Field>
        </div>

        {/* Address */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-jade" />
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Billing Address</p>
          </div>
          <Field label="Street Address">
            <Input icon={MapPin} value={form.billing_address} onChange={set("billing_address")} placeholder="123, Main Street, Bandra West" />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <input value={form.billing_city} onChange={set("billing_city")} placeholder="Mumbai" className="input-field w-full text-sm" />
            </Field>
            <Field label="State">
              <input value={form.billing_state} onChange={set("billing_state")} placeholder="Maharashtra" className="input-field w-full text-sm" />
            </Field>
            <Field label="Pincode">
              <input value={form.billing_pincode} onChange={set("billing_pincode")} placeholder="400050" className="input-field w-full text-sm" />
            </Field>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Details"}
          </button>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-jade font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Input({ icon: Icon, ...props }: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input {...props} className="input-field w-full text-sm pl-9" />
    </div>
  );
}
