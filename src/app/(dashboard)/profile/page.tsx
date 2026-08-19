"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/context/TenantContext";
import { createClient } from "@/lib/supabase/client";
import { UserCircle, Mail, Building2, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const { tenant, role, userId, loading, refresh } = useTenant();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load current agent profile
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      // Load name from team_members table
      const db = createClient();
      const { data: memberRow } = await db
        .from("team_members")
        .select("name")
        .eq("member_user_id", user.id)
        .maybeSingle();
      setName(memberRow?.name ?? user.user_metadata?.full_name ?? "");
    }
    if (!loading) loadProfile();
  }, [loading]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/profile/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setSaveMsg({ type: "success", text: "Name updated successfully!" });
        await refresh(); // update topbar immediately
      } else {
        const d = await res.json();
        setSaveMsg({ type: "error", text: d.error || "Failed to update name." });
      }
    } catch {
      setSaveMsg({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: "error", text: "Please fill all password fields." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "New passwords don't match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const supabase = createClient();
      // Re-authenticate with current password first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Not authenticated");

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signInErr) {
        setPwMsg({ type: "error", text: "Current password is incorrect." });
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;

      setPwMsg({ type: "success", text: "Password changed successfully!" });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      setPwMsg({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111B21]">My Profile</h1>
        <p className="text-sm text-[#667781] mt-1">Manage your personal details and password.</p>
      </div>

      {/* Avatar section */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-[#25D366] flex items-center justify-center text-white text-2xl font-bold">
          {name ? name.charAt(0).toUpperCase() : <UserCircle className="w-8 h-8" />}
        </div>
        <div>
          <p className="font-semibold text-[#111B21] text-lg">{name || "Agent"}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D9FDD3] text-[#075E54] capitalize">
            {role}
          </span>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-2xl border border-[#E9EDEF] p-6 mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#111B21] mb-5 flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-[#25D366]" />
          Personal Information
        </h2>

        <div className="space-y-4">
          {/* Name — editable */}
          <div>
            <label className="block text-sm font-medium text-[#111B21] mb-1.5">Display Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1 px-3 py-2.5 rounded-xl border border-[#E9EDEF] text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#128C7E] transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
            {saveMsg && (
              <p className={`flex items-center gap-1.5 text-xs mt-2 ${saveMsg.type === "success" ? "text-[#25D366]" : "text-red-500"}`}>
                {saveMsg.type === "success" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {saveMsg.text}
              </p>
            )}
          </div>

          {/* Email — locked */}
          <div>
            <label className="block text-sm font-medium text-[#111B21] mb-1.5">
              Email Address
              <span className="ml-2 text-xs text-[#667781] font-normal">(cannot be changed)</span>
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#E9EDEF] bg-[#F8F9FA] text-sm text-[#667781]">
              <Mail className="w-4 h-4 flex-shrink-0" />
              {email}
              <Lock className="w-3.5 h-3.5 ml-auto text-[#AAB8C2]" />
            </div>
          </div>

          {/* Organisation — read-only */}
          <div>
            <label className="block text-sm font-medium text-[#111B21] mb-1.5">Organisation</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#E9EDEF] bg-[#F8F9FA] text-sm text-[#667781]">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              {tenant?.company || tenant?.name || "—"}
              <Lock className="w-3.5 h-3.5 ml-auto text-[#AAB8C2]" />
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-[#E9EDEF] p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#111B21] mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#25D366]" />
          Change Password
        </h2>

        <div className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-[#111B21] mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[#E9EDEF] text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667781]">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-[#111B21] mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[#E9EDEF] text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667781]">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-[#111B21] mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[#E9EDEF] text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667781]">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {pwMsg && (
            <p className={`flex items-center gap-1.5 text-xs ${pwMsg.type === "success" ? "text-[#25D366]" : "text-red-500"}`}>
              {pwMsg.type === "success" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {pwMsg.text}
            </p>
          )}

          <button
            onClick={handleChangePassword}
            disabled={pwSaving}
            className="w-full py-2.5 bg-[#111B21] text-white rounded-xl text-sm font-semibold hover:bg-[#1A2A33] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pwSaving ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
