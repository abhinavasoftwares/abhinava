import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  ShieldAlert,
  Scale,
  Gem,
  Calculator,
  Shapes,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useKareegarEmployees } from "../modules/kareegar/hooks/useKareegarEmployees";
import {
  setKareegarLoginEnabled,
  setKareegarStatus,
} from "../modules/kareegar/services/kareegarTransactions";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const INITIAL_FORM = {
  type: "B2B",
  name: "",
  mobileNumber: "",
  email: "",
  dateOfBirth: "",
  city: "",
  loginEnabled: false,
};

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1 block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
}

function InputField({
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative flex overflow-hidden rounded-md border border-slate-200 bg-slate-50 transition-all focus-within:border-slate-400 focus-within:bg-white">
        {Icon && (
          <div className="flex w-8 items-center justify-center text-slate-400">
            <Icon size={12} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent py-2 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 ${
            Icon ? "pr-2.5" : "px-2.5"
          }`}
        />
      </div>
    </div>
  );
}

function TypeSelector({ value, onChange }) {
  return (
    <div>
      <FieldLabel required>Workflow Classification</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("B2B")}
          className={`flex items-center gap-2 rounded-md border p-2.5 text-left transition-all ${
            value === "B2B"
              ? "border-slate-900 bg-white text-slate-900 shadow-2xs"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded ${
              value === "B2B"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            <Building2 size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight">B2B Workshop</p>
            <p className="text-[10px] text-slate-400">Wholesale & Casting</p>
          </div>
          {value === "B2B" && <Check size={13} className="ml-auto text-slate-900" />}
        </button>

        <button
          type="button"
          onClick={() => onChange("B2J")}
          className={`flex items-center gap-2 rounded-md border p-2.5 text-left transition-all ${
            value === "B2J"
              ? "border-slate-900 bg-white text-slate-900 shadow-2xs"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded ${
              value === "B2J"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            <Hammer size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight">B2J Retail Bench</p>
            <p className="text-[10px] text-slate-400">In-House & Repairs</p>
          </div>
          {value === "B2J" && <Check size={13} className="ml-auto text-slate-900" />}
        </button>
      </div>
    </div>
  );
}

function KareegarCard({ employee, onStatusChange, onLoginChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = employee.status !== "DISABLED";

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all hover:border-slate-300">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            {employee.type === "B2B" ? <Building2 size={14} /> : <Hammer size={14} />}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-slate-700">
                {employee.kareegarId}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono font-medium text-slate-600 uppercase">
                {employee.type}
              </span>
              <span
                className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase border ${
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {isActive ? "Active" : "Disabled"}
              </span>
            </div>

            <h3 className="mt-1 text-xs font-semibold text-slate-900 truncate">
              {employee.name}
            </h3>

            <div className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-slate-500">
              {employee.mobileNumber && (
                <div className="flex items-center gap-1 font-mono text-[10.5px]">
                  <Phone size={10} className="text-slate-400" /> <span>{employee.mobileNumber}</span>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-1 truncate text-[10.5px]">
                  <Mail size={10} className="text-slate-400" /> <span className="truncate">{employee.email}</span>
                </div>
              )}
              {employee.city && (
                <div className="flex items-center gap-1 text-[10.5px]">
                  <MapPin size={10} className="text-slate-400" /> <span>{employee.city}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-7 z-40 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await onStatusChange(employee, isActive ? "DISABLED" : "ACTIVE");
                  }}
                  className="flex w-full items-center px-2.5 py-1.5 text-left text-slate-800 hover:bg-slate-50 rounded"
                >
                  {isActive ? "Disable Artisan" : "Enable Artisan"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await onLoginChange(employee, !employee.loginEnabled);
                  }}
                  className="flex w-full items-center px-2.5 py-1.5 text-left text-slate-800 hover:bg-slate-50 rounded"
                >
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

function KareegarTableRow({ employee, onStatusChange, onLoginChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = employee.status !== "DISABLED";

  return (
    <tr className="hover:bg-slate-50/70 border-b border-slate-100 last:border-none transition-colors">
      <td className="px-4 py-2.5 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-semibold text-slate-900">
            {employee.kareegarId}
          </span>
          <span className="inline-flex w-max items-center rounded bg-slate-100 border border-slate-200/70 px-1.5 py-0.2 text-[9px] font-mono font-medium uppercase text-slate-600">
            {employee.type === "B2B" ? "B2B Workshop" : "B2J Retail"}
          </span>
        </div>
      </td>

      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold text-xs">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">
              {employee.name}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
          {employee.mobileNumber && (
            <span className="flex items-center gap-1 font-mono text-[10.5px]">
              <Phone size={10} className="text-slate-400" /> {employee.mobileNumber}
            </span>
          )}
          {employee.email && (
            <span className="flex items-center gap-1 truncate max-w-[190px] text-[10.5px]">
              <Mail size={10} className="text-slate-400" /> {employee.email}
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-2.5 whitespace-nowrap">
        {employee.city ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-700">
            <MapPin size={11} className="text-slate-400" /> {employee.city}
          </span>
        ) : (
          <span className="text-xs text-slate-300 font-mono">—</span>
        )}
      </td>

      <td className="px-4 py-2.5 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider ${
              isActive ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {isActive ? "Active" : "Disabled"}
          </span>

          <span
            className={`inline-flex items-center gap-1 text-[9.5px] font-mono uppercase ${
              employee.loginEnabled ? "text-slate-700 font-medium" : "text-slate-400"
            }`}
          >
            {employee.loginEnabled ? (
              <ShieldCheck size={10} className="text-emerald-600" />
            ) : (
              <ShieldAlert size={10} className="text-slate-400" />
            )}
            <span>{employee.loginEnabled ? "Portal Access" : "No Login"}</span>
          </span>
        </div>
      </td>

      <td className="px-4 py-2.5 whitespace-nowrap text-right">
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 transition-colors"
          >
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-7 z-40 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await onStatusChange(employee, isActive ? "DISABLED" : "ACTIVE");
                  }}
                  className="flex w-full items-center px-2.5 py-1.5 text-left text-slate-800 hover:bg-slate-50 rounded"
                >
                  {isActive ? "Disable Artisan" : "Enable Artisan"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await onLoginChange(employee, !employee.loginEnabled);
                  }}
                  className="flex w-full items-center px-2.5 py-1.5 text-left text-slate-800 hover:bg-slate-50 rounded"
                >
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

export default function CrmKareegarDirectoryPage() {
  const navigate = useNavigate();
  const { employees, loading, saving, error, addEmployee } =
    useKareegarEmployees();

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
      return [
        employee.kareegarId,
        employee.name,
        employee.mobileNumber,
        employee.email,
        employee.city,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(searchValue));
    });
  }, [employees, activeTab, search]);

  const b2bCount = employees.filter((e) => e.type === "B2B").length;
  const b2jCount = employees.filter((e) => e.type === "B2J").length;

  const updateForm = (field, value) =>
    setForm((c) => ({ ...c, [field]: value }));

  const openAddModal = (e) => {
    e?.stopPropagation();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) return setFormError("Full name is required.");
    if (!form.mobileNumber.trim()) {
      return setFormError("Mobile number is required.");
    }

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
    } catch (err) {
      setFormError(err.message || "Failed to add artisan record.");
    }
  };

  const handleStatusChange = async (employee, status) => {
    try {
      setActionError("");
      await setKareegarStatus(employee.type, employee.id, status);
    } catch (err) {
      setActionError(err.message || "Failed to update artisan status.");
    }
  };

  const handleLoginChange = async (employee, enabled) => {
    try {
      setActionError("");
      await setKareegarLoginEnabled(employee.type, employee.id, enabled);
    } catch (err) {
      setActionError(err.message || "Failed to update login access.");
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      {/* Background Craftsmanship Doodles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        <div className="absolute -top-10 -left-8 text-slate-900/[0.035] rotate-[-12deg]">
          <Scale size={160} strokeWidth={1.1} />
        </div>
        <div className="absolute -top-12 -right-10 text-slate-900/[0.035] rotate-[22deg]">
          <Hammer size={170} strokeWidth={1.1} />
        </div>
        <div className="absolute top-1/3 -left-8 text-slate-900/[0.025] rotate-[15deg]">
          <Gem size={130} strokeWidth={1.2} />
        </div>
        <div className="absolute bottom-24 -right-6 text-slate-900/[0.03] rotate-[-22deg]">
          <Shapes size={140} strokeWidth={1.2} />
        </div>
        <div className="absolute -bottom-10 left-24 text-slate-900/[0.03] rotate-[10deg]">
          <Calculator size={140} strokeWidth={1.1} />
        </div>
      </div>

      {/* Header Command Bar */}
      <header className="shrink-0 h-13 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/crm/settings/kareegar")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            title="Return to Kareegar Settings"
          >
            <ArrowLeft size={13} />
          </button>

          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-slate-900 uppercase font-mono truncate">
                Artisan Directory
              </h1>
              <span className="hidden sm:inline-flex rounded-md bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-600">
                {employees.length} Registered
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
              Manage goldsmith bench master files, workflow types, and terminal access
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-7.5 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 active:scale-[0.98] transition-all shadow-2xs shrink-0 cursor-pointer"
        >
          <Plus size={13} />
          <span>Add Artisan</span>
        </button>
      </header>

      {/* Filter & Search Control Strip */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 z-10">
        <div className="inline-flex w-full sm:w-auto rounded-md border border-slate-200 bg-slate-50 p-0.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`flex-1 sm:flex-none rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("B2B")}
            className={`flex-1 sm:flex-none rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              activeTab === "B2B"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            B2B ({b2bCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("B2J")}
            className={`flex-1 sm:flex-none rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              activeTab === "B2J"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Retail ({b2jCount})
          </button>
        </div>

        <div className="relative w-full sm:w-60 shrink-0">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, phone..."
            className="h-7.5 w-full rounded-md border border-slate-200 bg-slate-50 pl-7.5 pr-6 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Error notification */}
      {(error || actionError) && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-200 px-4 py-1.5 text-xs font-mono font-medium text-rose-700 flex items-center justify-between">
          <span>{actionError || error}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="text-rose-500 hover:text-rose-700"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Main Data Workspace */}
      <main className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${noScroll} z-10`}>
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20 text-slate-500 space-y-1.5">
              <Loader2 size={18} className="animate-spin text-slate-700" />
              <span className="text-xs font-mono uppercase tracking-wider">
                Syncing artisan registry...
              </span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/80 p-10 text-center shadow-2xs backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                <UserPlus size={18} />
              </div>
              <h3 className="mt-2.5 text-xs font-semibold text-slate-900">
                No Goldsmith Profiles Found
              </h3>
              <p className="mt-1 max-w-xs text-[11px] text-slate-500 leading-relaxed">
                {search
                  ? "No artisan records match your query."
                  : "Add your first goldsmith to start managing work distributions."}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Register Artisan</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2">ID & Workflow</th>
                      <th className="px-4 py-2">Artisan Name</th>
                      <th className="px-4 py-2">Contact</th>
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2">Access & Status</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((emp) => (
                      <KareegarTableRow
                        key={`${emp.type}-${emp.id}`}
                        employee={emp}
                        onStatusChange={handleStatusChange}
                        onLoginChange={handleLoginChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Cards View */}
              <div className="lg:hidden space-y-2">
                {filteredEmployees.map((emp) => (
                  <KareegarCard
                    key={`${emp.type}-${emp.id}`}
                    employee={emp}
                    onStatusChange={handleStatusChange}
                    onLoginChange={handleLoginChange}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* =========================================================================
          MODAL PORTAL: Mounts to document.body, free from parent CSS transforms
      ========================================================================= */}
      {showModal && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={closeAddModal}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-900">
                    Register New Artisan
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Assign bench profile, contact details, and terminal privileges
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className={`min-h-0 flex-1 overflow-y-auto p-4 space-y-3.5 ${noScroll}`}>
                  {/* Workflow Classification */}
                  <TypeSelector
                    value={form.type}
                    onChange={(v) => updateForm("type", v)}
                  />

                  {/* Auto ID Token */}
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono">
                    <span className="text-slate-500 text-[11px]">System ID:</span>
                    <span className="font-semibold text-slate-900 text-[11px]">
                      AUTO-GENERATED ON SAVE
                    </span>
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="sm:col-span-2">
                      <InputField
                        label="Full Legal Name"
                        required
                        value={form.name}
                        onChange={(v) => updateForm("name", v)}
                        placeholder="e.g. Suresh Varma"
                      />
                    </div>

                    <InputField
                      label="Mobile Number"
                      required
                      value={form.mobileNumber}
                      onChange={(v) => updateForm("mobileNumber", v)}
                      placeholder="+91..."
                      icon={Phone}
                    />

                    <InputField
                      label="Email Address"
                      type="email"
                      value={form.email}
                      onChange={(v) => updateForm("email", v)}
                      placeholder="Optional email"
                      icon={Mail}
                    />

                    <InputField
                      label="Date of Birth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(v) => updateForm("dateOfBirth", v)}
                    />

                    <InputField
                      label="Workshop Area"
                      value={form.city}
                      onChange={(v) => updateForm("city", v)}
                      placeholder="e.g. Zaveri Bazaar"
                      icon={MapPin}
                    />
                  </div>

                  {/* Portal Access Control */}
                  <div className="space-y-1 pt-0.5">
                    <FieldLabel>Portal Access</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateForm("loginEnabled", false)}
                        className={`flex items-center gap-2 rounded-md border p-2 text-left transition-all ${
                          !form.loginEnabled
                            ? "border-rose-200 bg-rose-50 text-rose-900 shadow-2xs"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded ${
                            !form.loginEnabled ? "bg-rose-200 text-rose-800" : "bg-white text-slate-400"
                          }`}
                        >
                          <ShieldAlert size={12} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight">No Access</p>
                          <p className="text-[9px] font-mono opacity-70">Login Locked</p>
                        </div>
                        {!form.loginEnabled && (
                          <Check size={12} className="ml-auto text-rose-700" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateForm("loginEnabled", true)}
                        className={`flex items-center gap-2 rounded-md border p-2 text-left transition-all ${
                          form.loginEnabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-2xs"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded ${
                            form.loginEnabled ? "bg-emerald-200 text-emerald-800" : "bg-white text-slate-400"
                          }`}
                        >
                          <ShieldCheck size={12} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight">Allow Login</p>
                          <p className="text-[9px] font-mono opacity-70">Portal Enabled</p>
                        </div>
                        {form.loginEnabled && (
                          <Check size={12} className="ml-auto text-emerald-700" />
                        )}
                      </button>
                    </div>
                  </div>

                  {formError && (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs font-medium text-rose-700">
                      {formError}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    disabled={saving}
                    className="h-7.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-7.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-medium text-white hover:bg-slate-800 transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={12} />
                        <span>Save Artisan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}