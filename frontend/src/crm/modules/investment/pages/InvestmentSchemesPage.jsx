import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Save,
  X,
  Download,
  Wallet,
  CalendarDays,
  Percent,
  Activity,
  Search
} from "lucide-react";

import { useInvestmentSchemes } from "../hooks/useInvestmentSchemes";

import {
  createInvestmentScheme,
  updateInvestmentScheme,
} from "../services/investmentSchemes";

const INITIAL_FORM = {
  schemeCode: "",
  schemeName: "",
  schemeType: "FIXED_INSTALLMENT",
  durationMonths: "12",
  paymentFrequency: "MONTHLY",
  installmentType: "FIXED",
  installmentAmount: "",
  benefitType: "NONE",
  benefitValue: "",
  interestStrategyId: "STANDARD_INTEREST_V1",
  annualRate: "0",
  calculationMethod: "SIMPLE",
  compoundingFrequency: "NONE",
  dayCountConvention: "ACTUAL_365",
  roundingScale: "2",
  calculationStrategyId: "FIXED_INSTALLMENT_V1",
  accountPrefix: "INV",
  accountPadding: "3",
};

// ============================================================
// UI COMPONENTS (MODAL FORM FIELDS)
// ============================================================
function InputField({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false, unit = "" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex overflow-hidden rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] transition-all focus-within:border-[#345343] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#345343]/20 shadow-sm">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent px-4 py-3 text-sm font-bold text-[#1B241E] outline-none placeholder:text-[#A3B0AA] placeholder:font-semibold disabled:opacity-60"
        />
        {unit && (
          <span className="flex items-center border-l border-[#E2E8E4] bg-white/50 px-4 text-xs font-bold text-[#68786D]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, name, value, onChange, children, required = false, disabled = false }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] px-4 py-3 pr-10 text-sm font-bold text-[#1B241E] outline-none transition-all focus:border-[#345343] focus:bg-white focus:ring-2 focus:ring-[#345343]/20 shadow-sm disabled:opacity-60"
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#87968C]" />
      </div>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-[#E2E8E4] bg-white p-5 sm:p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)]">
      <div className="mb-5 border-b border-[#E2E8E4]/70 pb-4">
        <h3 className="text-sm font-bold text-[#1B241E]">{title}</h3>
        {description && <p className="mt-1 text-xs font-medium text-[#68786D]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// ============================================================
// STATUS & TYPE BADGES
// ============================================================
function StatusBadge({ status }) {
  const isActive = status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
      isActive ? "border-emerald-200/60 bg-emerald-50 text-emerald-700" : "border-rose-200/60 bg-rose-50 text-rose-700"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function TypeBadge({ type }) {
  const isGoldSip = type === "GOLD_SIP";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
      isGoldSip ? "bg-amber-50 text-amber-700 border border-amber-200/50" : "bg-blue-50 text-blue-700 border border-blue-200/50"
    }`}>
      {isGoldSip ? "Gold SIP" : "Fixed Installment"}
    </span>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function InvestmentSchemesPage() {
 const {
  schemes,
  loading,
  error: schemesError,
} = useInvestmentSchemes();
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");



  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  

  function openCreate() {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
    setModalOpen(true);
  }

  function openEdit(scheme) {
    setEditingId(scheme.id);
    setFormData({
      schemeCode: scheme.schemeCode || "",
      schemeName: scheme.schemeName || "",
      schemeType: scheme.schemeType || "FIXED_INSTALLMENT",
      durationMonths: String(scheme.durationMonths || 12),
      paymentFrequency: scheme.paymentFrequency || "MONTHLY",
      installmentType: scheme.installmentConfig?.type || "FIXED",
      installmentAmount: scheme.installmentConfig?.amount != null ? String(scheme.installmentConfig.amount) : "",
      benefitType: scheme.benefitConfig?.type || "NONE",
      benefitValue: scheme.benefitConfig?.value != null ? String(scheme.benefitConfig.value) : "",
      interestStrategyId: scheme.interestConfig?.strategyId || "STANDARD_INTEREST_V1",
      annualRate: scheme.interestConfig?.annualRate != null ? String(scheme.interestConfig.annualRate) : "0",
      calculationMethod: scheme.interestConfig?.calculationMethod || "SIMPLE",
      compoundingFrequency: scheme.interestConfig?.compoundingFrequency || "NONE",
      dayCountConvention: scheme.interestConfig?.dayCountConvention || "ACTUAL_365",
      roundingScale: scheme.interestConfig?.roundingScale != null ? String(scheme.interestConfig.roundingScale) : "2",
      calculationStrategyId: scheme.calculationStrategyId || "FIXED_INSTALLMENT_V1",
      accountPrefix: scheme.accountNumberConfig?.prefix || "INV",
      accountPadding: scheme.accountNumberConfig?.padding != null ? String(scheme.accountNumberConfig.padding) : "3",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function buildPayload() {
    const schemeType = formData.schemeType;
    return {
      schemeCode: formData.schemeCode.trim().toUpperCase(),
      schemeName: formData.schemeName.trim(),
      schemeType,
      durationMonths: Number(formData.durationMonths),
      paymentFrequency: formData.paymentFrequency,
      installmentConfig: { type: formData.installmentType, amount: Number(formData.installmentAmount || 0) },
      benefitConfig: formData.benefitType === "NONE" ? { type: "NONE", value: 0 } : { type: formData.benefitType, value: Number(formData.benefitValue || 0) },
      interestConfig: {
        strategyId: formData.interestStrategyId,
        annualRate: Number(formData.annualRate || 0),
        calculationMethod: formData.calculationMethod,
        compoundingFrequency: formData.compoundingFrequency,
        dayCountConvention: formData.dayCountConvention,
        roundingScale: Number(formData.roundingScale || 2),
      },
      calculationStrategyId: schemeType === "GOLD_SIP" ? "GOLD_SIP_V1" : "FIXED_INSTALLMENT_V1",
      calculationVersion: 1,
      accountNumberConfig: { prefix: formData.accountPrefix.trim().toUpperCase(), padding: Number(formData.accountPadding || 3) },
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    try {
      const payload = buildPayload();
      if (!payload.schemeCode) throw new Error("Scheme code is required.");
      if (!payload.schemeName) throw new Error("Scheme name is required.");
      if (!Number.isFinite(payload.durationMonths) || payload.durationMonths <= 0) throw new Error("Duration must be greater than zero.");
      if (!Number.isFinite(payload.interestConfig.annualRate) || payload.interestConfig.annualRate < 0) throw new Error("Interest rate cannot be negative.");
      if (!payload.accountNumberConfig.prefix) throw new Error("Account number prefix is required.");
      if (!/^[A-Z0-9_-]{1,20}$/.test(payload.accountNumberConfig.prefix)) {
        throw new Error("Account number prefix may contain only letters, numbers, hyphens, and underscores.");
      }
      if (!Number.isInteger(payload.accountNumberConfig.padding) || payload.accountNumberConfig.padding < 3 || payload.accountNumberConfig.padding > 10) {
        throw new Error("Account number padding must be between 3 and 10 digits.");
      }

      setSaving(true);
      if (editingId) {
        await updateInvestmentScheme(editingId, payload);
        setToast({ type: "success", message: "Investment scheme updated." });
      } else {
        await createInvestmentScheme({
          ...payload,
          nextAccountNumber: 1,
        });
        setToast({ type: "success", message: "Investment scheme created." });
      }
      closeModal();
    } catch (error) {
      console.error("Failed to save scheme:", error);
      setToast({ type: "error", message: error.message || "Failed to save investment scheme." });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(scheme) {
    try {
        await updateInvestmentScheme(
        scheme.id,
        {
            status:
            scheme.status === "ACTIVE"
                ? "INACTIVE"
                : "ACTIVE",
        }
        );

        setToast({
        type: "success",
        message:
            scheme.status === "ACTIVE"
            ? "Scheme deactivated."
            : "Scheme activated.",
        });
    } catch (error) {
        console.error(
        "Failed to toggle status:",
        error
        );

        setToast({
        type: "error",
        message:
            error.message ||
            "Failed to update scheme status.",
        });
    }
    }

  // ==========================================================
  // DATA PREPARATION
  // ==========================================================
  const filteredSchemes = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return schemes.filter((scheme) => {
      const matchesSearch = !searchValue || scheme.schemeName?.toLowerCase().includes(searchValue) || scheme.schemeCode?.toLowerCase().includes(searchValue);
      const matchesStatus = statusFilter === "ALL" || scheme.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schemes, search, statusFilter]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Scheme Code,Scheme Name,Type,Duration (Months),Frequency,Installment Type,Amount/Rate,Status\n";
    filteredSchemes.forEach(scheme => {
      const installmentVal = scheme.installmentConfig?.type === "FIXED" ? scheme.installmentConfig.amount : "Variable";
      csvContent += `${scheme.schemeCode},${scheme.schemeName},${scheme.schemeType},${scheme.durationMonths},${scheme.paymentFrequency},${scheme.installmentConfig?.type},${installmentVal},${scheme.status}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Investment_Schemes_${new Date().toLocaleDateString('en-IN')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full flex-col bg-[#F5F7F5] lg:bg-white p-3 lg:p-4 lg:overflow-hidden min-h-0">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col min-h-0 animate-in fade-in duration-300">
        
        {/* ======================================================
            TOAST NOTIFICATION
        ====================================================== */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-3 rounded-2xl border px-5 py-4 shadow-xl animate-in slide-in-from-bottom-6 duration-300 ${
            toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}>
            {toast.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
          </div>
        )}

        {schemesError && (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
            <AlertCircle size={15} />
            <span>{schemesError}</span>
        </div>
        )}

        {/* ======================================================
            COMPACT HEADER & CONTROL STRIP
        ====================================================== */}
        <div className="shrink-0 flex flex-col gap-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8E4]/60 pb-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[#345343]">
                <Wallet size={16} strokeWidth={2.5} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Configuration</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#1B241E] sm:text-2xl">Investment Schemes</h1>
              <p className="mt-1 text-xs font-medium text-[#68786D]">Create and manage client-specific gold and cash schemes.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExportCSV} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E2E8E4] bg-white px-4 text-xs font-bold text-[#345343] shadow-sm transition-colors hover:bg-[#F5F7F5] w-full sm:w-auto">
                <Download size={14} /> Export CSV
              </button>
              <button onClick={openCreate} className="flex h-9 items-center justify-center gap-2 rounded-lg bg-[#345343] px-5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1B241E] w-full sm:w-auto">
                <Plus size={14} strokeWidth={2.5} /> Create Scheme
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 sm:max-w-md items-center gap-2">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87968C]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code or name..."
                  className="w-full rounded-lg border border-[#E2E8E4] bg-white py-2 pl-9 pr-3 text-xs font-semibold text-[#1B241E] outline-none shadow-sm focus:border-[#345343] focus:ring-1 focus:ring-[#345343] placeholder:text-[#A3B0AA]"
                />
              </div>
              <div className="relative shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-[#E2E8E4] bg-white py-2 pl-3 pr-8 text-xs font-bold text-[#1B241E] outline-none shadow-sm focus:border-[#345343] focus:ring-1 focus:ring-[#345343]"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#87968C]" />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================
            MAIN DATA RENDER (Table ~70vh Desktop, Cards Mobile)
        ====================================================== */}
        <div className="flex-1 min-h-[60vh] flex flex-col overflow-hidden rounded-[1.5rem] bg-transparent lg:bg-white lg:border lg:border-[#E2E8E4] lg:shadow-sm">
          {loading ? (
            <div className="flex h-full items-center justify-center bg-white/50">
              <Loader2 size={32} className="animate-spin text-[#345343]" />
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-[#E2E8E4] rounded-[1.5rem]">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F7F5] text-[#87968C]">
                <Activity size={24} />
              </div>
              <h2 className="text-base font-bold text-[#1B241E]">No Schemes Found</h2>
              <p className="mt-1.5 max-w-sm text-xs font-medium text-[#68786D]">No investment schemes match your current search or filter criteria.</p>
              {!search && statusFilter === "ALL" && (
                <button onClick={openCreate} className="mt-5 rounded-lg bg-[#345343] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1B241E] shadow-sm">
                  Create First Scheme
                </button>
              )}
            </div>
          ) : (
            <>
              {/* --- DESKTOP TABLE --- */}
              <div className="hidden lg:flex flex-col h-full overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#F5F7F5] border-b border-[#E2E8E4] shadow-sm">
                    <tr>
                      <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Scheme Details</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Configuration</th>
                      <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Financials</th>
                      <th className="px-6 py-3.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Status</th>
                      <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="overflow-y-auto divide-y divide-[#E2E8E4]/60 [&::-webkit-scrollbar]:hidden">
                    {filteredSchemes.map((scheme) => (
                      <tr key={scheme.id} className="hover:bg-[#F5F7F5]/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-bold text-[#1B241E]">{scheme.schemeName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded bg-[#F5F7F5] px-1.5 py-0.5 text-[10px] font-bold text-[#345343] border border-[#E2E8E4]">{scheme.schemeCode}</span>
                            <TypeBadge type={scheme.schemeType} />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="flex items-center gap-1.5 text-xs font-bold text-[#1B241E]"><CalendarDays size={14} className="text-[#87968C]"/> {scheme.durationMonths} Months</p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#87968C]">{scheme.paymentFrequency} INSTALLMENTS</p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <p className="text-sm font-black text-[#1B241E]">
                            {scheme.installmentConfig?.type === "FIXED" ? `₹${Number(scheme.installmentConfig?.amount).toLocaleString("en-IN")}` : "Variable"}
                          </p>
                          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] font-bold tracking-wider text-[#345343]">
                            <Percent size={10} /> {Number(scheme.interestConfig?.annualRate || 0).toFixed(2)}% ({scheme.interestConfig?.calculationMethod})
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <StatusBadge status={scheme.status} />
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(scheme)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8E4] bg-white text-[#345343] transition-colors hover:bg-[#F5F7F5] shadow-sm">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleToggleStatus(scheme)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8E4] bg-white text-[#87968C] transition-colors hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm">
                              <Power size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- MOBILE CARDS --- */}
              <div className="flex lg:hidden flex-col gap-4 overflow-y-auto pb-6 [&::-webkit-scrollbar]:hidden">
                {filteredSchemes.map((scheme) => (
                  <div key={scheme.id} className="rounded-2xl border border-[#E2E8E4] bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between border-b border-[#E2E8E4]/60 pb-3 mb-3">
                      <div>
                        <p className="text-sm font-bold text-[#1B241E]">{scheme.schemeName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-[#F5F7F5] px-1.5 py-0.5 text-[10px] font-bold text-[#345343] border border-[#E2E8E4]">{scheme.schemeCode}</span>
                          <TypeBadge type={scheme.schemeType} />
                        </div>
                      </div>
                      <StatusBadge status={scheme.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl bg-[#F5F7F5] p-2.5 border border-[#E2E8E4]/40">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Duration</p>
                        <p className="mt-0.5 text-xs font-black text-[#1B241E]">{scheme.durationMonths} Months <span className="text-[10px] font-semibold text-[#68786D] block">{scheme.paymentFrequency}</span></p>
                      </div>
                      <div className="rounded-xl bg-[#F5F7F5] p-2.5 border border-[#E2E8E4]/40 text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Installment</p>
                        <p className="mt-0.5 text-xs font-black text-[#1B241E]">{scheme.installmentConfig?.type === "FIXED" ? `₹${Number(scheme.installmentConfig?.amount).toLocaleString("en-IN")}` : "Variable"}</p>
                        <p className="text-[10px] font-bold text-[#345343]">{Number(scheme.interestConfig?.annualRate || 0).toFixed(1)}% Interest</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(scheme)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8E4] bg-white px-3 py-2 text-xs font-bold text-[#345343] shadow-sm active:bg-[#F5F7F5]">
                        <Edit3 size={14} /> Edit
                      </button>
                      <button onClick={() => handleToggleStatus(scheme)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8E4] bg-white px-3 py-2 text-xs font-bold text-[#68786D] shadow-sm active:bg-rose-50 active:text-rose-600">
                        <Power size={14} /> {scheme.status === "ACTIVE" ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          CREATE / EDIT MODAL (Premium Glass UI)
      ====================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B241E]/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="flex shrink-0 items-center justify-between border-b border-[#E2E8E4] bg-[#F5F7F5]/50 px-6 py-5 sm:px-8">
              <div>
                <h2 className="text-lg font-bold text-[#1B241E]">
                  {editingId ? "Edit Investment Scheme" : "Create Investment Scheme"}
                </h2>
                <p className="mt-1 text-xs font-medium text-[#68786D]">
                  Configure contribution, interest, and account numbering rules.
                </p>
              </div>
              <button onClick={closeModal} disabled={saving} className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[#87968C] transition hover:border-[#E2E8E4] hover:bg-white hover:text-[#1B241E]">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden">
                <div className="grid gap-6 lg:grid-cols-2">

                  <Section title="Basic Information" description="Identity and overarching structure of the scheme.">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <InputField label="Scheme Code" name="schemeCode" value={formData.schemeCode} onChange={handleChange} placeholder="e.g. GLD12" required disabled={Boolean(editingId)} />
                      <InputField label="Scheme Name" name="schemeName" value={formData.schemeName} onChange={handleChange} placeholder="e.g. 11+1 Gold Savings" required disabled={saving} />
                      <SelectField label="Scheme Type" name="schemeType" value={formData.schemeType} onChange={handleChange} required disabled={saving}>
                        <option value="FIXED_INSTALLMENT">Fixed Installment</option>
                        <option value="GOLD_SIP">Gold SIP</option>
                      </SelectField>
                      <SelectField label="Payment Frequency" name="paymentFrequency" value={formData.paymentFrequency} onChange={handleChange} disabled={saving}>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                      </SelectField>
                      <div className="sm:col-span-2">
                        <InputField label="Duration" name="durationMonths" value={formData.durationMonths} onChange={handleChange} type="number" unit="Months" required disabled={saving} />
                      </div>
                    </div>
                  </Section>

                  <Section title="Installment Rules" description="Configure the required contribution amount.">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <SelectField label="Installment Type" name="installmentType" value={formData.installmentType} onChange={handleChange} disabled={saving}>
                        <option value="FIXED">Fixed Amount</option>
                        <option value="VARIABLE">Variable Amount</option>
                      </SelectField>
                      <InputField label="Installment Amount" name="installmentAmount" value={formData.installmentAmount} onChange={handleChange} type="number" unit="₹" placeholder="e.g. 5000" disabled={saving || formData.installmentType === "VARIABLE"} />
                    </div>
                  </Section>

                  <Section title="Interest Configuration" description="Calculation policy for returns or maturity value.">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <InputField label="Annual Interest Rate" name="annualRate" value={formData.annualRate} onChange={handleChange} type="number" unit="%" required disabled={saving} />
                      <SelectField label="Calculation Method" name="calculationMethod" value={formData.calculationMethod} onChange={handleChange} disabled={saving}>
                        <option value="SIMPLE">Simple Interest</option>
                        <option value="COMPOUND">Compound Interest</option>
                      </SelectField>
                      <SelectField label="Compounding" name="compoundingFrequency" value={formData.compoundingFrequency} onChange={handleChange} disabled={saving || formData.calculationMethod !== "COMPOUND"}>
                        <option value="NONE">None</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="YEARLY">Yearly</option>
                      </SelectField>
                      <SelectField label="Day Count" name="dayCountConvention" value={formData.dayCountConvention} onChange={handleChange} disabled={saving}>
                        <option value="ACTUAL_365">Actual / 365</option>
                        <option value="ACTUAL_360">Actual / 360</option>
                        <option value="ACTUAL_366">Actual / 366</option>
                      </SelectField>
                    </div>
                  </Section>

                  <Section title="Account Number Generation" description="Define the account number theme used for enrolled investment accounts.">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <InputField label="Account Number Theme" name="accountPrefix" value={formData.accountPrefix} onChange={handleChange} placeholder="e.g. INV" required disabled={saving} />
                      <InputField label="Number Padding" name="accountPadding" value={formData.accountPadding} onChange={handleChange} type="number" placeholder="e.g. 3" required disabled={saving} />
                      <div className="sm:col-span-2 mt-2 rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] p-4 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Account Generation Example</p>
                        <p className="mt-1 text-lg font-black tracking-widest text-[#345343]">{formData.accountPrefix || "INV"}-{String(1).padStart(Number(formData.accountPadding || 3), "0")}</p>
                      </div>
                    </div>
                  </Section>

                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#E2E8E4] bg-[#F5F7F5]/50 px-6 py-5 sm:px-8">
                <button type="button" onClick={closeModal} disabled={saving} className="rounded-xl border border-[#E2E8E4] bg-white px-6 py-3 text-xs font-bold text-[#68786D] transition hover:bg-[#F5F7F5] hover:text-[#1B241E] shadow-sm disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#345343] px-8 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1B241E] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> {editingId ? "Save Changes" : "Create Scheme"}</>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}