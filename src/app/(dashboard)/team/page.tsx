"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Users, UserPlus, X, Loader2, Shield, CheckCircle2, Mail, Copy
} from "lucide-react";

export default function TeamPage() {
  const [members, setMembers]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isOwner, setIsOwner]       = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent">("agent");
  const [inviting, setInviting]     = useState(false);
  const [inviteMsg, setInviteMsg]   = useState<{ type: "success" | "error"; text: string; url?: string } | null>(null);

  useEffect(() => {
    axios.get("/api/team")
      .then(r => { setMembers(Array.isArray(r.data) ? r.data : []); })
      .catch(err => { if (err?.response?.status === 403) setIsOwner(false); })
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true); setInviteMsg(null);
    try {
      const r = await axios.post("/api/team", { email: inviteEmail, role: inviteRole });
      setMembers(prev => {
        const exists = prev.find((m: any) => m.email === r.data.email);
        return exists
          ? prev.map((m: any) => m.email === r.data.email ? { ...m, ...r.data } : m)
          : [r.data, ...prev];
      });
      setInviteMsg({ type: "success", text: `Invite sent to ${r.data.email}`, url: r.data.inviteUrl });
      setInviteEmail("");
    } catch (err: any) {
      setInviteMsg({ type: "error", text: err?.response?.data?.error || "Failed to send invite" });
    } finally { setInviting(false); }
  };

  const handleRemove = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    await axios.delete(`/api/team/${id}`);
    setMembers(prev => prev.filter((m: any) => m.id !== id));
  };

  const handleRoleChange = async (id: string, role: string) => {
    await axios.patch(`/api/team/${id}`, { role });
    setMembers(prev => prev.map((m: any) => m.id === id ? { ...m, role } : m));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-jade animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-syne">Team Members</h2>
        <p className="text-sm text-text-muted mt-1">
          Invite staff to manage the shared inbox. Unlimited accounts.
        </p>
      </div>

      {/* Staff notice */}
      {!isOwner && (
        <div className="glass-card flex items-center gap-3 text-sm text-text-muted">
          <Shield className="w-5 h-5 text-jade flex-shrink-0" />
          You are a team member. Only the account owner can manage team settings.
        </div>
      )}

      {isOwner && (
        <>
          {/* Role guide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                role: "Agent",
                color: "jade",
                desc: "Can view and reply to conversations in the shared inbox. Cannot create campaigns or manage templates.",
                perms: ["View shared inbox", "Reply to messages", "View contacts"],
              },
              {
                role: "Admin",
                color: "info",
                desc: "Full platform access — contacts, templates, campaigns, analytics and inbox.",
                perms: ["Everything Agent can do", "Create & send campaigns", "Manage templates", "View analytics"],
              },
            ].map(({ role, color, desc, perms }) => (
              <div key={role} className={`glass-card border-${color}/20`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-${color}/10 text-${color} border border-${color}/20`}>
                    {role}
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-3">{desc}</p>
                <ul className="space-y-1">
                  {perms.map(p => (
                    <li key={p} className="flex items-center gap-2 text-xs text-text-primary">
                      <CheckCircle2 className="w-3 h-3 text-jade flex-shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Invite form */}
          <div className="glass-card">
            <h3 className="text-base font-bold font-syne mb-4">Invite a team member</h3>
            <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[220px] relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  placeholder="staff@email.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50"
                />
              </div>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as "admin" | "agent")}
                className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-jade/50"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="btn-primary flex items-center gap-2 px-5 disabled:opacity-50"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Send Invite
              </button>
            </form>

            {inviteMsg && (
              <div className={`mt-4 p-3 rounded-xl flex items-start gap-3 ${inviteMsg.type === "success" ? "bg-jade/10 border border-jade/20" : "bg-danger/10 border border-danger/20"}`}>
                <p className={`text-sm font-semibold ${inviteMsg.type === "success" ? "text-jade" : "text-danger"}`}>
                  {inviteMsg.text}
                </p>
                {inviteMsg.url && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteMsg.url!); }}
                    className="ml-auto flex items-center gap-1 text-[10px] text-jade hover:underline flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" /> Copy link
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Members table */}
          {members.length > 0 ? (
            <div className="glass-card !p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-bold font-syne">
                  {members.length} team member{members.length !== 1 ? "s" : ""}
                </h3>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    {["Email", "Role", "Status", "Invited", ""].map(h => (
                      <th key={h} className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {members.map((m: any) => (
                    <tr key={m.id} className="hover:bg-card/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-jade/10 border border-jade/20 flex items-center justify-center text-xs font-bold text-jade">
                            {m.email[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-text-primary">{m.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value)}
                          className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none"
                        >
                          <option value="agent">Agent</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.status === "active" ? "bg-jade/10 text-jade border-jade/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                          {m.status === "active" ? "✓ Active" : "Pending invite"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted">
                        {new Date(m.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemove(m.id, m.email)}
                          className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="glass-card flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 bg-jade/10 border border-jade/20 rounded-2xl flex items-center justify-center">
                <Users className="w-7 h-7 text-jade opacity-50" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">No team members yet</p>
                <p className="text-xs text-text-muted mt-1">Use the form above to invite your first staff account.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
