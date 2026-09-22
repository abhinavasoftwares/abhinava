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
  ChevronRight,
  Cpu,
  CreditCard,
  Database,
  FileChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Users,
  X,
  Sparkles,
  Clock,
} from "lucide-react";

import logo from "../assets/favicon.png";

/* ============================================================================
   1. TOAST NOTIFICATION CONTEXT
   ========================================================================== */

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
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Floating Animated Toast Container */}
      <aside
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-lg backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-5"
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              )}
              {toast.type === "error" && (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              {toast.type === "info" && (
                <Sparkles size={16} className="text-indigo-600 shrink-0" />
              )}
              <span className="text-xs font-semibold text-slate-800 leading-snug">
                {toast.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
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
   2. DASHBOARD DATA CONTEXT (Connects Top Bar Sync to Viewport)
   ========================================================================== */

const DashboardContext = createContext(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
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
          throw new Error(`Failed to load metrics (${response.status}).`);
        }

        const data = await response.json();
        setDashboard(data);
        if (manual) addToast("Telemetry metrics synchronized.", "success");
      } catch (err) {
        console.error("Dashboard load failed:", err);
        setError(err?.message || "Unable to sync dashboard overview.");
        if (manual) addToast(err?.message || "Sync failure.", "error");
      } finally {
        refreshLock.current = false;
        if (manual) setRefreshing(false);
        setLoading(false);
      }
    },
    [API_URL, addToast]
  );

  useEffect(() => {
    loadDashboard(false);
    const interval = setInterval(() => loadDashboard(true), 60000);
    return () => clearInterval(interval);
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
   3. NAVIGATION STRUCTURE
   ========================================================================== */

const MAIN_NAVIGATION = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard },
  { name: "Tenants", path: "/admin/clients", icon: Users },
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
   4. ADMIN LAYOUT COMPONENT
   ========================================================================== */

export function AdminLayout({ children }) {
  return (
    <ToastProvider>
      <DashboardProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </DashboardProvider>
    </ToastProvider>
  );
}

function AdminLayoutContent({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { refreshing, loadDashboard } = useDashboard();

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
      addToast("Session terminated securely.", "info");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const currentRoute = ALL_NAV_ITEMS.find((item) => {
    if (item.path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(item.path);
  });
  const activePageTitle = currentRoute ? currentRoute.name : "Console";

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-950">
      
      {/* MOBILE DRAWER OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ============================================================
          SIDEBAR: Clean Pure White with Indigo Accents
      ============================================================ */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* BRAND IDENTITY */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center ">
              <img
                src={logo}
                alt="Abhinava"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="leading-tight">
              <span className="block text-xs font-bold tracking-tight text-slate-900 uppercase">
                Abhinava Softwares
              </span>
              <span className="block text-[9.5px] font-mono font-medium tracking-wider text-slate-400 uppercase">
                Admin Console
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* NAVIGATION SECTIONS */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <SidebarSection label="Business Operations" items={MAIN_NAVIGATION} />
        </div>

        {/* FOOTER: Cluster Node & Logout */}
        <div className="shrink-0 border-t border-slate-100 p-3 space-y-2 bg-slate-50/60">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-all"
          >
            <LogOut size={15} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ============================================================
          MAIN VIEWPORT WITH TOPBAR CONTROLS
      ============================================================ */}
      <div className="flex min-h-screen flex-col lg:ml-[260px]">
        
        {/* TOP NAVBAR (Stationed Sync Action Here) */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 lg:hidden transition-colors"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                {activePageTitle}
              </h1>
            </div>
          </div>

          {/* TOPBAR ACTIONS: Sync Metrics Button + Notifications + Profile */}
          <div className="flex items-center gap-2.5">
            
            {/* Sync Metrics Button (Now stationed in Top Bar) */}
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all disabled:opacity-60"
              title="Synchronize real-time telemetry"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin text-indigo-600" : "text-slate-400"}
              />
              <span className="hidden sm:inline">Sync Metrics</span>
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              onClick={() => addToast("Platform systems are nominal.", "info")}
              className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-2xs"
              title="Notifications"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-white" />
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

            {/* USER BADGE */}
            <div className="flex items-center gap-2 pl-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-mono text-xs font-bold shadow-2xs">
                A
              </div>
              <div className="hidden xl:block leading-tight">
                <p className="text-xs font-bold text-slate-900">
                  Platform Admin
                </p>
                <p className="text-[10px] font-mono text-slate-400">
                  Master Tenant
                </p>
              </div>
            </div>

          </div>
        </header>

        {/* APPLICATION BODY */}
        <main className="flex-1 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ============================================================================
   5. SIDEBAR NAVIGATION ITEMS
   ========================================================================== */

function SidebarSection({ label, items }) {
  return (
    <div>
      <div className="mb-2 px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
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
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={15}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
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
   6. DASHBOARD VIEW (Utilizes shared DashboardContext)
   ========================================================================== */

export function Dashboard() {
  const { dashboard, loading, error, refreshing, loadDashboard } = useDashboard();

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-indigo-600 shadow-sm">
            <RefreshCw size={18} className="animate-spin" />
          </div>
          <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
            Compiling Cluster Metrics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <AlertCircle size={20} />
          </div>
          <h2 className="mt-4 text-sm font-bold text-slate-900">
            Telemetry Unreachable
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            {error}
          </p>
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-black active:scale-[0.99] transition-all"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const health = dashboard?.health || {};
  const clients = dashboard?.clients || [];

  const totalClients = Number(stats.total_clients || 0);
  const provisioningReady = Number(stats.provisioning_ready || 0);
  const provisioningPending = Number(stats.provisioning_pending || 0);
  const provisioningFailed = Number(stats.provisioning_failed || 0);

  const provisioningPercentage =
    totalClients > 0 ? Math.round((provisioningReady / totalClients) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* WORKSPACE MAIN GRID */}
      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,0.85fr)]">
        
        {/* ============================================================
            RESPONSIVE ADAPTIVE: Table on Desktop (lg+), Cards on Mobile/Tablet
        ============================================================ */}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                Organization Accounts
              </h3>
              <span className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-700">
                {clients.length} Total
              </span>
            </div>

            <NavLink
              to="/admin/clients"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span>View full directory</span>
              <ChevronRight size={13} />
            </NavLink>
          </div>

          {/* 1. DESKTOP AUDIT TABLE (lg: and up) */}
          <div className="hidden lg:block w-full overflow-x-auto">
            {clients.length === 0 ? (
              <EmptyClients />
            ) : (
              <table className="w-full table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    <th className="px-5 py-3 w-[34%]">Organization</th>
                    <th className="px-5 py-3 w-[16%]">Plan Tier</th>
                    <th className="px-5 py-3 w-[18%]">Subscription</th>
                    <th className="px-5 py-3 w-[18%]">Provisioning</th>
                    <th className="px-5 py-3 w-[14%] text-right">Last Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {clients.map((client, idx) => (
                    <tr
                      key={client.id || idx}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => window.location.assign(`/admin/clients/${client.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="truncate text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {client.business_name || "Unnamed entity"}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          TENANT #{client.id ?? "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium text-slate-600">
                          {client.plan || "Enterprise"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={client.subscription_status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={client.provisioning_status || client.display_status} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500">
                        {formatDate(client.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 2. MOBILE & TABLET CARD VIEW (Visible below lg) */}
          <div className="lg:hidden divide-y divide-slate-100">
            {clients.length === 0 ? (
              <EmptyClients />
            ) : (
              clients.map((client, idx) => (
                <div
                  key={client.id || idx}
                  onClick={() => window.location.assign(`/admin/clients/${client.id}`)}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {client.business_name || "Unnamed entity"}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: #{client.id ?? "—"}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {client.plan || "Enterprise"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={client.subscription_status} />
                      <StatusBadge status={client.provisioning_status || client.display_status} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatDate(client.updated_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Table Footer */}
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50 text-[11px] font-mono text-slate-400">
            <span>Showing {clients.length} account ledgers</span>
          </div>
        </div>

        {/* SIDEBAR MODULES: Health, Provisioning Progress, Platform State */}
        <div className="space-y-6">
          <PlatformHealth health={health} />
          
          <TenantProvisioning
            ready={provisioningReady}
            pending={provisioningPending}
            failed={provisioningFailed}
            percentage={provisioningPercentage}
          />

          <PlatformState health={health}  />
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   7. STATUS BADGES
   ========================================================================== */

function StatusBadge({ status }) {
  const normalized = String(status || "").trim().toUpperCase();

  let label = normalized || "Unknown";
  let classes = "bg-slate-100 text-slate-600 border-slate-200";

  if (normalized === "ACTIVE" || normalized === "READY") {
    label = normalized === "ACTIVE" ? "Active" : "Ready";
    classes = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  } else if (normalized === "FAILED" || normalized === "ERROR") {
    label = "Failed";
    classes = "bg-rose-50 text-rose-700 border-rose-200/80";
  } else if (normalized === "PENDING") {
    label = "Pending";
    classes = "bg-amber-50 text-amber-800 border-amber-200/80";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold border ${classes}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/* ============================================================================
   8. PANEL MODULES
   ========================================================================== */

function OverviewStat({ label, value, description, icon: Icon, themeColor }) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
          {label}
        </span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${colorMap[themeColor]}`}>
          <Icon size={15} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {value}
        </div>
        <p className="mt-1 text-[11px] text-slate-500 truncate">
          {description}
        </p>
      </div>
    </div>
  );
}

function PlatformHealth({ health }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
          Infrastructure Nodes
        </h4>
      </div>

      <div className="space-y-2 text-xs">
        <HealthRow icon={Server} label="Edge API Gateway" status={health?.api} />
        <HealthRow icon={Database} label="PostgreSQL Cluster" status={health?.database} />
        <HealthRow icon={ShieldCheck} label="Identity Provider" status={health?.authentication} />
      </div>
    </div>
  );
}

function HealthRow({ icon: Icon, label, status }) {
  const operational =
    String(status || "").toUpperCase().includes("OPERATIONAL") || !status;

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon size={15} className="text-slate-400" />
        <span className="font-semibold text-slate-700">{label}</span>
      </div>
      <span className={`text-[10.5px] font-mono font-bold flex items-center gap-1.5 ${
        operational ? "text-emerald-700" : "text-rose-700"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${operational ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
        {operational ? "Operational" : "Degraded"}
      </span>
    </div>
  );
}

function TenantProvisioning({ ready, pending, failed, percentage }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
          Tenant Provisioning
        </h4>
        <span className="text-xs font-bold font-mono text-indigo-700">
          {percentage}% Complete
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5">
          <div className="text-lg font-bold font-mono text-emerald-700">{ready}</div>
          <div className="text-[10px] font-mono font-semibold uppercase text-emerald-800">Ready</div>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
          <div className="text-lg font-bold font-mono text-amber-700">{pending}</div>
          <div className="text-[10px] font-mono font-semibold uppercase text-amber-800">Pending</div>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-2.5">
          <div className="text-lg font-bold font-mono text-rose-700">{failed}</div>
          <div className="text-[10px] font-mono font-semibold uppercase text-rose-800">Failed</div>
        </div>
      </div>
    </div>
  );
}

function PlatformState({ health}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
          Platform Heartbeat
        </h4>
        <CheckCircle2 size={15} className="text-emerald-600" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <span className="text-slate-400 font-mono text-[10px]">ENGINE</span>
          <p className="font-semibold text-slate-900 mt-0.5">Distributed v2.4</p>
        </div>
        <div>
          <span className="text-slate-400 font-mono text-[10px]">ROUTER</span>
          <p className="font-semibold text-slate-900 mt-0.5">Primary Direct</p>
        </div>
        <div>
          <span className="text-slate-400 font-mono text-[10px]">HEARTBEAT</span>
          <p className="font-semibold text-slate-900 mt-0.5">60s Auto Sync</p>
        </div>
        
      </div>
    </div>
  );
}

function EmptyClients() {
  return (
    <div className="py-12 text-center">
      <Building2 size={28} className="mx-auto text-slate-300" />
      <p className="mt-3 text-xs font-bold text-slate-800">
        No accounts registered yet
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5">
        Provision an organization account to initialize an isolated tenant.
      </p>
    </div>
  );
}

/* ============================================================================
   9. DATE & TIME UTILITIES
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