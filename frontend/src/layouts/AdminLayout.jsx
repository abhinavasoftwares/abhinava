import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Plus,
  Users,
  Activity,
  ArrowUpRight,
  Clock,
  Gem,
  ClipboardCheck,
  LayoutDashboard,
  FileChartColumn,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

// ============================================================================
// SHARED CONSTANTS & DATA
// ============================================================================
const GOLD = "#c59b27";

const stats = [
  { label: "Bespoke Orders", value: "24", delta: "+4", icon: Gem },
  { label: "Pending Appraisals", value: "8", delta: "-2", icon: ClipboardCheck },
];

const transactions = [
  { client: "Eleanor Vance", service: "Diamond Sourcing", date: "Oct 24", amount: "₹1,45,000" },
  { client: "Marcus Cole", service: "Watch Servicing", date: "Oct 24", amount: "₹8,500" },
  { client: "Sophia Reed", service: "Bespoke Ring", date: "Oct 23", amount: "₹2,20,000" },
  { client: "James Sterling", service: "Appraisal", date: "Oct 22", amount: "₹1,500" },
  { client: "Nadia Rao", service: "Restoration", date: "Oct 21", amount: "₹32,000" },
];

const sessions = [
  { name: "Sarah Jenkins", role: "Viewing Portfolio", time: "2 min" },
  { name: "David Chen", role: "Checkout Pending", time: "Just now" },
  { name: "Amelia Croft", role: "Consultation Call", time: "15 min" },
  { name: "Elena Gilbert", role: "Browsing Rings", time: "4 min" },
  { name: "Marcus Cole", role: "Invoice Paid", time: "1 hr" },
];

const spark = [38, 52, 44, 61, 55, 72, 66, 84, 78, 96];

const noScroll = "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";
const card =
  "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

// ============================================================================
// SPARKLINE COMPONENT
// ============================================================================
function Sparkline() {
  const max = Math.max(...spark);
  const pts = spark
    .map((v, i) => `${(i / (spark.length - 1)) * 100},${40 - (v / max) * 34}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.22" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${pts} 100,40`} fill="url(#sparkFill)" />
      <polyline
        points={pts}
        fill="none"
        stroke={GOLD}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================================
// 1. ADMIN LAYOUT
// ============================================================================
export function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navigation = [
    { name: "Overview", path: "/admin", icon: LayoutDashboard },
    { name: "Clients", path: "/admin/clients", icon: Users },
    { name: "Ledger", path: "/admin/reports", icon: FileChartColumn },
    { name: "Preferences", path: "/admin/settings", icon: Settings },
  ];

    const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row lg:h-screen lg:overflow-hidden bg-white font-sans text-slate-900">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200/70 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Gem size={18} color={GOLD} strokeWidth={2.5} />
            <span className="text-lg font-bold tracking-tight text-slate-900">Abhinava Softwares</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 lg:hidden">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 px-3 ${noScroll}`}>
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                    isActive 
                      ? "bg-slate-50 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.03)] border border-slate-100/50" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium border border-transparent"
                  }`
                }
                style={({ isActive }) => (isActive ? { color: GOLD } : {})}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="shrink-0 p-4 border-t border-slate-100">
          <button type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-600">
            <LogOut size={16} strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex flex-1 flex-col min-w-0 lg:overflow-hidden">
        
        {/* Mobile Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu size={20} strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Gem size={14} color={GOLD} /> Abhinava
          </div>
        </header>

        {/* Dynamic Page Rendering */}
        <main className="flex-1 lg:overflow-hidden">
          {children}
        </main>

      </div>
    </div>
  );
}

// ============================================================================
// 2. DASHBOARD VIEW (Responsive: Natural scroll on mobile, Locked height on desktop)
// ============================================================================
export function Dashboard() {
  return (
    <div
      className={`h-full w-full overflow-y-auto lg:overflow-hidden ${noScroll} bg-slate-50/60 p-4 sm:p-5 lg:p-6`}
    >
      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4">
        {/* Header */}
        <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
              Atelier Overview
            </h1>
            <p className="truncate text-[11px] text-slate-500">
              Fiscal period · October 2026
            </p>
          </div>
          <button
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: GOLD }}
          >
            <Plus size={14} strokeWidth={2.5} /> New Order
          </button>
        </header>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left column */}
          <div className="flex min-h-0 flex-col gap-4 lg:col-span-8">
            {/* KPI strip */}
            <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className={`${card} col-span-1 p-4 sm:col-span-2`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Total Revenue
                    </p>
                    <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900">
                      ₹24,50,000
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                    <TrendingUp size={12} strokeWidth={2.5} /> 12.5%
                  </span>
                </div>
                <div className="mt-3 h-14">
                  <Sparkline />
                </div>
              </div>

              {stats.map(({ label, value, delta, icon: Icon }) => (
                <div key={label} className={`${card} flex flex-col justify-between p-4`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {label}
                    </p>
                    <Icon size={14} className="shrink-0 text-slate-300" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight text-slate-900">
                      {value}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">{delta}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Ledger */}
            <section className={`${card} flex min-h-0 flex-1 flex-col overflow-hidden`}>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-[13px] font-semibold text-slate-900">Recent Transactions</h2>
                <button
                  className="flex items-center gap-1 text-[11px] font-semibold transition hover:text-slate-900"
                  style={{ color: GOLD }}
                >
                  Open Ledger <ArrowUpRight size={13} />
                </button>
              </div>

              <div className={`min-h-0 flex-1 overflow-y-auto ${noScroll}`}>
                {/* Table on md+ */}
                <table className="hidden w-full text-left text-[13px] md:table">
                  <thead className="sticky top-0 z-10 bg-white text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2.5 font-semibold">Client</th>
                      <th className="px-4 py-2.5 font-semibold">Service</th>
                      <th className="px-4 py-2.5 font-semibold">Date</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((row) => (
                      <tr key={row.client} className="transition hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{row.client}</td>
                        <td className="px-4 py-2.5 text-slate-500">{row.service}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{row.date}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                          {row.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Cards below md */}
                <div className="flex flex-col gap-2 p-3 md:hidden">
                  {transactions.map((row) => (
                    <div
                      key={row.client}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900">
                          {row.client}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {row.service} · {row.date}
                        </p>
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
                        {row.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="flex min-h-0 flex-col gap-4 lg:col-span-4">
            <section className={`${card} shrink-0 p-4`}>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Quick Actions
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
                {[
                  { label: "New Bespoke Order", icon: Plus },
                  { label: "Register Client", icon: Users },
                ].map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left text-[12px] font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-white hover:text-slate-900"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"
                      style={{ color: GOLD }}
                    >
                      <Icon size={15} strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 truncate">{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className={`${card} flex min-h-0 flex-1 flex-col overflow-hidden`}>
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-[13px] font-semibold text-slate-900">Active Sessions</h2>
                <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold tracking-wide text-emerald-600">
                  <Activity size={11} strokeWidth={2.5} /> LIVE
                </span>
              </div>

              <div className={`min-h-0 flex-1 overflow-y-auto p-2 ${noScroll}`}>
                <div className="flex flex-col gap-1">
                  {sessions.map((user) => (
                    <div
                      key={user.name}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-[11px] font-semibold"
                          style={{ color: GOLD }}
                        >
                          {user.name.charAt(0)}
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-emerald-500" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-slate-900">
                            {user.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{user.role}</p>
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={10} /> {user.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}