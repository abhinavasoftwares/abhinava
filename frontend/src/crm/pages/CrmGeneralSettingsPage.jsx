import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Clock,
  X,
  Lock,
  KeyRound,
  ShieldCheck,
  Fingerprint,
} from "lucide-react";

import { crmPath } from "../utils/crmRoutes";
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
    } catch (err) {
      setToast({
        type: "error",
        message: err.message || "Failed to load PIN status.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function getRemainingDays() {
    if (!status?.updatedAt) return 60;
    try {
      const updatedDate = status.updatedAt?.toDate
        ? status.updatedAt.toDate()
        : new Date(status.updatedAt);
      if (Number.isNaN(updatedDate.getTime())) return 60;
      const diffMs = Date.now() - updatedDate.getTime();
      const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const remaining = 60 - elapsedDays;
      return remaining > 0 ? remaining : 0;
    } catch {
      return 60;
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newPasscode) {
      return setToast({ type: "error", message: "Please enter a PIN." });
    }
    if (newPasscode.length < 6) {
      return setToast({
        type: "error",
        message: "PIN must be at least 6 characters.",
      });
    }
    if (newPasscode !== confirmPasscode) {
      return setToast({ type: "error", message: "PINs do not match." });
    }

    try {
      setSaving(true);
      await setCrmPasscode(newPasscode);
      setNewPasscode("");
      setConfirmPasscode("");
      setToast({ type: "success", message: "Security PIN created successfully." });
      await loadStatus();
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to create PIN." });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!currentPasscode) {
      return setToast({ type: "error", message: "Please enter your current PIN." });
    }
    if (!newPasscode) {
      return setToast({ type: "error", message: "Please enter a new PIN." });
    }
    if (newPasscode.length < 6) {
      return setToast({
        type: "error",
        message: "New PIN must be at least 6 characters.",
      });
    }
    if (newPasscode !== confirmPasscode) {
      return setToast({ type: "error", message: "New PINs do not match." });
    }

    try {
      setSaving(true);
      await changeCrmPasscode({ currentPasscode, newPasscode });
      setCurrentPasscode("");
      setNewPasscode("");
      setConfirmPasscode("");
      setShowRecovery(false);
      setToast({ type: "success", message: "Security PIN updated successfully." });
      await loadStatus();
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to update PIN." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRecovery(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await requestCrmPasscodeReset(recoveryNote);
      setRecoveryRequested(true);
      setToast({ type: "success", message: "Reset request sent to administrators." });
      setRecoveryNote("");
    } catch (err) {
      setToast({ type: "error", message: err.message || "Request failed." });
    } finally {
      setSaving(false);
    }
  }

  const configured = Boolean(status?.configured);
  const remainingDays = getRemainingDays();

  return (
    <div className="flex h-full w-full flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      {/* -------------------------------------------------------------
          BACKGROUND SECURITY DOODLES (LOCKS, KEYS, SHIELDS)
      ------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        <div className="absolute -top-6 -left-6 text-slate-900/[0.035] rotate-[-12deg]">
          <Lock size={140} strokeWidth={1.2} />
        </div>
        <div className="absolute top-28 left-20 text-slate-900/[0.03] rotate-[28deg]">
          <KeyRound size={72} strokeWidth={1.3} />
        </div>
        <div className="absolute top-64 -left-8 text-slate-900/[0.025] rotate-[-22deg]">
          <ShieldCheck size={110} strokeWidth={1.2} />
        </div>

        <div className="absolute -top-10 -right-8 text-slate-900/[0.035] rotate-[18deg]">
          <KeyRound size={150} strokeWidth={1.2} />
        </div>
        <div className="absolute top-36 right-20 text-slate-900/[0.03] rotate-[-15deg]">
          <Fingerprint size={85} strokeWidth={1.2} />
        </div>
        <div className="absolute top-72 -right-6 text-slate-900/[0.025] rotate-[24deg]">
          <Lock size={120} strokeWidth={1.2} />
        </div>

        <div className="absolute bottom-16 left-12 text-slate-900/[0.03] rotate-[15deg]">
          <Fingerprint size={96} strokeWidth={1.2} />
        </div>
        <div className="absolute -bottom-10 -left-6 text-slate-900/[0.035] rotate-[-18deg]">
          <Lock size={130} strokeWidth={1.2} />
        </div>

        <div className="absolute bottom-24 right-16 text-slate-900/[0.03] rotate-[-25deg]">
          <ShieldCheck size={90} strokeWidth={1.2} />
        </div>
        <div className="absolute -bottom-12 -right-8 text-slate-900/[0.035] rotate-[32deg]">
          <KeyRound size={145} strokeWidth={1.2} />
        </div>

        <svg
          className="absolute top-1/4 left-1/4 h-24 w-24 text-slate-900/[0.02] -rotate-12"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="4 4"
        >
          <circle cx="50" cy="50" r="40" />
          <path d="M50 35v30M35 50h30" />
        </svg>

        <svg
          className="absolute bottom-1/4 right-1/4 h-28 w-28 text-slate-900/[0.02] rotate-45"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="6 6"
        >
          <circle cx="50" cy="50" r="42" />
          <circle cx="50" cy="40" r="8" />
          <path d="M46 48l-4 28h16l-4-28z" />
        </svg>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border px-3 py-2 shadow-sm text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={14} className="text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 text-slate-400 hover:text-slate-600"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 h-13 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight">
              Terminal Security PIN
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              Secondary authentication key for high-privilege operations
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider ${
            configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              configured ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {configured ? "Active" : "Not Set"}
        </span>
      </header>

      {/* Body Stage */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-8 flex items-center justify-center [&::-webkit-scrollbar]:hidden z-10">
        <div className="w-full max-w-sm space-y-3">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3.5">
            {/* Title & Policy Badge */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider">
                  {configured ? "Rotate Security PIN" : "Create Security PIN"}
                </h2>

                {/* 60-Day Policy Badge */}
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-600">
                  <Clock size={10} className="text-slate-500" />
                  <span>60-Day Cadence</span>
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {configured
                  ? "Authorize with your current PIN to configure a new 6+ character key."
                  : "Initialize a secure PIN with at least 6 characters to guard critical actions."}
              </p>
            </div>

            {/* Default 60-Day Expiry Notice */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-[11px] font-mono text-slate-700">
              <span className="text-slate-500">Expiration:</span>
              <span className="font-semibold text-slate-900">
                {configured ? `${remainingDays} days remaining` : "Default: 60 days"}
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs font-mono text-slate-500">
                <Loader2 size={16} className="animate-spin text-slate-700" />
                <span>Reading security state...</span>
              </div>
            ) : !configured ? (
              /* Create Form */
              <form onSubmit={handleCreate} className="space-y-3 pt-0.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    New PIN
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full h-8.5 rounded-lg border border-slate-200 bg-slate-50 px-3 pr-8 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-2 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Re-enter PIN"
                    className="w-full h-8.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-8.5 mt-1 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Security PIN</span>
                </button>
              </form>
            ) : (
              /* Update Form */
              <form onSubmit={handleUpdate} className="space-y-3 pt-0.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Current PIN
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPasscode}
                      onChange={(e) => setCurrentPasscode(e.target.value)}
                      placeholder="Enter active PIN"
                      className="w-full h-8.5 rounded-lg border border-slate-200 bg-slate-50 px-3 pr-8 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    New Replacement PIN
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full h-8.5 rounded-lg border border-slate-200 bg-slate-50 px-3 pr-8 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-2 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Confirm Replacement PIN
                  </label>
                  <input
                    type="password"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Re-enter new PIN"
                    className="w-full h-8.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-8.5 mt-1 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  <span>Rotate Security PIN</span>
                </button>
              </form>
            )}

            {/* Recovery Option */}
            {configured && (
              <div className="pt-2 border-t border-slate-100">
                {!showRecovery && !recoveryRequested && (
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Forgot active PIN?</span>
                    <button
                      type="button"
                      onClick={() => setShowRecovery(true)}
                      className="font-semibold text-slate-900 underline hover:text-black"
                    >
                      Request reset
                    </button>
                  </div>
                )}

                {showRecovery && !recoveryRequested && (
                  <form onSubmit={handleRecovery} className="space-y-2 pt-1">
                    <textarea
                      value={recoveryNote}
                      onChange={(e) => setRecoveryNote(e.target.value)}
                      rows={2}
                      placeholder="Reason for administrative reset..."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRecovery(false)}
                        className="flex-1 h-7 rounded border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 h-7 rounded bg-slate-900 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
                      >
                        Submit Request
                      </button>
                    </div>
                  </form>
                )}

                {recoveryRequested && (
                  <p className="text-center text-[11px] font-mono font-medium text-emerald-800 bg-emerald-50 py-1.5 rounded border border-emerald-200">
                    Reset request submitted for administrator review.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Dedicated Security Note */}
          <p className="text-center text-[10.5px] leading-relaxed text-slate-400 px-2 font-mono">
            Terminal security PINs are hashed on the dedicated tenant database container. Neither Abhinava administrative staff nor automated system logs ever record plain-text keys.
          </p>
        </div>
      </main>
    </div>
  );
}