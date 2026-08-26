import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit3,
  Eye,
  Download,
  Loader2,
  Plus,
  Phone,
  Power,
  Search,
  UserRound,
  X,
  ArrowRight,
  Settings2,
  Wallet,
  CreditCard,
  MapPin,
  CalendarDays,
  Mail
} from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

import { useInvestmentInvestors } from "../hooks/useInvestmentInvestors";
import { useInvestmentSchemes } from "../hooks/useInvestmentSchemes";
import {
  createInvestmentInvestor,
  updateInvestmentInvestor,
  updateInvestmentInvestorStatus,
} from "../services/investmentInvestors";
import { createInvestmentAccount } from "../services/investmentAccounts";
import { getCrmFirestore } from "../../../firebase";

// ============================================================
// CONSTANTS & CONFIG
// ============================================================
const INITIAL_FORM = {
  fullName: "",
  mobileNumber: "",
  alternateMobileNumber: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  schemeId: "",
  contributionValue: "",
  startDate: "",
  minimumRestrictionEnabled: true,
};

const INVESTMENT_ACCOUNTS_COLLECTION = "investmentAccounts";
const ITEMS_PER_PAGE = 15;

// ============================================================
// REUSABLE UI COMPONENTS
// ============================================================
function InputField({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false, prefix = "" }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#68786D]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex overflow-hidden rounded-xl border border-[#E2E8E4] bg-white transition-all focus-within:border-[#345343] focus-within:ring-2 focus-within:ring-[#345343]/20 shadow-sm disabled:opacity-60">
        {prefix && <span className="flex items-center bg-[#F5F7F5] border-r border-[#E2E8E4] px-3.5 text-xs font-bold text-[#68786D]">{prefix}</span>}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA] placeholder:font-medium disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

function SelectField({ label, name, value, onChange, children, required = false, disabled = false }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#68786D]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-[#E2E8E4] bg-white px-3.5 py-2.5 pr-10 text-sm font-semibold text-[#1B241E] outline-none transition-all focus:border-[#345343] focus:ring-2 focus:ring-[#345343]/20 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#87968C]" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "ACTIVE" || !status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
      isActive ? "border-emerald-200/50 bg-emerald-50 text-emerald-700" : "border-rose-200/50 bg-rose-50 text-rose-700"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ============================================================
// HELPERS
// ============================================================
function formatDate(dateValue) {
  if (!dateValue) return "—";
  if (typeof dateValue === "object" && dateValue?.seconds) {
    return new Date(dateValue.seconds * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatGold(value) {
  return `${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} g`;
}

function getAccountUnit(account) {
  const unit = String(account?.contribution?.unit || account?.minimumRestriction?.unit || account?.schemeSnapshot?.installmentConfig?.unit || "").toUpperCase();
  return unit === "GOLD_GRAMS" ? "GOLD_GRAMS" : "AMOUNT";
}

function isGoldAccount(account) {
  return getAccountUnit(account) === "GOLD_GRAMS";
}

function calculateInvestorSummary(investorId, accounts) {
  const investorAccounts = accounts.filter((account) => String(account.investorId) === String(investorId));
  let totalAmount = 0, totalGold = 0;
  let hasAmountAccount = false, hasSip = false;
  let lastTransactionAt = null;

  investorAccounts.forEach((account) => {
    if (isGoldAccount(account)) {
      hasSip = true;
      totalGold += Number(account.totalGoldCredited || 0);
    } else {
      hasAmountAccount = true;
      totalAmount += Number(account.totalPaid || 0);
    }
    if (account.updatedAt) lastTransactionAt = account.updatedAt;
  });

  return { accounts: investorAccounts, totalAmount, totalGold, hasSip, hasAmountAccount, lastTransactionAt };
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function InvestmentInvestorsPage() {
  const navigate = useNavigate();

  // Data Hooks
  const { investors, loading, error } = useInvestmentInvestors();
  const { schemes, loading: schemesLoading, error: schemesError } = useInvestmentSchemes();

  // Account Data
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");

  // Modals & Forms
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [checkMobile, setCheckMobile] = useState("");
  const [matchedInvestors, setMatchedInvestors] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Filters & State
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);

  // Derived Schemes
  const activeSchemes = useMemo(() => schemes.filter((scheme) => scheme.status === "ACTIVE"), [schemes]);
  const selectedScheme = useMemo(() => activeSchemes.find((scheme) => scheme.id === formData.schemeId) || null, [activeSchemes, formData.schemeId]);

  const isGoldScheme = useMemo(() => {
    if (!selectedScheme) return false;
    const schemeType = String(selectedScheme.schemeType || "").toUpperCase();
    const unit = String(selectedScheme?.installmentConfig?.unit || "").toUpperCase();
    return schemeType.includes("GOLD") || unit === "GOLD_GRAMS";
  }, [selectedScheme]);

  const contributionUnit = useMemo(() => isGoldScheme ? "GOLD_GRAMS" : (selectedScheme?.installmentConfig?.unit || "AMOUNT"), [selectedScheme, isGoldScheme]);
  const schemeMinimum = useMemo(() => Number(selectedScheme?.installmentConfig?.minimumAmount || 0), [selectedScheme]);
  const hasSchemeMinimum = Number.isFinite(schemeMinimum) && schemeMinimum > 0;
  const durationEnabled = selectedScheme?.durationConfig?.enabled === true;

  // Load Accounts securely
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const db = getCrmFirestore();
      const reference = query(collection(db, INVESTMENT_ACCOUNTS_COLLECTION), orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(
        reference,
        (snapshot) => {
          setAccounts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
          setAccountsError("");
          setAccountsLoading(false);
        },
        (err) => {
          console.error(err);
          setAccountsError(err.message || "Failed to load accounts.");
          setAccountsLoading(false);
        }
      );
    } catch (err) {
      console.error(err);
      setAccountsError(err.message || "Init failed.");
      setAccountsLoading(false);
    }
    return () => unsubscribe();
  }, []);

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ==========================================================
  // DATA PROCESSING (Bulletproof 10k Records)
  // ==========================================================
  const investorSummaries = useMemo(() => {
    const map = new Map();
    investors.forEach((inv) => map.set(inv.id, calculateInvestorSummary(inv.id, accounts)));
    return map;
  }, [investors, accounts]);

  const processedInvestors = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    // 1. Filter safely
    let filtered = investors.filter((investor) => {
      const summary = investorSummaries.get(investor.id);
      const accountSearch = summary?.accounts?.some((acc) => String(acc.accountNumber || "").toLowerCase().includes(searchValue));
      
      const matchesSearch = !searchValue || 
        String(investor.fullName || "").toLowerCase().includes(searchValue) || 
        String(investor.mobileNumber || "").toLowerCase().includes(searchValue) || 
        String(investor.email || "").toLowerCase().includes(searchValue) || 
        accountSearch;
        
      const matchesStatus = statusFilter === "ALL" || (investor.status || "ACTIVE") === statusFilter;
      
      let matchesTab = true;
      if (activeTab !== "ALL") {
        matchesTab = summary?.accounts.some((acc) => String(acc.schemeId) === String(activeTab)) || false;
      }
      return matchesSearch && matchesStatus && matchesTab;
    });

    // 2. Sort safely
    filtered.sort((a, b) => {
      const sumA = investorSummaries.get(a.id);
      const sumB = investorSummaries.get(b.id);
      let valA, valB;

      switch (sortConfig.key) {
        case "fullName":
          valA = String(a.fullName || "").toLowerCase();
          valB = String(b.fullName || "").toLowerCase();
          break;
        case "totalAmount":
          valA = sumA?.totalAmount || 0;
          valB = sumB?.totalAmount || 0;
          break;
        case "totalGold":
          valA = sumA?.totalGold || 0;
          valB = sumB?.totalGold || 0;
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
  }, [investors, search, statusFilter, activeTab, sortConfig, investorSummaries]);

  // Pagination bounds
  const totalPages = Math.ceil(processedInvestors.length / ITEMS_PER_PAGE);
  const paginatedInvestors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedInvestors.slice(start, start + ITEMS_PER_PAGE);
  }, [processedInvestors, currentPage]);

  useEffect(() => setCurrentPage(1), [search, statusFilter, activeTab]);

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
  // WIZARD / MODAL HANDLERS
  // ==========================================================
  function openCreate() {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
    setCheckMobile("");
    setMatchedInvestors(null);
    setModalStep(1);
    setModalOpen(true);
  }

  function handleCheckMobile(e) {
    e.preventDefault();
    const mobile = checkMobile.trim();
    if (!/^[0-9]{10}$/.test(mobile)) {
      setToast({ type: "error", message: "Enter a valid 10-digit mobile number." });
      return;
    }
    const matches = investors.filter((inv) => String(inv.mobileNumber || "") === mobile);
    if (matches.length > 0) {
      setMatchedInvestors(matches);
    } else {
      setFormData({ ...INITIAL_FORM, mobileNumber: mobile });
      setModalStep(2);
    }
  }

  function proceedToNewProfile() {
    setFormData({ ...INITIAL_FORM, mobileNumber: checkMobile.trim() });
    setModalStep(2);
  }

  function openEdit(investor) {
    setEditingId(investor.id);
    setFormData({
      fullName: investor.fullName || "",
      mobileNumber: investor.mobileNumber || "",
      alternateMobileNumber: investor.alternateMobileNumber || "",
      email: investor.email || "",
      dateOfBirth: investor.dateOfBirth || "",
      gender: investor.gender || "",
      address: investor.address || "",
      city: investor.city || "",
      state: investor.state || "",
      pincode: investor.pincode || "",
      schemeId: "", contributionValue: "", startDate: "", minimumRestrictionEnabled: true,
    });
    setModalStep(2);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setFormData({ ...INITIAL_FORM });
      setModalStep(1);
      setMatchedInvestors(null);
      setCheckMobile("");
    }, 300);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================
  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    try {
      const fullName = formData.fullName.trim();
      const mobileNumber = formData.mobileNumber.trim();

      if (!fullName) throw new Error("Investor name is required.");
      if (!/^[0-9]{10}$/.test(mobileNumber)) throw new Error("Valid 10-digit mobile required.");

      setSaving(true);

      // --- EDIT ---
      if (editingId) {
        await updateInvestmentInvestor(editingId, {
          fullName, mobileNumber,
          alternateMobileNumber: formData.alternateMobileNumber.trim(),
          email: formData.email.trim().toLowerCase(),
          dateOfBirth: formData.dateOfBirth, gender: formData.gender,
          address: formData.address.trim(), city: formData.city.trim(), state: formData.state.trim(), pincode: formData.pincode.trim(),
        });
        setToast({ type: "success", message: "Profile updated successfully." });
        closeModal();
        return;
      }

      // --- NEW ---
      if (!formData.schemeId) throw new Error("Select an investment scheme.");
      if (!formData.startDate) throw new Error("Select enrollment date.");

      const contributionValue = Number(formData.contributionValue);
      if (!Number.isFinite(contributionValue) || contributionValue <= 0) {
        throw new Error(isGoldScheme ? "Enter a valid gold quantity." : "Enter a valid investment amount.");
      }

      const minimumRestrictionEnabled = Boolean(formData.minimumRestrictionEnabled);
      if (minimumRestrictionEnabled && hasSchemeMinimum && contributionValue < schemeMinimum) {
        throw new Error(isGoldScheme ? `Minimum investment is ${schemeMinimum} g.` : `Minimum investment is ₹${schemeMinimum.toLocaleString("en-IN")}.`);
      }

      const investor = await createInvestmentInvestor({
        fullName, mobileNumber,
        alternateMobileNumber: formData.alternateMobileNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        dateOfBirth: formData.dateOfBirth, gender: formData.gender,
        address: formData.address.trim(), city: formData.city.trim(), state: formData.state.trim(), pincode: formData.pincode.trim(),
        status: "ACTIVE",
      });

      const prefix = selectedScheme?.accountNumberConfig?.prefix || "INV";
      const padding = Number(selectedScheme?.accountNumberConfig?.padding || 6);
      const nextSequence = Number(selectedScheme?.accountNumberConfig?.nextSequence || selectedScheme?.nextAccountNumber || 1);
      const accountNumber = `${prefix}-${String(nextSequence).padStart(padding, "0")}`;

      await createInvestmentAccount({
        investorId: investor.id,
        scheme: selectedScheme,
        accountNumber,
        contributionValue,
        startDate: formData.startDate,
        minimumRestrictionEnabled,
      });

      setToast({ type: "success", message: "Investor & Account created." });
      closeModal();
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err.message || "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(investor) {
    try {
      const nextStatus = investor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await updateInvestmentInvestorStatus(investor.id, nextStatus);
      setToast({ type: "success", message: `Investor marked as ${nextStatus.toLowerCase()}.` });
    } catch (err) {
      setToast({ type: "error", message: "Failed to update status." });
    }
  }

  function handleExportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Full Name,Mobile,Email,Accounts,Total Amount,Total Gold,Status\n";
    processedInvestors.forEach((investor) => {
      const summary = investorSummaries.get(investor.id);
      const accountsText = summary?.accounts?.map((a) => a.accountNumber).join(" | ") || "";
      csvContent += `"${investor.fullName || ""}","${investor.mobileNumber || ""}","${investor.email || ""}","${accountsText}","${summary?.totalAmount || 0}","${summary?.totalGold || 0}","${investor.status || "ACTIVE"}"\n`;
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Investors_Directory_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="flex h-full flex-col bg-[#F9FAFB] p-2 sm:p-4 overflow-hidden">
      
      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[70] flex max-w-sm items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* ULTRA-COMPACT TOOLBAR */}
      <div className="shrink-0 mb-3 flex flex-col gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
        
        {/* Top Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534]">
              <UserRound size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-[#111827]">Investors Directory</h1>
              <p className="text-[10px] font-medium text-[#6B7280]">Showing {processedInvestors.length} records</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link to="/crm/investment/schemes" className="flex flex-1 sm:flex-none h-[34px] items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-4 text-xs font-bold text-[#374151] hover:bg-[#F9FAFB] transition-colors shadow-sm">
              <Settings2 size={14} /> <span className="hidden sm:inline">Schemes</span>
            </Link>
            <button onClick={handleExportCSV} className="flex flex-1 sm:flex-none h-[34px] items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-4 text-xs font-bold text-[#374151] hover:bg-[#F9FAFB] transition-colors shadow-sm">
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={openCreate} className="flex flex-1 sm:flex-none h-[34px] items-center justify-center gap-1.5 rounded-lg bg-[#166534] px-5 text-xs font-bold text-white hover:bg-[#14532D] transition-colors shadow-sm">
              <Plus size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">New Profile</span>
            </button>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pt-2 border-t border-[#F3F4F6]">
          
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records..." className="w-full rounded-md bg-[#F9FAFB] py-1.5 pl-9 pr-3 text-xs font-medium border border-[#E5E7EB] outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-all" />
            </div>
            <div className="relative shrink-0 w-32">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none rounded-md bg-[#F9FAFB] border border-[#E5E7EB] py-1.5 pl-3 pr-8 text-[10px] font-bold uppercase tracking-wider text-[#4B5563] outline-none focus:border-[#166534] transition-all">
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            </div>
          </div>

          {/* Scheme Tabs */}
          <div className="flex w-full overflow-x-auto gap-1.5 [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setActiveTab("ALL")} className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${activeTab === "ALL" ? "bg-[#166534] text-white border-[#166534]" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]"}`}>
              All Schemes
            </button>
            {activeSchemes.map(scheme => (
              <button key={scheme.id} onClick={() => setActiveTab(scheme.id)} className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${activeTab === scheme.id ? "bg-[#166534] text-white border-[#166534]" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]"}`}>
                {scheme.schemeName}
              </button>
            ))}
          </div>

        </div>

        {(error || accountsError || schemesError) && (
          <div className="mt-2 flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-700">
            <AlertCircle size={12} /> {error || accountsError || schemesError}
          </div>
        )}
      </div>

      {/* ==================================================
          DATA LIST (TABLE & CARDS)
      ================================================== */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
        {loading || accountsLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#166534]" />
          </div>
        ) : processedInvestors.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 bg-[#F9FAFB]">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#E5E7EB] text-[#9CA3AF]"><UserRound size={20} /></div>
            <h2 className="text-sm font-bold text-[#111827]">No Records Found</h2>
            <p className="mt-1 text-[11px] text-[#6B7280]">Adjust your filters or register a new investor.</p>
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
                        <button onClick={() => requestSort("fullName")} className="flex items-center gap-1.5 hover:text-[#111827]">
                          Name <SortIcon columnKey="fullName" />
                        </button>
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Contact & Accounts</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                        <button onClick={() => requestSort("totalAmount")} className="flex w-full justify-end items-center gap-1.5 hover:text-[#111827]">
                          Total Funds <SortIcon columnKey="totalAmount" />
                        </button>
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                        <button onClick={() => requestSort("totalGold")} className="flex w-full justify-end items-center gap-1.5 hover:text-[#111827]">
                          Total Gold <SortIcon columnKey="totalGold" />
                        </button>
                      </th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Status</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {paginatedInvestors.map((investor) => {
                      const summary = investorSummaries.get(investor.id) || { accounts: [], totalAmount: 0, totalGold: 0, hasSip: false, hasAmountAccount: false };
                      return (
                        <tr key={investor.id} className="group hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] border border-[#DCFCE7] text-xs font-bold text-[#166534]">
                                {(investor.fullName || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-[#111827]">{investor.fullName}</p>
                                <p className="text-[10px] font-medium text-[#6B7280] flex items-center gap-1"><MapPin size={10}/> {investor.city || "No Location"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <p className="text-[11px] font-bold text-[#374151] flex items-center gap-1.5"><Phone size={10} className="text-[#9CA3AF]"/> {investor.mobileNumber}</p>
                            <div className="mt-1 flex flex-wrap gap-1 items-center max-w-[200px]">
                              {summary.accounts.length === 0 ? <span className="text-[9px] text-[#9CA3AF] italic">No accounts</span> : summary.accounts.slice(0, 2).map(acc => (
                                <button key={acc.id} onClick={() => navigate(`/crm/investment/accounts/${acc.id}`)} className="px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-white text-[9px] font-bold text-[#4B5563] shadow-sm hover:border-[#166534] transition-colors">
                                  {acc.accountNumber || "—"}
                                </button>
                              ))}
                              {summary.accounts.length > 2 && <span className="text-[9px] font-bold text-[#166534]">+{summary.accounts.length - 2}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-right">
                            <span className={`text-xs font-black font-mono tracking-tight ${summary.hasAmountAccount ? "text-[#111827]" : "text-[#9CA3AF]"}`}>
                              {summary.hasAmountAccount ? formatCurrency(summary.totalAmount) : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-right">
                            <span className={`text-xs font-bold font-mono tracking-tight ${summary.hasSip ? "text-[#166534]" : "text-[#9CA3AF]"}`}>
                              {summary.hasSip ? formatGold(summary.totalGold) : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-center">
                            <StatusBadge status={investor.status} />
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => navigate(`/crm/investment/investors/${investor.id}`)} className="p-1.5 rounded-md text-[#4B5563] hover:text-[#111827] hover:bg-white border border-transparent hover:border-[#E5E7EB] shadow-sm transition-all" title="View Profile">
                                <Eye size={14} />
                              </button>
                              <button onClick={() => openEdit(investor)} className="p-1.5 rounded-md text-[#4B5563] hover:text-[#166534] hover:bg-white border border-transparent hover:border-[#E5E7EB] shadow-sm transition-all" title="Edit">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => handleToggleStatus(investor)} className="p-1.5 rounded-md text-[#9CA3AF] hover:text-rose-600 hover:bg-white border border-transparent hover:border-[#E5E7EB] shadow-sm transition-all" title="Toggle Status">
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
              {paginatedInvestors.map((investor) => {
                const summary = investorSummaries.get(investor.id) || { accounts: [], totalAmount: 0, totalGold: 0, hasSip: false, hasAmountAccount: false };
                return (
                  <div key={investor.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between border-b border-[#F3F4F6] pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] font-bold text-lg">
                          {(investor.fullName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#111827]">{investor.fullName}</p>
                          <p className="text-[10px] font-medium text-[#6B7280] flex items-center gap-1 mt-0.5"><Phone size={10}/> {investor.mobileNumber}</p>
                        </div>
                      </div>
                      <StatusBadge status={investor.status} />
                    </div>
                    
                    <div className="flex justify-between items-center mb-4 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                       <div className="flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Funds</span>
                         <span className="text-xs font-black font-mono text-[#111827]">{summary.hasAmountAccount ? formatCurrency(summary.totalAmount) : "—"}</span>
                       </div>
                       <div className="flex flex-col text-right">
                         <span className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Gold</span>
                         <span className="text-xs font-bold font-mono text-[#166534]">{summary.hasSip ? formatGold(summary.totalGold) : "—"}</span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => navigate(`/crm/investment/investors/${investor.id}`)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white py-2 text-[10px] font-bold text-[#374151] hover:bg-[#F9FAFB] shadow-sm">
                        <Eye size={12} /> View
                      </button>
                      <button onClick={() => openEdit(investor)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white py-2 text-[10px] font-bold text-[#374151] hover:bg-[#F9FAFB] shadow-sm">
                        <Edit3 size={12} /> Edit
                      </button>
                      <button onClick={() => handleToggleStatus(investor)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white py-2 text-[10px] font-bold text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 shadow-sm">
                        <Power size={12} /> Status
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* PAGINATION FOOTER */}
            {totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-between border-t border-[#E5E7EB] px-5 py-2.5 bg-[#F9FAFB]">
                <p className="text-[10px] font-bold text-[#6B7280]">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, processedInvestors.length)} of {processedInvestors.length}
                </p>
                <div className="flex gap-1.5">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[10px] font-bold rounded-md border border-[#E5E7EB] bg-white text-[#374151] disabled:opacity-50 hover:bg-[#F3F4F6] shadow-sm transition-colors">
                    Prev
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[10px] font-bold rounded-md border border-[#E5E7EB] bg-white text-[#374151] disabled:opacity-50 hover:bg-[#F3F4F6] shadow-sm transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ======================================================
          CREATE / EDIT WIZARD MODAL 
      ====================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 sm:px-8">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#111827]">
                  {modalStep === 1 ? "Verify Mobile Number" : editingId ? "Edit Profile" : "Register Investor"}
                </h2>
                <p className="text-[11px] font-medium text-[#6B7280]">
                  {modalStep === 1 ? "Ensure the profile doesn't already exist." : "Enter personal identity and initial investment details."}
                </p>
              </div>
              <button onClick={closeModal} disabled={saving} className="rounded-full p-2 text-[#9CA3AF] hover:bg-[#E5E7EB] hover:text-[#111827] transition-colors border border-transparent hover:border-[#D1D5DB]">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* STEP 1: MOBILE CHECK */}
            {modalStep === 1 && !matchedInvestors && (
              <form onSubmit={handleCheckMobile} className="p-8 sm:p-16 flex-1 flex flex-col items-center justify-center bg-white">
                <div className="flex flex-col items-center text-center max-w-sm w-full">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] shadow-sm">
                    <Phone size={32} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-[#111827]">Enter Mobile Number</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-[#6B7280]">
                    We will quickly check if an investor profile already exists with this phone number to avoid duplicates.
                  </p>
                  
                  <div className="mt-8 w-full text-left">
                    <InputField label="10-Digit Mobile" name="checkMobile" value={checkMobile} onChange={(e) => setCheckMobile(e.target.value)} type="tel" prefix="+91" required />
                  </div>
                  <button type="submit" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#166534] px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#14532D] hover:-translate-y-0.5">
                    Verify & Continue <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 1.5: MATCHES FOUND */}
            {modalStep === 1 && matchedInvestors && (
              <div className="p-6 sm:p-10 flex-1 overflow-y-auto bg-[#F9FAFB]">
                <div className="mx-auto max-w-2xl flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-900 mb-1">
                      <AlertCircle size={18} strokeWidth={2.5}/> 
                      <h3 className="text-sm font-bold">Existing Profiles Found</h3>
                    </div>
                    <p className="text-xs font-medium text-amber-800 leading-relaxed">
                      Found <span className="font-bold">{matchedInvestors.length}</span> profile(s) for <span className="font-bold tracking-wider">{checkMobile}</span>. Select an existing profile to edit, or create a new profile for a family member.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {matchedInvestors.map(inv => (
                      <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-[#E5E7EB] rounded-xl bg-white shadow-sm hover:border-[#166534]/40 transition-all">
                        <div className="flex items-center gap-4 mb-4 sm:mb-0">
                          <div className="h-12 w-12 flex items-center justify-center bg-[#F0FDF4] rounded-full text-[#166534] font-bold text-lg border border-[#DCFCE7]">
                              {(inv.fullName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-base font-bold text-[#111827] flex items-center gap-2">{inv.fullName} <StatusBadge status={inv.status} /></p>
                            <p className="text-[11px] font-medium text-[#6B7280] mt-0.5">{inv.email || "No Email"} • {inv.city || "No City"}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => openEdit(inv)} className="w-full sm:w-auto px-5 py-2.5 bg-white text-[#166534] border border-[#E5E7EB] text-xs font-bold rounded-lg hover:bg-[#F0FDF4] shadow-sm transition-colors">
                          Edit Profile
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col items-center border-t border-[#E5E7EB] pt-6">
                    <p className="text-[10px] font-bold text-[#9CA3AF] mb-3 uppercase tracking-wider">Creating account for a relative?</p>
                    <button type="button" onClick={proceedToNewProfile} className="px-6 py-2.5 bg-white border border-[#E5E7EB] text-[#374151] text-xs font-bold rounded-lg shadow-sm hover:bg-[#F9FAFB] transition-all">
                      Proceed with New Registration
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: FORM */}
            {modalStep === 2 && (
              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 animate-in fade-in duration-300">
                <div className="flex-1 overflow-y-auto p-5 sm:p-8 [&::-webkit-scrollbar]:hidden bg-white">
                  <div className="grid gap-6 lg:grid-cols-2">
                    
                    {/* Identity */}
                    <div className="space-y-4 rounded-[1.5rem] border border-[#E5E7EB] p-5 sm:p-6 bg-[#F9FAFB] shadow-sm h-fit">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-3 flex items-center gap-2"><UserRound size={16} className="text-[#166534]" /> Identity Details</h3>
                      <InputField label="Full Legal Name" name="fullName" value={formData.fullName} onChange={handleChange} required disabled={saving} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <InputField label="Primary Mobile" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} type="tel" prefix="+91" required disabled={saving} />
                        <InputField label="Alternate" name="alternateMobileNumber" value={formData.alternateMobileNumber} onChange={handleChange} type="tel" disabled={saving} />
                      </div>
                      <InputField label="Email Address" name="email" value={formData.email} onChange={handleChange} type="email" disabled={saving} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <InputField label="Date of Birth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} type="date" disabled={saving} />
                        <SelectField label="Gender" name="gender" value={formData.gender} onChange={handleChange} disabled={saving}>
                          <option value="">Select</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </SelectField>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4 rounded-[1.5rem] border border-[#E5E7EB] p-5 sm:p-6 bg-[#F9FAFB] shadow-sm h-fit">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-3 flex items-center gap-2"><MapPin size={16} className="text-[#166534]" /> Location Details</h3>
                      <div className="space-y-1 w-full">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Full Address</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} disabled={saving} rows={3} className="w-full resize-none rounded-xl border border-[#E2E8E4] bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#345343] focus:ring-2 focus:ring-[#345343]/20 shadow-sm" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <InputField label="City" name="city" value={formData.city} onChange={handleChange} disabled={saving} />
                        <InputField label="State" name="state" value={formData.state} onChange={handleChange} disabled={saving} />
                        <div className="sm:col-span-2"><InputField label="Postal Code" name="pincode" value={formData.pincode} onChange={handleChange} disabled={saving} /></div>
                      </div>
                    </div>
                  </div>

                  {/* INITIAL ENROLLMENT */}
                  {!editingId && (
                    <div className="mt-6 space-y-4 rounded-[1.5rem] border border-[#E5E7EB] p-5 sm:p-6 bg-white shadow-sm">
                      <div className="border-b border-[#E5E7EB] pb-3 flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2"><Wallet size={16} className="text-[#166534]"/> Initial Investment</h3>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="sm:col-span-2 lg:col-span-3">
                          <SelectField label="Select Scheme" name="schemeId" value={formData.schemeId} onChange={handleChange} required disabled={saving || schemesLoading}>
                            <option value="">{schemesLoading ? "Loading..." : "Select an investment scheme"}</option>
                            {activeSchemes.map(s => <option key={s.id} value={s.id}>{s.schemeName} — {s.installmentConfig?.type === "FIXED" ? `₹${s.installmentConfig.amount} Fixed` : "Variable"}</option>)}
                          </SelectField>
                        </div>

                        {/* Minimum Restriction Toggle */}
                        {hasSchemeMinimum && (
                          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 flex items-center justify-between">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-[#111827]">Enforce Scheme Minimum</p>
                              <p className="mt-1 text-[10px] font-medium text-[#6B7280]">
                                Standard minimum is <span className="font-bold text-[#166534]">{contributionUnit === "GOLD_GRAMS" ? `${schemeMinimum} g` : `₹${schemeMinimum.toLocaleString("en-IN")}`}</span>
                              </p>
                              {!formData.minimumRestrictionEnabled && (
                                <p className="mt-1 text-[9px] font-bold text-amber-600">Restriction disabled. Any amount accepted.</p>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setFormData(c => ({ ...c, minimumRestrictionEnabled: !c.minimumRestrictionEnabled }))}
                              className={`relative h-6 w-11 rounded-full transition-colors ${formData.minimumRestrictionEnabled ? "bg-[#166534]" : "bg-[#D1D5DB]"}`}
                            >
                              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${formData.minimumRestrictionEnabled ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        )}

                        <InputField label={isGoldScheme ? "Monthly Gold" : "Monthly Amount"} name="contributionValue" value={formData.contributionValue} onChange={handleChange} type="number" prefix={isGoldScheme ? "g" : "₹"} required disabled={saving || !selectedScheme} />
                        <InputField label="Enrollment Date" name="startDate" value={formData.startDate} onChange={handleChange} type="date" required disabled={saving} />
                      </div>
                    </div>
                  )}
                </div>

                {/* MODAL FOOTER */}
                <div className="flex shrink-0 items-center justify-between border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 sm:px-8">
                  <button type="button" onClick={() => !editingId ? setModalStep(1) : closeModal()} disabled={saving} className="rounded-xl px-5 py-2.5 text-xs font-bold text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827] transition-colors border border-transparent hover:border-[#D1D5DB]">
                    {!editingId ? "← Back" : "Cancel"}
                  </button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#166534] px-8 py-3 text-xs font-bold text-white shadow-md hover:bg-[#14532D] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                    {editingId ? "Save Changes" : "Complete Registration"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}