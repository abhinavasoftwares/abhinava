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
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Database,
  FileChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Users,
  X,
  Sparkles,
  Activity,
  Cpu,
  ReceiptText,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

import logo from "../assets/favicon.png";

/* ============================================================================
   TOAST CONTEXT
============================================================================ */

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id =
      Date.now() +
      Math.random().toString(36).substring(2, 7);

    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
      },
    ]);

    window.setTimeout(() => {
      setToasts((prev) =>
        prev.filter((toast) => toast.id !== id)
      );
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.filter((toast) => toast.id !== id)
    );
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      <aside
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3.5  transition-all"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {toast.type === "success" && (
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-emerald-700"
                />
              )}

              {toast.type === "error" && (
                <AlertCircle
                  size={16}
                  className="shrink-0 text-rose-700"
                />
              )}

              {toast.type === "warning" && (
                <ShieldAlert
                  size={16}
                  className="shrink-0 text-amber-700"
                />
              )}

              {toast.type === "info" && (
                <Sparkles
                  size={16}
                  className="shrink-0 text-slate-700"
                />
              )}

              <span className="text-xs font-semibold leading-snug text-slate-800">
                {toast.message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

/* ============================================================================
   DASHBOARD CONTEXT
============================================================================ */

const DashboardContext = createContext(null);

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error(
      "useDashboard must be used within DashboardProvider"
    );
  }

  return context;
}

function DashboardProvider({ children }) {
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const { addToast } = useToast();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refreshLock = useRef(false);

  const loadDashboard = useCallback(
    async (manual = false) => {
      if (refreshLock.current) {
        return;
      }

      refreshLock.current = true;

      if (manual) {
        setRefreshing(true);
      }

      try {
        setError("");

        const response = await fetch(
          `${API_URL}/admin/dashboard`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Platform session expired."
            );
          }

          if (response.status === 403) {
            throw new Error(
              "Access clearance required."
            );
          }

          throw new Error(
            `Failed to load admin telemetry (${response.status}).`
          );
        }

        const data = await response.json();

        setDashboard(data);

        if (manual) {
          addToast(
            "Platform telemetry synchronized.",
            "success"
          );
        }
      } catch (err) {
        console.error(
          "Admin dashboard load failed:",
          err
        );

        setError(
          err?.message ||
            "Unable to synchronize platform telemetry."
        );

        if (manual) {
          addToast(
            err?.message ||
              "Unable to synchronize telemetry.",
            "error"
          );
        }
      } finally {
        refreshLock.current = false;

        if (manual) {
          setRefreshing(false);
        }

        setLoading(false);
      }
    },
    [API_URL, addToast]
  );

  useEffect(() => {
    loadDashboard(false);

    const interval = window.setInterval(() => {
      loadDashboard(true);
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  return (
    <DashboardContext.Provider
      value={{
        dashboard,
        loading,
        refreshing,
        error,
        loadDashboard,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

/* ============================================================================
   ADMIN NAVIGATION
============================================================================ */

const MAIN_NAVIGATION = [
  {
    name: "Overview",
    path: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Clients",
    path: "/admin/clients",
    icon: Users,
  },
  {
    name: "Subscriptions & Plans",
    path: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    name: "Billing",
    path: "/admin/billing",
    icon: ReceiptText,
    comingSoon: true,
  },
  {
    name: "Communication",
    path: "/admin/communication",
    icon: MessageSquare,
    comingSoon: true,
  },
];

const PLATFORM_NAVIGATION = [
  {
    name: "Provisioning",
    path: "/admin/provisioning",
    icon: Cpu,
    comingSoon: true,
  },
  {
    name: "System Health",
    path: "/admin/metrics",
    icon: Activity,
    comingSoon: true,
  },
  {
    name: "Audit Log",
    path: "/admin/audit",
    icon: FileChartColumn,
    comingSoon: true,
  },
];

const SETTINGS_NAVIGATION = [
  {
    name: "Admin Security",
    path: "/admin/security",
    icon: ShieldCheck,
    comingSoon: true,
  },
  {
    name: "Preferences",
    path: "/admin/settings",
    icon: Settings,
    comingSoon: true,
  },
];

const ACTIVE_NAVIGATION = {
  "/admin": true,
  "/admin/clients": true,
  "/admin/subscriptions": true,
};

/* ============================================================================
   ADMIN LAYOUT
============================================================================ */

export function AdminLayout({ children }) {
  return (
    <ToastProvider>
      <DashboardProvider>
        <AdminLayoutContent>
          {children}
        </AdminLayoutContent>
      </DashboardProvider>
    </ToastProvider>
  );
}

function AdminLayoutContent({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const { addToast } = useToast();

  const {
    dashboard,
    refreshing,
    loadDashboard,
  } = useDashboard();

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

      addToast(
        "Admin session terminated securely.",
        "info"
      );
    } catch (error) {
      console.error(
        "Admin logout failed:",
        error
      );
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  };

  const currentRoute = [
    ...MAIN_NAVIGATION,
    ...PLATFORM_NAVIGATION,
    ...SETTINGS_NAVIGATION,
  ].find((item) => {
    if (item.path === "/admin") {
      return location.pathname === "/admin";
    }

    return location.pathname.startsWith(
      item.path
    );
  });

  const activePageTitle =
    currentRoute?.name || "Admin Console";

  const health = dashboard?.health || {};

  const allOperational =
    isOperational(health.api) &&
    isOperational(health.database) &&
    isOperational(health.authentication);

  const activeClientCount = Number(
    dashboard?.stats?.active_clients ??
      dashboard?.stats?.active_tenants ??
      0
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-slate-200">
      {/* ============================================================
          MOBILE OVERLAY
      ============================================================ */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-xs lg:hidden"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* ============================================================
          SIDEBAR
      ============================================================ */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[270px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full"
        }`}
      >
        {/* BRAND */}

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <img
                src={logo}
                alt="Abhinava"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="leading-tight">
              <span className="block text-xs font-bold uppercase tracking-tight text-slate-900">
                Abhinava Softwares
              </span>

              <span className="mt-0.5 block text-[9.5px] font-mono font-medium uppercase tracking-wider text-slate-400">
                Admin Console
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* PLATFORM STATUS */}

        <div className="border-b border-slate-100 px-3.5 py-3">
          <div
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
              allOperational
                ? "border-emerald-200/70 bg-emerald-50/60"
                : "border-amber-200/70 bg-amber-50/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                  allOperational
                    ? "border-emerald-200 bg-white text-emerald-700"
                    : "border-amber-200 bg-white text-amber-700"
                }`}
              >
                {allOperational ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertCircle size={15} />
                )}
              </span>

              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700">
                  Platform Status
                </p>

                <p
                  className={`text-[10.5px] font-medium ${
                    allOperational
                      ? "text-emerald-800"
                      : "text-amber-800"
                  }`}
                >
                  {allOperational
                    ? "Core systems operational"
                    : "Attention required"}
                </p>
              </div>
            </div>

            <span
              className={`h-2 w-2 rounded-full ${
                allOperational
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
            />
          </div>
        </div>

        {/* NAVIGATION */}

        <div className="flex-1 overflow-y-auto px-3.5 py-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <SidebarSection
            label="Business Operations"
            items={MAIN_NAVIGATION}
          />

          <SidebarSection
            label="Platform"
            items={PLATFORM_NAVIGATION}
          />

          <SidebarSection
            label="Administration"
            items={SETTINGS_NAVIGATION}
          />

          {/* QUICK REGISTER */}

          <div className="mt-6">
            <button
              type="button"
              onClick={() =>
                navigate("/admin/clients/new")
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-black active:scale-[0.99]"
            >
              <Building2 size={14} />
              Register Client
            </button>
          </div>
        </div>

        {/* SIDEBAR FOOTER */}

        <div className="shrink-0 border-t border-slate-100 bg-[#FAFAFA] p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-rose-50/80 hover:text-rose-700"
          >
            <LogOut
              size={15}
              className="text-slate-400 transition-colors group-hover:text-rose-600"
            />

            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ============================================================
          MAIN VIEWPORT
      ============================================================ */}

      <div className="flex min-h-screen flex-col lg:ml-[270px]">
        {/* TOPBAR */}

        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
            >
              <Menu size={18} />
            </button>

            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                {activePageTitle}
              </h1>

              <p className="hidden text-[10.5px] font-medium text-slate-400 sm:block">
                Abhinava platform administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* REFRESH */}
            <button
              type="button"
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
              title="Synchronize platform telemetry"
            >
              <RefreshCw
                size={12}
                className={
                  refreshing
                    ? "animate-spin text-slate-900"
                    : "text-slate-400"
                }
              />
              <span className="hidden sm:inline">
                Sync
              </span>
            </button>

            {/* NOTIFICATIONS */}
            <button
              type="button"
              onClick={() =>
                addToast(
                  "No notification center is connected yet.",
                  "info"
                )
              }
              className="relative rounded-lg border border-slate-200/90 bg-white p-2 text-slate-500 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-800"
              title="Notifications"
            >
              <Bell size={14} />
            </button>

            <div className="hidden h-4 w-px bg-slate-200 sm:block" />

            {/* ADMIN IDENTITY */}

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-bold text-white shadow-2xs">
                A
              </div>

              <div className="hidden leading-tight xl:block">
                <p className="text-xs font-bold text-slate-900">
                  Platform Admin
                </p>

                <p className="text-[10px] font-mono text-slate-400">
                  Abhinava Control Plane
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* BODY */}

        <main className="min-h-[calc(100vh-4rem)] flex-1 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ============================================================================
   SIDEBAR SECTION
============================================================================ */

function SidebarSection({ label, items }) {
  return (
    <section className="mb-6">
      <div className="mb-2 px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;

          const routeExists =
            ACTIVE_NAVIGATION[item.path];

          if (!routeExists) {
            return (
              <div
                key={item.name}
                className="group flex cursor-default items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400"
                title="This Admin function will be enabled when its backend and page are wired."
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-300"
                  />

                  <span className="truncate">
                    {item.name}
                  </span>
                </div>

                <span className="ml-2 shrink-0 rounded border border-slate-200/60 bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all duration-150 ${
                  isActive
                    ? "bg-slate-100 font-bold text-slate-900 shadow-2xs"
                    : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon
                      size={15}
                      strokeWidth={
                        isActive ? 2.2 : 1.8
                      }
                      className={
                        isActive
                          ? "text-slate-900"
                          : "text-slate-400 group-hover:text-slate-700"
                      }
                    />

                    <span className="truncate">
                      {item.name}
                    </span>
                  </div>

                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </section>
  );
}

/* ============================================================================
   DASHBOARD
============================================================================ */

export function Dashboard() {
  const {
    dashboard,
    loading,
    error,
    refreshing,
    loadDashboard,
  } = useDashboard();

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs">
            <RefreshCw
              size={16}
              className="animate-spin"
            />
          </div>

          <p className="text-xs font-mono font-medium uppercase tracking-wider text-slate-400">
            Loading platform telemetry...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50/70 text-rose-700">
            <AlertCircle size={20} />
          </div>

          <h2 className="mt-4 text-sm font-bold text-slate-900">
            Platform telemetry unavailable
          </h2>

          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadDashboard(true)
            }
            disabled={refreshing}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-black disabled:opacity-60"
          >
            <RefreshCw
              size={13}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const health = dashboard?.health || {};
  const clients = dashboard?.clients || [];

  const totalClients = Number(
    stats.total_clients || 0
  );

  const provisioningReady = Number(
    stats.provisioning_ready || 0
  );

  const provisioningPending = Number(
    stats.provisioning_pending || 0
  );

  const provisioningFailed = Number(
    stats.provisioning_failed || 0
  );

  const activeClients = Number(
    stats.active_clients ??
      stats.active_tenants ??
      0
  );

  const disabledClients = Math.max(
    totalClients - activeClients,
    0
  );

  const provisioningPercentage =
    totalClients > 0
      ? Math.round(
          (provisioningReady /
            totalClients) *
            100
        )
      : 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* PLATFORM HEALTH */}

      <section className="grid gap-3.5 sm:grid-cols-3">
        <HealthSummaryCard
          icon={Server}
          label="API Node"
          status={health.api}
        />

        <HealthSummaryCard
          icon={Database}
          label="PostgreSQL Primary"
          status={health.database}
        />

        <HealthSummaryCard
          icon={ShieldCheck}
          label="Authentication Gateway"
          status={health.authentication}
        />
      </section>

      {/* MAIN GRID */}

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,0.85fr)]">
        {/* CLIENT DIRECTORY */}

        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Client Directory
              </h3>

              <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                {clients.length}
              </span>
            </div>

            <NavLink
              to="/admin/clients"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 transition-colors hover:text-black"
            >
              View clients
              <ChevronRight size={13} />
            </NavLink>
          </div>

          {clients.length === 0 ? (
            <EmptyClients />
          ) : (
            <>
              {/* DESKTOP */}

              <div className="hidden w-full overflow-x-auto lg:block">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-[#FAFAFA] text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3">
                        Organization
                      </th>

                      <th className="px-5 py-3">
                        Plan
                      </th>

                      <th className="px-5 py-3">
                        Subscription
                      </th>

                      <th className="px-5 py-3">
                        Provisioning
                      </th>

                      <th className="px-5 py-3 text-right">
                        Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {clients.map(
                      (client, index) => (
                        <tr
                          key={
                            client.id ||
                            index
                          }
                          className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                          onClick={() =>
                            navigateToClient(
                              client.id
                            )
                          }
                        >
                          <td className="px-5 py-3.5">
                            <div className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-black">
                              {client.business_name ||
                                "Unnamed entity"}
                            </div>

                            <div className="mt-0.5 text-[10px] font-mono text-slate-400">
                              TENANT #
                              {client.id ??
                                "—"}
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-700">
                              {client.plan ||
                                "—"}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <StatusBadge
                              status={
                                client.subscription_status
                              }
                            />
                          </td>

                          <td className="px-5 py-3.5">
                            <StatusBadge
                              status={
                                client.provisioning_status ||
                                client.display_status
                              }
                            />
                          </td>

                          <td className="px-5 py-3.5 text-right text-[11px] font-mono text-slate-400">
                            {formatDate(
                              client.updated_at
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}

              <div className="divide-y divide-slate-100 lg:hidden">
                {clients.map(
                  (client, index) => (
                    <button
                      type="button"
                      key={
                        client.id ||
                        index
                      }
                      onClick={() =>
                        navigateToClient(
                          client.id
                        )
                      }
                      className="w-full p-4 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {client.business_name ||
                              "Unnamed entity"}
                          </p>

                          <span className="text-[10px] font-mono text-slate-400">
                            ID #
                            {client.id ??
                              "—"}
                          </span>
                        </div>

                        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                          {client.plan ||
                            "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={
                              client.subscription_status
                            }
                          />

                          <StatusBadge
                            status={
                              client.provisioning_status ||
                              client.display_status
                            }
                          />
                        </div>

                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDate(
                            client.updated_at
                          )}
                        </span>
                      </div>
                    </button>
                  )
                )}
              </div>
            </>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-[#FAFAFA] px-5 py-2.5 text-[11px] font-mono text-slate-400">
            <span>
              Showing {clients.length} accounts
            </span>

            <span>
              {provisioningPercentage}%
              provisioned
            </span>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}

        <div className="space-y-6">
          <TenantProvisioning
            ready={provisioningReady}
            pending={provisioningPending}
            failed={provisioningFailed}
            percentage={
              provisioningPercentage
            }
          />

          <PlatformSummary
            totalClients={totalClients}
            activeClients={activeClients}
            disabledClients={
              disabledClients
            }
          />
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   SUPPORTING COMPONENTS
============================================================================ */

function HealthSummaryCard({
  icon: Icon,
  label,
  status,
}) {
  const operational =
    isOperational(status);

  return (
    <div
      className={`rounded-xl border bg-white p-3.5 shadow-2xs transition-colors ${
        operational
          ? "border-slate-200/90"
          : "border-amber-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              operational
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <Icon size={15} strokeWidth={2} />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              {label}
            </p>

            <p className="text-[10px] font-mono text-slate-400">
              Health status
            </p>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 text-[10px] font-mono font-semibold ${
            operational
              ? "text-emerald-800"
              : "text-amber-800"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              operational
                ? "bg-emerald-500"
                : "bg-amber-500"
            }`}
          />

          {operational
            ? "Operational"
            : "Attention"}
        </span>
      </div>
    </div>
  );
}

function TenantProvisioning({
  ready,
  pending,
  failed,
  percentage,
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Tenant Provisioning
          </h4>

          <p className="mt-0.5 text-[10px] font-mono text-slate-400">
            Isolated readiness
          </p>
        </div>

        <span className="text-xs font-bold font-mono text-slate-900">
          {percentage}%
        </span>
      </div>

      <div className="mb-3.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-800 transition-all"
          style={{
            width: `${Math.min(
              Math.max(
                percentage,
                0
              ),
              100
            )}`,
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniCount
          value={ready}
          label="Ready"
          tone="emerald"
        />

        <MiniCount
          value={pending}
          label="Pending"
          tone="amber"
        />

        <MiniCount
          value={failed}
          label="Failed"
          tone="rose"
        />
      </div>
    </div>
  );
}

function MiniCount({
  value,
  label,
  tone,
}) {
  const styles = {
    emerald:
      "border-emerald-200/70 bg-emerald-50/60 text-emerald-800",
    amber:
      "border-amber-200/70 bg-amber-50/60 text-amber-800",
    rose:
      "border-rose-200/70 bg-rose-50/60 text-rose-800",
  };

  return (
    <div
      className={`rounded-lg border p-2 ${styles[tone]}`}
    >
      <div className="text-base font-bold font-mono">
        {value}
      </div>

      <div className="text-[9px] font-mono font-semibold uppercase">
        {label}
      </div>
    </div>
  );
}

function PlatformSummary({
  totalClients,
  activeClients,
  disabledClients,
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Platform Summary
          </h4>

          <p className="mt-0.5 text-[10px] font-mono text-slate-400">
            Current registry snapshot
          </p>
        </div>

        <CheckCircle2
          size={15}
          className="text-emerald-700"
        />
      </div>

      <div className="space-y-2.5">
        <SummaryRow
          label="Total clients"
          value={totalClients}
        />

        <SummaryRow
          label="Active clients"
          value={activeClients}
          valueClass="text-emerald-700"
        />

        <SummaryRow
          label="Disabled / inactive"
          value={disabledClients}
          valueClass="text-rose-700"
        />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = "text-slate-900",
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>

      <span
        className={`text-xs font-bold font-mono ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(
    status || ""
  )
    .trim()
    .toUpperCase();

  let label =
    normalized || "Unknown";

  let classes =
    "border-slate-200 bg-slate-100 text-slate-600";

  if (
    normalized === "ACTIVE" ||
    normalized === "READY"
  ) {
    label =
      normalized === "ACTIVE"
        ? "Active"
        : "Ready";

    classes =
      "border-emerald-200/70 bg-emerald-50/60 text-emerald-800";
  } else if (
    normalized === "FAILED" ||
    normalized === "ERROR"
  ) {
    label = "Failed";

    classes =
      "border-rose-200/70 bg-rose-50/60 text-rose-800";
  } else if (
    normalized === "PENDING"
  ) {
    label = "Pending";

    classes =
      "border-amber-200/70 bg-amber-50/60 text-amber-800";
  } else if (
    normalized === "DISABLED" ||
    normalized === "INACTIVE"
  ) {
    label = "Disabled";

    classes =
      "border-rose-200/70 bg-rose-50/60 text-rose-800";
  } else if (
    normalized === "TRIAL"
  ) {
    label = "Trial";

    classes =
      "border-slate-200 bg-slate-100 text-slate-700";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9.5px] font-mono font-medium ${classes}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function EmptyClients() {
  return (
    <div className="py-12 text-center">
      <Building2
        size={28}
        className="mx-auto text-slate-300"
      />

      <p className="mt-2.5 text-xs font-bold text-slate-800">
        No clients registered yet
      </p>

      <p className="mt-0.5 text-[11px] text-slate-500">
        Register an organization to initialize an isolated tenant.
      </p>
    </div>
  );
}

/* ============================================================================
   HELPERS
============================================================================ */

function isOperational(status) {
  return String(status || "")
    .toUpperCase()
    .includes("OPERATIONAL");
}

function navigateToClient(clientId) {
  if (!clientId) {
    return;
  }

  window.location.assign(
    `/admin/clients/${clientId}`
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}