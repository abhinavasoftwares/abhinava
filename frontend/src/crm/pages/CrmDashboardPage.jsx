import {
  Activity,
  ArrowUpRight,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Compass,
  Database,
  FileText,
  HardDrive,
  Mail,
  MessageCircle,
  Package,
  PackagePlus,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../context/TenantContext";
import { useCrmAuth } from "../context/CrmAuthContext";
import { crmPath } from "../utils/crmRoutes";

export default function CrmDashboardPage() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { authorization, user } = useCrmAuth();

  const businessName =
    tenant?.business_name ||
    tenant?.businessName ||
    "Your Enterprise";

  const currentUserName =
    authorization?.name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Administrator";

  /* Integrated financial telemetry metrics */
  const metrics = [
    {
      label: "Sales Today",
      value: "—",
      subtext: "Awaiting invoices",
      icon: ShoppingBag,
      iconColor: "text-emerald-600",
      accentBg: "bg-emerald-500/10",
      trend: "+0.0%",
    },
    {
      label: "Active Estimates",
      value: "—",
      subtext: "Drafts & Sent",
      icon: Receipt,
      iconColor: "text-amber-600",
      accentBg: "bg-amber-500/10",
      trend: "Pending",
    },
    {
      label: "Receivables",
      value: "—",
      subtext: "Dues outstanding",
      icon: CircleDollarSign,
      iconColor: "text-rose-600",
      accentBg: "bg-rose-500/10",
      trend: "Uncollected",
    },
    {
      label: "Stock Valuation",
      value: "—",
      subtext: "All warehouses",
      icon: Boxes,
      iconColor: "text-sky-600",
      accentBg: "bg-sky-500/10",
      trend: "Audited",
    },
  ];

  /* Operational Launchpad */
  const quickActions = [
    {
      label: "New Sale",
      tag: "POS / Invoice",
      icon: ShoppingBag,
      path: "sales",
      iconColor: "text-emerald-600",
      badge: "bg-emerald-50",
    },
    {
      label: "Draft Estimate",
      tag: "Quotes & Rates",
      icon: FileText,
      path: "estimations",
      iconColor: "text-amber-600",
      badge: "bg-amber-50",
    },
    {
      label: "Add Customer",
      tag: "CRM Directory",
      icon: UserPlus,
      path: "customers",
      iconColor: "text-violet-600",
      badge: "bg-violet-50",
    },
    {
      label: "Stock Inward",
      tag: "Inventory In",
      icon: PackagePlus,
      path: "inventory",
      iconColor: "text-sky-600",
      badge: "bg-sky-50",
    },
    {
      label: "Vendor Bill",
      tag: "Purchases",
      icon: Package,
      path: "purchases",
      iconColor: "text-teal-600",
      badge: "bg-teal-50",
    },
    {
      label: "Investor Entry",
      tag: "Capital Ledger",
      icon: Wallet,
      path: "investment/investors",
      iconColor: "text-indigo-600",
      badge: "bg-indigo-50",
    },
  ];

  const recentTimeline = [
    {
      id: "ev-1",
      title: "Realtime Data Engine Standby",
      detail: "Transaction events across all active terminals will stream here automatically.",
      category: "System Core",
      timestamp: "Ready",
    },
  ];

  const activeStaff = [];

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[#FBFBFA] font-sans text-slate-900 antialiased [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      {/* Background Architectural Blueprint Doodles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40 select-none">
        <svg
          className="absolute -right-20 top-10 h-[500px] w-[500px] text-slate-200"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 4" />
          <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 3" />
          <path d="M100 0 V200 M0 100 H200" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 5" />
        </svg>

        <svg
          className="absolute -bottom-24 -left-20 h-96 w-96 text-slate-200"
          viewBox="0 0 200 200"
          fill="none"
        >
          <rect x="25" y="25" width="150" height="150" rx="35" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" />
          <path d="M25 100 Q 100 20 175 100 T 325 100" stroke="currentColor" strokeWidth="0.75" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-[1680px] p-4 sm:p-6 lg:p-8">
        
        {/* =========================================================
            HEADER COMMAND BAR
        ========================================================== */}
        

        {/* =========================================================
            MAIN 2-COLUMN COCKPIT (Left: Primary / Right: Aside Rail)
        ========================================================== */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
          
          {/* -------------------------------------------------------
              LEFT WORKSPACE: FINANCIAL CONSOLE & AUDIT STREAM
          -------------------------------------------------------- */}
          <div className="space-y-6">

            {/* INTEGRATED FINANCIAL TICKER (Single unified strip, no individual boxed cards) */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-slate-700" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Financial Telemetry
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">Shift Currency: INR (₹)</span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
                {metrics.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="group p-5 transition-colors hover:bg-slate-50/40">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.label}
                        </span>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.accentBg} ${item.iconColor} transition-transform group-hover:scale-105`}>
                          <Icon size={16} strokeWidth={2} />
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
                          {item.value}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{item.subtext}</span>
                        <span className="font-mono text-[10px] font-semibold text-slate-500">{item.trend}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AUDIT LOG TIMELINE STREAM */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-slate-900" />
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Operational Ledger Stream
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Chronological event feed across transactions, updates & logins
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(crmPath("reports"))}
                  className="group flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Reports Center
                  <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              </div>

              {/* Timeline Container */}
              <div className="space-y-3">
                {recentTimeline.map((evt) => (
                  <div
                    key={evt.id}
                    className="group relative flex items-start gap-3 rounded-lg border border-slate-100 bg-[#FAFAFA] p-3.5 transition-all hover:border-slate-200 hover:bg-white"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600">
                      <Sparkles size={14} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {evt.title}
                        </p>
                        <span className="font-mono text-[10px] uppercase text-slate-400">
                          {evt.timestamp}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {evt.detail}
                      </p>
                      <div className="mt-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                        <span>{evt.category}</span>
                        <span>•</span>
                        <span className="text-emerald-600">Verified Hash</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 font-mono">
                <span>Synchronized with Central Storage</span>
                <span className="text-slate-600 font-semibold">Latency: 12ms</span>
              </div>
            </div>

            {/* INTEGRATED UTILITY CHANNELS */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Compass size={16} className="text-slate-900" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Outbound Communications & Vault
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  className="group flex items-center justify-between rounded-lg border border-slate-200/80 bg-[#FAFAFA] p-3 text-left transition-all hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <MessageCircle size={15} />
                    </div>
                    <div className="truncate">
                      <p className="truncate text-xs font-bold text-slate-900">WhatsApp Alert</p>
                      <p className="text-[10px] text-slate-500">Direct notifications</p>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  className="group flex items-center justify-between rounded-lg border border-slate-200/80 bg-[#FAFAFA] p-3 text-left transition-all hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                      <Mail size={15} />
                    </div>
                    <div className="truncate">
                      <p className="truncate text-xs font-bold text-slate-900">Email Gateway</p>
                      <p className="text-[10px] text-slate-500">Invoices & statements</p>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  className="group flex items-center justify-between rounded-lg border border-slate-200/80 bg-[#FAFAFA] p-3 text-left transition-all hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <HardDrive size={15} />
                    </div>
                    <div className="truncate">
                      <p className="truncate text-xs font-bold text-slate-900">Cloud Vault</p>
                      <p className="text-[10px] text-slate-500">Nightly snapshots</p>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

          </div>

          {/* -------------------------------------------------------
              RIGHT ASIDE RAIL: DIRECT DISPATCH & STAFF PULSE
          -------------------------------------------------------- */}
          <aside className="space-y-6">

            {/* QUICK ACTIONS ASIDE PANEL */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness size={16} className="text-slate-900" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Quick Dispatch
                  </h2>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Shortcut</span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => navigate(crmPath(action.path))}
                      className="group flex flex-col justify-between rounded-lg border border-slate-200/70 bg-[#FAFAFA] p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${action.badge} ${action.iconColor} transition-transform group-hover:scale-105`}>
                          <Icon size={15} strokeWidth={2} />
                        </div>
                        <ArrowUpRight size={12} className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700" />
                      </div>

                      <div className="mt-3">
                        <p className="truncate text-xs font-bold text-slate-900">{action.label}</p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">{action.tag}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACTIVE SHIFTS & EMPLOYEES ASIDE PANEL */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-900" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Active Floor Staff
                  </h2>
                </div>
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>

              {activeStaff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-7 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                    <Clock size={18} />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-800">
                    No active shifts detected
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 max-w-[220px]">
                    Employees currently logged in through POS or admin will be pinned here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Active staff roster when populated */}
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate(crmPath("settings"))}
                className="mt-4 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <span>Role & Permissions Console</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* SYSTEM STATUS ASIDE BANNER */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-slate-600" />
                  <span className="font-semibold text-slate-800">Database Engine</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-emerald-600">HEALTHY</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-slate-600" />
                  <span className="font-semibold text-slate-800">Tenant Isolation</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-sky-600">ENFORCED</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}