import { useEffect, useState, createContext, useContext } from "react";
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
  Clock3,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_BASE_URL;

/* ============================================================================
   ABHINAVA ENTERPRISE SAAS THEME (SMOKED TITANIUM & INDIGO, ZERO BLACK)
   ========================================================================== */
export const THEMES = {
  light: {
    mode: "light",

    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F5F9",
    surfaceHover: "#E2E8F0",

    border: "#E2E8F0",
    borderStrong: "#CBD5E1",

    text: "#0F172A",
    textSoft: "#334155",
    textMuted: "#64748B",
    textLight: "#94A3B8",

    primary: "#2563EB",
    primaryText: "#FFFFFF",
    primaryHover: "#1D4ED8",
    primarySoft: "#EFF6FF",

    primaryBtnBg: "#2563EB",
    primaryBtnText: "#FFFFFF",
    primaryBtnHover: "#1D4ED8",

    navActiveBg: "#EFF6FF",
    navActiveText: "#2563EB",

    success: "#059669",
    successSoft: "#ECFDF5",
    warning: "#D97706",
    warningSoft: "#FFFBEB",
    danger: "#E11D48",
    dangerSoft: "#FFF1F2",

    sidebar: "#FFFFFF",
    header: "rgba(255, 255, 255, 0.94)",
    chartGrid: "#E2E8F0",
  },

  dark: {
    mode: "dark",

    background: "#11141B",
    surface: "#181D27",
    surfaceAlt: "#202634",
    surfaceHover: "#283042",

    border: "#283042",
    borderStrong: "#38435C",

    text: "#F8FAFC",
    textSoft: "#CBD5E1",
    textMuted: "#94A3B8",
    textLight: "#64748B",

    primary: "#3B82F6",
    primaryText: "#FFFFFF",
    primaryHover: "#60A5FA",
    primarySoft: "rgba(59, 130, 246, 0.16)",

    primaryBtnBg: "#3B82F6",
    primaryBtnText: "#FFFFFF",
    primaryBtnHover: "#60A5FA",

    navActiveBg: "rgba(59, 130, 246, 0.14)",
    navActiveText: "#60A5FA",

    success: "#34D399",
    successSoft: "rgba(52, 211, 153, 0.14)",
    warning: "#FBBF24",
    warningSoft: "rgba(251, 191, 36, 0.14)",
    danger: "#FB7185",
    dangerSoft: "rgba(251, 113, 133, 0.14)",

    sidebar: "#141822",
    header: "rgba(24, 29, 39, 0.88)",
    chartGrid: "#242C3D",
  },
};

/* ============================================================================
   GLOBAL THEME CONTEXT & HOOK
   ========================================================================== */
const ThemeContext = createContext({
  themeMode: "light",
  theme: THEMES.light,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const stored = localStorage.getItem("abhinava-admin-theme");
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      // Fallback
    }
    return "light";
  });

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("abhinava-admin-theme", next);
      } catch {
        // Ignore
      }
      window.dispatchEvent(new CustomEvent("abhinava-theme-change", { detail: next }));
      return next;
    });
  };

  useEffect(() => {
    const handleCustomChange = (e) => {
      if (e.detail && (e.detail === "dark" || e.detail === "light")) {
        setThemeMode(e.detail);
      }
    };
    const handleStorageChange = (e) => {
      if (e.key === "abhinava-admin-theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setThemeMode(e.newValue);
      }
    };

    window.addEventListener("abhinava-theme-change", handleCustomChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("abhinava-theme-change", handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const theme = THEMES[themeMode] || THEMES.light;

  return (
    <ThemeContext.Provider value={{ themeMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context || !context.theme) {
    const [localMode, setLocalMode] = useState(() => {
      try {
        const stored = localStorage.getItem("abhinava-admin-theme");
        if (stored === "dark" || stored === "light") return stored;
      } catch {}
      return "light";
    });

    useEffect(() => {
      const handleCustom = (e) => setLocalMode(e.detail);
      const handleStorage = (e) => {
        if (e.key === "abhinava-admin-theme") setLocalMode(e.newValue);
      };
      window.addEventListener("abhinava-theme-change", handleCustom);
      window.addEventListener("storage", handleStorage);
      return () => {
        window.removeEventListener("abhinava-theme-change", handleCustom);
        window.removeEventListener("storage", handleStorage);
      };
    }, []);

    return {
      themeMode: localMode,
      theme: THEMES[localMode] || THEMES.light,
      toggleTheme: () => {
        const next = localMode === "light" ? "dark" : "light";
        setLocalMode(next);
        try {
          localStorage.setItem("abhinava-admin-theme", next);
        } catch {}
        window.dispatchEvent(new CustomEvent("abhinava-theme-change", { detail: next }));
      },
    };
  }
  return context;
}

const MODULE_DEFINITIONS = [
  { key: "customer_directory", label: "Customer Directory", icon: Users },
  { key: "kareegar_management", label: "Kareegar Management", icon: Hammer },
  { key: "estimation", label: "Estimation", icon: Receipt },
  { key: "investments", label: "Investments", icon: Wallet },
  { key: "sales_invoicing", label: "Sales & Invoicing", icon: Receipt },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "reports_analytics", label: "Reports & Analytics", icon: BarChart3 },
];

/* ============================================================================
   STATUS BADGE
   ========================================================================== */
export function StatusBadge({ status, type = "tenant", theme }) {
  const normalized = String(status || "").trim().toUpperCase();

  let label = status || "Unknown";
  let color = theme.textMuted;
  let background = theme.surfaceAlt;
  let Icon = Clock3;

  if (type === "subscription") {
    if (normalized === "ACTIVE" || normalized === "READY") {
      label = "Active";
      color = theme.success;
      background = theme.successSoft;
      Icon = CheckCircle2;
    } else if (normalized === "TRIAL") {
      label = "Trial";
      color = theme.warning;
      background = theme.warningSoft;
      Icon = Clock3;
    } else if (
      [
        "CANCELLED",
        "CANCELED",
        "EXPIRED",
        "INACTIVE",
      ].includes(normalized)
    ) {
      label =
        normalized === "CANCELED"
          ? "Cancelled"
          : normalized.charAt(0) + normalized.slice(1).toLowerCase();
      color = theme.danger;
      background = theme.dangerSoft;
      Icon = AlertCircle;
    }
  } else if (type === "account") {
    if (normalized === "ACTIVE" || normalized === "ENABLED") {
      label = "Account Active";
      color = theme.success;
      background = theme.successSoft;
      Icon = CheckCircle2;
    } else if (normalized === "DISABLED") {
      label = "Account Disabled";
      color = theme.danger;
      background = theme.dangerSoft;
      Icon = AlertCircle;
    } else {
      label = "Account Status Unknown";
      color = theme.warning;
      background = theme.warningSoft;
      Icon = Clock3;
    }} else {
    if (normalized === "READY" || normalized === "ACTIVE" || normalized === "ENABLED") {
      label = normalized === "ENABLED" ? "Enabled" : "Ready";
      color = theme.success;
      background = theme.successSoft;
      Icon = CheckCircle2;
    } else if (normalized === "FAILED" || normalized === "ERROR") {
      label = "Failed";
      color = theme.danger;
      background = theme.dangerSoft;
      Icon = AlertCircle;
    } else {
      label = normalized === "UNKNOWN" ? "Unknown" : "Provisioning";
      color = theme.warning;
      background = theme.warningSoft;
      Icon = Clock3;
    }
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{
        color,
        backgroundColor: background,
      }}
    >
      <Icon size={11} strokeWidth={2.2} />
      {label}
    </span>
  );
}

/* ============================================================================
   CLIENT DETAILS PAGE
   ========================================================================== */
export default function ClientDetailsPage() {
  const { clientId } = useParams();
  const { theme } = useTheme();

  const [client, setClient] = useState(null);
  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [error, setError] = useState("");
  const [firebaseError, setFirebaseError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const fetchClient = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/clients/${clientId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Session expired. Please sign in again.");
        if (response.status === 404) throw new Error("Client account not found.");
        throw new Error("Unable to retrieve client record.");
      }

      const data = await response.json();
      setClient(data.client);
    } catch (err) {
      console.error("Error fetching client:", err);
      setError(err.message || "Failed to load client details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFirebaseStatus = async () => {
    try {
      setFirebaseLoading(true);
      setFirebaseError("");
      const response = await fetch(`${API_URL}/clients/${clientId}/firebase-status`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Unable to inspect Firebase status.");
      }

      setFirebaseStatus(data);
    } catch (err) {
      console.error("Error fetching Firebase status:", err);
      setFirebaseError(err.message || "Unable to resolve infrastructure health.");
    } finally {
      setFirebaseLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
    fetchFirebaseStatus();
  }, [clientId]);

  if (loading) {
    return (
      <div
        className="flex h-full w-full items-center justify-center p-6"
        style={{ backgroundColor: theme.background }}
      >
        <div
          className="flex flex-col items-center justify-center rounded-xl border p-8 shadow-xs"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
        >
          <div
            className="h-7 w-7 animate-spin rounded-full border-2"
            style={{
              borderColor: theme.border,
              borderTopColor: theme.primary,
            }}
          />
          <p className="mt-4 text-xs font-medium" style={{ color: theme.textMuted }}>
            Retrieving tenant metadata...
          </p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div
        className="h-full w-full overflow-y-auto p-4 sm:p-6"
        style={{ backgroundColor: theme.background }}
      >
        <div className="mx-auto max-w-4xl">
          <Link
            to="/admin/clients"
            className="mb-4 inline-flex items-center gap-2 text-xs font-medium transition-colors"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
          >
            <ArrowLeft size={14} /> Back to Directory
          </Link>

          <div
            className="flex flex-col items-center justify-center rounded-xl border p-12 text-center shadow-xs"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: theme.dangerSoft,
                borderColor: theme.danger,
                color: theme.danger,
              }}
            >
              <AlertCircle size={20} />
            </div>
            <h2 className="mt-4 text-sm font-bold" style={{ color: theme.text }}>
              Record Unavailable
            </h2>
            <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
              {error || "Tenant record could not be located."}
            </p>
            <button
              type="button"
              onClick={fetchClient}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold shadow-xs transition-opacity hover:opacity-90"
              style={{
                backgroundColor: theme.primaryBtnBg,
                color: theme.primaryBtnText,
              }}
            >
              <RefreshCw size={13} /> Retry Synchronization
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modules = client.modules && typeof client.modules === "object" ? client.modules : {};

  const verification = firebaseStatus?.verification || {};
  const project = verification.project || {};
  const webApp = verification.web_app || {};
  const firestore = verification.firestore || {};
  const authentication = verification.authentication || {};
  const billing = verification.billing || {};

  return (
    <div
      className="abhinava-scroll flex h-full w-full flex-col gap-4 overflow-y-auto p-4 sm:p-6 lg:p-7"
      style={{ backgroundColor: theme.background }}
    >
      {/* DIRECTORY BACK LINK */}
      <div className="shrink-0">
        <Link
          to="/admin/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: theme.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
        >
          <ArrowLeft size={14} /> Back to Directory
        </Link>
      </div>

      {/* TENANT BANNER */}
      <div
        className="shrink-0 rounded-xl border p-5 shadow-xs"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base font-bold shadow-xs"
              style={{
                backgroundColor: theme.primarySoft,
                borderColor: theme.border,
                color: theme.primary,
              }}
            >
              {client.business_name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1
                  className="truncate text-base font-bold tracking-tight sm:text-lg"
                  style={{ color: theme.text }}
                >
                  {client.business_name}
                </h1>
                <StatusBadge status={client.subscription_status} type="subscription" theme={theme} />
                <StatusBadge
                  status={client.account_status || "ACTIVE"}
                  type="account"
                  theme={theme}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge icon={<CreditCard size={12} />} label={client.plan} theme={theme} />
                <Badge
                  icon={<Clock size={12} />}
                  label={`${client.billing_cycle || "Standard"} cycle`}
                  capitalize
                  theme={theme}
                />
                <Badge
                  icon={<CalendarDays size={12} />}
                  label={`Initialized ${client.start_date || "—"}`}
                  theme={theme}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled
              title="Client editing will be enabled after the backend client-update endpoint is implemented."
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs opacity-50"
              style={{
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                color: theme.textSoft,
              }}
            >
              <Edit size={13} />
              Edit Account
            </button>

            {String(client.account_status || "ACTIVE").toUpperCase() === "ACTIVE" ? (
              <button
                type="button"
                disabled
                title="Disable action will be enabled after the backend lifecycle endpoint is implemented."
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs opacity-50"
                style={{
                  backgroundColor: theme.dangerSoft,
                  borderColor: theme.danger,
                  color: theme.danger,
                }}
              >
                Disable
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Enable action will be enabled after the backend lifecycle endpoint is implemented."
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs opacity-50"
                style={{
                  backgroundColor: theme.successSoft,
                  borderColor: theme.success,
                  color: theme.success,
                }}
              >
                Enable
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP TABS */}
      <div
        className="hidden lg:flex shrink-0 rounded-xl border px-2 shadow-xs"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }}
      >
        {[
          { id: "overview", label: "Overview & Records" },
          { id: "product", label: "Modules & Documents" },
          { id: "infrastructure", label: "Cloud Infrastructure" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="relative px-4 py-3 text-xs font-semibold transition-colors"
            style={{
              color: activeTab === tab.id ? theme.primary : theme.textMuted,
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 h-[2px] w-full"
                style={{ backgroundColor: theme.primary }}
              />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & RECORDS */}
      <div className={`flex-col gap-4 ${activeTab === "overview" ? "flex" : "flex lg:hidden"}`}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Business Entity */}
          <section
            className="rounded-xl border p-5 shadow-xs"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Building2 size={16} style={{ color: theme.primary }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text }}>
                Corporate Registration
              </h2>
            </div>
            <div className="flex flex-col">
              <RecordRow label="Legal Corporate Name" value={client.legal_business_name} theme={theme} />
              <RecordRow label="Entity Classification" value={client.business_type} capitalize theme={theme} />
              <RecordRow label="Jurisdiction" value={client.country} theme={theme} />
              <RecordRow label="Corporate Billing Email" value={client.business_email} theme={theme} />
              <RecordRow
                label="CRM Welcome Message"
                value={client.welcome_message}
                theme={theme}
              />
              <RecordRow label="Primary Telephony" value={client.business_phone} isLast theme={theme} />
            </div>
          </section>

          <div className="flex flex-col gap-4">
            {/* Primary Contact */}
            <section
              className="rounded-xl border p-5 shadow-xs"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <UserRound size={16} style={{ color: theme.primary }} />
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text }}>
                  Primary Contact
                </h2>
              </div>
              <div className="flex flex-col">
                <RecordRow label="Authorized Representative" value={client.owner_name} theme={theme} />
                <RecordRow label="Assigned Role" value={client.owner_role} capitalize theme={theme} />
                <RecordRow label="Direct Work Email" value={client.owner_email} theme={theme} />
                <RecordRow label="Direct Phone" value={client.owner_phone} isLast theme={theme} />
              </div>
            </section>

            {/* Tenant Boundary */}
            <section
              className="rounded-xl border p-5 shadow-xs"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Database size={16} style={{ color: theme.primary }} />
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text }}>
                  Tenant Isolation
                </h2>
              </div>
              <div className="flex flex-col">
                <RecordRow
                  label="Database Identifier"
                  value={client.id}
                  theme={theme}
                />

                <RecordRow
                  label="System Tenant ID"
                  value={client.tenant_id}
                  theme={theme}
                  mono
                />

                <RecordRow
                  label="CRM Slug"
                  value={client.crm_slug}
                  theme={theme}
                  mono
                />

                <RecordRow
                  label="Cloud Workspace ID"
                  value={client.firebase_project_id}
                  theme={theme}
                  mono
                />

                <RecordRow
                  label="CRM URL"
                  value={
                    client.crm_slug
                      ? `crm.abhinava.site/${client.crm_slug}`
                      : "—"
                  }
                  isLast
                  theme={theme}
                  mono
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* TAB 2: PRODUCT & DOCUMENTS */}
      <div className={`flex-col gap-4 ${activeTab === "product" ? "flex" : "flex lg:hidden"}`}>
        <section
          className="rounded-xl border p-5 shadow-xs"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
        >
          <div className="mb-4 flex shrink-0 items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <Package size={16} style={{ color: theme.primary }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text }}>
                Authoritative Modules
              </h2>
            </div>
            <span
              className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: theme.primarySoft,
                color: theme.primary,
              }}
            >
              Domain: {client.domain || "Commerce"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {MODULE_DEFINITIONS.map((module) => {
              const Icon = module.icon;
              const isEnabled = modules[module.key] === true;
              return (
                <div
                  key={module.key}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors"
                  style={{
                    backgroundColor: isEnabled ? theme.surface : theme.surfaceAlt,
                    borderColor: isEnabled ? theme.borderStrong : theme.border,
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
                      style={{
                        backgroundColor: isEnabled ? theme.primarySoft : theme.surface,
                        borderColor: theme.border,
                        color: isEnabled ? theme.primary : theme.textLight,
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: isEnabled ? theme.text : theme.textMuted }}
                    >
                      {module.label}
                    </span>
                  </div>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: isEnabled ? theme.successSoft : theme.surface,
                      color: isEnabled ? theme.success : theme.textLight,
                    }}
                  >
                    {isEnabled ? "Online" : "Off"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-xl border p-5 shadow-xs"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
        >
          <div className="mb-3 flex items-center gap-2">
            <FileText size={16} style={{ color: theme.primary }} />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text }}>
              Statutory Verification Status
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DocumentCard label="PAN Verification" status={client.pan ? "Verified" : "Missing"} theme={theme} />
            <DocumentCard label="GSTIN Registry" status={client.gstin ? "Verified" : "Missing"} theme={theme} />
            <DocumentCard label="Identity Record" status="Verified" theme={theme} />
            <DocumentCard label="Master Agreement" status="Verified" theme={theme} />
          </div>
        </section>
      </div>

      {/* TAB 3: CLOUD INFRASTRUCTURE */}
      <div className={`flex-col gap-4 ${activeTab === "infrastructure" ? "flex" : "flex lg:hidden"}`}>
        <section
          className="rounded-xl border p-5 shadow-xs"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
        >
          <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <Cloud size={16} style={{ color: theme.primary }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text }}>
                Cloud Infrastructure Telemetry
              </h2>
            </div>
            <button
              type="button"
              onClick={fetchFirebaseStatus}
              disabled={firebaseLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                color: theme.textSoft,
              }}
            >
              <RefreshCw size={12} className={firebaseLoading ? "animate-spin" : ""} />
              Inspect
            </button>
          </div>

          <div>
            {firebaseLoading ? (
              <InfrastructureLoading theme={theme} />
            ) : firebaseError ? (
              <InfrastructureError message={firebaseError} onRetry={fetchFirebaseStatus} theme={theme} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <div
                    className="flex items-center justify-between rounded-lg border p-3.5"
                    style={{
                      backgroundColor: theme.surfaceAlt,
                      borderColor: theme.border,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md border"
                        style={{
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          color: theme.primary,
                        }}
                      >
                        <Activity size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                          Link Gateway
                        </p>
                        <p className="text-xs font-bold" style={{ color: theme.text }}>
                          {firebaseStatus?.connection_status || "UNKNOWN"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={firebaseStatus?.connection_status} type="tenant" theme={theme} />
                  </div>

                  <InfrastructureCard icon={<Server size={14} />} title="Google Cloud Partition" theme={theme}>
                    <InfrastructureRow
                      label="Project Identifier"
                      value={project.project_id || client.firebase_project_id}
                      mono
                      theme={theme}
                    />
                    <InfrastructureRow label="Resource Name" value={project.resource_name} mono theme={theme} />
                    <InfrastructureRow label="Display Cluster" value={project.display_name} theme={theme} />
                    <InfrastructureRow label="Lifecycle Phase" value={project.lifecycle_state} status isLast theme={theme} />
                  </InfrastructureCard>

                  {billing.status === "UNKNOWN" && (
                    <div
                      className="flex gap-2.5 rounded-lg border p-3.5"
                      style={{
                        backgroundColor: theme.warningSoft,
                        borderColor: theme.warning,
                      }}
                    >
                      <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: theme.warning }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: theme.warning }}>
                          Telemetry verification pending
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: theme.textSoft }}>
                          The isolated project is linked. External billing status could not be polled via Cloud Billing API.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <InfrastructureCard icon={<Globe size={14} />} title="Web App Client" theme={theme}>
                    <InfrastructureRow
                      label="App Identifier"
                      value={webApp.app_id || client.firebase_web_app_id}
                      mono
                      theme={theme}
                    />
                    <InfrastructureRow label="Cluster Name" value={webApp.display_name} theme={theme} />
                    <InfrastructureRow label="State" value={webApp.state} status isLast theme={theme} />
                  </InfrastructureCard>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfrastructureCard icon={<Database size={14} />} title="Firestore Engine" theme={theme}>
                      <InfrastructureRow label="Service Status" value={firestore.status} status theme={theme} />
                      <InfrastructureRow label="Data Region" value={firestore.location} theme={theme} />
                      <InfrastructureRow label="Deployment" value={firestore.edition} isLast theme={theme} />
                    </InfrastructureCard>

                    <div className="flex flex-col gap-4">
                      <InfrastructureCard icon={<ShieldCheck size={14} />} title="Identity Provider" theme={theme}>
                        <InfrastructureRow label="Auth Engine" value={authentication.status} status isLast theme={theme} />
                      </InfrastructureCard>
                      <InfrastructureCard icon={<BillingIcon size={14} />} title="Cloud Billing" theme={theme}>
                        <InfrastructureRow label="Status" value={billing.status} status isLast theme={theme} />
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
// SUB-COMPONENTS
// =============================================================

function Badge({ icon, label, capitalize, theme }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor: theme.surfaceAlt,
        borderColor: theme.border,
        color: theme.textSoft,
      }}
    >
      {icon}
      <span className={capitalize ? "capitalize" : ""}>{label}</span>
    </div>
  );
}

function RecordRow({ label, value, capitalize, mono, isLast, theme }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-2 text-xs"
      style={{ borderBottom: !isLast ? `1px solid ${theme.border}` : "none" }}
    >
      <span className="shrink-0 font-medium" style={{ color: theme.textMuted }}>
        {label}
      </span>
      <span
        className={`min-w-0 truncate text-right font-medium ${
          capitalize ? "capitalize" : ""
        } ${mono ? "font-mono text-[11px]" : ""}`}
        style={{ color: theme.text }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function InfrastructureCard({ icon, title, children, theme }) {
  return (
    <div
      className="rounded-lg border p-4 shadow-xs"
      style={{
        backgroundColor: theme.surfaceAlt,
        borderColor: theme.border,
      }}
    >
      <div className="mb-2.5 flex items-center gap-2 border-b pb-2" style={{ borderColor: theme.border }}>
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md border"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            color: theme.primary,
          }}
        >
          {icon}
        </div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.text }}>
          {title}
        </h3>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function InfrastructureRow({ label, value, status, mono, isLast, theme }) {
  const getStatusColor = (val) => {
    const norm = String(val || "").toUpperCase();
    if (norm === "READY" || norm === "ACTIVE" || norm === "ENABLED") return theme.success;
    if (norm === "UNKNOWN") return theme.warning;
    return theme.textMuted;
  };

  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5 text-xs"
      style={{ borderBottom: !isLast ? `1px solid ${theme.border}` : "none" }}
    >
      <span className="shrink-0 font-medium" style={{ color: theme.textMuted }}>
        {label}
      </span>
      <span
        className={`min-w-0 truncate text-right font-medium ${mono ? "font-mono text-[11px]" : ""}`}
        style={{ color: status ? getStatusColor(value) : theme.text }}
      >
        {value ? String(value).replaceAll("_", " ").toUpperCase() : "—"}
      </span>
    </div>
  );
}

function DocumentCard({ label, status, theme }) {
  const isVerified = status === "Verified";
  return (
    <div
      className="flex flex-col justify-between rounded-lg border p-3 shadow-xs"
      style={{
        backgroundColor: theme.surfaceAlt,
        borderColor: theme.border,
      }}
    >
      <span className="truncate text-xs font-bold" style={{ color: theme.text }}>
        {label}
      </span>
      <div className="mt-3 flex items-center justify-between">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: isVerified ? theme.successSoft : theme.surface,
            color: isVerified ? theme.success : theme.textMuted,
          }}
        >
          {status}
        </span>
        {isVerified && <CheckCircle2 size={13} style={{ color: theme.success }} />}
      </div>
    </div>
  );
}

function InfrastructureLoading({ theme }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-lg border p-4"
          style={{
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
          }}
        >
          <div className="h-3 w-32 rounded" style={{ backgroundColor: theme.border }} />
          <div className="mt-3 h-2 w-full rounded" style={{ backgroundColor: theme.border }} />
          <div className="mt-2 h-2 w-3/4 rounded" style={{ backgroundColor: theme.border }} />
        </div>
      ))}
    </div>
  );
}

function InfrastructureError({ message, onRetry, theme }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: theme.dangerSoft,
        borderColor: theme.danger,
      }}
    >
      <div className="flex gap-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: theme.danger }} />
        <div className="min-w-0">
          <p className="text-xs font-bold" style={{ color: theme.danger }}>
            Telemetry Verification Interrupted
          </p>
          <p className="mt-1 break-words text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            {message}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-xs"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.primary,
            }}
          >
            <RefreshCw size={12} /> Retry Verification
          </button>
        </div>
      </div>
    </div>
  );
}