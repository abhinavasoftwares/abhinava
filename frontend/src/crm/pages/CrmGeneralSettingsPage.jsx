import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Mail
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getCrmPasscodeStatus,
  setCrmPasscode,
  changeCrmPasscode,
  requestCrmPasscodeReset,
} from "../services/crmPasscode";

export default function CrmGeneralSettingsPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");

  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryNote, setRecoveryNote] = useState("");
  const [recoveryRequested, setRecoveryRequested] = useState(false);

  async function loadStatus() {
    try {
      setLoading(true);
      const result = await getCrmPasscodeStatus();
      setStatus(result);
    } catch (loadError) {
      console.error("Failed to load CRM passcode status:", loadError);
      setToast({ type: "error", message: loadError.message || "Failed to load CRM security settings." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleCreatePasscode(event) {
    event.preventDefault();
    if (!newPasscode) return setToast({ type: "error", message: "Enter a CRM security passcode." });
    if (newPasscode.length < 6) return setToast({ type: "error", message: "Passcode must contain at least 6 characters." });
    if (newPasscode !== confirmPasscode) return setToast({ type: "error", message: "Passcodes do not match." });

    try {
      setSaving(true);
      await setCrmPasscode(newPasscode);
      setNewPasscode("");
      setConfirmPasscode("");
      setToast({ type: "success", message: "CRM security passcode has been created successfully." });
      await loadStatus();
    } catch (saveError) {
      console.error("Failed to create CRM passcode:", saveError);
      setToast({ type: "error", message: saveError.message || "Failed to create CRM security passcode." });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePasscode(event) {
    event.preventDefault();
    if (!currentPasscode) return setToast({ type: "error", message: "Enter the current CRM passcode." });
    if (!newPasscode) return setToast({ type: "error", message: "Enter the new CRM passcode." });
    if (newPasscode.length < 6) return setToast({ type: "error", message: "New passcode must contain at least 6 characters." });
    if (newPasscode !== confirmPasscode) return setToast({ type: "error", message: "New passcodes do not match." });

    try {
      setSaving(true);
      await changeCrmPasscode({ currentPasscode, newPasscode });
      setCurrentPasscode("");
      setNewPasscode("");
      setConfirmPasscode("");
      setShowRecovery(false);
      setToast({ type: "success", message: "CRM security passcode has been changed successfully." });
      await loadStatus();
    } catch (changeError) {
      console.error("Failed to change CRM passcode:", changeError);
      setToast({ type: "error", message: changeError.message || "Failed to change CRM security passcode." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRecoveryRequest(event) {
    event.preventDefault();
    try {
      setSaving(true);
      await requestCrmPasscodeReset(recoveryNote);
      setRecoveryRequested(true);
      setToast({ type: "success", message: "Passcode reset request has been submitted for administrator review." });
      setRecoveryNote("");
    } catch (requestError) {
      console.error("Failed to request CRM passcode reset:", requestError);
      setToast({ type: "error", message: requestError.message || "Failed to submit the reset request." });
    } finally {
      setSaving(false);
    }
  }

  function formatDate(value) {
    if (!value) return "Not available";
    try {
      const date = value?.toDate ? value.toDate() : new Date(value);
      if (Number.isNaN(date.getTime())) return "Not available";
      return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return "Not available";
    }
  }

  const configured = Boolean(status?.configured);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F5F7F5] lg:p-6 lg:overflow-hidden relative">
      
      {/* TOAST NOTIFICATION (Floats above UI to prevent scrolling) */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[100] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* MAIN CONTAINER (Locked to screen height) */}
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1000px] flex-col overflow-hidden bg-white lg:rounded-2xl lg:border lg:border-[#E2E8E4] lg:shadow-sm">
        
        {/* =====================================================
            HEADER (Compact & Fixed)
        ====================================================== */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#E2E8E4] px-6 py-4 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/crm/settings")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8E4] text-[#68786D] hover:bg-[#F5F7F5] hover:text-[#1B241E] transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#1B241E]">Security Settings</h1>
              <p className="text-[10px] font-medium text-[#68786D] mt-0.5">Manage master CRM passcode</p>
            </div>
          </div>
          <button onClick={loadStatus} disabled={loading} className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#F5F7F5] px-3 text-[10px] font-bold uppercase tracking-wider text-[#345343] transition hover:bg-[#E2E8E4] disabled:opacity-50">
            <RefreshCcw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* =====================================================
            SPLIT BODY CONTENT
        ====================================================== */}
        <div className="flex flex-1 flex-col lg:flex-row min-h-0 bg-white">
          
          {/* LEFT PANE: STATUS & INFO */}
          <div className="w-full lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#E2E8E4] bg-[#F5F7F5]/50 p-6 lg:p-8 flex flex-col justify-between overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#345343]">
                  <ShieldCheck size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Status</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${configured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {configured ? "Active" : "Not Set"}
                </div>
              </div>

              {configured && (
                <div className="space-y-4 mb-8 border-b border-[#E2E8E4] pb-6">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Configuration Version</p>
                    <p className="mt-0.5 text-sm font-black text-[#1B241E]">v{status?.version || 1}.0</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Last Updated</p>
                    <p className="mt-0.5 text-xs font-bold text-[#1B241E]">{formatDate(status?.updatedAt)}</p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-[#1B241E] mb-2">
                  <KeyRound size={16} />
                  <span className="text-sm font-bold">Universal Lock</span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-[#68786D]">
                  This passcode secures sensitive CRM operations, including investment transactions, account closures, and ledger reversals. It is cryptographically hashed and never stored in plaintext.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANE: FLAT FORM */}
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto flex flex-col justify-center [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto w-full max-w-sm">
              
              {loading ? (
                <div className="flex flex-col items-center justify-center text-[#345343] py-20">
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Loading Configuration...</p>
                </div>
              ) : !configured ? (
                
                /* CREATE FORM */
                <form onSubmit={handleCreatePasscode} className="space-y-5 animate-in fade-in duration-500">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-[#1B241E] tracking-tight">Initialize Passcode</h2>
                    <p className="mt-1.5 text-xs text-[#68786D]">Create a secure 6+ character passcode for the CRM.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">New Passcode</label>
                    <div className="relative flex items-center rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] focus-within:border-[#345343] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#345343] transition-colors">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPasscode}
                        onChange={(e) => setNewPasscode(e.target.value)}
                        placeholder="Enter secure passcode"
                        className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA]"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="pr-3 text-[#87968C] hover:text-[#345343]">
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Confirm Passcode</label>
                    <input
                      type="password"
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      placeholder="Re-enter passcode"
                      className="w-full rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] px-3 py-2.5 text-sm font-semibold text-[#1B241E] outline-none focus:border-[#345343] focus:bg-white focus:ring-1 focus:ring-[#345343] transition-colors"
                    />
                  </div>

                  <button type="submit" disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#345343] py-3 text-xs font-bold text-white transition-colors hover:bg-[#1B241E] disabled:opacity-50">
                    {saving && <Loader2 size={14} className="animate-spin" />} Create Security Passcode
                  </button>
                </form>

              ) : (

                /* CHANGE FORM */
                <div className="animate-in fade-in duration-500">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-[#1B241E] tracking-tight">Update Passcode</h2>
                    <p className="mt-1.5 text-xs text-[#68786D]">Current passcode is required to authorize changes.</p>
                  </div>

                  <form onSubmit={handleChangePasscode} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Current Passcode</label>
                      <div className="relative flex items-center rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] focus-within:border-[#345343] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#345343] transition-colors">
                        <input
                          type={showCurrent ? "text" : "password"}
                          value={currentPasscode}
                          onChange={(e) => setCurrentPasscode(e.target.value)}
                          placeholder="Enter current passcode"
                          className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA]"
                        />
                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="pr-3 text-[#87968C] hover:text-[#345343]">
                          {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">New Passcode</label>
                      <div className="relative flex items-center rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] focus-within:border-[#345343] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#345343] transition-colors">
                        <input
                          type={showNew ? "text" : "password"}
                          value={newPasscode}
                          onChange={(e) => setNewPasscode(e.target.value)}
                          placeholder="Enter new passcode"
                          className="w-full bg-transparent px-3 py-2.5 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA]"
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="pr-3 text-[#87968C] hover:text-[#345343]">
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Confirm New Passcode</label>
                      <input
                        type="password"
                        value={confirmPasscode}
                        onChange={(e) => setConfirmPasscode(e.target.value)}
                        placeholder="Re-enter new passcode"
                        className="w-full rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] px-3 py-2.5 text-sm font-semibold text-[#1B241E] outline-none focus:border-[#345343] focus:bg-white focus:ring-1 focus:ring-[#345343] transition-colors"
                      />
                    </div>

                    <button type="submit" disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#345343] py-3 text-xs font-bold text-white transition-colors hover:bg-[#1B241E] disabled:opacity-50">
                      {saving && <Loader2 size={14} className="animate-spin" />} Update Security Passcode
                    </button>
                  </form>

                  {/* EMERGENCY RECOVERY (FLAT, INLINE) */}
                  <div className="mt-8 border-t border-[#E2E8E4] pt-6">
                    {!showRecovery && !recoveryRequested && (
                      <div className="text-center">
                        <p className="text-xs text-[#68786D]">Forgotten your current passcode?</p>
                        <button type="button" onClick={() => { setShowRecovery(true); resetMessages(); }} className="mt-1 text-xs font-bold text-[#345343] hover:underline">
                          Request an administrator reset
                        </button>
                      </div>
                    )}

                    {showRecovery && !recoveryRequested && (
                      <form onSubmit={handleRecoveryRequest} className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C] flex items-center gap-1.5">
                          <Mail size={12} /> Administrator Reset Request
                        </label>
                        <textarea
                          value={recoveryNote}
                          onChange={(e) => setRecoveryNote(e.target.value)}
                          rows={2}
                          placeholder="Optional reason for reset..."
                          className="w-full resize-none rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] px-3 py-2 text-xs font-medium outline-none focus:border-[#345343] focus:bg-white focus:ring-1 focus:ring-[#345343]"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowRecovery(false)} className="flex-1 rounded-lg border border-[#E2E8E4] bg-white py-2 text-xs font-bold text-[#68786D] hover:bg-[#F5F7F5]">
                            Cancel
                          </button>
                          <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1B241E] py-2 text-xs font-bold text-white disabled:opacity-50">
                            {saving && <Loader2 size={12} className="animate-spin" />} Submit
                          </button>
                        </div>
                      </form>
                    )}

                    {recoveryRequested && (
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 py-3 rounded-lg border border-emerald-200 animate-in fade-in">
                        <CheckCircle2 size={16} /> Request recorded. Awaiting review.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}