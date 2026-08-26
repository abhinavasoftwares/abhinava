import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit3,
  Loader2,
  Plus,
  Power,
  Save,
  X,
  Download,
  Search,
  Settings2,
  Activity,
  Wallet,
  Percent,
  CalendarDays
} from "lucide-react";
import { useInvestmentSchemes } from "../hooks/useInvestmentSchemes";
import { createInvestmentScheme, updateInvestmentScheme } from "../services/investmentSchemes";

// ============================================================
// CONSTANTS & INITIAL STATE
// ============================================================
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
  interestEnabled: false,
  interestStrategyId: "STANDARD_INTEREST_V1",
  annualRate: "",
  calculationMethod: "SIMPLE",
  compoundingFrequency: "NONE",
  dayCountConvention: "ACTUAL_365",
  roundingScale: "2",
  accountPrefix: "INV",
  accountPadding: "3",
};

const ITEMS_PER_PAGE = 15;

// ============================================================
// UI COMPONENTS
// ============================================================
function InputField({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false, unit = "" }) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F9FAFB] transition-all focus-within:border-[#166534] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#166534] shadow-sm disabled:opacity-60">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent px-3 py-2 text-xs font-semibold text-[#111827] outline-none placeholder:text-[#9CA3AF] disabled:cursor-not-allowed"
        />
        {unit && <span className="flex items-center border-l border-[#E5E7EB] bg-white px-3 text-xs font-bold text-[#6B7280]">{unit}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, name, value, onChange, children, required = false, disabled = false }) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 pr-8 text-xs font-semibold text-[#111827] outline-none transition-all focus:border-[#166534] focus:bg-white focus:ring-1 focus:ring-[#166534] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {children}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
      isActive ? "border-emerald-200/50 bg-emerald-50 text-emerald-700" : "border-rose-200/50 bg-rose-50 text-rose-700"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function TypeBadge({ type }) {
  const isGoldSip = type === "GOLD_SIP";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
      isGoldSip ? "border-amber-200/50 bg-amber-50 text-amber-700" : "border-[#E5E7EB] bg-white text-[#374151]"
    }`}>
      {isGoldSip ? "Gold SIP" : "Fixed Installment"}
    </span>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function InvestmentSchemesPage() {
  const { schemes, loading, error: schemesError } = useInvestmentSchemes();

  // Form & Modal States
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [toast, setToast] = useState(null);

  const isGoldSip =
    formData.schemeType === "GOLD_SIP";

  // Filters & Sort States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ==========================================================
  // DATA PIPELINE (Filter -> Sort -> Paginate)
  // ==========================================================
  const processedSchemes = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    // 1. Filter
    let filtered = schemes.filter((scheme) => {
      const matchesSearch = !searchValue || 
        String(scheme.schemeName || "").toLowerCase().includes(searchValue) || 
        String(scheme.schemeCode || "").toLowerCase().includes(searchValue);
      const matchesStatus = statusFilter === "ALL" || scheme.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      let valA, valB;
      switch (sortConfig.key) {
        case "schemeName":
          valA = String(a.schemeName || "").toLowerCase();
          valB = String(b.schemeName || "").toLowerCase();
          break;
        case "schemeType":
          valA = String(a.schemeType || "").toLowerCase();
          valB = String(b.schemeType || "").toLowerCase();
          break;
        case "minimum":
          valA = Number(a.installmentConfig?.amount || 0);
          valB = Number(b.installmentConfig?.amount || 0);
          break;
        case "createdAt":
        default:
          valA = a.createdAt?.seconds || 0;
          valB = b.createdAt?.seconds || 0;
          break;
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [schemes, search, statusFilter, sortConfig]);

  // 3. Paginate
  const totalPages = Math.ceil(processedSchemes.length / ITEMS_PER_PAGE);
  const paginatedSchemes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedSchemes.slice(start, start + ITEMS_PER_PAGE);
  }, [processedSchemes, currentPage]);

  useEffect(() => setCurrentPage(1), [search, statusFilter]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ChevronsUpDown size={12} className="opacity-30" />;
    return sortConfig.direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // ==========================================================
  // MODAL HANDLERS
  // ==========================================================
  function openCreate() {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
    setModalOpen(true);
  }

  function openEdit(scheme) {
    const isGoldSip = scheme.schemeType === "GOLD_SIP";
    setEditingId(scheme.id);
    setFormData({
      schemeCode: scheme.schemeCode || "",
      schemeName: scheme.schemeName || "",
      schemeType: scheme.schemeType || "FIXED_INSTALLMENT",
      durationMonths: scheme.durationMonths != null ? String(scheme.durationMonths) : isGoldSip ? "" : "12",
      paymentFrequency: scheme.paymentFrequency || "MONTHLY",
      installmentType: scheme.installmentConfig?.type || "FIXED",
      installmentAmount: scheme.installmentConfig?.amount != null ? String(scheme.installmentConfig.amount) : "",
      benefitType: scheme.benefitConfig?.type || "NONE",
      benefitValue: scheme.benefitConfig?.value != null ? String(scheme.benefitConfig.value) : "",
      interestEnabled: scheme.interestConfig?.enabled === true,
      interestStrategyId: scheme.interestConfig?.strategyId || "STANDARD_INTEREST_V1",
      annualRate: scheme.interestConfig?.annualRate != null ? String(scheme.interestConfig.annualRate) : "",
      calculationMethod: scheme.interestConfig?.calculationMethod || "SIMPLE",
      compoundingFrequency: scheme.interestConfig?.compoundingFrequency || "NONE",
      dayCountConvention: scheme.interestConfig?.dayCountConvention || "ACTUAL_365",
      roundingScale: scheme.interestConfig?.roundingScale != null ? String(scheme.interestConfig.roundingScale) : "2",
      accountPrefix: scheme.accountNumberConfig?.prefix || "INV",
      accountPadding: scheme.accountNumberConfig?.padding != null ? String(scheme.accountNumberConfig.padding) : "3",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setFormData({ ...INITIAL_FORM });
    }, 200);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setFormData((current) => {
      const next = { ...current, [name]: type === "checkbox" ? checked : value };
      if (name === "schemeType" && value === "GOLD_SIP") {
        next.durationMonths = "";
        next.paymentFrequency = "MONTHLY";
        next.installmentType = "FIXED";
      }
      if (name === "schemeType" && value === "FIXED_INSTALLMENT") {
        if (!next.durationMonths) next.durationMonths = "12";
        if (!next.paymentFrequency) next.paymentFrequency = "MONTHLY";
      }
      if (name === "interestEnabled" && !checked) {
        next.annualRate = "";
      }
      return next;
    });
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================
  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    try {
      const isGoldSip = formData.schemeType === "GOLD_SIP";
      const installmentAmount = Number(formData.installmentAmount || 0);
      const durationMonths = isGoldSip ? null : Number(formData.durationMonths);
      const schemeCode = formData.schemeCode.trim().toUpperCase();
      const schemeName = formData.schemeName.trim();

      if (!schemeCode) throw new Error("Scheme code is required.");
      if (!schemeName) throw new Error("Scheme name is required.");
      if (!isGoldSip && (!Number.isFinite(durationMonths) || durationMonths <= 0)) throw new Error("Duration must be > 0.");
      if (formData.installmentType !== "VARIABLE" && (!Number.isFinite(installmentAmount) || installmentAmount <= 0)) {
        throw new Error(isGoldSip ? "Minimum gold contribution must be > 0g." : "Minimum contribution amount must be > 0.");
      }
      if (formData.interestEnabled && (!Number.isFinite(Number(formData.annualRate)) || Number(formData.annualRate) < 0)) {
        throw new Error("Enter a valid interest rate.");
      }
      const accountPrefix = formData.accountPrefix.trim().toUpperCase();
      if (!accountPrefix || !/^[A-Z0-9_-]{1,20}$/i.test(accountPrefix)) throw new Error("Invalid account prefix.");
      const accountPadding = Number(formData.accountPadding);
      if (!Number.isInteger(accountPadding) || accountPadding < 3 || accountPadding > 10) throw new Error("Account padding must be between 3 and 10.");

      setSaving(true);

      const payload = {
        schemeCode, schemeName, schemeType: formData.schemeType, durationMonths,
        paymentFrequency: isGoldSip ? "MONTHLY" : formData.paymentFrequency,
        installmentConfig: { type: formData.installmentType, unit: isGoldSip ? "GOLD_GRAMS" : "AMOUNT", amount: installmentAmount },
        benefitConfig: formData.benefitType === "NONE" ? { type: "NONE", value: 0 } : { type: formData.benefitType, value: Number(formData.benefitValue || 0) },
        interestConfig: formData.interestEnabled ? {
          enabled: true, strategyId: formData.interestStrategyId, annualRate: Number(formData.annualRate || 0),
          calculationMethod: formData.calculationMethod, compoundingFrequency: formData.compoundingFrequency,
          dayCountConvention: formData.dayCountConvention, roundingScale: Number(formData.roundingScale || 2),
        } : { enabled: false },
        calculationStrategyId: isGoldSip ? "GOLD_SIP_V1" : "FIXED_INSTALLMENT_V1",
        calculationVersion: 1,
        accountNumberConfig: { prefix: accountPrefix, padding: accountPadding },
      };

      if (editingId) {
        await updateInvestmentScheme(editingId, payload);
        setToast({ type: "success", message: "Scheme updated successfully." });
      } else {
        await createInvestmentScheme({ ...payload, nextAccountNumber: 1 });
        setToast({ type: "success", message: isGoldSip ? "Gold SIP scheme created." : "Investment scheme created." });
      }
      closeModal();
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: error.message || "Failed to save scheme." });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(scheme) {
    try {
      const nextStatus = scheme.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await updateInvestmentScheme(scheme.id, { status: nextStatus });
      setToast({ type: "success", message: nextStatus === "ACTIVE" ? "Scheme activated." : "Scheme deactivated." });
    } catch (error) {
      setToast({ type: "error", message: "Failed to update status." });
    }
  }

  function handleExportCSV() {
    let csv = "data:text/csv;charset=utf-8,Scheme Code,Scheme Name,Type,Duration,Frequency,Unit,Minimum,Interest Enabled,Interest Rate,Status\n";
    processedSchemes.forEach((scheme) => {
      const isGold = scheme.schemeType === "GOLD_SIP";
      const unit = scheme.installmentConfig?.unit || (isGold ? "GOLD_GRAMS" : "AMOUNT");
      const minimum = scheme.installmentConfig?.amount || 0;
      const duration = isGold ? "OPEN_ENDED" : scheme.durationMonths || "";
      const interestEnabled = scheme.interestConfig?.enabled === true;
      const interestRate = interestEnabled ? Number(scheme.interestConfig?.annualRate || 0) : "";
      csv += `"${scheme.schemeCode || ""}","${scheme.schemeName || ""}","${scheme.schemeType || ""}","${duration}","${scheme.paymentFrequency || ""}","${unit}","${minimum}","${interestEnabled ? "YES" : "NO"}","${interestRate}","${scheme.status || ""}"\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Schemes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="flex h-full flex-col bg-[#F9FAFB] p-2 sm:p-4 overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-hidden bg-white lg:border lg:border-[#E5E7EB] rounded-2xl lg:shadow-sm">

        {/* TOAST */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[70] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-xl animate-in slide-in-from-bottom-6 duration-300 ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        )}

        {/* ==================================================
            ULTRA-COMPACT TOOLBAR
        ================================================== */}
        <div className="shrink-0 mb-3 flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]">
                <Settings2 size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-[#111827]">Scheme Manager</h1>
                <p className="text-[10px] font-medium text-[#6B7280]">Configure investment and SIP plans</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schemes..." className="w-full rounded-md bg-[#F9FAFB] py-1.5 pl-8 pr-3 text-xs font-medium border border-[#E5E7EB] outline-none focus:border-[#166534] focus:bg-white transition-colors" />
              </div>
              <div className="relative shrink-0">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none rounded-md bg-[#F9FAFB] border border-[#E5E7EB] py-1.5 pl-3 pr-7 text-[10px] font-bold uppercase tracking-wider text-[#4B5563] outline-none focus:border-[#166534] transition-colors">
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
              <button onClick={handleExportCSV} className="flex h-[30px] items-center justify-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 text-[11px] font-bold text-[#374151] hover:bg-[#F9FAFB] transition-colors shadow-sm">
                <Download size={12} /> <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={openCreate} className="flex h-[30px] items-center justify-center gap-1.5 rounded-md bg-[#166534] px-4 text-[11px] font-bold text-white hover:bg-[#14532D] shadow-sm transition-colors">
                <Plus size={12} strokeWidth={2.5} /> <span className="hidden sm:inline">New Scheme</span>
              </button>
            </div>
          </div>
          
          {schemesError && (
            <div className="mt-1 flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700">
              <AlertCircle size={12} /> {schemesError}
            </div>
          )}
        </div>

        {/* ==================================================
            DATA TABLE & CARDS
        ================================================== */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#166534]" />
            </div>
          ) : processedSchemes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 bg-[#F9FAFB]">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-[#E5E7EB] text-[#9CA3AF]">
                <Activity size={20} />
              </div>
              <h2 className="text-sm font-bold text-[#111827]">No Schemes Found</h2>
              <p className="mt-1 max-w-xs text-xs text-[#6B7280]">Adjust filters or create a new scheme.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                          <button onClick={() => requestSort("schemeName")} className="flex items-center gap-1.5 hover:text-[#111827]">
                            Scheme <SortIcon columnKey="schemeName" />
                          </button>
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Configuration</th>
                        <th className="px-5 py-3 text-right">
                          <button onClick={() => requestSort("minimum")} className="flex w-full justify-end items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#111827]">
                            Rules & Limits <SortIcon columnKey="minimum" />
                          </button>
                        </th>
                        <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Status</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {paginatedSchemes.map((scheme) => {
                        const isGold = scheme.schemeType === "GOLD_SIP";
                        const unit = scheme.installmentConfig?.unit || (isGold ? "GOLD_GRAMS" : "AMOUNT");
                        const contribution = Number(scheme.installmentConfig?.amount || 0);
                        const interestEnabled = scheme.interestConfig?.enabled === true;
                        
                        return (
                          <tr key={scheme.id} className="group hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-5 py-3 whitespace-nowrap">
                              <p className="text-sm font-bold text-[#111827]">{scheme.schemeName}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="rounded bg-white border border-[#E5E7EB] px-1.5 py-0.5 text-[9px] font-bold text-[#4B5563] shadow-sm">{scheme.schemeCode}</span>
                                <TypeBadge type={scheme.schemeType} />
                              </div>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <p className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                                <CalendarDays size={12} className="text-[#9CA3AF]" />
                                {isGold ? "Open-ended" : `${scheme.durationMonths || 0} Months`}
                              </p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#6B7280]">
                                {scheme.paymentFrequency || "MONTHLY"}
                              </p>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap text-right">
                              <p className="text-xs font-black font-mono text-[#111827]">
                                {unit === "GOLD_GRAMS" ? `${contribution} g` : `₹${contribution.toLocaleString("en-IN")}`}
                                <span className="text-[9px] font-semibold text-[#6B7280] ml-1 uppercase tracking-wider">Min</span>
                              </p>
                              <p className="mt-1 flex items-center justify-end gap-1 text-[10px] font-bold text-[#166534]">
                                {interestEnabled ? <><Percent size={10} /> {Number(scheme.interestConfig?.annualRate || 0).toFixed(1)}% Yield</> : <span className="text-[#9CA3AF]">No Interest</span>}
                              </p>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap text-center">
                              <StatusBadge status={scheme.status} />
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap text-right opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(scheme)} className="p-1.5 rounded-md text-[#4B5563] hover:text-[#166534] hover:bg-white border border-transparent hover:border-[#E5E7EB] shadow-sm transition-all" title="Edit">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => handleToggleStatus(scheme)} className="p-1.5 rounded-md text-[#9CA3AF] hover:text-rose-600 hover:bg-white border border-transparent hover:border-[#E5E7EB] shadow-sm transition-all" title="Toggle Status">
                                  <Power size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE CARDS */}
              <div className="flex lg:hidden flex-col gap-3 overflow-y-auto p-3 bg-[#F9FAFB] [&::-webkit-scrollbar]:hidden">
                {paginatedSchemes.map((scheme) => {
                  const isGold = scheme.schemeType === "GOLD_SIP";
                  const unit = scheme.installmentConfig?.unit || (isGold ? "GOLD_GRAMS" : "AMOUNT");
                  const contribution = Number(scheme.installmentConfig?.amount || 0);

                  return (
                    <div key={scheme.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between border-b border-[#F3F4F6] pb-3 mb-3">
                        <div>
                          <p className="text-sm font-bold text-[#111827]">{scheme.schemeName}</p>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <span className="rounded bg-white border border-[#E5E7EB] px-1.5 py-0.5 text-[9px] font-bold text-[#4B5563] shadow-sm">{scheme.schemeCode}</span>
                            <TypeBadge type={scheme.schemeType} />
                          </div>
                        </div>
                        <StatusBadge status={scheme.status} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-2">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-[#6B7280]">Duration</p>
                          <p className="mt-0.5 text-xs font-bold text-[#111827]">{isGold ? "Open-ended" : `${scheme.durationMonths || 0} Months`}</p>
                        </div>
                        <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-2 text-right">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-[#6B7280]">Minimum</p>
                          <p className="mt-0.5 text-xs font-black font-mono text-[#111827]">{unit === "GOLD_GRAMS" ? `${contribution} g` : `₹${contribution.toLocaleString("en-IN")}`}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(scheme)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white py-2 text-[10px] font-bold text-[#166534] shadow-sm hover:bg-[#F9FAFB]">
                          <Edit3 size={12} /> Edit
                        </button>
                        <button onClick={() => handleToggleStatus(scheme)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[10px] font-bold text-[#9CA3AF] shadow-sm hover:text-rose-600 hover:bg-rose-50">
                          <Power size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* PAGINATION FOOTER */}
              {totalPages > 1 && (
                <div className="flex shrink-0 items-center justify-between border-t border-[#E5E7EB] px-5 py-2.5 bg-white">
                  <p className="text-[10px] font-bold text-[#6B7280]">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, processedSchemes.length)} of {processedSchemes.length}
                  </p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[10px] font-bold rounded-md border border-[#E5E7EB] bg-white text-[#374151] disabled:opacity-50 hover:bg-[#F9FAFB] transition-colors">
                      Prev
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[10px] font-bold rounded-md border border-[#E5E7EB] bg-white text-[#374151] disabled:opacity-50 hover:bg-[#F9FAFB] transition-colors">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          CREATE / EDIT MODAL
      ====================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-[#111827]">
                  {editingId ? "Edit Investment Scheme" : "Create Investment Scheme"}
                </h2>
                <p className="text-[10px] font-medium text-[#6B7280] mt-0.5">Configure rules, duration, and account generation.</p>
              </div>
              <button onClick={closeModal} disabled={saving} className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#E5E7EB] hover:text-[#111827] transition-colors">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

                {/* Base Configuration */}
                <div className="rounded-xl border border-[#E5E7EB] p-4 bg-white shadow-sm">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-2 mb-4 flex items-center gap-2">
                    <Wallet size={14} className="text-[#166534]"/> Base Configuration
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField label="Scheme Code" name="schemeCode" value={formData.schemeCode} onChange={handleChange} placeholder="e.g. GLD12" required disabled={Boolean(editingId)} />
                    <InputField label="Scheme Name" name="schemeName" value={formData.schemeName} onChange={handleChange} placeholder="e.g. Gold Savings" required disabled={saving} />
                    <SelectField label="Scheme Type" name="schemeType" value={formData.schemeType} onChange={handleChange} required disabled={saving}>
                      <option value="FIXED_INSTALLMENT">Fixed Installment</option>
                      <option value="GOLD_SIP">Gold SIP</option>
                    </SelectField>
                    <SelectField label="Payment Frequency" name="paymentFrequency" value={formData.paymentFrequency} onChange={handleChange} disabled={saving}>
                      <option value="MONTHLY">Monthly</option>
                      {!isGoldSip && <option value="QUARTERLY">Quarterly</option>}
                    </SelectField>
                    {!isGoldSip && (
                      <div className="sm:col-span-2">
                        <InputField label="Duration" name="durationMonths" value={formData.durationMonths} onChange={handleChange} type="number" unit="Months" required disabled={saving} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Contribution Rules */}
                <div className="rounded-xl border border-[#E5E7EB] p-4 bg-white shadow-sm">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-2 mb-4">Contribution Rules</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField label="Contribution Type" name="installmentType" value={formData.installmentType} onChange={handleChange} disabled={saving}>
                      <option value="FIXED">Fixed Minimum</option>
                      <option value="VARIABLE">Variable</option>
                    </SelectField>
                    <InputField 
                      label={isGoldSip ? "Minimum Gold" : "Minimum Amount"} 
                      name="installmentAmount" 
                      value={formData.installmentAmount} 
                      onChange={handleChange} 
                      type="number" 
                      unit={isGoldSip ? "g" : "₹"} 
                      disabled={saving || formData.installmentType === "VARIABLE"} 
                    />
                  </div>
                </div>

                {/* Interest Configuration */}
                <div className="rounded-xl border border-[#E5E7EB] p-4 bg-white shadow-sm">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-2 mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Percent size={14} className="text-[#166534]" /> Interest Configuration</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[9px] uppercase tracking-wider text-[#6B7280]">Enable</span>
                      <input type="checkbox" name="interestEnabled" checked={formData.interestEnabled} onChange={handleChange} disabled={saving} className="h-4 w-4 accent-[#166534]"/>
                    </label>
                  </h4>
                  {formData.interestEnabled ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InputField label="Annual Rate" name="annualRate" value={formData.annualRate} onChange={handleChange} type="number" unit="%" required disabled={saving} />
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
                  ) : (
                    <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-3 text-center">
                      <p className="text-[10px] font-semibold text-[#6B7280]">No interest will be calculated for accounts under this scheme.</p>
                    </div>
                  )}
                </div>

                {/* Account Number Generation */}
                <div className="rounded-xl border border-[#E5E7EB] p-4 bg-[#F9FAFB] shadow-sm">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-2 mb-4">Account Number Generation</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField label="Prefix" name="accountPrefix" value={formData.accountPrefix} onChange={handleChange} placeholder="INV" required disabled={saving} />
                    <InputField label="Number Padding" name="accountPadding" value={formData.accountPadding} onChange={handleChange} type="number" placeholder="3" required disabled={saving} />
                    <div className="sm:col-span-2 mt-1 rounded-lg bg-white border border-[#E5E7EB] p-3 text-center shadow-sm">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#6B7280]">Live Preview</p>
                      <p className="mt-1 text-lg font-black font-mono tracking-widest text-[#166534]">
                        {formData.accountPrefix || "INV"}-{String(1).padStart(Number(formData.accountPadding || 3), "0")}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-between border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
                <button type="button" onClick={closeModal} disabled={saving} className="rounded-lg px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#166534] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#14532D] transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                  {editingId ? "Save Changes" : "Create Scheme"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}