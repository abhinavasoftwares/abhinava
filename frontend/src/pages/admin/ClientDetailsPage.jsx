import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Layers,
  Lock,
  MessageSquare,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  X,
  FileText,
  Search,
  Cpu,
  Sparkles,
  ChevronRight,
  Code2,
  Radio,
  FileCode2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof data === "object" && data?.detail
        ? data.detail
        : typeof data === "string" && data
        ? data
        : `Request failed with status ${response.status}`;

    throw new Error(detail);
  }

  return data;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value, currency = "INR") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function normaliseModules(modules) {
  if (!modules) return [];
  if (Array.isArray(modules)) return modules;
  if (typeof modules === "string") {
    try {
      const parsed = JSON.parse(modules);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return modules.split(",").map((m) => m.trim()).filter(Boolean);
    }
  }
  if (typeof modules === "object") {
    return Object.entries(modules)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }
  return [];
}

const SECTIONS = [
  { id: "overview", label: "Overview & Governance", icon: Building2 },
  { id: "subscription", label: "Licensing & Term", icon: CreditCard },
  { id: "invoices", label: "Invoice History", icon: FileText },
  { id: "communication", label: "Dispatch Log", icon: MessageSquare },
  { id: "firebase", label: "Data Node & Infrastructure", icon: Database },
];

/* ============================================================
   STATUS PILL
============================================================ */

function StatusPill({ status }) {
  const normalized = String(status || "").trim().toUpperCase();

  if (
    normalized === "ACTIVE" ||
    normalized === "READY" ||
    normalized === "OPERATIONAL" ||
    normalized === "PAID" ||
    normalized === "DELIVERED" ||
    normalized === "VERIFIED"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {normalized === "READY" ? "READY" : normalized}
      </span>
    );
  }

  if (
    normalized === "DISABLED" ||
    normalized === "FAILED" ||
    normalized === "ERROR" ||
    normalized === "CANCELLED" ||
    normalized === "OVERDUE"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50/80 px-2.5 py-0.5 text-[10px] font-mono font-bold text-rose-800">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {normalized}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {normalized || "PENDING"}
    </span>
  );
}

function AttributeRow({ label, value, mono = false, copyable = false, onCopy }) {
  return (
    <div className="group flex items-baseline justify-between gap-4 py-2.5 border-b border-slate-100/90 last:border-0 text-xs">
      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0 justify-end">
        <span
          className={`truncate font-medium text-slate-800 transition-colors group-hover:text-slate-950 ${
            mono ? "font-mono text-[11px]" : ""
          }`}
          title={value}
        >
          {value || "—"}
        </span>
        {copyable && value && (
          <button
            type="button"
            onClick={() => onCopy(value)}
            className="text-slate-300 hover:text-slate-700 transition-colors p-0.5"
            title="Copy value"
          >
            <Copy size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function ClientDetailsPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  // Active Section
  const [activeSection, setActiveSection] = useState("overview");
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  // Core Data States
  const [client, setClient] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [communications, setCommunications] = useState([]);
  const [communicationsLoading, setCommunicationsLoading] = useState(false);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [firebaseVerifying, setFirebaseVerifying] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [firebaseSyncing, setFirebaseSyncing] = useState(false);

  // Module Inspection States
  const [moduleFilter, setModuleFilter] = useState("");

  // Lifecycle Modal
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableReason, setDisableReason] = useState("");

  const loadClientDossier = useCallback(
    async (isSilent = false) => {
      if (!clientId) return;
      if (isSilent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const data = await apiRequest(`/clients/${clientId}`);
        const payload = data?.client || data;
        setClient(payload);

        apiRequest(`/subscriptions/client-subscriptions/${clientId}/entitlement`)
          .then((res) => setEntitlement(res))
          .catch(() => setEntitlement(null));

        apiRequest(`/clients/${clientId}/firebase-status`)
          .then((res) => setFirebaseStatus(res))
          .catch((err) =>
            setFirebaseStatus({
              status: "STANDBY",
              error: err.message || "Cluster unreached.",
            })
          );
      } catch (err) {
        setError(err?.message || "Failed to sync client dossier.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clientId]
  );

  const loadFirebaseStatus = useCallback(async () => {
    if (!clientId) return;
    setFirebaseVerifying(true);
    try {
      const data = await apiRequest(`/clients/${clientId}/firebase-status`);
      setFirebaseStatus(data);
      setToastMessage("Firebase cluster signal verified.");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      setFirebaseStatus({
        status: "ERROR",
        error: err.message || "Cluster check failed.",
      });
    } finally {
      setFirebaseVerifying(false);
    }
  }, [clientId]);

  const syncFirebaseConfig = useCallback(async () => {
  if (!clientId) return;

  const projectId = String(
    client?.firebase_project_id ||
      firebaseStatus?.firebase_project_id ||
      ""
  ).trim();

  if (!projectId) {
    setError("Firebase project ID is not configured for this client.");
    return;
  }

  setFirebaseSyncing(true);
  setError("");

  try {
    await apiRequest(`/clients/${clientId}/connect-firebase`, {
      method: "POST",
      body: JSON.stringify({
        firebase_project_id: projectId,
      }),
    });

    await loadClientDossier(true);

    setToastMessage(
      "Firebase configuration synchronized successfully."
    );

    setTimeout(() => setToastMessage(""), 3000);
  } catch (err) {
    console.error("Firebase configuration sync failed:", err);

    setError(
      err?.message ||
        "Unable to synchronize Firebase configuration."
    );
  } finally {
    setFirebaseSyncing(false);
  }
}, [
  clientId,
  client?.firebase_project_id,
  firebaseStatus?.firebase_project_id,
  loadClientDossier,
]);

  const loadInvoices = useCallback(async () => {
    if (!clientId) return;
    setInvoicesLoading(true);
    try {
      const data = await apiRequest(`/clients/${clientId}/invoices`);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.invoices)
        ? data.invoices
        : [];
      setInvoices(list);
    } catch {
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [clientId]);

  const loadCommunications = useCallback(async () => {
    if (!clientId) return;
    setCommunicationsLoading(true);
    try {
      const data = await apiRequest(`/clients/${clientId}/communications`);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.communications)
        ? data.communications
        : [];
      setCommunications(list);
    } catch {
      setCommunications([]);
    } finally {
      setCommunicationsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClientDossier();
  }, [loadClientDossier]);

  useEffect(() => {
    if (activeSection === "invoices") loadInvoices();
    if (activeSection === "communication") loadCommunications();
    if (activeSection === "firebase" && !firebaseStatus) loadFirebaseStatus();
  }, [activeSection, loadInvoices, loadCommunications, loadFirebaseStatus, firebaseStatus]);

  const modules = useMemo(
    () =>
      normaliseModules(
        entitlement?.modules?.length ? entitlement.modules : client?.modules
      ),
    [client, entitlement]
  );

  const filteredModules = useMemo(() => {
    const q = moduleFilter.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => String(m).toLowerCase().includes(q));
  }, [modules, moduleFilter]);

  const accountStatus = client?.account_status || client?.status || "ACTIVE";
  const isDisabled = String(accountStatus).toUpperCase() === "DISABLED";

  const triggerCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToastMessage(`Copied: ${text}`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleAccountLifecycle = async (action) => {
    setActionLoading(true);
    setError("");

    try {
      if (action === "disable") {
        if (!disableReason.trim()) {
          throw new Error("Reason required to suspend tenant.");
        }
        await apiRequest(`/clients/${clientId}/disable`, {
          method: "POST",
          body: JSON.stringify({ reason: disableReason.trim() }),
        });
        setToastMessage("Tenant access revoked successfully.");
        setDisableReason("");
        setShowDisableModal(false);
      } else {
        await apiRequest(`/clients/${clientId}/enable`, {
          method: "POST",
        });
        setToastMessage("Tenant credentials re-authorized.");
      }
      await loadClientDossier(true);
    } catch (err) {
      setError(err?.message || "Lifecycle state update failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const currentActiveSectionObj = useMemo(
    () => SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0],
    [activeSection]
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={20} className="animate-spin text-slate-400" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Querying Tenant Specifications...
          </p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <CircleAlert className="mx-auto text-rose-600 mb-3" size={24} />
          <h2 className="text-sm font-bold text-slate-900">Tenant Dossier Unreachable</h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            {error || "Record could not be retrieved from master registry."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/clients")}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black transition-colors"
          >
            Return to Ledger Directory
          </button>
        </div>
      </div>
    );
  }

  const ActiveIcon = currentActiveSectionObj.icon;

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      
      {/* -------------------------------------------------------------
          1. TOP DOSSIER COMMAND BAR (SHRINK-0)
      ------------------------------------------------------------- */}
      <header className="shrink-0 h-16 w-full border-b border-slate-200/90 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between z-10">
        
        {/* Identity Anchor */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/admin/clients")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-2xs"
            title="Return to Directory"
          >
            <ArrowLeft size={14} />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 p-1 shadow-2xs">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt=""
                  className="h-full w-full object-contain rounded-lg"
                />
              ) : (
                <span className="font-mono text-sm font-bold text-slate-700">
                  {client.business_name?.charAt(0)?.toUpperCase() || "C"}
                </span>
              )}
            </div>

            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-950 truncate tracking-tight">
                  {client.business_name}
                </h1>
                <StatusPill status={accountStatus} />
              </div>

              <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-400 mt-1 truncate">
                <span>TENANT #{client.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {client.crm_slug && (
            <a
              href={`${window.location.origin}/crm/${client.crm_slug}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <span>Portal</span>
              <ExternalLink size={12} className="text-slate-400" />
            </a>
          )}

          <button
            type="button"
            onClick={() => loadClientDossier(true)}
            disabled={refreshing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            title="Refresh Dossier"
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin text-slate-900" : "text-slate-500"}
            />
          </button>

          {isDisabled ? (
            <button
              type="button"
              onClick={() => handleAccountLifecycle("enable")}
              disabled={actionLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Unlock size={13} />
              <span className="hidden sm:inline">Authorize</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDisableModal((v) => !v)}
              disabled={actionLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 text-xs font-semibold text-rose-700 hover:bg-rose-100/70 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Lock size={13} />
              <span className="hidden sm:inline">Suspend</span>
            </button>
          )}
        </div>
      </header>

      {/* Ephemeral Feedback */}
      {toastMessage && (
        <div className="shrink-0 bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-mono text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check size={13} className="text-emerald-600" /> {toastMessage}
          </span>
          <button onClick={() => setToastMessage("")} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {showDisableModal && !isDisabled && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50/95 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-rose-800">
            <ShieldAlert size={14} className="shrink-0 text-rose-600" />
            <span>Confirm suspension: All client session tokens will be revoked immediately.</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              placeholder="Reason for suspension..."
              className="h-7 w-60 rounded border border-rose-300 bg-white px-2.5 text-xs text-slate-900 outline-none font-sans"
            />
            <button
              type="button"
              onClick={() => handleAccountLifecycle("disable")}
              disabled={actionLoading || !disableReason.trim()}
              className="h-7 rounded bg-rose-700 px-3 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50"
            >
              Revoke
            </button>
            <button
              type="button"
              onClick={() => setShowDisableModal(false)}
              className="h-7 rounded bg-white border border-rose-200 px-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          2. SECTION NAVIGATION BAR:
             - Desktop: Horizontal tabs
             - Mobile/Tablet: Dropdown trigger chip for bottom sheet
      ------------------------------------------------------------- */}
      <div className="shrink-0 border-b border-slate-200/90 bg-white px-4 sm:px-6 lg:px-8">
        
        {/* Desktop View (> lg) */}
        <div className="hidden lg:flex items-center gap-8 overflow-x-auto text-xs font-mono">
          {SECTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 py-3.5 font-bold transition-all border-b-2 ${
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon size={14} className={isActive ? "text-slate-900" : "text-slate-400"} />
                <span className="uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Small/Medium View (< lg) */}
        <div className="lg:hidden py-2.5 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Active Dossier Section
          </span>

          <button
            type="button"
            onClick={() => setBottomSheetOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-2xs hover:bg-slate-100 transition-all font-mono"
          >
            <ActiveIcon size={13} className="text-slate-600" />
            <span className="uppercase">{currentActiveSectionObj.label}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. MAIN VIEWPORT & RE-ENGINEERED MODULE CAPACITY HUB
      ------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden">
        
        {/* Main Section Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* =========================================================
                SECTION 1: OVERVIEW & GOVERNANCE
            ========================================================== */}
            {activeSection === "overview" && (
              <div className="space-y-6">
                
                {/* Governance Card */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-slate-500" />
                      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                        Governance & Legal Specification
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      MASTER REGISTER
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <AttributeRow label="Trading Entity" value={client.business_name} />
                    <AttributeRow label="Legal Corporate Name" value={client.legal_business_name || client.business_name} />
                    <AttributeRow label="Sector Category" value={client.business_type} />
                    <AttributeRow label="Operational Country" value={client.country} />
                    <AttributeRow label="PAN Identifier" value={client.pan} mono copyable onCopy={triggerCopy} />
                    <AttributeRow label="GSTIN Tax Token" value={client.gstin} mono copyable onCopy={triggerCopy} />
                    <AttributeRow label="Domain Endpoint" value={client.domain} />
                    <AttributeRow label="Welcome Greeting" value={client.welcome_message || `Welcome to ${client.business_name}`} />
                  </div>
                </div>

                {/* Authority & Contacts */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck size={15} className="text-slate-500" />
                      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                        Commercial Authority Contact
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      AUTHORIZED CONTACT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <AttributeRow label="Full Legal Name" value={client.owner_name} />
                    <AttributeRow label="Corporate Role" value={client.owner_role || "Principal Owner"} />
                    <AttributeRow label="Direct Email" value={client.owner_email} copyable onCopy={triggerCopy} />
                    <AttributeRow label="Contact Phone" value={client.owner_phone} copyable onCopy={triggerCopy} />
                    <AttributeRow label="Commercial Email" value={client.business_email} copyable onCopy={triggerCopy} />
                    <AttributeRow label="Commercial Phone" value={client.business_phone} copyable onCopy={triggerCopy} />
                  </div>
                </div>

                {/* Mobile / Tablet Inline Module Card Representation (< lg) */}
                <div className="lg:hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers size={15} className="text-slate-500" />
                      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                        Module Entitlements Matrix
                      </h2>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                      {modules.length} Active
                    </span>
                  </div>

                  {modules.length === 0 ? (
                    <p className="text-xs font-mono text-slate-400 py-3 text-center">
                      No standalone modules compiled. Baseline system is active.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modules.map((mod) => (
                        <div
                          key={mod}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 bg-slate-50/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {String(mod).replace(/[_-]/g, " ").toUpperCase()}
                              </p>
                              <span className="text-[10px] font-mono text-slate-400 truncate block">
                                key: {String(mod).toLowerCase()}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => triggerCopy(mod)}
                            className="text-slate-400 hover:text-slate-700 p-1"
                            title="Copy key"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* =========================================================
                SECTION 2: SUBSCRIPTION & TERMS
            ========================================================== */}
            {activeSection === "subscription" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard size={15} className="text-slate-500" />
                      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                        Authoritative Licensing Terms
                      </h2>
                    </div>
                    <StatusPill status={client.subscription_status || "ACTIVE"} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <AttributeRow label="Assigned Plan Tier" value={entitlement?.plan_name || client.plan || "Standard"} />
                    <AttributeRow label="Subscription Token" value={entitlement?.subscription_id} mono copyable onCopy={triggerCopy} />
                    <AttributeRow label="Billing Cadence" value={client.billing_cycle || "MONTHLY"} />
                    <AttributeRow label="Commencement Date" value={formatDate(client.start_date || client.created_at)} />
                    <AttributeRow label="Contract Renewal" value={formatDate(entitlement?.subscription_end)} />
                    <AttributeRow label="Settlement Channel" value="Automated NACH / ACH" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase text-slate-900">
                      Tier Governance
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adjust recurring frequencies, seats, or allocate dedicated custom quotas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/subscriptions")}
                    className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-black transition-colors"
                  >
                    Manage Subscriptions
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================
                SECTION 3: INVOICES & SETTLEMENT
            ========================================================== */}
            {activeSection === "invoices" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Settlement Ledger</h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      Authoritative invoice history compiled by billing engine.
                    </p>
                  </div>

                  {invoices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => triggerCopy(JSON.stringify(invoices))}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                    >
                      <Download size={13} className="text-slate-400" />
                      <span>Export</span>
                    </button>
                  )}
                </div>

                {invoicesLoading ? (
                  <div className="py-12 text-center text-xs font-mono text-slate-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-slate-400" />
                    Querying Invoice Records...
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
                    <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                    <h3 className="text-xs font-bold text-slate-800">No Invoices Compiled</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Invoices generate automatically on billing cycle settlement dates.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden lg:block rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70 font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-5 py-3">Invoice ID</th>
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3">Total Amount</th>
                            <th className="px-5 py-3">Method</th>
                            <th className="px-5 py-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{inv.id}</td>
                              <td className="px-5 py-3.5 font-mono text-slate-500">{formatDate(inv.date || inv.created_at)}</td>
                              <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{formatCurrency(inv.amount)}</td>
                              <td className="px-5 py-3.5 text-slate-600">{inv.payment_method || "Direct ACH"}</td>
                              <td className="px-5 py-3.5 text-right">
                                <StatusPill status={inv.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden space-y-2.5">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-2">
                          <div className="flex items-start justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900">{inv.id}</span>
                            <StatusPill status={inv.status} />
                          </div>
                          <div className="flex items-baseline justify-between text-xs pt-1 border-t border-slate-100 font-mono">
                            <span className="text-slate-400">{formatDate(inv.date || inv.created_at)}</span>
                            <span className="font-bold text-slate-900">{formatCurrency(inv.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* =========================================================
                SECTION 4: COMMUNICATION DISPATCH
            ========================================================== */}
            {activeSection === "communication" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Communication Records</h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    Transactional notifications and credential broadcasts.
                  </p>
                </div>

                {communicationsLoading ? (
                  <div className="py-12 text-center text-xs font-mono text-slate-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-slate-400" />
                    Querying Dispatch Records...
                  </div>
                ) : communications.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
                    <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
                    <h3 className="text-xs font-bold text-slate-800">No Dispatches Recorded</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Broadcasts and credential distributions will record here when sent.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden lg:block rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70 font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-5 py-3">Channel</th>
                            <th className="px-5 py-3">Dispatch Description</th>
                            <th className="px-5 py-3">Target</th>
                            <th className="px-5 py-3">Timestamp</th>
                            <th className="px-5 py-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {communications.map((comm) => (
                            <tr key={comm.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{comm.channel}</td>
                              <td className="px-5 py-3.5 font-semibold text-slate-900">{comm.title || comm.subject}</td>
                              <td className="px-5 py-3.5 font-mono text-slate-500">{comm.recipient}</td>
                              <td className="px-5 py-3.5 font-mono text-slate-500">{formatDateTime(comm.created_at)}</td>
                              <td className="px-5 py-3.5 text-right">
                                <StatusPill status={comm.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden space-y-2.5">
                      {communications.map((comm) => (
                        <div key={comm.id} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-2">
                          <div className="flex items-start justify-between">
                            <span className="font-mono text-[11px] font-bold text-slate-800 uppercase">{comm.channel}</span>
                            <StatusPill status={comm.status} />
                          </div>
                          <p className="text-xs font-bold text-slate-900">{comm.title || comm.subject}</p>
                          <div className="flex items-baseline justify-between text-xs pt-1 border-t border-slate-100 font-mono text-slate-400 text-[10.5px]">
                            <span className="truncate max-w-[180px]">{comm.recipient}</span>
                            <span>{formatDate(comm.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* =========================================================
                SECTION 5: FULL FIREBASE INFRASTRUCTURE MATRIX (RESTORED)
            ========================================================== */}
            {activeSection === "firebase" && (
              <div className="space-y-6">
                
                {/* 1. Firebase Primary Cluster State */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                        <Database size={15} />
                      </div>
                      <div>
                        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                          Firebase Tenant Cluster & Partition
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Isolated Firestore data residency & authentication runtime
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusPill
                        status={
                          firebaseStatus?.connection_status ||
                          firebaseStatus?.status ||
                          (client.firebase_project_id ? "READY" : "UNALLOCATED")
                        }
                      />

                      {/* Verify existing Firebase connection */}
                      <button
                        type="button"
                        onClick={loadFirebaseStatus}
                        disabled={firebaseVerifying || firebaseSyncing}
                        className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold font-mono text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Verify Firebase connection"
                      >
                        <RefreshCw
                          size={11}
                          className={
                            firebaseVerifying
                              ? "animate-spin text-slate-900"
                              : "text-slate-400"
                          }
                        />

                        <span className="hidden sm:inline">
                          Verify
                        </span>
                      </button>

                      {/* Synchronize Firebase Web App configuration */}
                      <button
                        type="button"
                        onClick={syncFirebaseConfig}
                        disabled={firebaseSyncing || firebaseVerifying}
                        className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 text-[11px] font-semibold font-mono text-white shadow-2xs hover:bg-black transition-colors disabled:opacity-50"
                        title="Synchronize Firebase configuration"
                      >
                        <RefreshCw
                          size={11}
                          className={
                            firebaseSyncing
                              ? "animate-spin"
                              : ""
                          }
                        />

                        <span>
                          {firebaseSyncing
                            ? "Syncing..."
                            : "Sync Config"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Restored Complete Parameters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <AttributeRow
                      label="Firebase Project ID"
                      value={client.firebase_project_id || firebaseStatus?.firebase_project_id}
                      mono
                      copyable
                      onCopy={triggerCopy}
                    />
                    <AttributeRow
                      label="Firebase Web App ID"
                      value={firebaseStatus?.firebase_web_app_id}
                      mono
                      copyable
                      onCopy={triggerCopy}
                    />
                    <AttributeRow
                      label="Cluster Heartbeat Signal"
                      value={
                        firebaseStatus?.verification
                          ? "Verification Nominal"
                          : firebaseStatus?.error || "Standby Telemetry"
                      }
                    />
                    <AttributeRow
                      label="Initial Provisioned At"
                      value={formatDateTime(firebaseStatus?.connected_at || client.created_at)}
                    />
                    <AttributeRow
                      label="Deterministic Route Slug"
                      value={firebaseStatus?.crm_slug || client.crm_slug}
                      mono
                    />
                    <AttributeRow
                      label="Data Isolation Strategy"
                      value="Dedicated Partitioned Firestore"
                    />
                  </div>

                  {/* Error Notification if cluster signal is degraded */}
                  {firebaseStatus?.error && (
                    <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-xs font-mono text-rose-800 flex items-start gap-2">
                      <CircleAlert size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <p>{firebaseStatus.error}</p>
                    </div>
                  )}
                </div>
                {/* 3. Restored Tenant Routing & Endpoint Spec */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} className="text-slate-500" />
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                        Cryptographic Tenant Endpoint
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      SECURE RESOLUTION
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 text-xs">
                    <AttributeRow label="Master Client ID" value={client.id} mono />
                    <AttributeRow label="Platform Tenant UID" value={client.tenant_id} mono copyable onCopy={triggerCopy} />
                    <AttributeRow label="CRM Route Slug" value={client.crm_slug} mono />
                    <AttributeRow
                      label="Portal Production URL"
                      value={
                        client.crm_slug
                          ? `${window.location.origin}/crm/${client.crm_slug}`
                          : "Not Provisioned"
                      }
                      mono
                      copyable
                      onCopy={triggerCopy}
                    />
                  </div>
                </div>

              </div>
            )}

          </div>
        </main>

        {/* -------------------------------------------------------------
            RE-ENGINEERED DESKTOP ASIDE: Module Command Hub (> lg)
        ------------------------------------------------------------- */}
        <aside className="hidden lg:flex shrink-0 w-80 xl:w-96 border-l border-slate-200/90 bg-white flex-col justify-between overflow-hidden">
          
          {/* Header Strip with Live Metric */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs">
                  <Layers size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                    Compiled Modules
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Runtime Capability Scope
                  </p>
                </div>
              </div>

              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-mono font-bold text-slate-800 shadow-2xs">
                {modules.length} ACTIVE
              </span>
            </div>

            {/* In-Drawer Filter */}
            <div className="relative w-full">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                placeholder="Filter capabilities..."
                className="h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 font-sans"
              />
            </div>
          </div>

          {/* Module List Stack */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {filteredModules.length === 0 ? (
              <div className="text-center py-8">
                <Layers size={22} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs font-mono font-bold text-slate-600">No Modules Matching</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Check query or reset filter</p>
              </div>
            ) : (
              filteredModules.map((mod) => (
                <div
                  key={mod}
                  className="group flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/70 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {String(mod).replace(/[_-]/g, " ").toUpperCase()}
                      </p>
                      <span className="text-[9.5px] font-mono text-slate-400 truncate block">
                        key: {String(mod).toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerCopy(mod)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity p-1"
                    title="Copy module token"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

      </div>

      {/* -------------------------------------------------------------
          4. BOTTOM SHEET MODAL (< lg Viewports Only)
      ------------------------------------------------------------- */}
      {bottomSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in">
          
          <div
            className="flex-1 w-full"
            onClick={() => setBottomSheetOpen(false)}
          />

          <div className="w-full bg-white rounded-t-2xl border-t border-slate-200 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 space-y-4">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                Select Dossier View
              </span>
              <button
                type="button"
                onClick={() => setBottomSheetOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5 font-mono">
              {SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isSelected = activeSection === sec.id;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(sec.id);
                      setBottomSheetOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={15} />
                      <span className="uppercase">{sec.label}</span>
                    </div>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}