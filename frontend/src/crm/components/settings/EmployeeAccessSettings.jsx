import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  Search,
  Plus,
  X,
  Check,
  ShieldCheck,
  Loader2,
  Trash2,
  Edit2,
  Mail,
  Phone,
  KeyRound,
  Lock,
  UserCheck,
} from "lucide-react";

import {
  createEmployeeAccess,
  updateEmployeeAccess,
  disableEmployeeAccess,
  subscribeToEmployees,
  sendEmployeeWelcomeEmail,
} from "../../services/employeeAccess";
import { useCrmAuth } from "../../context/CrmAuthContext";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

/* =========================================================
   PREDEFINED ROLES
========================================================= */

const PREDEFINED_ROLES = [
  {
    value: "ADMIN_OWNER",
    label: "Admin / Owner",
    description: "Full Read, Write, and Delete access to every enabled module.",
  },
  {
    value: "MANAGER_STOCK_COORDINATOR",
    label: "Manager / Stock Coordinator",
    description: "Operational access based on assigned modules and permissions.",
  },
  {
    value: "SALES_EXECUTIVE",
    label: "Sales Executive",
    description: "Sales and customer operations based on assigned permissions.",
  },
  {
    value: "INVESTOR",
    label: "Investor",
    description: "Restricted strictly to the investor's individual ledger accounts.",
  },
];

/* =========================================================
   MODULES
========================================================= */

const CRM_MODULES = [
  { value: "sales", label: "Sales & Invoicing", description: "Invoices, estimates, and customer billing." },
  { value: "investments", label: "Investments", description: "Investor ledger accounts and returns." },
  { value: "customers", label: "Customers", description: "Client directory and purchase histories." },
  { value: "inventory", label: "Inventory", description: "Live stock weights, bullion, and tags." },
  { value: "kareegar", label: "Kareegar Workshop", description: "Goldsmith issuing, returns, and melt math." },
  { value: "reports", label: "Reports & Audit", description: "Business telemetry and ledger exports." },
];

/* =========================================================
   HELPERS
========================================================= */

function createEmptyPermissions() {
  const permissions = {};
  CRM_MODULES.forEach((module) => {
    permissions[module.value] = { read: false, write: false, delete: false };
  });
  return permissions;
}

function createAdminPermissions() {
  const permissions = createEmptyPermissions();
  CRM_MODULES.forEach((module) => {
    permissions[module.value] = { read: true, write: true, delete: true };
  });
  return permissions;
}

function createInvestorPermissions() {
  const permissions = createEmptyPermissions();
  permissions.investments = { read: true, write: true, delete: false };
  return permissions;
}

const EMPTY_FORM = {
  name: "",
  mobile: "",
  email: "",
  role: "",
  enableGoogleLogin: true,
  enableOtpLogin: false,
  selectedModules: createEmptyPermissions(),
  enforce24HourLogout: false,
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function EmployeeAccessSettings() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    selectedModules: createEmptyPermissions(),
  });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [sendingWelcomeEmail, setSendingWelcomeEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const {
  activityActor,
} = useCrmAuth();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToEmployees(
      (items) => {
        setEmployees(items);
        setLoading(false);
      },
      (err) => {
        console.error("Employee subscription failed:", err);
        setError(err?.message || "Unable to load employee access records.");
        setLoading(false);
      }
    );
    return () => unsubscribe?.();
  }, []);

  const isAdmin = form.role === "ADMIN_OWNER";
  const isInvestor = form.role === "INVESTOR";

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) =>
      [employee.name, employee.email, employee.mobile, employee.roleLabel]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(term))
    );
  }, [employees, search]);

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
      selectedModules: createEmptyPermissions(),
    });
    setEditingId(null);
    setError("");
  }

  function handleOpenCreate() {
    resetForm();
    setShowModal(true);
  }

  function handleRoleChange(role) {
    let permissions = createEmptyPermissions();
    if (role === "ADMIN_OWNER") permissions = createAdminPermissions();
    if (role === "INVESTOR") permissions = createInvestorPermissions();

    setForm((prev) => ({
      ...prev,
      role,
      selectedModules: permissions,
    }));
  }

  function updatePermission(moduleId, permission) {
    if (isAdmin) return;
    if (isInvestor && moduleId !== "investments") return;

    setForm((prev) => {
      const current = prev.selectedModules[moduleId] || {
        read: false,
        write: false,
        delete: false,
      };

      const updated = { ...current };

      if (permission === "read") {
        updated.read = !current.read;
        if (!updated.read) {
          updated.write = false;
          updated.delete = false;
        }
      }
      if (permission === "write") {
        updated.write = !current.write;
        if (updated.write) updated.read = true;
      }
      if (permission === "delete") {
        updated.delete = !current.delete;
        if (updated.delete) {
          updated.read = true;
          updated.write = true;
        }
      }

      return {
        ...prev,
        selectedModules: {
          ...prev.selectedModules,
          [moduleId]: updated,
        },
      };
    });
  }

  function handleEdit(employee) {
    const permissions = createEmptyPermissions();

    Object.entries(employee.permissions || {}).forEach(([modId, modPerms]) => {
      if (permissions[modId]) {
        permissions[modId] = {
          read: Boolean(modPerms.read),
          write: Boolean(modPerms.write),
          delete: Boolean(modPerms.delete),
        };
      }
    });

    setEditingId(employee.id);
    setForm({
      name: employee.name || "",
      mobile: employee.mobile || "",
      email: employee.email || "",
      role: employee.role || "",
      enableGoogleLogin: Boolean(employee.loginMethods?.google),
      enableOtpLogin: Boolean(employee.loginMethods?.otp),
      selectedModules: permissions,
      enforce24HourLogout: Boolean(employee.enforce24HourLogout),
    });
    setError("");
    setShowModal(true);
  }

  function validate() {
    if (!form.name.trim()) return "Employee full name is required.";
    if (!form.mobile.trim()) return "Mobile contact number is required.";
    if (!form.email.trim()) return "Work email address is required.";
    if (!form.role) return "Role assignment is required.";
    if (!form.enableGoogleLogin && !form.enableOtpLogin) {
      return "Select at least one permitted login method.";
    }

    const hasModules = Object.values(form.selectedModules).some((p) => p.read);
    if (!hasModules) return "Authorize at least one operational module.";

    return "";
  }

  async function handleSave(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const roleDef = PREDEFINED_ROLES.find((r) => r.value === form.role);
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        roleLabel: roleDef?.label || form.role,
        enableGoogleLogin: form.enableGoogleLogin,
        enableOtpLogin: form.enableOtpLogin,
        permissions: form.selectedModules,
        enforce24HourLogout: form.enforce24HourLogout,
      };

      if (editingId) {
        await updateEmployeeAccess(editingId, payload);
      } else {
        await createEmployeeAccess(payload,activityActor);
      }

      setShowModal(false);
      resetForm();
    } catch (saveErr) {
      setError(saveErr?.message || "Failed to update employee access.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(id) {
    if (!window.confirm("Revoke all CRM console access for this employee?")) return;
    try {
      await disableEmployeeAccess(id);
    } catch (err) {
      setError(err?.message || "Failed to disable employee.");
    }
  }

  async function handleSendWelcomeEmail() {
  if (!selectedEmployeeId) {
    setError("Select an active employee first.");
    return;
  }

  const employee = employees.find(
    (item) => item.id === selectedEmployeeId
  );

  if (!employee) {
    setError("Selected employee could not be found.");
    return;
  }

  if (employee.status === "DISABLED") {
    setError("Welcome email cannot be sent to a disabled employee.");
    return;
  }

  if (!employee.email) {
    setError("Selected employee does not have an email address.");
    return;
  }

  const confirmed = window.confirm(
    `Send the welcome email to ${employee.name} (${employee.email})?`
  );

  if (!confirmed) return;

  setSendingWelcomeEmail(true);
  setError("");
  setEmailMessage("");

  try {
    await sendEmployeeWelcomeEmail(employee.id);

    setEmailMessage(
      `Welcome email sent successfully to ${employee.email}.`
    );
  } catch (err) {
    console.error("Welcome email failed:", err);

    setError(
      err?.message ||
        "Unable to send the welcome email."
    );
  } finally {
    setSendingWelcomeEmail(false);
  }
}

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      {/* 1. Header Toolbar */}
      <header className="shrink-0 h-13 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
            <Users size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-slate-900 uppercase font-mono truncate">
                Employee Access Control
              </h1>
              <span className="hidden sm:inline-flex rounded-md bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 text-[9px] font-mono font-medium text-slate-600">
                {employees.length} Operators
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex h-7.5 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 active:scale-[0.98] transition-all shadow-2xs shrink-0 cursor-pointer"
        >
          <Plus size={13} />
          <span>Provision Employee</span>
        </button>
      </header>
      {/* 2. Search & Info Bar */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 sm:px-6 py-2 flex flex-col lg:flex-row items-center justify-between gap-2.5 z-10">
        <div className="flex w-full lg:w-auto items-center gap-2">
          <div className="relative w-full sm:w-72 shrink-0">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, email, role..."
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

          <span className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono text-slate-500 whitespace-nowrap">
            {selectedEmployeeId
              ? "1 employee selected"
              : "Select an employee"}
          </span>
        </div>

        <div className="flex w-full lg:w-auto items-center justify-between lg:justify-end gap-2">
          <div className="hidden xl:flex items-center gap-2 text-[10.5px] font-mono text-slate-500">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span>STRICT RBAC & FIREBASE AUTH SYNCED</span>
          </div>

          <button
            type="button"
            onClick={handleSendWelcomeEmail}
            disabled={
              !selectedEmployeeId ||
              sendingWelcomeEmail
            }
            className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 transition-all shadow-2xs"
          >
            {sendingWelcomeEmail ? (
              <>
                <Loader2
                  size={12}
                  className="animate-spin"
                />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Mail size={12} />
                <span>Send Welcome Email</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && !showModal && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-200 px-4 py-1.5 text-xs font-mono font-medium text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X size={12} />
          </button>
        </div>
      )}
      {emailMessage && !showModal && (
        <div className="shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-xs font-mono font-medium text-emerald-700 flex items-center justify-between">
          <span>{emailMessage}</span>

          <button
            type="button"
            onClick={() => setEmailMessage("")}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 3. Main Employee Workspace Ledger */}
      <main className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${noScroll} z-10`}>
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20 text-slate-500 space-y-1.5">
              <Loader2 size={18} className="animate-spin text-slate-700" />
              <span className="text-xs font-mono uppercase tracking-wider">
                Syncing operator directory...
              </span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/80 p-10 text-center shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                <Users size={18} />
              </div>
              <h3 className="mt-2.5 text-xs font-semibold text-slate-900">
                No Employees Configured
              </h3>
              <p className="mt-1 max-w-xs text-[11px] text-slate-500 leading-relaxed">
                {search
                  ? "No employee records match your query."
                  : "Provision staff credentials and module authorizations above."}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-all shadow-2xs"
                >
                  <Plus size={13} />
                  <span>Provision First Staff Account</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2 w-10 text-center">
                        Select
                      </th>
                      <th className="px-4 py-2">
                        Staff Member
                      </th>
                      <th className="px-4 py-2">Assigned Role</th>
                      <th className="px-4 py-2">Contact Details</th>
                      <th className="px-4 py-2">Auth Rails</th>
                      <th className="px-4 py-2">Session Policy</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((emp) => {
                      const isDisabled = emp.status === "DISABLED";
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedEmployeeId === emp.id}
                            disabled={isDisabled}
                            onChange={() => {
                              setSelectedEmployeeId((current) =>
                                current === emp.id ? "" : emp.id
                              );
                              setError("");
                              setEmailMessage("");
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                            aria-label={`Select ${emp.name}`}
                          />
                        </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-xs">
                                {emp.name?.charAt(0)?.toUpperCase() || "E"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                  {emp.name}
                                </p>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {emp.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200/80 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-700">
                              {emp.roleLabel || emp.role}
                            </span>
                          </td>

                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-0.5 text-[11px] text-slate-500 font-mono">
                              <span className="flex items-center gap-1">
                                <Mail size={10} className="text-slate-400" />
                                {emp.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone size={10} className="text-slate-400" />
                                {emp.mobile}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {emp.loginMethods?.google && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9.5px] font-mono text-slate-600 border border-slate-200">
                                  Google SSO
                                </span>
                              )}
                              {emp.loginMethods?.otp && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9.5px] font-mono text-slate-600 border border-slate-200">
                                  SMS OTP
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[10.5px]">
                            {emp.enforce24HourLogout ? (
                              <span className="text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2 text-[9px] font-bold">
                                24h Expiry
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Standard</span>
                            )}
                          </td>

                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider border ${
                                isDisabled
                                  ? "border-rose-200 bg-rose-50 text-rose-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isDisabled ? "bg-rose-500" : "bg-emerald-500"
                                }`}
                              />
                              {isDisabled ? "Disabled" : "Active"}
                            </span>
                          </td>

                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(emp)}
                                className="h-6.5 w-6.5 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                title="Edit Configuration"
                              >
                                <Edit2 size={11} />
                              </button>
                              {!isDisabled && (
                                <button
                                  type="button"
                                  onClick={() => handleDisable(emp.id)}
                                  className="h-6.5 w-6.5 inline-flex items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Disable Access"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet View Cards */}
              <div className="lg:hidden divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const isDisabled = emp.status === "DISABLED";
                  return (
                    <div key={emp.id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedEmployeeId === emp.id}
                            disabled={isDisabled}
                            onChange={() => {
                              setSelectedEmployeeId((current) =>
                                current === emp.id ? "" : emp.id
                              );
                              setError("");
                              setEmailMessage("");
                            }}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 disabled:opacity-40 cursor-pointer"
                            aria-label={`Select ${emp.name}`}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {emp.name}
                              </h4>

                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-mono uppercase font-bold ${
                                  isDisabled
                                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                }`}
                              >
                                {isDisabled ? "Disabled" : "Active"}
                              </span>
                            </div>

                            <p className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                              {emp.roleLabel || emp.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(emp)}
                            className="h-7 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700"
                          >
                            Edit
                          </button>

                          {!isDisabled && (
                            <button
                              type="button"
                              onClick={() => handleDisable(emp.id)}
                              className="h-7 px-2 rounded-md border border-rose-200 bg-white text-xs text-rose-600"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5 text-[10.5px] font-mono text-slate-500">
                        <span>{emp.email}</span>
                        <span>{emp.mobile}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          4. MODAL PORTAL: Mounts to document.body, free from parent CSS transforms
      ========================================================================= */}
      {showModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-900">
                    {editingId ? "Update Employee Profile" : "Provision Employee Access"}
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Configure staff identity, authorized login rails, and granular RBAC rights
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                <div className={`min-h-0 flex-1 overflow-y-auto p-4 space-y-4 ${noScroll}`}>
                  {error && (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs font-medium text-rose-700">
                      {error}
                    </div>
                  )}

                  {/* Identity Grid */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      1. Personnel Coordinates
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="mb-1 block text-[10px] font-mono font-medium text-slate-500">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="e.g. Arun Gowda"
                          className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-mono font-medium text-slate-500">
                          Mobile Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.mobile}
                          onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                          placeholder="+91..."
                          className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[10px] font-mono font-medium text-slate-500">
                          Corporate Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="employee@abhinava.com"
                          className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role Assignment */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      2. Role Profile
                    </span>
                    <select
                      value={form.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="h-8.5 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white font-sans"
                    >
                      <option value="">Select Predefined Role</option>
                      {PREDEFINED_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label} — {r.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Login Methods */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      3. Permitted Authentication Rails
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, enableGoogleLogin: !form.enableGoogleLogin })
                        }
                        className={`flex items-center justify-between p-2 rounded-md border text-left transition-all ${
                          form.enableGoogleLogin
                            ? "border-slate-900 bg-white text-slate-900 shadow-2xs font-semibold"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span className="text-xs">Google OAuth</span>
                        {form.enableGoogleLogin && <Check size={12} className="text-slate-900" />}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, enableOtpLogin: !form.enableOtpLogin })
                        }
                        className={`flex items-center justify-between p-2 rounded-md border text-left transition-all ${
                          form.enableOtpLogin
                            ? "border-slate-900 bg-white text-slate-900 shadow-2xs font-semibold"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span className="text-xs">SMS OTP Code</span>
                        {form.enableOtpLogin && <Check size={12} className="text-slate-900" />}
                      </button>
                    </div>
                  </div>

                  {/* Module Matrix */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                        4. Module Authorization Matrix
                      </span>
                      {isAdmin && (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded">
                          FULL ADMIN PRIVILEGES
                        </span>
                      )}
                      {isInvestor && (
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 rounded">
                          INVESTOR ONLY
                        </span>
                      )}
                    </div>

                    <div className="rounded-md border border-slate-200 overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-500 uppercase">
                            <th className="px-3 py-1.5">Module Scope</th>
                            <th className="px-2 py-1.5 text-center w-14">Read</th>
                            <th className="px-2 py-1.5 text-center w-14">Write</th>
                            <th className="px-2 py-1.5 text-center w-14">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {CRM_MODULES.map((m) => {
                            const perms = form.selectedModules[m.value] || {};
                            const isRestricted =
                              isAdmin || (isInvestor && m.value !== "investments");

                            return (
                              <tr key={m.value} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-slate-900 text-xs">
                                    {m.label}
                                  </p>
                                  <p className="text-[10px] text-slate-400 leading-tight">
                                    {m.description}
                                  </p>
                                </td>

                                {["read", "write", "delete"].map((pType) => (
                                  <td key={pType} className="px-2 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      disabled={isRestricted}
                                      checked={Boolean(perms[pType])}
                                      onChange={() => updatePermission(m.value, pType)}
                                      className="rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Session Expiry Checkbox */}
                  <div className="pt-1 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.enforce24HourLogout}
                        onChange={(e) =>
                          setForm({ ...form, enforce24HourLogout: e.target.checked })
                        }
                        className="rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        Enforce compulsory 24-hour session expiry
                      </span>
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>{editingId ? "Update Employee" : "Provision Account"}</span>
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