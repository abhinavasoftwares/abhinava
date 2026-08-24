import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  UserRound,
  Edit,
  Clock,
  Package,
  Users,
  Receipt,
  Wallet,
  BarChart3,
  MessageCircle,
  Hammer,
  CheckCircle2,
  Database,
  ShieldCheck,
  Cloud,
  Globe,
  Activity,
  AlertCircle,
  RefreshCw,
  Server,
  CreditCard as BillingIcon,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

const API_URL = "https://sturdy-train-77rj957xr4pp2x675-8000.app.github.dev";
const GOLD = "#c59b27";

const MODULE_DEFINITIONS = [
  { key: "customer_directory", label: "Customer Directory", icon: Users },
  { key: "kareegar_management", label: "Kareegar Management", icon: Hammer },
  { key: "estimation", label: "Estimation", icon: Receipt },
  { key: "investments", label: "Investments", icon: Wallet },
  { key: "sales_invoicing", label: "Sales & Invoicing", icon: Receipt },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "reports_analytics", label: "Reports & Analytics", icon: BarChart3 },
];

export default function ClientDetailsPage() {
  const { clientId } = useParams();

  const [client, setClient] = useState(null);
  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [error, setError] = useState("");
  const [firebaseError, setFirebaseError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");

  // =========================================================
  // LOAD CLIENT
  // =========================================================
  const fetchClient = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/clients/${clientId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error("Client not found.");
        throw new Error("Failed to load client.");
      }

      const data = await response.json();
      setClient(data.client);
    } catch (error) {
      console.error("Error fetching client:", error);
      setError(error.message || "Unable to load client.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD FIREBASE INFRASTRUCTURE
  // =========================================================
  const fetchFirebaseStatus = async () => {
    try {
      setFirebaseLoading(true);
      setFirebaseError("");
      const response = await fetch(`${API_URL}/clients/${clientId}/firebase-status`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Failed to load Firebase status.");
      }

      setFirebaseStatus(data);
    } catch (error) {
      console.error("Error fetching Firebase status:", error);
      setFirebaseError(error.message || "Unable to load Firebase status.");
    } finally {
      setFirebaseLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
    fetchFirebaseStatus();
  }, [clientId]);

  // =========================================================
  // LOADING STATE
  // =========================================================
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50/60 p-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#c59b27]" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading client record...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR STATE
  // =========================================================
  if (error || !client) {
    return (
      <div className="h-full w-full overflow-y-auto bg-slate-50/60 p-4 sm:p-5 lg:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div>
          <Link
            to="/admin/clients"
            className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={14} /> Back to Clients
          </Link>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-12">
            <h2 className="text-lg font-semibold text-rose-700">Unable to load record</h2>
            <p className="mt-2 text-sm font-medium text-rose-600">{error || "Client not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // DERIVED DATA
  // =========================================================
  const status = client.subscription_status?.toLowerCase();
  const statusClass =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  const modules = client.modules && typeof client.modules === "object" ? client.modules : {};
  const enabledModules = MODULE_DEFINITIONS.filter((module) => modules[module.key] === true);

  const verification = firebaseStatus?.verification || {};
  const project = verification.project || {};
  const webApp = verification.web_app || {};
  const firestore = verification.firestore || {};
  const authentication = verification.authentication || {};
  const billing = verification.billing || {};

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col gap-4 bg-slate-50/60 p-4 sm:p-5 lg:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      {/* NAVIGATION */}
      <div className="shrink-0">
        <Link
          to="/admin/clients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={14} /> Directory
        </Link>
      </div>

      {/* PROFILE HEADER */}
      <div className="shrink-0 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#faf8f3] text-lg font-bold shadow-sm"
              style={{ color: GOLD }}
            >
              {client.business_name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  {client.business_name}
                </h1>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusClass}`}>
                  {client.subscription_status}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge icon={<CreditCard size={11} />} label={client.plan} />
                <Badge icon={<Clock size={11} />} label={`${client.billing_cycle} billing`} capitalize />
                <Badge icon={<CalendarDays size={11} />} label={`Since ${client.start_date}`} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Edit size={14} /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP TABS (Hidden on Mobile) */}
      <div className="hidden lg:flex shrink-0 border-b border-slate-200/70 bg-white px-4 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {[
          { id: "overview", label: "Overview & Records" },
          { id: "product", label: "Product & Documents" },
          { id: "infrastructure", label: "Cloud Infrastructure" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab.id ? "text-[#c59b27]" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#c59b27]" />}
          </button>
        ))}
      </div>

      {/* ===================================================
          CONTENT AREA (Stacked on Mobile, Tabbed on Desktop)
      =================================================== */}

      {/* TAB 1: OVERVIEW & RECORDS */}
      <div className={`flex-col gap-4 ${activeTab === "overview" ? "flex" : "flex lg:hidden"}`}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Business Record */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-2 flex items-center gap-2">
              <Building2 size={15} style={{ color: GOLD }} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Business Record</h2>
            </div>
            <div className="flex flex-col">
              <RecordRow label="Legal Name" value={client.legal_business_name} />
              <RecordRow label="Type" value={client.business_type} capitalize />
              <RecordRow label="Country" value={client.country} />
              <RecordRow label="Email" value={client.business_email} />
              <RecordRow label="Phone" value={client.business_phone} isLast />
            </div>
          </section>

          <div className="flex flex-col gap-4">
            {/* Owner Record */}
            <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center gap-2">
                <UserRound size={15} style={{ color: GOLD }} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Owner Record</h2>
              </div>
              <div className="flex flex-col">
                <RecordRow label="Full Name" value={client.owner_name} />
                <RecordRow label="Account Role" value={client.owner_role} capitalize />
                <RecordRow label="Email Address" value={client.owner_email} />
                <RecordRow label="Contact Number" value={client.owner_phone} isLast />
              </div>
            </section>

            {/* Tenant Information */}
            <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center gap-2">
                <Database size={15} style={{ color: GOLD }} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Tenant Information</h2>
              </div>
              <RecordRow label="Client ID" value={client.id} />
              <RecordRow label="Tenant ID" value={client.tenant_id} />
              <RecordRow label="Firebase Project" value={client.firebase_project_id} isLast />
            </section>
          </div>
        </div>
      </div>

      {/* TAB 2: PRODUCT & DOCUMENTS */}
      <div className={`flex-col gap-4 ${activeTab === "product" ? "flex" : "flex lg:hidden"}`}>
        {/* Product Configuration */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={15} style={{ color: GOLD }} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Product Configuration</h2>
            </div>
            <span className="inline-flex rounded-lg border border-slate-200/50 bg-[#faf8f3] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c59b27]">
              {client.domain || "Standard"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 mt-3">
            {MODULE_DEFINITIONS.map((module) => {
              const Icon = module.icon;
              const isEnabled = modules[module.key] === true;
              return (
                <div
                  key={module.key}
                  className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
                    isEnabled ? "border-emerald-100 bg-emerald-50/30 text-slate-900" : "border-slate-100 bg-slate-50/40 text-slate-400 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isEnabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                      <Icon size={14} />
                    </div>
                    <span className="text-xs font-bold truncate">{module.label}</span>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {isEnabled ? "Active" : "Off"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Verification Documents */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center gap-2">
            <FileText size={15} style={{ color: GOLD }} />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Verification Documents</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DocumentCard label="PAN Card" status={client.pan ? "Verified" : "Missing"} />
            <DocumentCard label="GSTIN" status={client.gstin ? "Verified" : "Missing"} />
            <DocumentCard label="Aadhaar" status="Missing" />
            <DocumentCard label="Agreement" status="Missing" />
          </div>
        </section>
      </div>

      {/* TAB 3: FIREBASE INFRASTRUCTURE */}
      <div className={`flex-col gap-4 ${activeTab === "infrastructure" ? "flex" : "flex lg:hidden"}`}>
        <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud size={15} style={{ color: GOLD }} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Firebase Infrastructure</h2>
            </div>
            <button
              type="button"
              onClick={fetchFirebaseStatus}
              disabled={firebaseLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={11} className={firebaseLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div>
            {firebaseLoading ? (
              <InfrastructureLoading />
            ) : firebaseError ? (
              <InfrastructureError message={firebaseError} onRetry={fetchFirebaseStatus} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                
                {/* Status & Project Box */}
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                          <Activity size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connection</p>
                          <p className="text-xs font-bold text-slate-900">{firebaseStatus?.connection_status || "UNKNOWN"}</p>
                        </div>
                      </div>
                      <StatusBadge status={firebaseStatus?.connection_status} />
                    </div>
                  </div>

                  <InfrastructureCard icon={<Server size={14} />} title="Google Cloud Project">
                    <InfrastructureRow label="Project ID" value={project.project_id || client.firebase_project_id} mono />
                    <InfrastructureRow label="Resource" value={project.resource_name} mono />
                    <InfrastructureRow label="Display Name" value={project.display_name} />
                    <InfrastructureRow label="Lifecycle" value={project.lifecycle_state} status isLast />
                  </InfrastructureCard>
                  {billing.status === "UNKNOWN" && (
                    <div className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-[10px] font-bold text-amber-700">Billing verification unavailable</p>
                        <p className="mt-1 text-[9px] font-medium leading-relaxed text-amber-600">
                          The Firebase project is connected successfully. Billing status could not be verified through the Cloud Billing API.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* DB, Auth & Web App Box */}
                <div className="flex flex-col gap-4">
                  <InfrastructureCard icon={<Globe size={14} />} title="Firebase Web App">
                    <InfrastructureRow label="App ID" value={webApp.app_id || client.firebase_web_app_id} mono />
                    <InfrastructureRow label="Display Name" value={webApp.display_name} />
                    <InfrastructureRow label="State" value={webApp.state} status isLast />
                  </InfrastructureCard>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfrastructureCard icon={<Database size={14} />} title="Firestore">
                      <InfrastructureRow label="Status" value={firestore.status} status />
                      <InfrastructureRow label="Location" value={firestore.location} />
                      <InfrastructureRow label="Edition" value={firestore.edition} isLast />
                    </InfrastructureCard>

                    <div className="flex flex-col gap-4">
                      <InfrastructureCard icon={<ShieldCheck size={14} />} title="Authentication">
                        <InfrastructureRow label="Status" value={authentication.status} status isLast />
                      </InfrastructureCard>
                      <InfrastructureCard icon={<BillingIcon size={14} />} title="Billing">
                        <InfrastructureRow label="Status" value={billing.status} status isLast />
                      </InfrastructureCard>
                    </div>
                  </div>

                  
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}

// =============================================================
// MICRO-COMPONENTS
// =============================================================

function Badge({ icon, label, capitalize }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
      {icon}
      <span className={capitalize ? "capitalize" : ""}>{label}</span>
    </div>
  );
}

function RecordRow({ label, value, capitalize, isLast }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 text-xs ${!isLast ? "border-b border-slate-100" : ""}`}>
      <span className="shrink-0 font-medium text-slate-400">{label}</span>
      <span className={`min-w-0 truncate text-right font-semibold text-slate-900 ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function InfrastructureCard({ icon, title, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#faf8f3] text-[#c59b27]">{icon}</div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{title}</h3>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function InfrastructureRow({ label, value, status, mono, isLast }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 text-[10px] ${!isLast ? "border-b border-slate-100" : ""}`}>
      <span className="shrink-0 font-medium text-slate-400">{label}</span>
      <span className={`min-w-0 truncate text-right font-semibold ${status ? getStatusTextClass(value) : "text-slate-700"} ${mono ? "font-mono text-[9px]" : ""}`}>
        {formatStatus(value)}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = status?.toUpperCase();
  if (normalized === "READY" || normalized === "ACTIVE" || normalized === "ENABLED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
        <CheckCircle2 size={10} />
        {normalized}
      </span>
    );
  }
  if (normalized === "UNKNOWN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-700">
        <AlertCircle size={10} />
        UNKNOWN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
      {normalized || "UNKNOWN"}
    </span>
  );
}

function getStatusTextClass(value) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "READY" || normalized === "ACTIVE" || normalized === "ENABLED") return "text-emerald-600";
  if (normalized === "UNKNOWN") return "text-amber-600";
  if (normalized === "NOT_ENABLED") return "text-slate-500";
  return "text-slate-700";
}

function formatStatus(value) {
  if (!value) return "—";
  return String(value).replaceAll("_", " ").toUpperCase();
}

function DocumentCard({ label, status }) {
  const isVerified = status === "Verified";
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
      <span className="truncate text-[11px] font-semibold text-slate-900">{label}</span>
      <div className="mt-2 flex items-center justify-between">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isVerified ? "bg-emerald-50 text-emerald-600" : "bg-slate-200/60 text-slate-500"}`}>
          {status}
        </span>
        {isVerified && <CheckCircle2 size={12} className="text-emerald-500" />}
      </div>
    </div>
  );
}

function InfrastructureLoading() {
  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="animate-pulse rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-2 w-full rounded bg-slate-100" />
          <div className="mt-2 h-2 w-3/4 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function InfrastructureError({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
      <div className="flex gap-2">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-500" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-rose-700">Unable to verify Firebase</p>
          <p className="mt-1 break-words text-[10px] leading-relaxed text-rose-600">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-700 transition hover:bg-rose-50"
          >
            <RefreshCw size={11} /> Retry Verification
          </button>
        </div>
      </div>
    </div>
  );
}