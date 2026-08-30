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
  CalendarDays,
  Lock,
  Mail
} from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { useInvestmentSchemes } from "../hooks/useInvestmentSchemes";
import { createInvestmentScheme, updateInvestmentScheme } from "../services/investmentSchemes";
import { createAccountNumberChangeRequest } from "../services/investmentAccountNumberChangeRequests";
import { getCrmFirestore } from "../../../firebase";

// ============================================================
// CONSTANTS & INITIAL STATE
// ============================================================
const ABHINAVA_ADMIN_EMAIL = import.meta.env.VITE_ABHINAVA_ADMIN_EMAIL || "admin@abhinava.site";

const INITIAL_FORM = {
  schemeCode: "",
  schemeName: "",
  schemeType: "FIXED_INSTALLMENT",
  durationMonths: "12",
  paymentFrequency: "MONTHLY",
  installmentType: "FIXED",
  minimumAmount: "",
  minimumGrams: "",
  benefitType: "NONE",
  benefitValue: "",
  interestEnabled: false,
  interestStrategyId: "STANDARD_INTEREST_V1",
  annualRate: "",
  calculationMethod: "SIMPLE",
  compoundingFrequency: "NONE",
  dayCountConvention: "ACTUAL_365",
  roundingScale: "2",
  accountPrefix: "",
  accountPadding: "6",
};

const ITEMS_PER_PAGE = 15;

// ============================================================
// UI COMPONENTS
// ============================================================
function InputField({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false, unit = "", min, step }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white transition-all focus-within:border-[#166534] focus-within:ring-1 focus-within:ring-[#166534] shadow-sm disabled:opacity-60">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          step={step}
          className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-[#111827] outline-none placeholder:text-[#9CA3AF] disabled:cursor-not-allowed disabled:bg-gray-50"
        />
        {unit && <span className="flex items-center border-l border-[#E5E7EB] bg-gray-50 px-3 text-xs font-bold text-[#6B7280]">{unit}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, name, value, onChange, children, required = false, disabled = false }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 pr-8 text-sm font-semibold text-[#111827] outline-none transition-all focus:border-[#166534] focus:ring-1 focus:ring-[#166534] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50"
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
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
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
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
      isGoldSip ? "border-amber-200/50 bg-amber-50 text-amber-700" : "border-blue-200/50 bg-blue-50 text-blue-700"
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

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [toast, setToast] = useState(null);

  // Filters & State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);

  // Change Request Modal
  const [requestModal, setRequestModal] = useState(null);
  const [requestReason, setRequestReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
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
          valA = a.schemeType === "GOLD_SIP" ? Number(a.installmentConfig?.minimumGrams || 0) : Number((a.installmentConfig?.minimumAmount ?? a.installmentConfig?.amount) || 0);
          valB = b.schemeType === "GOLD_SIP" ? Number(b.installmentConfig?.minimumGrams || 0) : Number((b.installmentConfig?.minimumAmount ?? b.installmentConfig?.amount) || 0);
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
    const interestEnabled = Boolean(scheme.interestConfig?.enabled);

    setEditingId(scheme.id);
    setFormData({
      schemeCode: scheme.schemeCode || "",
      schemeName: scheme.schemeName || "",
      schemeType: scheme.schemeType || "FIXED_INSTALLMENT",
      durationMonths: isGoldSip ? "" : String(scheme.durationMonths || ""),
      paymentFrequency: scheme.paymentFrequency || "MONTHLY",
      installmentType: scheme.installmentConfig?.type || "FIXED",
      minimumAmount: isGoldSip ? "" : String((scheme.installmentConfig?.minimumAmount ?? scheme.installmentConfig?.amount) || ""),
      minimumGrams: isGoldSip ? String(scheme.installmentConfig?.minimumGrams || "") : "",
      benefitType: scheme.benefitConfig?.type || "NONE",
      benefitValue: scheme.benefitConfig?.value != null ? String(scheme.benefitConfig.value) : "",
      interestEnabled,
      interestStrategyId: scheme.interestConfig?.strategyId || "STANDARD_INTEREST_V1",
      annualRate: scheme.interestConfig?.annualRate != null ? String(scheme.interestConfig.annualRate) : "",
      calculationMethod: scheme.interestConfig?.calculationMethod || "SIMPLE",
      compoundingFrequency: scheme.interestConfig?.compoundingFrequency || "NONE",
      dayCountConvention: scheme.interestConfig?.dayCountConvention || "ACTUAL_365",
      roundingScale: scheme.interestConfig?.roundingScale != null ? String(scheme.interestConfig.roundingScale) : "2",
      accountPrefix: scheme.accountNumberConfig?.prefix || "",
      accountPadding: scheme.accountNumberConfig?.padding != null ? String(scheme.accountNumberConfig.padding) : "6",
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
        next.minimumAmount = "";
        next.installmentType = "FIXED";
      }
      if (name === "schemeType" && value !== "GOLD_SIP") {
        if (!next.durationMonths) next.durationMonths = "12";
        next.minimumGrams = "";
      }
      if (name === "calculationMethod" && value === "SIMPLE") {
        next.compoundingFrequency = "NONE";
      }
      return next;
    });
  }

  // ==========================================================
  // CHANGE REQUEST MODAL
  // ==========================================================
  function openChangeRequest(scheme) {
    setRequestReason("");
    setRequestModal(scheme);
  }

  async function submitChangeRequest() {
    if (!requestModal) return;
    if (!requestReason.trim()) {
      setToast({ type: "error", message: "Please provide a reason for the change request." });
      return;
    }

    try {
      setRequesting(true);
      const currentPrefix = requestModal.accountNumberConfig?.prefix || "";
      const currentPadding = requestModal.accountNumberConfig?.padding || 6;

      const result = await createAccountNumberChangeRequest({
        schemeId: requestModal.id,
        schemeName: requestModal.schemeName,
        currentTheme: { prefix: currentPrefix, padding: Number(currentPadding) },
        reason: requestReason.trim(),
      });

      const subject = encodeURIComponent(`Account Number Theme Change Request - ${requestModal.schemeName}`);
      const body = encodeURIComponent([
        "Account Number Theme Change Request\n",
        `Scheme: ${requestModal.schemeName}`,
        `Scheme ID: ${requestModal.id}\n`,
        `Current Prefix: ${currentPrefix}`,
        `Current Padding: ${currentPadding}\n`,
        `Reason: ${requestReason.trim()}\n`,
        `Request ID: ${result.id}`
      ].join("\n"));

      window.location.href = `mailto:${ABHINAVA_ADMIN_EMAIL}?subject=${subject}&body=${body}`;

      setRequestModal(null);
      setToast({ type: "success", message: "Request recorded. Your email client will open." });
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: error.message || "Failed to create change request." });
    } finally {
      setRequesting(false);
    }
  }

  // ==========================================================
  // SUBMIT HANDLERS
  // ==========================================================
  const isGoldSip = formData.schemeType === "GOLD_SIP";

  function buildPayload() {
    const schemeType = formData.schemeType;
    const goldSip = schemeType === "GOLD_SIP";
    const minimumAmount = Number(formData.minimumAmount || 0);
    const minimumGrams = Number(formData.minimumGrams || 0);
    const durationMonths = goldSip ? null : Number(formData.durationMonths);

    return {
      schemeCode: formData.schemeCode.trim().toUpperCase(),
      schemeName: formData.schemeName.trim(),
      schemeType,
      durationMonths,
      paymentFrequency: formData.paymentFrequency,
      installmentConfig: goldSip ? {
        type: "FIXED",
        unit: "GOLD_GRAMS",
        minimumGrams: Number.isFinite(minimumGrams) ? minimumGrams : 0,
      } : {
        type: formData.installmentType,
        unit: "AMOUNT",
        minimumAmount: Number.isFinite(minimumAmount) ? minimumAmount : 0,
        amount: Number.isFinite(minimumAmount) ? minimumAmount : 0, // Legacy support
      },
      benefitConfig: formData.benefitType === "NONE" ? { type: "NONE", value: 0 } : { type: formData.benefitType, value: Number(formData.benefitValue || 0) },
      interestConfig: formData.interestEnabled ? {
        enabled: true,
        strategyId: formData.interestStrategyId,
        annualRate: Number(formData.annualRate || 0),
        calculationMethod: formData.calculationMethod,
        compoundingFrequency: formData.compoundingFrequency,
        dayCountConvention: formData.dayCountConvention,
        roundingScale: Number(formData.roundingScale || 2),
      } : { enabled: false, strategyId: null, annualRate: 0, calculationMethod: null, compoundingFrequency: null, dayCountConvention: null, roundingScale: 2 },
      calculationStrategyId: goldSip ? "GOLD_SIP_V1" : "FIXED_INSTALLMENT_V1",
      calculationVersion: 1,
      accountNumberConfig: {
        prefix: formData.accountPrefix.trim().toUpperCase(),
        padding: Number(formData.accountPadding || 6),
        locked: true, // Always locked after creation
      },
    };
  }

  function validatePayload(payload) {
    if (!payload.schemeCode) throw new Error("Scheme code is required.");
    if (!payload.schemeName) throw new Error("Scheme name is required.");
    if (!payload.paymentFrequency) throw new Error("Payment frequency is required.");

    if (payload.schemeType === "GOLD_SIP") {
      const grams = Number(payload.installmentConfig?.minimumGrams);
      if (!Number.isFinite(grams) || grams <= 0) throw new Error("Minimum gold contribution must be > 0.");
    } else {
      const duration = Number(payload.durationMonths);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("Duration must be > 0.");
      const minimumAmount = Number(payload.installmentConfig?.minimumAmount);
      if (payload.installmentConfig.type !== "VARIABLE" && (!Number.isFinite(minimumAmount) || minimumAmount <= 0)) {
        throw new Error("Minimum contribution amount must be > 0.");
      }
    }

    if (payload.interestConfig?.enabled) {
      const rate = Number(payload.interestConfig.annualRate);
      if (!Number.isFinite(rate) || rate < 0) throw new Error("Interest rate cannot be negative.");
    }

    const prefix = payload.accountNumberConfig?.prefix;
    if (!prefix) throw new Error("Account prefix is required.");
    if (!/^[A-Z0-9_-]{1,20}$/.test(prefix)) throw new Error("Prefix may contain only letters, numbers, hyphens and underscores.");
    const padding = Number(payload.accountNumberConfig?.padding);
    if (!Number.isInteger(padding) || padding < 3 || padding > 10) throw new Error("Padding must be between 3 and 10.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    try {
      const payload = buildPayload();
      validatePayload(payload);
      setSaving(true);

      if (editingId) {
        const existing = schemes.find((s) => s.id === editingId);
        const oldConfig = existing?.accountNumberConfig;
        const oldPrefix = String(oldConfig?.prefix || "").trim().toUpperCase();
        const oldPadding = Number(oldConfig?.padding || 0);
        
        if (oldConfig?.locked && (oldPrefix !== payload.accountNumberConfig.prefix || oldPadding !== payload.accountNumberConfig.padding)) {
          throw new Error("Account numbering is locked. Please use 'Request Change'.");
        }

        await updateInvestmentScheme(editingId, payload);
        setToast({ type: "success", message: "Scheme updated successfully." });
      } else {
        await createInvestmentScheme({ ...payload, nextAccountNumber: 1 });
        setToast({ type: "success", message: payload.schemeType === "GOLD_SIP" ? "Gold SIP scheme created." : "Investment scheme created." });
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
    let csv = "data:text/csv;charset=utf-8,Scheme Code,Scheme Name,Type,Duration,Frequency,Unit,Minimum,Interest Enabled,Interest Rate,Account Prefix,Padding,Status\n";
    processedSchemes.forEach((scheme) => {
      const isGold = scheme.schemeType === "GOLD_SIP";
      const unit = scheme.installmentConfig?.unit || (isGold ? "GOLD_GRAMS" : "AMOUNT");
      const minimum = isGold ? scheme.installmentConfig?.minimumGrams || 0 : (scheme.installmentConfig?.minimumAmount ?? scheme.installmentConfig?.amount) || 0;
      const duration = isGold ? "OPEN_ENDED" : scheme.durationMonths || "";
      const interestEnabled = scheme.interestConfig?.enabled ? "YES" : "NO";
      const interestRate = scheme.interestConfig?.enabled ? scheme.interestConfig?.annualRate || 0 : "";
      
      csv += [
        scheme.schemeCode || "", scheme.schemeName || "", scheme.schemeType || "",
        duration, scheme.paymentFrequency || "", unit, minimum, interestEnabled, interestRate,
        scheme.accountNumberConfig?.prefix || "", scheme.accountNumberConfig?.padding || "", scheme.status || ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Investment_Schemes_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <div className={`fixed bottom-6 right-6 z-[100] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-xl animate-in slide-in-from-bottom-6 duration-300 ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        )}

        {/* ==================================================
            ULTRA-COMPACT HEADER TOOLBAR
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
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search scheme code or name..." className="w-full rounded-md bg-[#F9FAFB] py-1.5 pl-8 pr-3 text-xs font-medium border border-[#E5E7EB] outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-all" />
              </div>
              
              <div className="relative shrink-0">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none rounded-md bg-[#F9FAFB] border border-[#E5E7EB] py-1.5 pl-3 pr-8 text-[10px] font-bold uppercase tracking-wider text-[#4B5563] outline-none focus:border-[#166534] transition-all">
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
              
              <button onClick={handleExportCSV} className="flex flex-1 sm:flex-none h-[30px] items-center justify-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 text-[11px] font-bold text-[#374151] hover:bg-[#F9FAFB] shadow-sm transition-colors">
                <Download size={12} /> <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={openCreate} className="flex flex-1 sm:flex-none h-[30px] items-center justify-center gap-1.5 rounded-md bg-[#166534] px-4 text-[11px] font-bold text-white shadow-sm hover:bg-[#14532D] transition-colors">
                <Plus size={12} strokeWidth={2.5} /> <span className="hidden sm:inline">New Scheme</span>
              </button>
            </div>
          </div>

          {schemesError && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700">
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
                            Contribution Rules <SortIcon columnKey="minimum" />
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
                        const contribution = Number(isGold ? scheme.installmentConfig?.minimumGrams : (scheme.installmentConfig?.minimumAmount ?? scheme.installmentConfig?.amount) || 0);
                        const interestEnabled = Boolean(scheme.interestConfig?.enabled);
                        const accountLocked = scheme.accountNumberConfig?.locked === true;

                        return (
                          <tr key={scheme.id} className="group hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-5 py-3 whitespace-nowrap">
                              <p className="text-sm font-bold text-[#111827]">{scheme.schemeName}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="rounded bg-white border border-[#E5E7EB] px-1.5 py-0.5 text-[9px] font-bold text-[#4B5563] shadow-sm">{scheme.schemeCode}</span>
                                <TypeBadge type={scheme.schemeType} />
                                {accountLocked && <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[8px] font-bold text-amber-700 uppercase tracking-wider"><Lock size={8}/> Locked</span>}
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
                              <p className="text-xs font-black font-mono tracking-tight text-[#111827]">
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
                  const contribution = Number(isGold ? scheme.installmentConfig?.minimumGrams : (scheme.installmentConfig?.minimumAmount ?? scheme.installmentConfig?.amount) || 0);

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
          CREATE / EDIT WIZARD MODAL (Clean Grid Layout)
      ====================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  {editingId ? "Edit Investment Scheme" : "Create Investment Scheme"}
                </h2>
                <p className="text-[10px] font-medium text-gray-500 mt-0.5">Configure rules, duration, and account generation.</p>
              </div>
              <button onClick={closeModal} disabled={saving} className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8">

                {/* Section: Basic Info */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                    <Wallet size={14} className="text-[#166534]"/> Base Configuration
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField label="Scheme Code" name="schemeCode" value={formData.schemeCode} onChange={handleChange} placeholder="e.g. GLD12" required disabled={Boolean(editingId)} />
                    <InputField label="Scheme Name" name="schemeName" value={formData.schemeName} onChange={handleChange} placeholder="e.g. Gold Savings" required disabled={saving} />
                    <SelectField label="Scheme Type" name="schemeType" value={formData.schemeType} onChange={handleChange} required disabled={saving}>
                      <option value="FIXED_INSTALLMENT">Fixed Installment</option>
                      <option value="GOLD_SIP">Gold SIP</option>
                    </SelectField>
                    <SelectField label="Payment Frequency" name="paymentFrequency" value={formData.paymentFrequency} onChange={handleChange} disabled={saving || isGoldSip}>
                      <option value="MONTHLY">Monthly</option>
                      {!isGoldSip && <option value="QUARTERLY">Quarterly</option>}
                      {!isGoldSip && <option value="HALF_YEARLY">Half Yearly</option>}
                      {!isGoldSip && <option value="YEARLY">Yearly</option>}
                    </SelectField>
                    {!isGoldSip && (
                      <div className="sm:col-span-2">
                        <InputField label="Duration" name="durationMonths" value={formData.durationMonths} onChange={handleChange} type="number" unit="Months" required disabled={saving} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Contribution */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-2 mb-4">Contribution Rules</h4>
                  {isGoldSip ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                        <Wallet size={16} className="mt-0.5 text-amber-700" />
                        <div>
                          <p className="text-xs font-bold text-amber-900">Gold contribution tracking</p>
                          <p className="mt-1 text-[10px] text-amber-800 leading-relaxed">This scheme has no fixed duration. Contributions are recorded directly in grams of gold rather than fiat currency.</p>
                        </div>
                      </div>
                      <InputField label="Minimum Gold Contribution" name="minimumGrams" value={formData.minimumGrams} onChange={handleChange} type="number" unit="g" placeholder="e.g. 1" min="0.001" step="0.001" required disabled={saving} />
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField label="Contribution Type" name="installmentType" value={formData.installmentType} onChange={handleChange} disabled={saving}>
                        <option value="FIXED">Fixed Minimum</option>
                        <option value="VARIABLE">Variable</option>
                      </SelectField>
                      <InputField 
                        label="Minimum Amount" 
                        name="minimumAmount" 
                        value={formData.minimumAmount} 
                        onChange={handleChange} 
                        type="number" 
                        unit="₹" 
                        disabled={saving || formData.installmentType === "VARIABLE"} 
                      />
                    </div>
                  )}
                </div>

                {/* Section: Interest */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-2 mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Percent size={14} className="text-[#166534]" /> Interest Configuration</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Enable</span>
                      <input type="checkbox" name="interestEnabled" checked={formData.interestEnabled} onChange={handleChange} disabled={saving} className="h-4 w-4 accent-[#166534]"/>
                    </label>
                  </h4>
                  {formData.interestEnabled ? (
                    <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">
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
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
                      <p className="text-[10px] font-semibold text-gray-500">No interest will be calculated for accounts under this scheme.</p>
                    </div>
                  )}
                </div>

                {/* Section: Accounts */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-2 mb-4">Account Number Generation</h4>
                  
                  {editingId && schemes.find(s => s.id === editingId)?.accountNumberConfig?.locked ? (
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div>
                        <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5"><Lock size={14}/> Theme is Locked</p>
                        <p className="mt-1 text-[10px] text-amber-800">Cannot be changed directly to protect existing accounts.</p>
                      </div>
                      <button type="button" onClick={() => openChangeRequest(schemes.find(s => s.id === editingId))} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#166534] px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-[#14532D]">
                        <Mail size={12}/> Request Change
                      </button>
                    </div>
                  ) : (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <Lock size={16} className="mt-0.5 shrink-0 text-amber-700" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">Account number theme is mandatory</p>
                        <p className="mt-1 text-[10px] text-amber-800 leading-relaxed">Once the scheme is created, this theme is locked. If a change is required later, use the Account Number Theme Change Request workflow.</p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField label="Prefix" name="accountPrefix" value={formData.accountPrefix} onChange={handleChange} placeholder="INV" required disabled={saving || Boolean(editingId && schemes.find((s) => s.id === editingId)?.accountNumberConfig?.locked)} />
                    <InputField label="Number Padding" name="accountPadding" value={formData.accountPadding} onChange={handleChange} type="number" placeholder="6" required disabled={saving || Boolean(editingId && schemes.find((s) => s.id === editingId)?.accountNumberConfig?.locked)} />
                    
                    <div className="sm:col-span-2 mt-2 rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Live Preview</p>
                      <p className="mt-1 text-xl font-black font-mono tracking-widest text-[#166534]">
                        {formData.accountPrefix || "INV"}-{String(1).padStart(Number(formData.accountPadding || 6), "0")}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button type="button" onClick={closeModal} disabled={saving} className="rounded-lg px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
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

      {/* ======================================================
          CHANGE REQUEST MODAL
      ====================================================== */}
      {requestModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-[1.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Lock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Locked Configuration</span>
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Request Theme Change</h2>
                </div>
                <button onClick={() => setRequestModal(null)} disabled={requesting} className="rounded p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-900">Why is this required?</p>
                <p className="mt-1 text-[10px] text-amber-800 leading-relaxed">Accounts may already exist. Changing the prefix/padding requires admin review to ensure historical records remain traceable.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Current Prefix</p>
                  <p className="mt-0.5 text-sm font-black font-mono text-gray-900">{requestModal.accountNumberConfig?.prefix || "—"}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Current Padding</p>
                  <p className="mt-0.5 text-sm font-black font-mono text-gray-900">{requestModal.accountNumberConfig?.padding || "—"}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reason for Change <span className="text-rose-500">*</span></label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why the theme needs to be changed..."
                  disabled={requesting}
                  className="mt-1.5 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] shadow-sm"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-center">
                <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#166534]"><Mail size={12} /> Sending to Admin</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setRequestModal(null)} disabled={requesting} className="rounded-lg px-4 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-200">
                Cancel
              </button>
              <button type="button" onClick={submitChangeRequest} disabled={requesting} className="flex items-center gap-2 rounded-lg bg-[#166534] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#14532D] disabled:opacity-50">
                {requesting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} 
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}