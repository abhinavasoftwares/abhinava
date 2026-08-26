import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Loader2,
  Plus,
  Power,
  Search,
  UserRound,
  X,
  Download,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  ArrowRight,
  Wallet
} from "lucide-react";

import { useInvestmentInvestors } from "../hooks/useInvestmentInvestors";
import { useInvestmentSchemes } from "../hooks/useInvestmentSchemes";
import {
  createInvestmentInvestor,
  updateInvestmentInvestor,
  updateInvestmentInvestorStatus,
} from "../services/investmentInvestors";
import { createInvestmentAccount } from "../services/investmentAccounts";

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
  monthlyAmount: "",
  startDate: "",
};

// ============================================================
// UI COMPONENTS
// ============================================================
function InputField({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false, prefix = "" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex overflow-hidden rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] transition-all focus-within:border-[#345343] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#345343]/20 shadow-sm disabled:opacity-60">
        {prefix && (
          <span className="flex items-center border-r border-[#E2E8E4] px-4 text-sm font-bold text-[#68786D]">
            {prefix}
          </span>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent px-4 py-3 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA]"
        />
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
          className="w-full appearance-none rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] px-4 py-3 pr-10 text-sm font-semibold text-[#1B241E] outline-none transition-all focus:border-[#345343] focus:bg-white focus:ring-2 focus:ring-[#345343]/20 disabled:opacity-60 shadow-sm"
        >
          {children}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#87968C]" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "ACTIVE" || !status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
      isActive ? "border-emerald-200/60 bg-emerald-50 text-emerald-700" : "border-rose-200/60 bg-rose-50 text-rose-700"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  if (typeof dateString === "object" && dateString.seconds) {
    return new Date(dateString.seconds * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function InvestmentInvestorsPage() {
  const { investors, loading, error } = useInvestmentInvestors();
  const { schemes, loading: schemesLoading, error: schemesError } = useInvestmentSchemes();

  // Wizard & Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [checkMobile, setCheckMobile] = useState("");
  const [matchedInvestors, setMatchedInvestors] = useState(null);

  // Form States
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  
  // Page Filters & Toasts
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toast, setToast] = useState(null);

  const activeSchemes = useMemo(() => schemes.filter((scheme) => scheme.status === "ACTIVE"), [schemes]);
  const selectedScheme = useMemo(() => activeSchemes.find((scheme) => scheme.id === formData.schemeId) || null, [activeSchemes, formData.schemeId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ==========================================================
  // TWO-STEP WIZARD HANDLERS
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
    const trimmedMobile = checkMobile.trim();

    if (!/^[0-9]{10}$/.test(trimmedMobile)) {
      setToast({ type: "error", message: "Please enter a valid 10-digit mobile number." });
      return;
    }

    const matches = investors.filter(inv => inv.mobileNumber === trimmedMobile);
    
    if (matches.length > 0) {
      setMatchedInvestors(matches);
    } else {
      setFormData({ ...INITIAL_FORM, mobileNumber: trimmedMobile });
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
      schemeId: "",
          monthlyAmount: "",
      startDate: "",
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
  // CRUD OPERATIONS
  // ==========================================================
  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    try {
      const fullName = formData.fullName.trim();
      const mobileNumber = formData.mobileNumber.trim();

      if (!fullName) throw new Error("Investor name is required.");
      if (!mobileNumber) throw new Error("Mobile number is required.");
      if (!/^[0-9]{10}$/.test(mobileNumber)) throw new Error("Enter a valid 10-digit mobile number.");

      setSaving(true);

      // --- EXISTING INVESTOR (UPDATE ONLY) ---
      if (editingId) {
        await updateInvestmentInvestor(editingId, {
          fullName,
          mobileNumber,
          alternateMobileNumber: formData.alternateMobileNumber.trim(),
          email: formData.email.trim().toLowerCase(),
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        });

        setToast({ type: "success", message: "Investor profile updated." });
        closeModal();
        return;
      }

      // --- NEW INVESTOR (CREATE PROFILE + ENROLLMENT) ---
      if (!formData.schemeId) throw new Error("Select an investment scheme.");
      if (!formData.startDate) throw new Error("Select the investment enrollment date.");

      const monthlyAmount = Number(formData.monthlyAmount);
      if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
        throw new Error("Enter a valid monthly amount.");
      }

      // Safe minimum amount check based on custom scheme structure
      const schemeInstallmentType =
        selectedScheme?.installmentConfig?.type || "FIXED";

      const minimumAmount = Number(
        selectedScheme?.installmentConfig?.amount ||
        selectedScheme?.monthlyAmount ||
        0
      );

      if (schemeInstallmentType === "FIXED") {
        if (!Number.isFinite(minimumAmount) || minimumAmount <= 0) {
          throw new Error(
            "Selected scheme has an invalid monthly amount configuration."
          );
        }

        if (monthlyAmount < minimumAmount) {
          throw new Error(
            `Monthly amount must be at least ₹${minimumAmount.toLocaleString("en-IN")}.`
          );
        }
      }

      // 1. Create Profile
      const investor = await createInvestmentInvestor({
        fullName,
        mobileNumber,
        alternateMobileNumber: formData.alternateMobileNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        status: "ACTIVE"
      });

      // 2. Create First Account
      const account = await createInvestmentAccount({
        investorId: investor.id,
        scheme: selectedScheme,
        monthlyAmount,
        startDate: formData.startDate,
      });

      setToast({
        type: "success",
        message: `Investor and investment account ${account.accountNumber} created successfully.`,
      });
      closeModal();
    } catch (submitError) {
      console.error("Failed to save investor:", submitError);
      setToast({ type: "error", message: submitError.message || "Failed to save investor and account." });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(investor) {
    try {
      const nextStatus = investor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await updateInvestmentInvestorStatus(investor.id, nextStatus);
      setToast({ type: "success", message: nextStatus === "ACTIVE" ? "Investor activated." : "Investor deactivated." });
    } catch (statusError) {
      console.error("Failed to update investor status:", statusError);
      setToast({ type: "error", message: statusError.message || "Failed to update investor status." });
    }
  }

  // ==========================================================
  // DATA PREP & EXPORT
  // ==========================================================
  const filteredInvestors = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return investors.filter((investor) => {
      const matchesSearch = !searchValue || 
        investor.fullName?.toLowerCase().includes(searchValue) || 
        investor.mobileNumber?.toLowerCase().includes(searchValue) || 
        investor.email?.toLowerCase().includes(searchValue);
      const matchesStatus = statusFilter === "ALL" || (investor.status || "ACTIVE") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [investors, search, statusFilter]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Full Name,Mobile,Alternate Mobile,Email,DOB,Gender,City,State,Status\n";
    filteredInvestors.forEach(inv => {
      csvContent += `${inv.fullName},${inv.mobileNumber},${inv.alternateMobileNumber || ""},${inv.email || ""},${inv.dateOfBirth || ""},${inv.gender || ""},${inv.city || ""},${inv.state || ""},${inv.status || "ACTIVE"}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Investors_Directory_${new Date().toLocaleDateString('en-IN')}.csv`);
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

        {/* ======================================================
            COMPACT HEADER & CONTROL STRIP
        ====================================================== */}
        <div className="shrink-0 flex flex-col gap-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8E4]/60 pb-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[#345343]">
                <UserRound size={16} strokeWidth={2.5} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Customer Directory</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#1B241E] sm:text-2xl">Investors</h1>
              <p className="mt-1 text-xs font-medium text-[#68786D]">Manage investors enrolled in jewellery investment schemes.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExportCSV} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E2E8E4] bg-white px-4 text-xs font-bold text-[#345343] shadow-sm transition-colors hover:bg-[#F5F7F5] w-full sm:w-auto">
                <Download size={14} /> Export CSV
              </button>
              <button onClick={openCreate} className="flex h-9 items-center justify-center gap-2 rounded-lg bg-[#345343] px-5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1B241E] w-full sm:w-auto">
                <Plus size={14} strokeWidth={2.5} /> Add Investor
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
                  placeholder="Search name, mobile or email..."
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

        {error && (
          <div className="mb-4 flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* ======================================================
            MAIN DATA RENDER (Table ~70vh Desktop, Cards Mobile)
        ====================================================== */}
        <div className="flex-1 min-h-[60vh] flex flex-col overflow-hidden rounded-[1.5rem] bg-transparent lg:bg-white lg:border lg:border-[#E2E8E4] lg:shadow-sm">
          {loading ? (
            <div className="flex h-full items-center justify-center bg-white/50">
              <Loader2 size={32} className="animate-spin text-[#345343]" />
            </div>
          ) : filteredInvestors.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-[#E2E8E4] rounded-[1.5rem]">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F7F5] text-[#87968C]">
                <UserRound size={24} />
              </div>
              <h2 className="text-base font-bold text-[#1B241E]">No Investors Found</h2>
              <p className="mt-1.5 max-w-sm text-xs font-medium text-[#68786D]">No investors match your current search or there are no profiles in the directory.</p>
              {!search && statusFilter === "ALL" && (
                <button onClick={openCreate} className="mt-5 rounded-lg bg-[#345343] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1B241E] shadow-sm">
                  Add First Investor
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
                      <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Investor Identity</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Contact & Demographics</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Location</th>
                      <th className="px-6 py-3.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Status</th>
                      <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="overflow-y-auto divide-y divide-[#E2E8E4]/60 [&::-webkit-scrollbar]:hidden">
                    {filteredInvestors.map((investor) => (
                      <tr key={investor.id} className="hover:bg-[#F5F7F5]/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E2E8E4] text-[#345343] shadow-sm">
                              {investor.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#1B241E]">{investor.fullName}</p>
                              {investor.email && <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[#87968C]"><Mail size={10} /> {investor.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="flex items-center gap-1.5 text-xs font-bold text-[#1B241E]"><Phone size={12} className="text-[#87968C]"/> {investor.mobileNumber}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-[#87968C]">
                            {investor.dateOfBirth && <span><CalendarDays size={10} className="inline mr-1"/>{formatDate(investor.dateOfBirth)}</span>}
                            {investor.gender && <span className="uppercase px-1.5 py-0.5 rounded bg-[#F5F7F5] border border-[#E2E8E4]">{investor.gender}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="flex items-center gap-1.5 text-xs font-bold text-[#1B241E]"><MapPin size={12} className="text-[#87968C]"/> {investor.city || "—"}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-[#87968C] ml-4">{investor.state || "—"} {investor.pincode ? `- ${investor.pincode}` : ""}</p>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <StatusBadge status={investor.status} />
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(investor)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8E4] bg-white text-[#345343] transition-colors hover:bg-[#F5F7F5] shadow-sm" title="Edit Profile">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleToggleStatus(investor)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8E4] bg-white text-[#87968C] transition-colors hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm" title={investor.status === "ACTIVE" ? "Deactivate" : "Activate"}>
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
                {filteredInvestors.map((investor) => (
                  <div key={investor.id} className="rounded-2xl border border-[#E2E8E4] bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between border-b border-[#E2E8E4]/60 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343] font-bold text-lg border border-[#E2E8E4]">
                          {investor.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1B241E]">{investor.fullName}</p>
                          <p className="text-[10px] font-medium text-[#87968C]">{investor.mobileNumber}</p>
                        </div>
                      </div>
                      <StatusBadge status={investor.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl bg-[#F5F7F5] p-2.5 border border-[#E2E8E4]/40">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Location</p>
                        <p className="mt-0.5 text-xs font-bold text-[#1B241E] truncate">{investor.city || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-[#F5F7F5] p-2.5 border border-[#E2E8E4]/40 text-right">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Date of Birth</p>
                        <p className="mt-0.5 text-xs font-bold text-[#1B241E]">{formatDate(investor.dateOfBirth)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(investor)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8E4] bg-white px-3 py-2 text-xs font-bold text-[#345343] shadow-sm active:bg-[#F5F7F5]">
                        <Edit3 size={14} /> Edit
                      </button>
                      <button onClick={() => handleToggleStatus(investor)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8E4] bg-white px-3 py-2 text-xs font-bold text-[#68786D] shadow-sm active:bg-rose-50 active:text-rose-600">
                        <Power size={14} /> {investor.status === "ACTIVE" ? "Disable" : "Enable"}
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
          CREATE / EDIT WIZARD MODAL (Premium Glass UI)
      ====================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B241E]/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#E2E8E4] bg-[#F5F7F5]/50 px-6 py-5 sm:px-8">
              <div>
                <h2 className="text-lg font-bold text-[#1B241E]">
                  {modalStep === 1 ? "Verify Investor" : editingId ? "Edit Investor Profile" : "Register New Investor"}
                </h2>
                <p className="mt-1 text-xs font-medium text-[#68786D]">
                  {modalStep === 1 ? "Check for existing profiles before creating a new one." : "Maintain the investor's core identity and communication details."}
                </p>
              </div>
              <button onClick={closeModal} disabled={saving} className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[#87968C] transition hover:border-[#E2E8E4] hover:bg-white hover:text-[#1B241E]">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* STEP 1: MOBILE NUMBER CHECK */}
            {modalStep === 1 && !matchedInvestors && (
              <form onSubmit={handleCheckMobile} className="p-8 sm:p-12 flex-1 flex flex-col items-center justify-center bg-white">
                <div className="flex flex-col items-center text-center max-w-md w-full">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#F5F7F5] border border-[#E2E8E4]/60 text-[#345343] shadow-sm">
                    <Phone size={28} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-[#1B241E]">Enter Mobile Number</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-[#68786D]">
                    We will quickly check if an investor profile already exists with this phone number to avoid duplicates.
                  </p>
                  
                  <div className="mt-8 w-full">
                    <InputField 
                      label="10-Digit Mobile Number" 
                      name="checkMobile" 
                      value={checkMobile} 
                      onChange={(e) => setCheckMobile(e.target.value)} 
                      type="tel" 
                      placeholder="e.g. 9876543210" 
                      required 
                    />
                  </div>
                  
                  <div className="mt-8 flex w-full justify-center">
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#345343] px-8 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1B241E] hover:-translate-y-0.5">
                      Check & Continue <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 1.5: EXISTING MATCHES FOUND */}
            {modalStep === 1 && matchedInvestors && (
              <div className="p-6 sm:p-8 flex-1 overflow-y-auto bg-[#F5F7F5]/30">
                <div className="mx-auto max-w-2xl flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                  
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <p className="text-sm font-bold text-amber-900 flex items-center gap-2"><AlertCircle size={16}/> Existing Profiles Found</p>
                    <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                      We found <span className="font-bold">{matchedInvestors.length}</span> profile(s) linked to the number <span className="font-bold">{checkMobile}</span>. You can edit an existing profile or purposefully create a new one.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {matchedInvestors.map(inv => (
                      <div key={inv.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-[#E2E8E4] rounded-2xl bg-white shadow-sm hover:border-[#345343]/30 transition-all">
                        <div className="flex items-center gap-4 mb-4 sm:mb-0">
                          <div className="h-12 w-12 flex items-center justify-center bg-[#F5F7F5] rounded-xl text-[#345343] font-bold text-lg border border-[#E2E8E4]/60">
                              {inv.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-base font-bold text-[#1B241E] flex items-center gap-2">
                              {inv.fullName} <StatusBadge status={inv.status} />
                            </p>
                            <p className="text-xs font-medium text-[#87968C] mt-1">{inv.email || "No Email"} • {inv.city || "No City"}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => openEdit(inv)} className="w-full sm:w-auto px-5 py-2.5 bg-[#F5F7F5] text-[#345343] border border-[#E2E8E4] text-xs font-bold rounded-xl hover:bg-white hover:border-[#345343] transition-colors shadow-sm">
                          View & Edit Profile
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col items-center border-t border-[#E2E8E4]/60 pt-6">
                    <p className="text-xs font-bold text-[#87968C] mb-4 uppercase tracking-wider">Creating an account for a relative/family member?</p>
                    <button type="button" onClick={proceedToNewProfile} className="px-8 py-3 bg-white border border-[#E2E8E4] text-[#1B241E] text-xs font-bold rounded-xl shadow-sm hover:bg-[#F5F7F5] transition-all">
                      Proceed to Register New Profile
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* STEP 2: FULL REGISTRATION / EDIT FORM */}
            {modalStep === 2 && (
              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 animate-in fade-in duration-300">
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden">
                  
                  {/* GRID FOR PERSONAL + ADDRESS */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    
                    {/* Identity & Contact */}
                    <div className="space-y-5 rounded-2xl border border-[#E2E8E4] p-5 sm:p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] bg-white h-fit">
                      <div className="border-b border-[#E2E8E4]/70 pb-3 mb-2">
                        <h3 className="text-sm font-bold text-[#1B241E]">Identity & Contact</h3>
                      </div>
                      <InputField label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. Rahul Sharma" required disabled={saving} />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <InputField label="Mobile Number" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} type="tel" placeholder="10-digit number" required disabled={saving} />
                        <InputField label="Alternate Mobile" name="alternateMobileNumber" value={formData.alternateMobileNumber} onChange={handleChange} type="tel" placeholder="Optional" disabled={saving} />
                      </div>
                      <InputField label="Email Address" name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Optional" disabled={saving} />
                      <div className="grid gap-5 sm:grid-cols-2">
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
                    <div className="space-y-5 rounded-2xl border border-[#E2E8E4] p-5 sm:p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] bg-white h-fit">
                      <div className="border-b border-[#E2E8E4]/70 pb-3 mb-2">
                        <h3 className="text-sm font-bold text-[#1B241E]">Location Details</h3>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Full Address</label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="House / street / locality"
                          disabled={saving}
                          rows={3}
                          className="w-full resize-none rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] px-4 py-3 text-sm font-semibold text-[#1B241E] outline-none transition-all placeholder:text-[#A3B0AA] focus:border-[#345343] focus:bg-white focus:ring-2 focus:ring-[#345343]/20 disabled:opacity-60 shadow-sm"
                        />
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <InputField label="City" name="city" value={formData.city} onChange={handleChange} placeholder="City" disabled={saving} />
                        <InputField label="State" name="state" value={formData.state} onChange={handleChange} placeholder="State" disabled={saving} />
                        <div className="sm:col-span-2">
                          <InputField label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} type="text" placeholder="e.g. 560001" disabled={saving} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FIRST INVESTMENT ENROLLMENT (ONLY IF CREATING NEW INVESTOR) */}
                  {!editingId && (
                    <div className="mt-6 space-y-5 rounded-2xl border border-[#E2E8E4] p-5 sm:p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] bg-[#F5F7F5]/50">
                      <div className="border-b border-[#E2E8E4]/70 pb-3 mb-2 flex items-center gap-2">
                        <Wallet size={16} className="text-[#345343]" />
                        <h3 className="text-sm font-bold text-[#1B241E]">First Investment Enrollment</h3>
                      </div>
                      <p className="text-xs font-medium text-[#68786D] -mt-3 mb-5">Select a scheme to generate the primary investment account.</p>
                      
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="sm:col-span-2 lg:col-span-3">
                          <SelectField label="Investment Scheme" name="schemeId" value={formData.schemeId} onChange={handleChange} required disabled={saving || schemesLoading}>
                            <option value="">
                              {schemesLoading ? "Loading schemes..." : activeSchemes.length === 0 ? "No active schemes" : "Select investment scheme"}
                            </option>
                            {activeSchemes.map((scheme) => (
                              <option key={scheme.id} value={scheme.id}>
                                {scheme.schemeName} — {scheme.installmentConfig?.type === "FIXED" ? `₹${Number(scheme.installmentConfig?.amount || scheme.monthlyAmount || 0).toLocaleString("en-IN")}` : "Variable"} / month
                              </option>
                            ))}
                          </SelectField>
                          {schemesError && <p className="mt-1.5 text-[10px] font-semibold text-rose-600">{schemesError}</p>}
                        </div>

                        <div className="rounded-xl border border-[#D8E5DD] bg-[#F5F9F6] px-4 py-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">
                            Account Number
                          </p>
                          <p className="mt-1 text-base font-black tracking-widest text-[#345343]">
                            {selectedScheme?.accountNumberConfig?.prefix
                              ? `${selectedScheme.accountNumberConfig.prefix}-${String(1).padStart(
                                  Number(selectedScheme.accountNumberConfig.padding || 3),
                                  "0"
                                )}`
                              : "Will be generated automatically"}
                          </p>
                          <p className="mt-1 text-[9px] font-medium text-[#68786D]">
                            The system assigns the next available account number automatically.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <InputField label="Monthly Amount" name="monthlyAmount" value={formData.monthlyAmount} onChange={handleChange} type="number" prefix="₹" placeholder={selectedScheme ? String(selectedScheme.installmentConfig?.amount || selectedScheme.monthlyAmount || "Amount") : "Amount"} required disabled={saving} />
                          {selectedScheme && (
                            <p className="text-[9px] font-bold text-[#68786D] px-1">
                              Minimum: <span className="text-[#345343]">₹{Number(selectedScheme.installmentConfig?.amount || selectedScheme.monthlyAmount || 0).toLocaleString("en-IN")}</span>
                            </p>
                          )}
                        </div>

                        <InputField label="Enrollment Date" name="startDate" value={formData.startDate} onChange={handleChange} type="date" required disabled={saving} />
                      </div>
                    </div>
                  )}

                </div>

                {/* MODAL FOOTER ACTIONS */}
                <div className="flex shrink-0 items-center justify-between border-t border-[#E2E8E4] bg-[#F5F7F5]/50 px-6 py-4 sm:px-8">
                  <button type="button" onClick={() => !editingId ? setModalStep(1) : closeModal()} disabled={saving} className="rounded-xl px-4 py-2.5 text-xs font-bold text-[#87968C] transition hover:text-[#1B241E] disabled:opacity-50">
                    {!editingId ? "← Back to Verification" : "Cancel"}
                  </button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#345343] px-8 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1B241E] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={16} /> {editingId ? "Save Changes" : "Complete Registration"}</>}
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