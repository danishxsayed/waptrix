"use client";

import { useState, useEffect } from "react";
import { Receipt, Search, Download, Eye, Loader2, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  billing_cycle: string | null;
  amount: number | null;
  currency: string;
  status: string;
  cf_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  paid:    "bg-[#D9FDD3] text-[#075E54] border-[#25D366]/20",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed:  "bg-red-50 text-red-600 border-red-200",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  paid: CheckCircle2, pending: Clock, failed: XCircle,
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Pro — Monthly", quarterly: "Pro — Quarterly", yearly: "Pro — Yearly",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<"all" | "paid" | "pending" | "failed">("all");
  const [viewing, setViewing]   = useState<Invoice | null>(null);

  useEffect(() => {
    fetch("/api/billing/invoices")
      .then(r => r.json())
      .then(d => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (d: string | null) => d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const q = search.trim().toLowerCase();
  const filtered = invoices.filter(inv => {
    const matchSearch =
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.order_id.toLowerCase().includes(q) ||
      (inv.cf_payment_id || "").toLowerCase().includes(q) ||
      (inv.billing_cycle || "").toLowerCase().includes(q);
    const matchFilter = filter === "all" || inv.status === filter;
    return matchSearch && matchFilter;
  });

  const handlePrint = (inv: Invoice) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Invoice ${inv.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 28px; margin-bottom: 4px; }
        .sub { color: #667781; font-size: 13px; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        td { padding: 10px 0; border-bottom: 1px solid #E9EDEF; font-size: 13px; }
        td:last-child { text-align: right; font-weight: 600; }
        .total td { border-bottom: none; font-size: 15px; font-weight: bold; padding-top: 16px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #D9FDD3; color: #075E54; }
        @media print { button { display: none; } }
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>Waptrix</h1><div class="sub">Tax Invoice · ${inv.invoice_number}</div></div>
        <div style="text-align:right"><span class="badge">${inv.status.toUpperCase()}</span><br>
        <span style="font-size:11px;color:#667781;margin-top:4px;display:block">Date: ${fmt(inv.paid_at || inv.created_at)}</span></div>
      </div>
      <hr style="border:none;border-top:2px solid #E9EDEF;margin:24px 0"/>
      <table>
        <tr><td>Invoice Number</td><td>${inv.invoice_number}</td></tr>
        <tr><td>Order ID</td><td>${inv.order_id}</td></tr>
        <tr><td>Payment ID</td><td>${inv.cf_payment_id || "—"}</td></tr>
        <tr><td>Plan</td><td>${CYCLE_LABELS[inv.billing_cycle || ""] || "Waptrix Pro"}</td></tr>
        <tr><td>Payment Date</td><td>${fmt(inv.paid_at || inv.created_at)}</td></tr>
        <tr><td>Subtotal</td><td>₹${((inv.amount || 0) / 1.18).toFixed(2)}</td></tr>
        <tr><td>GST (18%)</td><td>₹${((inv.amount || 0) * 0.18 / 1.18).toFixed(2)}</td></tr>
        <tr class="total"><td>Total Amount</td><td>₹${(inv.amount || 0).toLocaleString("en-IN")}</td></tr>
      </table>
      <p style="font-size:11px;color:#667781;margin-top:32px">Waptrix · waptrix.in · support@waptrix.in</p>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold font-syne text-text-primary">Invoices</h1>
        <p className="text-sm text-text-muted mt-1">Complete history of your payments and receipts.</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice, order, or payment ID…"
            className="input-field w-full text-sm pl-9"
          />
        </div>
        <div className="flex bg-card border border-border rounded-xl p-1 gap-1">
          {(["all", "paid", "pending", "failed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === f ? "bg-jade text-white" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-7 h-7 text-jade animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-dashed border-border rounded-2xl">
          <Receipt className="w-10 h-10 text-text-muted opacity-30 mb-3" />
          <p className="text-sm font-semibold text-text-muted">No invoices found</p>
          <p className="text-xs text-text-muted mt-1">Your payment history will appear here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                {["Invoice", "Date", "Plan", "Amount", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(inv => {
                const SIcon = STATUS_ICONS[inv.status] || Clock;
                return (
                  <tr key={inv.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-jade/10 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-jade" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">{inv.invoice_number}</p>
                          <p className="text-[10px] text-text-muted truncate max-w-[100px]">{inv.order_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                      {fmt(inv.paid_at || inv.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-primary">
                      {CYCLE_LABELS[inv.billing_cycle || ""] || "Waptrix Pro"}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-text-primary whitespace-nowrap">
                      ₹{(inv.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${STATUS_STYLES[inv.status] || "bg-surface text-text-muted border-border"}`}>
                        <SIcon className="w-3 h-3" />
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => setViewing(inv)}
                          title="View"
                          className="p-1.5 rounded-lg hover:bg-jade/10 text-text-muted hover:text-jade transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrint(inv)}
                          title="Download / Print"
                          className="p-1.5 rounded-lg hover:bg-jade/10 text-text-muted hover:text-jade transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
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

      {/* Invoice detail modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setViewing(null)} />
          <div className="relative bg-surface border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-extrabold font-syne text-lg">{viewing.invoice_number}</h3>
                <p className="text-xs text-text-muted mt-0.5">{fmt(viewing.paid_at || viewing.created_at)}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[viewing.status] || ""}`}>
                {viewing.status}
              </span>
            </div>

            <div className="space-y-0 divide-y divide-border/50 bg-card border border-border rounded-xl overflow-hidden mb-6">
              {[
                ["Plan",        CYCLE_LABELS[viewing.billing_cycle || ""] || "Waptrix Pro"],
                ["Order ID",    viewing.order_id],
                ["Payment ID",  viewing.cf_payment_id || "—"],
                ["Subtotal",    `₹${((viewing.amount || 0) / 1.18).toFixed(2)}`],
                ["GST (18%)",   `₹${((viewing.amount || 0) * 0.18 / 1.18).toFixed(2)}`],
                ["Total",       `₹${(viewing.amount || 0).toLocaleString("en-IN")}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-text-muted">{k}</span>
                  <span className="text-xs font-bold text-text-primary text-right max-w-[60%] break-all">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setViewing(null)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-text-muted hover:bg-surface transition-all"
              >
                Close
              </button>
              <button
                onClick={() => handlePrint(viewing)}
                className="flex-1 py-3 rounded-xl bg-jade text-white text-sm font-bold hover:bg-jade/90 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
