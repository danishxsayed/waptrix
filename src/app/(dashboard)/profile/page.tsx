"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/context/TenantContext";
import { createClient } from "@/lib/supabase/client";
import {
  UserCircle, Mail, Building2, Lock, Eye, EyeOff,
  Loader2, CheckCircle, AlertCircle, Trash2, TriangleAlert
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { tenant, role, loading, refresh } = useTenant();
  const router = useRouter();

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

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const DELETE_CONFIRM_WORD = "DELETE";

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: memberRow } = await supabase
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
        await refresh();
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== DELETE_CONFIRM_WORD) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setDeleteError(d.error || "Failed to delete account. Please try again.");
        return;
      }
      // Success — redirect to login with confirmation message
      router.push("/login?message=" + encodeURIComponent("Your account has been permanently deleted."));
    } catch (err: any) {
      setDeleteError(err.message || "Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
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
      <div className="bg-white rounded-2xl border border-[#E9EDEF] p-6 mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#111B21] mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#25D366]" />
          Change Password
        </h2>

        <div className="space-y-4">
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

      {/* Danger Zone — Delete Account */}
      <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-red-600 mb-2 flex items-center gap-2">
          <TriangleAlert className="w-4 h-4" />
          Danger Zone
        </h2>
        <p className="text-sm text-[#667781] mb-4">
          Permanently delete your account and all associated data — campaigns, contacts, conversations, and templates.
          This action <strong className="text-[#111B21]">cannot be undone</strong>.
        </p>
        <button
          onClick={() => { setShowDeleteDialog(true); setDeleteConfirmText(""); setDeleteError(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete My Account
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowDeleteDialog(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <TriangleAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111B21] text-base">Delete account permanently?</h3>
                <p className="text-sm text-[#667781] mt-1">
                  This will permanently delete all your data including contacts, campaigns, conversations, and templates. You cannot recover this account.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 space-y-1">
              <p className="font-semibold">The following will be permanently deleted:</p>
              <p>• All contacts and segments</p>
              <p>• All campaigns and message logs</p>
              <p>• All conversations and chat history</p>
              <p>• All templates and automations</p>
              <p>• Your WhatsApp connection and account</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111B21] mb-2">
                Type <span className="font-mono font-bold text-red-600">{DELETE_CONFIRM_WORD}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={DELETE_CONFIRM_WORD}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E9EDEF] text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 font-mono"
                autoFocus
              />
            </div>

            {deleteError && (
              <p className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertCircle className="w-3.5 h-3.5" />
                {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[#E9EDEF] text-[#667781] hover:bg-[#F8F9FA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== DELETE_CONFIRM_WORD}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete Account</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
