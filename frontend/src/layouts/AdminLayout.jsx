import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  Cpu,
  CreditCard,
  Database,
  FileChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";

import logo from "../assets/logo2.png";

/* ============================================================================
   ABHINAVA ENTERPRISE THEME: MONOCHROME OBSIDIAN & PURE WHITE
   ========================================================================== */

const THEMES = {
  light: {
    mode: "light",

    background: "#F8F9FA",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F4F6",
    surfaceHover: "#EBECEF",

    border: "#E4E7EB",
    borderStrong: "#CBD0D7",

    // Sharp editorial ink typography
    text: "#0F1117",
    textSoft: "#363B45",
    textMuted: "#6B7280",
    textLight: "#9CA3AF",

    // High-contrast Obsidian Action Buttons
    primaryBtnBg: "#0F1117",
    primaryBtnText: "#FFFFFF",
    primaryBtnHover: "#1F2430",

    // Highlight / Active states
    navActiveBg: "#F0F2F5",
    navActiveText: "#0F1117",

    // Precision semantic tokens
    success: "#047857",
    successSoft: "#ECFDF5",
    warning: "#B45309",
    warningSoft: "#FFFBEB",
    danger: "#B91C1C",
    dangerSoft: "#FEF2F2",

    sidebar: "#FFFFFF",
    header: "rgba(255, 255, 255, 0.94)",
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

    // Crisp high-contrast white action buttons
    primaryBtnBg: "#FFFFFF",
    primaryBtnText: "#090A0D",
    primaryBtnHover: "#E5E7EB",

    // Highlight / Active states
    navActiveBg: "#1C2029",
    navActiveText: "#FFFFFF",

    // Restful luminous status marks
    success: "#34D399",
    successSoft: "rgba(52, 211, 153, 0.12)",
    warning: "#FBBF24",
    warningSoft: "rgba(251, 191, 36, 0.12)",
    danger: "#F87171",
    dangerSoft: "rgba(248, 113, 113, 0.12)",

    sidebar: "#0C0E12",
    header: "rgba(12, 14, 18, 0.92)",
  },
};

/* ============================================================================
   NAVIGATION STRUCTURE
   ========================================================================== */

const MAIN_NAVIGATION = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard },
  { name: "Clients & Ledgers", path: "/admin/clients", icon: Users },
  { name: "Subscriptions", path: "/admin/subscriptions", icon: CreditCard },
  { name: "Financial Audit", path: "/admin/reports", icon: FileChartColumn },
];

const PLATFORM_NAVIGATION = [
  { name: "Tenant Provisioning", path: "/admin/provisioning", icon: Cpu },
  { name: "System Metrics", path: "/admin/metrics", icon: Activity },
];

const SETTINGS_NAVIGATION = [
  { name: "Preferences", path: "/admin/settings", icon: Settings },
];

const ALL_NAV_ITEMS = [
  ...MAIN_NAVIGATION,
  ...PLATFORM_NAVIGATION,
  ...SETTINGS_NAVIGATION,
  { name: "Register Client", path: "/admin/clients/new" },
];

/* ============================================================================
   THEME CONTEXT & HOOK
   ========================================================================== */

const AbhinavaThemeContext = createContext(null);

function getStoredTheme() {
  try {
    const stored = localStorage.getItem("abhinava-admin-theme");
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Ignore storage issues
  }
  return "light";
}

export function useAbhinavaTheme() {
  const context = useContext(AbhinavaThemeContext);
  if (!context) {
    throw new Error("useAbhinavaTheme must be used inside AbhinavaThemeProvider.");
  }
  return context;
}

export function AbhinavaThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(getStoredTheme);
  const theme = THEMES[themeMode];

  const toggleTheme = useCallback(() => {
    setThemeMode((current) => (current === "light" ? "dark" : "light"));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("abhinava-admin-theme", themeMode);
    } catch {
      // Ignore
    }

    document.documentElement.setAttribute("data-abhinava-theme", themeMode);
    document.body.setAttribute("data-abhinava-theme", themeMode);
    document.documentElement.style.backgroundColor = theme.background;
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode, theme]);

  return (
    <AbhinavaThemeContext.Provider value={{ themeMode, theme, toggleTheme }}>
      {children}
    </AbhinavaThemeContext.Provider>
  );
}

/* ============================================================================
   GLOBAL STYLES & TYPOGRAPHY
   ========================================================================== */

function AbhinavaGlobalStyles() {
  const { theme } = useAbhinavaTheme();

  return (
    <style>
      {`
        html, body, #root {
          min-height: 100%;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
          letter-spacing: -0.016em;
          font-feature-settings: "cv02", "cv03", "cv04", "cv11";
        }

        html {
          background: ${theme.background};
          scrollbar-width: thin;
          scrollbar-color: ${theme.borderStrong} transparent;
        }

        body {
          background: ${theme.background};
          color: ${theme.text};
          transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        .abhinava-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${theme.borderStrong} transparent;
        }

        .abhinava-scroll::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }

        .abhinava-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .abhinava-scroll::-webkit-scrollbar-thumb {
          background: ${theme.borderStrong};
          border-radius: 999px;
        }

        .abhinava-no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .abhinava-no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .abhinava-search::placeholder {
          color: ${theme.textMuted};
        }

        ::selection {
          background: ${theme.borderStrong};
          color: ${theme.text};
        }
      `}
    </style>
  );
}

/* ============================================================================
   ADMIN LAYOUT
   ========================================================================== */

export function AdminLayout({ children }) {
  return (
    <AbhinavaThemeProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AbhinavaThemeProvider>
  );
}

function AdminLayoutContent({ children }) {
  const { themeMode, theme, toggleTheme } = useAbhinavaTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  // Determine active route name dynamically for top navbar
  const currentRoute = ALL_NAV_ITEMS.find((item) => {
    if (item.path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(item.path);
  });
  const activePageTitle = currentRoute ? currentRoute.name : "Console";

  return (
    <>
      <AbhinavaGlobalStyles />

      <div
        className="min-h-screen"
        style={{
          backgroundColor: theme.background,
          color: theme.text,
        }}
      >
        {/* MOBILE OVERLAY */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-200"
            style={{
              backgroundColor:
                themeMode === "dark" ? "rgba(0,0,0,0.75)" : "rgba(15,17,23,0.35)",
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* PERSISTENT SIDEBAR */}
        <aside
          className={`fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r transition-transform duration-200 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            backgroundColor: theme.sidebar,
            borderColor: theme.border,
          }}
        >
          {/* BRAND WITH ISOLATED LOGO PEDESTAL */}
          <div
            className="flex h-[68px] shrink-0 items-center justify-between border-b px-5"
            style={{ borderColor: theme.border }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border p-1 shadow-sm transition-all"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                }}
              >
                <img
                  src={logo}
                  alt="Abhinava"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <span
                  className="block text-[13px] font-bold tracking-tight uppercase"
                  style={{ color: theme.text }}
                >
                  Abhinava
                </span>
                <span
                  className="block text-[9px] font-semibold tracking-wider uppercase"
                  style={{ color: theme.textMuted }}
                >
                  Enterprise ERP
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 lg:hidden"
              style={{ color: theme.textMuted }}
            >
              <X size={18} />
            </button>
          </div>

          {/* NAVIGATION DIRECTORY */}
          <div className="abhinava-no-scrollbar flex-1 overflow-y-auto px-3.5 py-5">
            <SidebarSection label="Business Modules" items={MAIN_NAVIGATION} theme={theme} />

            <div className="mt-6">
              <SidebarSection
                label="Provisioning"
                items={PLATFORM_NAVIGATION}
                theme={theme}
              />
            </div>

            <div className="mt-6">
              <SidebarSection
                label="System"
                items={SETTINGS_NAVIGATION}
                theme={theme}
              />
            </div>
          </div>

          {/* LOGOUT FOOTER */}
          <div
            className="shrink-0 border-t p-3"
            style={{ borderColor: theme.border }}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.dangerSoft;
                e.currentTarget.style.color = theme.danger;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = theme.textMuted;
              }}
            >
              <LogOut size={16} strokeWidth={1.7} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* WORKSPACE AREA */}
        <div className="flex min-h-screen flex-col lg:ml-[260px]">
          {/* HEADER */}
          <header
            className="sticky top-0 z-30 border-b backdrop-blur-md"
            style={{
              backgroundColor: theme.header,
              borderColor: theme.border,
            }}
          >
            <div className="flex h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-lg p-2 lg:hidden"
                  style={{ color: theme.textSoft }}
                >
                  <Menu size={20} />
                </button>

                {/* DYNAMIC ACTIVE PAGE HEADER */}
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-[14px] font-bold tracking-tight"
                    style={{ color: theme.text }}
                  >
                    {activePageTitle}
                  </span>
                </div>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative mx-2 flex-1 max-w-[320px]">
                <Search
                  size={15}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: theme.textMuted }}
                />
                <input
                  type="text"
                  placeholder="Search ledgers, organizations..."
                  className="abhinava-search h-[38px] w-full rounded-lg border pl-9 pr-4 text-[12px] outline-none transition-all shadow-sm"
                  style={{
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = theme.borderStrong)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = theme.border)}
                />
              </div>

              {/* ACTION TOOLS */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  className="relative rounded-lg p-2 transition-colors"
                  style={{ color: theme.textSoft }}
                  title="Notifications"
                >
                  <Bell size={17} strokeWidth={1.8} />
                  <span
                    className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: theme.danger }}
                  />
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-lg p-2 transition-colors"
                  style={{ color: theme.textSoft }}
                  title={themeMode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                >
                  {themeMode === "light" ? (
                    <Moon size={17} strokeWidth={1.8} />
                  ) : (
                    <Sun size={17} strokeWidth={1.8} />
                  )}
                </button>

                <div
                  className="mx-1 hidden h-5 w-px sm:block"
                  style={{ backgroundColor: theme.border }}
                />

                {/* USER BADGE */}
                <div className="flex items-center gap-2.5 pl-1">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm"
                    style={{
                      backgroundColor: theme.surfaceAlt,
                      borderColor: theme.border,
                      color: theme.textSoft,
                    }}
                  >
                    <UserRound size={15} strokeWidth={1.8} />
                  </div>
                  <div className="hidden xl:block leading-tight">
                    <p className="text-[11px] font-bold" style={{ color: theme.text }}>
                      Root Admin
                    </p>
                    <p className="text-[10px]" style={{ color: theme.textMuted }}>
                      Master Tenant
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* APPLICATION VIEW */}
          <main
            className="abhinava-scroll flex-1 overflow-y-auto"
            style={{ backgroundColor: theme.background }}
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

/* ============================================================================
   SIDEBAR NAV ITEMS
   ========================================================================== */

function SidebarSection({ label, items, theme }) {
  return (
    <div>
      <div
        className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider"
        style={{ color: theme.textLight }}
      >
        {label}
      </div>

      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/admin"}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-medium transition-all"
              style={({ isActive }) => ({
                color: isActive ? theme.navActiveText : theme.textSoft,
                backgroundColor: isActive ? theme.navActiveBg : "transparent",
                fontWeight: isActive ? 600 : 500,
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2 : 1.7}
                    style={{ color: isActive ? theme.navActiveText : theme.textMuted }}
                  />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: theme.text }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

/* ============================================================================
   DASHBOARD VIEW
   ========================================================================== */

export function Dashboard() {
  const { theme } = useAbhinavaTheme();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const refreshLock = useRef(false);

  const loadDashboard = useCallback(
    async (manual = false) => {
      if (refreshLock.current) return;
      refreshLock.current = true;
      if (manual) setRefreshing(true);

      try {
        setError("");
        const response = await fetch(`${API_URL}/admin/dashboard`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error("Platform session expired.");
          if (response.status === 403) throw new Error("Access clearance required.");
          throw new Error(`Unable to fetch metrics (${response.status}).`);
        }

        const data = await response.json();
        setDashboard(data);
      } catch (err) {
        console.error("Dashboard load failed:", err);
        setError(err?.message || "Unable to sync dashboard overview.");
      } finally {
        refreshLock.current = false;
        if (manual) setRefreshing(false);
        setLoading(false);
      }
    },
    [API_URL]
  );

  useEffect(() => {
    loadDashboard(false);
    const interval = setInterval(() => loadDashboard(true), 60000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <RefreshCw size={18} className="animate-spin" />
          </div>
          <p className="mt-4 text-[12px] font-medium" style={{ color: theme.textMuted }}>
            Syncing platform metrics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center px-4">
        <div
          className="w-full max-w-[400px] rounded-xl border p-8 text-center shadow-sm"
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        >
          <div
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: theme.warningSoft, color: theme.warning }}
          >
            <AlertCircle size={20} />
          </div>
          <h2 className="mt-4 text-[15px] font-bold" style={{ color: theme.text }}>
            Service Unavailable
          </h2>
          <p className="mx-auto mt-2 text-[12px] leading-relaxed" style={{ color: theme.textMuted }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-opacity"
            style={{
              backgroundColor: theme.primaryBtnBg,
              color: theme.primaryBtnText,
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const health = dashboard?.health || {};
  const clients = dashboard?.clients || [];

  const totalClients = Number(stats.total_clients || 0);
  const activeTenants = Number(stats.active_tenants || 0);
  const provisioningReady = Number(stats.provisioning_ready || 0);
  const provisioningPending = Number(stats.provisioning_pending || 0);
  const provisioningFailed = Number(stats.provisioning_failed || 0);
  const activeSubscriptions = Number(stats.active_subscriptions || 0);

  const provisioningPercentage =
    totalClients > 0 ? Math.round((provisioningReady / totalClients) * 100) : 0;
  const lastUpdated = dashboard?.updated_at || new Date().toISOString();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      {/* HEADER ROW */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mt-1 text-[12px]" style={{ color: theme.textMuted }}>
            Client orchestration, isolated database tenants & system telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-medium shadow-sm transition-all"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.surface,
              color: theme.textSoft,
            }}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Sync
          </button>

          {/* HIGH CONVICTION SOLID ACTION BUTTON */}
          <button
            type="button"
            onClick={() => window.location.assign("/admin/clients/new")}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12px] font-bold shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
            style={{
              backgroundColor: theme.primaryBtnBg,
              color: theme.primaryBtnText,
            }}
          >
            <Plus size={15} strokeWidth={2.2} />
            Register Client
          </button>
        </div>
      </section>
      {/* WORKSPACE CONTENT */}
      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,0.85fr)]">
        {/* CLIENT ACTIVITY TABLE */}
        <div
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border shadow-sm"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
        >
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: theme.border }}
          >
            <div className="flex items-center gap-2.5">
              <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: theme.text }}>
                Recent Accounts
              </h2>
              <span
                className="rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                  color: theme.textSoft,
                }}
              >
                Audited
              </span>
            </div>

            <NavLink
              to="/admin/clients"
              className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline"
              style={{ color: theme.text }}
            >
              View directory
              <ChevronDown size={13} className="-rotate-90" />
            </NavLink>
          </div>

          <div className="abhinava-scroll w-full overflow-x-auto">
            {clients.length === 0 ? (
              <EmptyClients theme={theme} />
            ) : (
              <table className="w-full min-w-[650px] table-fixed border-collapse">
                <thead>
                  <tr style={{ backgroundColor: theme.surfaceAlt }}>
                    <TableHeader label="ORGANIZATION" theme={theme} className="w-[34%]" />
                    <TableHeader label="TIER" theme={theme} className="w-[16%]" />
                    <TableHeader label="SUBSCRIPTION" theme={theme} className="w-[18%]" />
                    <TableHeader label="DATABASE TENANT" theme={theme} className="w-[18%]" />
                    <TableHeader label="LAST ACTIVE" theme={theme} className="w-[14%]" />
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {clients.map((client, idx) => (
                    <DashboardClientRow
                      key={client.id || idx}
                      client={client}
                      theme={theme}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div
            className="mt-auto flex items-center justify-between border-t px-5 py-3"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.surfaceAlt,
            }}
          >
            <span className="text-[11px]" style={{ color: theme.textMuted }}>
              Showing {clients.length} account records
            </span>
            <span className="text-[10px]" style={{ color: theme.textLight }}>
              Updated {formatTime(lastUpdated)}
            </span>
          </div>
        </div>

        {/* HEALTH & PROVISIONING */}
        <div className="space-y-6">
          <PlatformHealth health={health} theme={theme} />

          <TenantProvisioning
            ready={provisioningReady}
            pending={provisioningPending}
            failed={provisioningFailed}
            total={totalClients}
            percentage={provisioningPercentage}
            theme={theme}
          />

          <PlatformState health={health} lastUpdated={lastUpdated} theme={theme} />
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   TABLE ROW & STATUS BADGES
   ========================================================================== */

function TableHeader({ label, theme, className = "" }) {
  return (
    <th
      className={`px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{ color: theme.textMuted }}
    >
      {label}
    </th>
  );
}

function DashboardClientRow({ client, theme }) {
  return (
    <tr
      className="transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.surfaceHover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <td className="px-5 py-3.5">
        <div className="truncate text-[12px] font-bold" style={{ color: theme.text }}>
          {client.business_name || "Unnamed entity"}
        </div>
        <div className="text-[10px]" style={{ color: theme.textMuted }}>
          ID: {client.id ?? "—"}
        </div>
      </td>

      <td className="px-5 py-3.5">
        <span className="text-[11px] font-medium" style={{ color: theme.textSoft }}>
          {client.plan || "Enterprise"}
        </span>
      </td>

      <td className="px-5 py-3.5">
        <StatusBadge
          status={client.subscription_status}
          type="subscription"
          theme={theme}
        />
      </td>

      <td className="px-5 py-3.5">
        <StatusBadge
          status={client.provisioning_status || client.display_status}
          type="tenant"
          theme={theme}
        />
      </td>

      <td className="px-5 py-3.5">
        <div className="text-[11px]" style={{ color: theme.textSoft }}>
          {formatDate(client.updated_at)}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status, type, theme }) {
  const normalized = String(status || "").trim().toUpperCase();

  let label = normalized || "Unknown";
  let color = theme.warning;
  let bg = theme.warningSoft;

  if (normalized === "ACTIVE" || normalized === "READY") {
    label = normalized === "ACTIVE" ? "Active" : "Ready";
    color = theme.success;
    bg = theme.successSoft;
  } else if (normalized === "FAILED" || normalized === "ERROR") {
    label = "Failed";
    color = theme.danger;
    bg = theme.dangerSoft;
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/* ============================================================================
   PANEL MODULES
   ========================================================================== */

function OverviewStat({ label, value, description, icon: Icon, theme }) {
  return (
    <div
      className="rounded-xl border p-5 shadow-sm transition-all"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: theme.textMuted }}
        >
          {label}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </div>
      </div>
      <div
        className="mt-3 text-[28px] font-bold tracking-tight"
        style={{ color: theme.text }}
      >
        {value}
      </div>
      <p className="mt-1 text-[11px]" style={{ color: theme.textMuted }}>
        {description}
      </p>
    </div>
  );
}

function PlatformHealth({ health, theme }) {
  return (
    <div
      className="rounded-xl border p-5 shadow-sm"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <div
        className="flex items-center justify-between border-b pb-3"
        style={{ borderColor: theme.border }}
      >
        <h2 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: theme.text }}>
          System Health
        </h2>
        <span
          className="rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: theme.successSoft,
            color: theme.success,
          }}
        >
          Operational
        </span>
      </div>

      <div className="divide-y pt-2" style={{ borderColor: theme.border }}>
        <HealthRow
          icon={Server}
          label="Edge Gateway"
          status={health.api}
          theme={theme}
        />
        <HealthRow
          icon={Database}
          label="PostgreSQL Primary Cluster"
          status={health.database}
          theme={theme}
        />
        <HealthRow
          icon={ShieldCheck}
          label="Auth & Identity Provider"
          status={health.authentication}
          theme={theme}
        />
      </div>
    </div>
  );
}

function HealthRow({ icon: Icon, label, status, theme }) {
  const operational =
    String(status || "").toUpperCase().includes("OPERATIONAL") || !status;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        <Icon size={15} strokeWidth={1.7} style={{ color: theme.textMuted }} />
        <span className="text-[12px] font-medium" style={{ color: theme.textSoft }}>
          {label}
        </span>
      </div>
      <span
        className="text-[11px] font-semibold"
        style={{ color: operational ? theme.success : theme.danger }}
      >
        {operational ? "Operational" : "Degraded"}
      </span>
    </div>
  );
}

function TenantProvisioning({ ready, pending, failed, total, percentage, theme }) {
  return (
    <div
      className="rounded-xl border p-5 shadow-sm"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <div
        className="flex items-center justify-between border-b pb-4"
        style={{ borderColor: theme.border }}
      >
        <h2 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: theme.text }}>
          Tenant Provisioning
        </h2>
        <span className="text-[11px] font-bold" style={{ color: theme.text }}>
          {percentage}% Complete
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
        <div
          className="rounded-lg border p-2.5"
          style={{
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
          }}
        >
          <div className="text-[16px] font-bold" style={{ color: theme.success }}>
            {ready}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
            Ready
          </div>
        </div>
        <div
          className="rounded-lg border p-2.5"
          style={{
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
          }}
        >
          <div className="text-[16px] font-bold" style={{ color: theme.warning }}>
            {pending}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
            Pending
          </div>
        </div>
        <div
          className="rounded-lg border p-2.5"
          style={{
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
          }}
        >
          <div className="text-[16px] font-bold" style={{ color: theme.danger }}>
            {failed}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
            Failed
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformState({ health, lastUpdated, theme }) {
  return (
    <div
      className="rounded-xl border p-5 shadow-sm"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <div
        className="flex items-center justify-between border-b pb-3"
        style={{ borderColor: theme.border }}
      >
        <h2 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: theme.text }}>
          Platform State
        </h2>
        <CheckCircle2 size={16} style={{ color: theme.success }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <span style={{ color: theme.textLight }}>Runtime Engine</span>
          <p className="font-semibold" style={{ color: theme.text }}>
            Distributed v2.4
          </p>
        </div>
        <div>
          <span style={{ color: theme.textLight }}>Multi-Tenant DB</span>
          <p className="font-semibold" style={{ color: theme.text }}>
            Connected
          </p>
        </div>
        <div>
          <span style={{ color: theme.textLight }}>Sync Interval</span>
          <p className="font-semibold" style={{ color: theme.text }}>
            60s Interval
          </p>
        </div>
        <div>
          <span style={{ color: theme.textLight }}>Last Heartbeat</span>
          <p className="font-semibold" style={{ color: theme.text }}>
            {formatTime(lastUpdated)}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyClients({ theme }) {
  return (
    <div className="py-12 text-center">
      <Building2 size={28} className="mx-auto" style={{ color: theme.textLight }} />
      <p className="mt-3 text-[13px] font-bold" style={{ color: theme.textSoft }}>
        No accounts registered yet
      </p>
      <p className="text-[11px]" style={{ color: theme.textMuted }}>
        Provision an organization account to initialize an isolated tenant.
      </p>
    </div>
  );
}

/* ============================================================================
   DATE & TIME UTILITIES
   ========================================================================== */

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
}

function formatTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
}