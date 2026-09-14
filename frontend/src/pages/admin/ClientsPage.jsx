import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Users,
  Download,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  Mail,
  Phone,
  Building2,
  CreditCard,
  CheckCircle2,
  Clock3,
  XCircle,
  Check,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_BASE_URL;

/* =========================================================
   ABHINAVA ENTERPRISE THEME (MONOCHROME & ZINC)
========================================================= */

const THEMES = {
  light: {
    mode: "light",
    background: "#F8F9FA",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F4F6",
    surfaceHover: "#EBECEF",

    border: "#E4E7EB",
    borderStrong: "#CBD0D7",

    text: "#0F1117",
    textSoft: "#363B45",
    textMuted: "#6B7280",
    textLight: "#9CA3AF",

    primary: "#0F1117",
    primaryText: "#FFFFFF",
    primaryHover: "#1F2430",
    primarySoft: "#F0F2F5",

    success: "#047857",
    successSoft: "#ECFDF5",
    warning: "#B45309",
    warningSoft: "#FFFBEB",
    danger: "#B91C1C",
    dangerSoft: "#FEF2F2",
  },
  dark: {
    mode: "dark",
    background: "#090A0D",
    surface: "#111318",
    surfaceAlt: "#181B22",
    surfaceHover: "#20242D",

    border: "#20242D",
    borderStrong: "#2E3442",

    text: "#F9FAFB",
    textSoft: "#D1D5DB",
    textMuted: "#88909F",
    textLight: "#545B6B",

    primary: "#FFFFFF",
    primaryText: "#090A0D",
    primaryHover: "#E5E7EB",
    primarySoft: "#1C2029",

    success: "#34D399",
    successSoft: "rgba(52, 211, 153, 0.12)",
    warning: "#FBBF24",
    warningSoft: "rgba(251, 191, 36, 0.12)",
    danger: "#F87171",
    dangerSoft: "rgba(248, 113, 113, 0.12)",
  },
};

function getStoredTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return localStorage.getItem("abhinava-admin-theme") === "dark"
    ? "dark"
    : "light";
}

/* =========================================================
   PAGE
========================================================= */

function ClientsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Clients");

  const [themeMode, setThemeMode] = useState(getStoredTheme);
  const theme = THEMES[themeMode] || THEMES.light;

  /* =======================================================
     SYNC WITH ADMINLAYOUT THEME
  ======================================================== */

  useEffect(() => {
    const root = document.documentElement;

    const updateTheme = () => {
      const mode =
        root.getAttribute("data-abhinava-theme") === "dark"
          ? "dark"
          : "light";

      setThemeMode(mode);
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-abhinava-theme"],
    });

    return () => observer.disconnect();
  }, []);

  /* =======================================================
     SUCCESS NOTIFICATION
  ======================================================== */

  useEffect(() => {
    if (!location.state?.successMessage) {
      return;
    }

    setSuccessMessage(location.state.successMessage);

    navigate(location.pathname, {
      replace: true,
      state: {},
    });

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [location, navigate]);

  /* =======================================================
     FETCH DIRECTORY
  ======================================================== */

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/clients`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        if (response.status === 403) {
          throw new Error("You do not have administrative clearance to access directory.");
        }

        if (!response.ok) {
          throw new Error(`Directory query failed (${response.status})`);
        }

        const data = await response.json();

        setClients(
          Array.isArray(data.clients)
            ? data.clients
            : []
        );
      } catch (err) {
        console.error("Error fetching clients:", err);
        setError(err.message || "Unable to sync client directory.");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [navigate]);

  /* =======================================================
     FILTER
  ======================================================== */

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const businessName = client.business_name?.toLowerCase() || "";
      const ownerName = client.owner_name?.toLowerCase() || "";
      const email = client.business_email?.toLowerCase() || "";
      const status = client.subscription_status?.toLowerCase() || "";

      const matchesSearch =
        !search ||
        businessName.includes(search) ||
        ownerName.includes(search) ||
        email.includes(search);

      const matchesStatus =
        statusFilter === "All Clients" ||
        status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const handleExport = () => {
    if (filteredClients.length === 0) return;
    const headers = ["ID", "Business Name", "Owner Name", "Email", "Plan", "Status"];
    const rows = filteredClients.map((c) => [
      c.id ?? "",
      `"${c.business_name || ""}"`,
      `"${c.owner_name || ""}"`,
      `"${c.business_email || ""}"`,
      `"${c.plan || ""}"`,
      `"${c.subscription_status || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `abhinava_clients_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* =======================================================
     RENDER
  ======================================================== */

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{
        backgroundColor: theme.background,
        color: theme.text,
      }}
    >
      {/* TOAST NOTIFICATION */}
      {successMessage && (
        <div
          className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg backdrop-blur-md transition-all sm:right-6 sm:top-6"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.success,
          }}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: theme.successSoft,
              color: theme.success,
            }}
          >
            <Check size={14} strokeWidth={2.5} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold" style={{ color: theme.text }}>
              Operation Successful
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
              {successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="shrink-0 text-base leading-none transition opacity-60 hover:opacity-100"
            style={{ color: theme.textMuted }}
          >
            ×
          </button>
        </div>
      )}

      {/* PAGE HEADER */}
      <header
        className="shrink-0 border-b px-4 py-5 sm:px-6 lg:px-8"
        style={{
          backgroundColor: theme.background,
          borderColor: theme.border,
        }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1
              className="text-[22px] sm:text-[26px] font-bold tracking-tight"
              style={{ color: theme.text }}
            >
              Client Directory
            </h1>
            <p className="mt-1 text-[12px]" style={{ color: theme.textMuted }}>
              Manage isolated tenant workspaces, subscription lifecycle, and account contacts.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium shadow-sm transition"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textSoft,
              }}
            >
              <Download size={13} strokeWidth={1.9} />
              Export
            </button>

            <Link
              to="/admin/clients/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-bold shadow-sm transition hover:opacity-90 active:scale-[0.99]"
              style={{
                backgroundColor: theme.primary,
                color: theme.primaryText,
              }}
            >
              <Plus size={14} strokeWidth={2.4} />
              Register Client
            </Link>
          </div>
        </div>
      </header>

      {/* SEARCH / FILTER CONTROLS */}
      <div
        className="shrink-0 px-4 py-3.5 sm:px-6 lg:px-8"
        style={{ backgroundColor: theme.background }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px]" style={{ color: theme.textMuted }}>
            Showing <span className="font-bold" style={{ color: theme.text }}>{filteredClients.length}</span> of{" "}
            <span className="font-bold" style={{ color: theme.text }}>{clients.length}</span> registered organizations
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
            {/* SEARCH */}
            <div className="relative w-full sm:w-[260px]">
              <Search
                size={14}
                strokeWidth={1.8}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: theme.textLight }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients, owners, emails..."
                className="h-9 w-full rounded-lg border py-1.5 pl-8 pr-3 text-[11px] font-medium outline-none transition shadow-sm"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = theme.borderStrong)}
                onBlur={(e) => (e.currentTarget.style.borderColor = theme.border)}
              />
            </div>

            {/* STATUS DROPDOWN */}
            <div className="relative w-full sm:w-[140px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border px-3 pr-8 text-[11px] font-medium outline-none transition shadow-sm"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.textSoft,
                }}
              >
                <option value="All Clients">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>

              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: theme.textLight }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN DATA VIEW */}
      <main className="min-h-0 flex-1 overflow-hidden px-4 pb-6 sm:px-6 lg:px-8">
        {loading && (
          <div
            className="flex h-full min-h-[240px] items-center justify-center rounded-xl border"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2"
                style={{
                  borderColor: theme.border,
                  borderTopColor: theme.text,
                }}
              />
              <p className="mt-3 text-[11px] font-medium" style={{ color: theme.textMuted }}>
                Loading directory...
              </p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div
            className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border px-6 text-center"
            style={{
              backgroundColor: theme.dangerSoft,
              borderColor: theme.danger,
            }}
          >
            <XCircle size={24} strokeWidth={1.5} style={{ color: theme.danger }} />
            <p className="mt-2.5 text-[12px] font-semibold" style={{ color: theme.danger }}>
              {error}
            </p>
          </div>
        )}

        {!loading && !error && filteredClients.length > 0 && (
          <>
            {/* DESKTOP TABLE */}
            <div
              className="hidden h-full min-h-0 overflow-hidden rounded-xl border shadow-sm lg:flex lg:flex-col"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
            >
              <div
                className="grid shrink-0 grid-cols-[minmax(0,1.7fr)_minmax(180px,1.2fr)_110px_120px_110px] border-b px-5 py-3"
                style={{
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                }}
              >
                <TableHeading label="Organization" theme={theme} />
                <TableHeading label="Primary Contact" theme={theme} />
                <TableHeading label="Service Tier" theme={theme} />
                <TableHeading label="Status" theme={theme} />
                <TableHeading label="Actions" theme={theme} align="right" />
              </div>

              {/* ISOLATED SCROLLABLE TABLE BODY */}
              <div
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden divide-y"
                style={{
                  borderColor: theme.border,
                  scrollbarWidth: "thin",
                  scrollbarColor: `${theme.borderStrong} transparent`,
                }}
              >
                {filteredClients.map((client) => (
                  <DesktopClientRow
                    key={client.id}
                    client={client}
                    theme={theme}
                  />
                ))}
              </div>

              {/* FOOTER */}
              <div
                className="flex shrink-0 items-center justify-between border-t px-5 py-3"
                style={{
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                }}
              >
                <span className="text-[11px]" style={{ color: theme.textMuted }}>
                  {filteredClients.length} verified {filteredClients.length === 1 ? "tenant" : "tenants"}
                </span>
                <span className="text-[10px]" style={{ color: theme.textLight }}>
                  Encrypted Directory
                </span>
              </div>
            </div>

            {/* MOBILE CARDS */}
            <div className="h-full overflow-y-auto overflow-x-hidden pb-2 lg:hidden space-y-3">
              {filteredClients.map((client) => (
                <MobileClientCard
                  key={client.id}
                  client={client}
                  theme={theme}
                />
              ))}
            </div>
          </>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && filteredClients.length === 0 && (
          <div
            className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border px-6 text-center shadow-sm"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                color: theme.text,
              }}
            >
              <Building2 size={20} strokeWidth={1.8} />
            </div>

            <h2 className="mt-4 text-[14px] font-bold" style={{ color: theme.text }}>
              {clients.length === 0 ? "No Clients Registered" : "No Matching Records"}
            </h2>

            <p className="mt-1 max-w-sm text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
              {clients.length === 0
                ? "Onboard your first enterprise client to initialize database provisioning."
                : "Adjust your search parameters or reset the status filters."}
            </p>

            {clients.length === 0 && (
              <Link
                to="/admin/clients/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[11px] font-bold shadow-sm transition hover:opacity-90"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.primaryText,
                }}
              >
                <Plus size={14} strokeWidth={2.4} />
                Register First Client
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   ROW & CELL COMPONENTS
========================================================= */

function TableHeading({ label, theme, align = "left" }) {
  return (
    <div
      className={`text-[9px] font-bold uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      }`}
      style={{ color: theme.textMuted }}
    >
      {label}
    </div>
  );
}

function DesktopClientRow({ client, theme }) {
  return (
    <div
      className="grid grid-cols-[minmax(0,1.7fr)_minmax(180px,1.2fr)_110px_120px_110px] items-center px-5 py-3 transition-colors"
      style={{ borderColor: theme.border }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.surfaceHover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {/* BUSINESS */}
      <div className="min-w-0 pr-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold"
            style={{
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            {getInitial(client.business_name)}
          </div>

          <div className="min-w-0">
            <Link
              to={`/admin/clients/${client.id}`}
              className="block truncate text-[12px] font-bold transition hover:underline"
              style={{ color: theme.text }}
            >
              {client.business_name || "Unnamed entity"}
            </Link>

            <span className="mt-0.5 block truncate text-[10px]" style={{ color: theme.textMuted }}>
              Tenant #{client.id ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* OWNER */}
      <div className="min-w-0 pr-4">
        <div className="truncate text-[11px] font-medium" style={{ color: theme.textSoft }}>
          {client.owner_name || "—"}
        </div>
        <div className="truncate text-[10px]" style={{ color: theme.textMuted }}>
          {client.business_email || "No email"}
        </div>
      </div>

      {/* PLAN */}
      <div className="min-w-0 pr-3">
        <span
          className="inline-flex max-w-full truncate rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: theme.surfaceAlt,
            color: theme.textSoft,
          }}
          title={client.plan || "—"}
        >
          {client.plan || "Standard"}
        </span>
      </div>

      {/* STATUS */}
      <div className="min-w-0 pr-3">
        <StatusBadge status={client.subscription_status} theme={theme} />
      </div>

      {/* ACTIONS */}
      <div className="flex items-center justify-end gap-1">
        <ActionButton
          to={`/admin/clients/${client.id}`}
          icon={Eye}
          label="View client"
          theme={theme}
        />
        <ActionButton icon={Edit} label="Edit client" theme={theme} />
        <ActionButton icon={Trash2} label="Delete client" theme={theme} danger />
      </div>
    </div>
  );
}

function MobileClientCard({ client, theme }) {
  const phone = client.whatsapp_number || client.primary_number || "";

  return (
    <div
      className="rounded-xl border p-4 shadow-sm"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-[13px] font-bold"
            style={{
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            {getInitial(client.business_name)}
          </div>

          <div className="min-w-0">
            <Link
              to={`/admin/clients/${client.id}`}
              className="block truncate text-[13px] font-bold"
              style={{ color: theme.text }}
            >
              {client.business_name || "Unnamed organization"}
            </Link>
            <p className="truncate text-[10px]" style={{ color: theme.textMuted }}>
              {client.owner_name || "Owner unassigned"}
            </p>
          </div>
        </div>

        <StatusBadge status={client.subscription_status} theme={theme} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] border-t pt-3" style={{ borderColor: theme.border }}>
        <div className="truncate" style={{ color: theme.textMuted }}>
          Email: <span className="font-medium" style={{ color: theme.textSoft }}>{client.business_email || "—"}</span>
        </div>
        <div className="truncate text-right" style={{ color: theme.textMuted }}>
          Tier: <span className="font-medium" style={{ color: theme.textSoft }}>{client.plan || "—"}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: theme.border }}>
        <span className="text-[10px]" style={{ color: theme.textLight }}>
          ID: {client.id ?? "—"}
        </span>

        <div className="flex items-center gap-1.5">
          <Link
            to={`/admin/clients/${client.id}`}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold"
            style={{
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <Eye size={12} /> View
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, theme }) {
  const normalized = status?.toLowerCase() || "";

  let color = theme.textMuted;
  let background = theme.surfaceAlt;
  let Icon = Clock3;

  if (normalized === "active" || normalized === "ready") {
    color = theme.success;
    background = theme.successSoft;
    Icon = CheckCircle2;
  } else if (normalized === "pending" || normalized === "trial") {
    color = theme.warning;
    background = theme.warningSoft;
    Icon = Clock3;
  } else if (
    normalized === "inactive" ||
    normalized === "failed" ||
    normalized === "cancelled"
  ) {
    color = theme.danger;
    background = theme.dangerSoft;
    Icon = XCircle;
  }

  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded px-2 py-0.5 text-[9px] font-semibold"
      style={{
        backgroundColor: background,
        color,
      }}
    >
      <Icon size={10} strokeWidth={2.2} className="shrink-0" />
      <span className="truncate">{status || "Unknown"}</span>
    </span>
  );
}

function ActionButton({ to, icon: Icon, label, theme, danger = false }) {
  const content = <Icon size={14} strokeWidth={1.8} />;
  const className = "rounded-lg p-1.5 transition";

  const style = {
    color: danger ? theme.danger : theme.textMuted,
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.backgroundColor = danger
      ? theme.dangerSoft
      : theme.surfaceHover;
    e.currentTarget.style.color = danger ? theme.danger : theme.text;
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.color = danger ? theme.danger : theme.textMuted;
  };

  if (to) {
    return (
      <Link
        to={to}
        aria-label={label}
        title={label}
        className={className}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={className}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {content}
    </button>
  );
}

function getInitial(name) {
  if (!name) return "C";
  return name.trim().charAt(0).toUpperCase();
}

export default ClientsPage;