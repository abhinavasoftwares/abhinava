import { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Building2,
  Users,
  Settings2,
} from "lucide-react";

import { getStrategiesForOperation } from "../calculations/strategies/registry";
import { useKareegarCalculationConfig } from "../hooks/useKareegarCalculationConfig";

// ============================================================================
// MICRO-COMPONENTS
// ============================================================================
function StrategySelect({ label, value, strategies, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
        {label}
      </label>
      <div className="relative">
        <select
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] px-4 py-3 text-sm font-semibold text-[#1B241E] outline-none transition focus:border-[#345343] focus:bg-white focus:ring-2 focus:ring-[#345343]/20"
        >
          {strategies.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.name}
            </option>
          ))}
        </select>
        {/* Custom Chevron for Select */}
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#87968C]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function KareegarCalculationSettingsPage() {
  const {
    config,
    loading,
    saving,
    error,
    saveError,
    saveConfig,
  } = useKareegarCalculationConfig();

  const [formConfig, setFormConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("b2b");
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle Save Errors from hook
  useEffect(() => {
    if (saveError) {
      setToast({ type: "error", message: saveError });
    }
  }, [saveError]);

  const b2bAssignmentStrategies = useMemo(() => getStrategiesForOperation("B2B", "ASSIGNMENT"), []);
  const b2bReturnStrategies = useMemo(() => getStrategiesForOperation("B2B", "RETURN"), []);
  const b2cAssignmentStrategies = useMemo(() => getStrategiesForOperation("B2C", "ASSIGNMENT"), []);
  const b2cReturnStrategies = useMemo(() => getStrategiesForOperation("B2C", "RETURN"), []);
  const b2cBalanceStrategies = useMemo(() => getStrategiesForOperation("B2C", "BALANCE"), []);

  // ---------------------------------------------------------
  // LOADING & ERROR STATES
  // ---------------------------------------------------------
  if (loading || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E8E4] bg-[#F5F7F5]/50 p-8 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#345343]" />
          <p className="mt-4 text-sm font-medium text-[#68786D]">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center">
          <AlertCircle className="h-10 w-10 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-rose-700">Unable to load settings</h2>
          <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // FORM UPDATE LOGIC
  // ---------------------------------------------------------
  const currentConfig = formConfig || config;
  const isDirty = formConfig !== null;

  const update = (section, field, value) => {
    setFormConfig((previous) => {
      const base = previous || config;
      return {
        ...base,
        [section]: {
          ...base[section],
          [field]: { ...base[section][field], ...value },
        },
      };
    });
  };

  const updateClosingTolerance = (value) => {
    setFormConfig((previous) => {
      const base = previous || config;
      return {
        ...base,
        b2b: {
          ...base.b2b,
          closing: {
            ...base.b2b.closing,
            weightTolerance: value === "" ? "" : Number(value),
          },
        },
      };
    });
  };

  const handleSave = async () => {
    try {
      await saveConfig(formConfig || config);
      setFormConfig(null);
      setToast({ type: "success", message: "Calculation settings saved successfully." });
    } catch (err) {
      setToast({ type: "error", message: "Failed to save settings." });
    }
  };

  return (
    <div className="relative flex h-full flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 bg-white lg:overflow-hidden min-h-0">
      
      {/* ===================================================
          TOAST NOTIFICATION
      ==================================================== */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* ===================================================
          LEFT COLUMN: Header & Tabs (Desktop)
      ==================================================== */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-6 lg:gap-8">
        <header>
          <div className="mb-2 flex items-center gap-2 text-[#345343]">
            <Settings2 size={18} />
            <h1 className="text-xl font-bold tracking-tight text-[#1B241E] sm:text-2xl">
              Calculations
            </h1>
          </div>
          <p className="text-xs font-medium text-[#68786D] leading-relaxed">
            Configure how Kareegar algorithms handle B2B and retail workflows.
          </p>
        </header>

        {/* Desktop Tabs (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col gap-2">
          <button
            onClick={() => setActiveTab("b2b")}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "b2b" ? "bg-[#F5F7F5] text-[#345343] border border-[#E2E8E4]" : "text-[#87968C] hover:bg-[#F5F7F5]/50 hover:text-[#1B241E] border border-transparent"
            }`}
          >
            <Building2 size={16} /> B2B Workflows
          </button>
          <button
            onClick={() => setActiveTab("b2c")}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "b2c" ? "bg-[#F5F7F5] text-[#345343] border border-[#E2E8E4]" : "text-[#87968C] hover:bg-[#F5F7F5]/50 hover:text-[#1B241E] border border-transparent"
            }`}
          >
            <Users size={16} /> B2C & Job Work
          </button>
        </div>
      </div>

      {/* ===================================================
          RIGHT COLUMN: Form Content & Sticky Save Bar
      ==================================================== */}
      <div className="flex-1 flex flex-col min-h-0 rounded-[2rem] border border-[#E2E8E4] bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] lg:overflow-hidden">
        
        {/* Form Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="mx-auto max-w-2xl flex flex-col gap-8">

            {/* B2B SECTION */}
            {/* Shows on Mobile ALWAYS. Shows on Desktop ONLY if activeTab === 'b2b' */}
            <div className={`flex-col gap-6 ${activeTab !== "b2b" ? "lg:hidden" : ""} flex`}>
              <div>
                <h2 className="text-base font-bold text-[#1B241E]">B2B Rules</h2>
                <p className="mt-1 text-xs font-medium text-[#68786D]">Configuration for bulk and business-to-business Kareegar assignments.</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <StrategySelect
                  label="Assignment Strategy"
                  value={currentConfig.b2b.assignment.strategyId}
                  strategies={b2bAssignmentStrategies}
                  onChange={(val) => update("b2b", "assignment", { strategyId: val })}
                />
                <StrategySelect
                  label="Return Strategy"
                  value={currentConfig.b2b.return.strategyId}
                  strategies={b2bReturnStrategies}
                  onChange={(val) => update("b2b", "return", { strategyId: val })}
                />

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
                    Closing Weight Tolerance
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="0.000"
                      value={currentConfig.b2b.closing.weightTolerance}
                      onChange={(e) => updateClosingTolerance(e.target.value)}
                      className="w-full max-w-[200px] rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] px-4 py-3 text-sm font-semibold text-[#1B241E] outline-none transition focus:border-[#345343] focus:bg-white focus:ring-2 focus:ring-[#345343]/20"
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#87968C]">grams</span>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-[#87968C]">Permitted fine gold variance during ledger closing.</p>
                </div>
              </div>
            </div>

            {/* Mobile Only Divider */}
            <div className="h-px w-full bg-[#E2E8E4] lg:hidden" />

            {/* B2C SECTION */}
            {/* Shows on Mobile ALWAYS. Shows on Desktop ONLY if activeTab === 'b2c' */}
            <div className={`flex-col gap-6 ${activeTab !== "b2c" ? "lg:hidden" : ""} flex`}>
              <div>
                <h2 className="text-base font-bold text-[#1B241E]">B2C & Job Work Rules</h2>
                <p className="mt-1 text-xs font-medium text-[#68786D]">Configuration for retail custom orders and direct client job work.</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <StrategySelect
                  label="Assignment Strategy"
                  value={currentConfig.b2c.assignment.strategyId}
                  strategies={b2cAssignmentStrategies}
                  onChange={(val) => update("b2c", "assignment", { strategyId: val })}
                />
                <StrategySelect
                  label="Return Strategy"
                  value={currentConfig.b2c.return.strategyId}
                  strategies={b2cReturnStrategies}
                  onChange={(val) => update("b2c", "return", { strategyId: val })}
                />
                <div className="md:col-span-2 md:max-w-[50%]">
                  <StrategySelect
                    label="Balance Strategy"
                    value={currentConfig.b2c.balance.strategyId}
                    strategies={b2cBalanceStrategies}
                    onChange={(val) => update("b2c", "balance", { strategyId: val })}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Sticky Save Footer */}
        <div className="shrink-0 border-t border-[#E2E8E4] bg-[#F5F7F5]/50 px-5 py-4 sm:px-8 sm:py-5 flex items-center justify-between">
          <div className="hidden sm:block">
            {isDirty ? (
              <p className="text-xs font-bold text-amber-600">Unsaved changes</p>
            ) : (
              <p className="text-xs font-bold text-[#87968C]">All systems up to date</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold transition-all shadow-sm ${
              isDirty && !saving
                ? "bg-[#345343] text-white hover:bg-[#1B241E] hover:shadow-md"
                : "bg-white border border-[#E2E8E4] text-[#87968C] cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>

      </div>
    </div>
  );
}