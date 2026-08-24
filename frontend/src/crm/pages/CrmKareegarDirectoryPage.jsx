import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Hammer,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  UserPlus,
  Users,
  Save,
  Loader2,
  X,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useKareegarEmployees } from "../modules/kareegar/hooks/useKareegarEmployees";
import { setKareegarLoginEnabled, setKareegarStatus } from "../modules/kareegar/services/kareegarTransactions";

// ============================================================
// INITIAL STATE
// ============================================================
const INITIAL_FORM = {
  type: "B2B",
  name: "",
  mobileNumber: "",
  email: "",
  dateOfBirth: "",
  city: "",
  loginEnabled: false,
};

// ============================================================
// MODAL COMPONENTS
// ============================================================
function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
}

function InputField({ label, required, type = "text", value, onChange, placeholder, icon: Icon }) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative flex overflow-hidden rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] transition-all focus-within:border-[#345343] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#345343]/20">
        {Icon && (
          <div className="flex w-10 items-center justify-center text-[#87968C]">
            <Icon size={14} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent py-3 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA] ${Icon ? "pr-4" : "px-4"}`}
        />
      </div>
    </div>
  );
}

function TypeSelector({ value, onChange }) {
  return (
    <div>
      <FieldLabel required>Kareegar Workflow Type</FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("B2B")}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
            value === "B2B" ? "border-[#345343] bg-[#F5F7F5] text-[#345343] shadow-sm" : "border-[#E2E8E4] bg-white text-[#68786D] hover:border-[#345343]/30"
          }`}
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${value === "B2B" ? "bg-[#345343] text-white" : "bg-[#F5F7F5] text-[#87968C]"}`}>
            <Building2 size={16} />
          </div>
          <div>
            <p className="text-xs font-bold">B2B</p>
            <p className="mt-0.5 text-[10px] font-medium text-[#87968C]">Business</p>
          </div>
          {value === "B2B" && <Check size={16} className="ml-auto" />}
        </button>

        <button
          type="button"
          onClick={() => onChange("B2J")}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
            value === "B2J" ? "border-[#345343] bg-[#F5F7F5] text-[#345343] shadow-sm" : "border-[#E2E8E4] bg-white text-[#68786D] hover:border-[#345343]/30"
          }`}
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${value === "B2J" ? "bg-[#345343] text-white" : "bg-[#F5F7F5] text-[#87968C]"}`}>
            <Hammer size={16} />
          </div>
          <div>
            <p className="text-xs font-bold">B2J</p>
            <p className="mt-0.5 text-[10px] font-medium text-[#87968C]">Retail Job</p>
          </div>
          {value === "B2J" && <Check size={16} className="ml-auto" />}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MOBILE/TABLET CARD VIEW
// ============================================================
function KareegarCard({ employee, onStatusChange, onLoginChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = employee.status !== "DISABLED";

  return (
    <div className="group relative rounded-2xl border border-[#E2E8E4] bg-white p-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] transition-all hover:border-[#345343]/30 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343]">
          {employee.type === "B2B" ? <Building2 size={20} /> : <Hammer size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#E2E8E4] bg-[#F5F7F5] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#345343]">
              {employee.kareegarId}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${employee.type === "B2B" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800"}`}>
              {employee.type}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {isActive ? "Active" : "Disabled"}
            </span>
          </div>

          <h3 className="mt-2 text-sm font-bold text-[#1B241E]">{employee.name}</h3>

          <div className="mt-2 flex flex-col gap-1.5">
            {employee.mobileNumber && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-[#68786D]">
                <Phone size={12} /> {employee.mobileNumber}
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-[#68786D] truncate">
                <Mail size={12} /> {employee.email}
              </div>
            )}
            {employee.city && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-[#68786D]">
                <MapPin size={12} /> {employee.city}
              </div>
            )}
          </div>
        </div>

        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8E4] text-[#87968C] transition hover:bg-[#F5F7F5] hover:text-[#1B241E]">
            <ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-[#E2E8E4] bg-white p-1 shadow-lg">
                <button onClick={async () => { setMenuOpen(false); await onStatusChange(employee, isActive ? "DISABLED" : "ACTIVE"); }} className="flex w-full items-center px-3 py-2.5 text-left text-xs font-bold text-[#1B241E] hover:bg-[#F5F7F5] rounded-lg">
                  {isActive ? "Disable Kareegar" : "Enable Kareegar"}
                </button>
                <button onClick={async () => { setMenuOpen(false); await onLoginChange(employee, !employee.loginEnabled); }} className="flex w-full items-center px-3 py-2.5 text-left text-xs font-bold text-[#1B241E] hover:bg-[#F5F7F5] rounded-lg">
                  {employee.loginEnabled ? "Revoke Login" : "Grant Login"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DESKTOP TABLE ROW
// ============================================================
function KareegarTableRow({ employee, onStatusChange, onLoginChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = employee.status !== "DISABLED";

  return (
    <tr className="group transition-colors hover:bg-[#F5F7F5]/50 border-b border-[#E2E8E4]/60 last:border-none">
      {/* ID & TYPE */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-[#1B241E]">{employee.kareegarId}</span>
          <span className={`inline-flex w-max items-center rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${employee.type === "B2B" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800"}`}>
            {employee.type === "B2B" ? "B2B Pro" : "B2J Retail"}
          </span>
        </div>
      </td>

      {/* NAME */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F7F5] border border-[#E2E8E4] text-[#345343] font-bold text-xs">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-[#1B241E]">{employee.name}</p>
          </div>
        </div>
      </td>

      {/* CONTACT */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1 text-[11px] font-medium text-[#68786D]">
          {employee.mobileNumber && <span className="flex items-center gap-1.5"><Phone size={10} /> {employee.mobileNumber}</span>}
          {employee.email && <span className="flex items-center gap-1.5"><Mail size={10} /> {employee.email}</span>}
        </div>
      </td>

      {/* LOCATION */}
      <td className="px-6 py-4 whitespace-nowrap">
        {employee.city ? (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#68786D]">
            <MapPin size={12} className="text-[#87968C]" /> {employee.city}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[#A3B0AA]">-</span>
        )}
      </td>

      {/* ACCESS & STATUS */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1.5">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-emerald-700" : "text-rose-700"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
            {isActive ? "Active" : "Disabled"}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${employee.loginEnabled ? "text-indigo-700" : "text-[#87968C]"}`}>
            {employee.loginEnabled ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
            {employee.loginEnabled ? "Login Access" : "No Access"}
          </span>
        </div>
      </td>

      {/* ACTIONS */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="relative inline-block text-left">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8E4] bg-white text-[#87968C] transition-all hover:border-[#345343] hover:text-[#345343] focus:outline-none">
            <ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-[#E2E8E4] bg-white p-1 shadow-lg">
                <button onClick={async () => { setMenuOpen(false); await onStatusChange(employee, isActive ? "DISABLED" : "ACTIVE"); }} className="flex w-full items-center px-3 py-2 text-left text-xs font-bold text-[#1B241E] hover:bg-[#F5F7F5] rounded-md transition-colors">
                  {isActive ? "Disable Kareegar" : "Enable Kareegar"}
                </button>
                <button onClick={async () => { setMenuOpen(false); await onLoginChange(employee, !employee.loginEnabled); }} className="flex w-full items-center px-3 py-2 text-left text-xs font-bold text-[#1B241E] hover:bg-[#F5F7F5] rounded-md transition-colors">
                  {employee.loginEnabled ? "Revoke Login" : "Grant Login"}
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function CrmKareegarDirectoryPage() {
  const navigate = useNavigate();
  const { employees, loading, saving, error, addEmployee } = useKareegarEmployees();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [actionError, setActionError] = useState("");

  const filteredEmployees = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesTab = activeTab === "ALL" || employee.type === activeTab;
      if (!matchesTab) return false;
      if (!searchValue) return true;
      return [employee.kareegarId, employee.name, employee.mobileNumber, employee.email, employee.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue));
    });
  }, [employees, activeTab, search]);

  const b2bCount = employees.filter((e) => e.type === "B2B").length;
  const b2jCount = employees.filter((e) => e.type === "B2J").length;

  const updateForm = (field, value) => setForm((c) => ({ ...c, [field]: value }));

  const openAddModal = () => {
    setForm(INITIAL_FORM);
    setFormError("");
    setActionError("");
    setShowModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;
    setShowModal(false);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.name.trim()) return setFormError("Name is required.");
    if (!form.mobileNumber.trim()) return setFormError("Mobile number is required.");

    try {
      await addEmployee({
        ...form,
        name: form.name.trim(),
        mobileNumber: form.mobileNumber.trim(),
        email: form.email.trim().toLowerCase(),
        dateOfBirth: form.dateOfBirth || null,
        city: form.city.trim() || null,
        loginEnabled: Boolean(form.loginEnabled),
        status: "ACTIVE",
      });
      setShowModal(false);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setFormError(submitError.message || "Failed to add Kareegar.");
    }
  };

  const handleStatusChange = async (employee, status) => {
    try {
      setActionError("");
      await setKareegarStatus(employee.type, employee.id, status);
    } catch (err) {
      setActionError(err.message || "Failed to update status.");
    }
  };

  const handleLoginChange = async (employee, enabled) => {
    try {
      setActionError("");
      await setKareegarLoginEnabled(employee.type, employee.id, enabled);
    } catch (err) {
      setActionError(err.message || "Failed to update login.");
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#F5F7F5] lg:bg-white p-4 sm:p-6 lg:p-8 lg:overflow-hidden min-h-0">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col min-h-0">
        
        {/* ==================================================
            HEADER & TOOLBAR (Pinned to top)
        ================================================== */}
        <div className="shrink-0 flex flex-col gap-5 border-b border-[#E2E8E4] pb-5 lg:pb-6">
          
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button onClick={() => navigate("/crm/settings/kareegar")} className="group mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C] transition-colors hover:text-[#345343]">
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
                Back to Settings
              </button>
              <h1 className="text-2xl font-bold tracking-tight text-[#1B241E] sm:text-3xl">Goldsmith Directory</h1>
              <p className="mt-1 max-w-2xl text-xs font-medium text-[#68786D]">Manage goldsmiths, assign workflows, and control portal access.</p>
            </div>
            <button onClick={openAddModal} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#345343] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1B241E] hover:-translate-y-0.5">
              <Plus size={16} /> Add Goldsmith
            </button>
          </div>

          {(error || actionError) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 shadow-sm">
              {actionError || error}
            </div>
          )}

          {/* ==================================================
              SEARCH & FILTER TABS
          ================================================== */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            
            <div className="inline-flex w-full sm:w-max rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] p-1 shadow-sm">
              <button onClick={() => setActiveTab("ALL")} className={`flex-1 sm:flex-none rounded-md px-4 py-1.5 text-xs font-bold transition-all ${activeTab === "ALL" ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60" : "text-[#87968C] hover:text-[#1B241E] border border-transparent"}`}>
                All <span className="ml-1 opacity-70">({employees.length})</span>
              </button>
              <button onClick={() => setActiveTab("B2B")} className={`flex-1 sm:flex-none rounded-md px-4 py-1.5 text-xs font-bold transition-all ${activeTab === "B2B" ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60" : "text-[#87968C] hover:text-[#1B241E] border border-transparent"}`}>
                B2B <span className="ml-1 opacity-70">({b2bCount})</span>
              </button>
              <button onClick={() => setActiveTab("B2J")} className={`flex-1 sm:flex-none rounded-md px-4 py-1.5 text-xs font-bold transition-all ${activeTab === "B2J" ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60" : "text-[#87968C] hover:text-[#1B241E] border border-transparent"}`}>
                Retail <span className="ml-1 opacity-70">({b2jCount})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
              <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87968C]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, or phone..." className="w-full rounded-lg border border-[#E2E8E4] bg-white py-2 pl-9 pr-4 text-xs font-semibold text-[#1B241E] outline-none transition focus:border-[#345343] focus:ring-2 focus:ring-[#345343]/20 shadow-sm placeholder:text-[#A3B0AA]" />
            </div>
          </div>
        </div>

        {/* ==================================================
            DATA RENDER
        ================================================== */}
        <div className="flex-1 min-h-0 flex flex-col pt-5 lg:pt-6">
          {filteredEmployees.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#E2E8E4] bg-white p-8 text-center shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F7F5] text-[#87968C]">
                <UserPlus size={28} />
              </div>
              <h2 className="mt-4 text-base font-bold text-[#1B241E]">No Goldsmiths Found</h2>
              <p className="mt-1.5 max-w-sm text-xs font-medium leading-relaxed text-[#68786D]">
                {search ? "No profiles match your current search criteria." : "Add your first goldsmith to start managing workflows."}
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden rounded-[2rem] border border-[#E2E8E4] bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)]">
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <table className="w-full text-left text-sm text-[#1B241E]">
                    <thead className="sticky top-0 z-10 bg-[#F5F7F5] text-[10px] font-bold uppercase tracking-wider text-[#87968C] shadow-sm backdrop-blur-md">
                      <tr>
                        <th className="px-6 py-4">ID & Workflow</th>
                        <th className="px-6 py-4">Goldsmith Details</th>
                        <th className="px-6 py-4">Contact Info</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Access Status</th>
                        <th className="px-6 py-4 text-right">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8E4]/60">
                      {filteredEmployees.map((emp) => (
                        <KareegarTableRow key={`${emp.type}-${emp.id}`} employee={emp} onStatusChange={handleStatusChange} onLoginChange={handleLoginChange} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE/TABLET CARDS */}
              <div className="flex lg:hidden flex-1 flex-col overflow-y-auto space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {filteredEmployees.map((emp) => (
                  <KareegarCard key={`${emp.type}-${emp.id}`} employee={emp} onStatusChange={handleStatusChange} onLoginChange={handleLoginChange} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================================================
          ADD KAREEGAR MODAL
      ================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B241E]/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-[#E2E8E4] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#E2E8E4] bg-[#F5F7F5]/50 px-6 py-5 sm:px-8">
              <div>
                <h2 className="text-lg font-bold text-[#1B241E]">Add Goldsmith</h2>
                <p className="mt-1 text-xs font-medium text-[#68786D]">Register a new goldsmith into the system.</p>
              </div>
              <button onClick={closeAddModal} className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[#87968C] transition hover:border-[#E2E8E4] hover:bg-white hover:text-[#1B241E]">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex flex-col gap-6">
                  
                  <TypeSelector value={form.type} onChange={(v) => updateForm("type", v)} />

                  <div className="rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">System ID</p>
                    <p className="mt-1 text-sm font-bold text-[#345343]">Auto-generated upon save</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <InputField label="Full Name" required value={form.name} onChange={(v) => updateForm("name", v)} placeholder="E.g. Rajesh Kumar" />
                    <InputField label="Mobile Number" required value={form.mobileNumber} onChange={(v) => updateForm("mobileNumber", v)} placeholder="+91..." icon={Phone} />
                    <InputField label="Email Address" type="email" value={form.email} onChange={(v) => updateForm("email", v)} placeholder="Email (optional)" icon={Mail} />
                    <InputField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => updateForm("dateOfBirth", v)} />
                    <div className="sm:col-span-2">
                      <InputField label="City / Location" value={form.city} onChange={(v) => updateForm("city", v)} placeholder="Workshop city" icon={MapPin} />
                    </div>
                  </div>

                  {/* REDESIGNED EXPLICIT PORTAL ACCESS CONTROL */}
                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel>Portal Access Configuration</FieldLabel>
                    <div className="grid grid-cols-2 gap-4">
                      
                      {/* Disable Box */}
                      <button
                        type="button"
                        onClick={() => updateForm("loginEnabled", false)}
                        className={`flex items-start sm:items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                          !form.loginEnabled 
                            ? "border-rose-200 bg-rose-50 text-rose-900 shadow-sm ring-1 ring-rose-500/10" 
                            : "border-[#E2E8E4] bg-[#F5F7F5] text-[#87968C] hover:bg-white hover:border-rose-200"
                        }`}
                      >
                        <div className={`flex shrink-0 h-10 w-10 items-center justify-center rounded-lg ${!form.loginEnabled ? "bg-rose-200/50 text-rose-700" : "bg-white text-[#87968C] shadow-sm"}`}>
                          <ShieldAlert size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold leading-tight">No Access</p>
                          <p className="mt-0.5 text-[10px] font-semibold opacity-75">Login Disabled</p>
                        </div>
                        {!form.loginEnabled && <Check size={16} className="hidden sm:block ml-auto text-rose-600" />}
                      </button>

                      {/* Enable Box */}
                      <button
                        type="button"
                        onClick={() => updateForm("loginEnabled", true)}
                        className={`flex items-start sm:items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                          form.loginEnabled 
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/10" 
                            : "border-[#E2E8E4] bg-[#F5F7F5] text-[#87968C] hover:bg-white hover:border-emerald-200"
                        }`}
                      >
                        <div className={`flex shrink-0 h-10 w-10 items-center justify-center rounded-lg ${form.loginEnabled ? "bg-emerald-200/50 text-emerald-700" : "bg-white text-[#87968C] shadow-sm"}`}>
                          <ShieldCheck size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold leading-tight">Allow Login</p>
                          <p className="mt-0.5 text-[10px] font-semibold opacity-75">Portal Access Enabled</p>
                        </div>
                        {form.loginEnabled && <Check size={16} className="hidden sm:block ml-auto text-emerald-600" />}
                      </button>

                    </div>
                  </div>

                  {formError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                      {formError}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#E2E8E4] bg-[#F5F7F5]/50 px-6 py-5 sm:px-8">
                <button type="button" onClick={closeAddModal} disabled={saving} className="rounded-xl border border-[#E2E8E4] bg-white px-6 py-3 text-xs font-bold text-[#68786D] transition hover:bg-[#F5F7F5] disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#345343] px-8 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1B241E] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Goldsmith</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}