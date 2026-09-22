import {
  Activity,
  Boxes,
  IndianRupee,
  ShoppingCart,
  Users,
  TrendingUp,
  Receipt,
  PackagePlus,
  ChevronRight,
  Clock,
  AlertCircle,
  BarChart2,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { useTenant } from "../context/TenantContext";

export default function CrmDashboardPage() {
  const { tenant } = useTenant();
  const businessName = tenant?.business_name || "Your Boutique";

  const metrics = [
    { 
      label: "Total Customers", 
      value: "1,240", 
      trend: "+12 this week", 
      icon: Users,
      iconBg: "bg-blue-50 text-blue-700 border-blue-100",
    },
    { 
      label: "Stock Units", 
      value: "482", 
      trend: "18 inward", 
      icon: Boxes,
      iconBg: "bg-slate-50 text-slate-700 border-slate-200",
    },
    { 
      label: "Gross Sales Today", 
      value: "₹3.4L", 
      trend: "+12.4%", 
      icon: ShoppingCart,
      iconBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    { 
      label: "Valuation", 
      value: "₹1.2 Cr", 
      trend: "Audited", 
      icon: IndianRupee,
      iconBg: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 min-h-full lg:h-full lg:overflow-hidden bg-white">
      
      {/* ===================================================
          LEFT COLUMN: Header, KPIs, & Analytics Graph
      ==================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden gap-5 lg:gap-6">
        
        {/* ENTERPRISE HEADER BAR */}
        <header className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 border border-slate-200 uppercase">
                <Building2 size={11} className="text-slate-500" />
                Enterprise Core
              </span>
              <span className="text-xs font-mono text-slate-400">ORG: {tenant?.id || "HQ-701"}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Operations Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Active ledger: <span className="font-semibold text-slate-700">{businessName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 self-start sm:self-auto">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-slate-600">Database Synchronized</span>
          </div>
        </header>

        {/* METRIC KPI TILES */}
        <section className="shrink-0 grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
          {metrics.map(({ label, value, trend, icon: Icon, iconBg }) => (
            <div
              key={label}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#FAFAFA] p-4 transition-all duration-150 hover:bg-white hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs ${iconBg}`}>
                  <Icon size={14} strokeWidth={2.2} />
                </div>
              </div>

              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  {value}
                </span>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <TrendingUp size={12} strokeWidth={2.4} />
                  <span>{trend}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* REVENUE ANALYTICS PANEL */}
        <section className="flex-1 flex flex-col min-h-[300px] lg:min-h-0 rounded-xl border border-slate-200 bg-[#FAFAFA] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-200/60 text-slate-700">
                <BarChart2 size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Revenue Trajectory
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Daily transaction inflow volume</p>
              </div>
            </div>

            <select className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs outline-none hover:border-slate-300 focus:border-slate-400">
              <option>This Accounting Period</option>
              <option>Previous Quarter</option>
              <option>Fiscal Year-to-Date</option>
            </select>
          </div>

          <div className="flex-1 flex items-end justify-center rounded-lg bg-white p-4 sm:p-6 border border-slate-200/80 relative overflow-hidden">
            {/* Subtle horizontal grid guide lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none opacity-30">
              <div className="border-b border-dashed border-slate-300 w-full" />
              <div className="border-b border-dashed border-slate-300 w-full" />
              <div className="border-b border-dashed border-slate-300 w-full" />
            </div>

            <div className="relative z-10 flex h-full w-full items-end justify-center gap-2 sm:gap-4 px-2">
              {[32, 54, 28, 72, 46, 62, 40, 84, 58, 92, 68, 100].map((height, i) => (
                <div
                  key={i}
                  className="group relative flex-1 max-w-[26px] h-full flex items-end justify-center"
                >
                  <div
                    className="w-full rounded-t-sm bg-slate-300 transition-all duration-200 group-hover:bg-slate-700"
                    style={{ height: `${height}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 hidden group-hover:flex items-center rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white shadow-sm pointer-events-none">
                    {height}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ===================================================
          RIGHT COLUMN: Tools, Concurrent Sessions, Action Log
      ==================================================== */}
      <div className="w-full lg:w-[330px] xl:w-[370px] flex flex-col shrink-0 gap-5 lg:h-full lg:overflow-hidden">
        
        {/* 1. ERP ACTION BUTTONS */}
        <section className="shrink-0 grid grid-cols-2 gap-2.5">
          <button className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.99]">
            <Receipt size={14} className="text-slate-300" />
            <span>Issue Voucher</span>
          </button>
          <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99]">
            <PackagePlus size={14} className="text-slate-500" />
            <span>Stock Inward</span>
          </button>
        </section>

        {/* 2. CONCURRENT USER SESSIONS */}
        <section className="shrink-0 flex flex-col rounded-xl border border-slate-200 bg-[#FAFAFA] p-3.5">
          <div className="mb-2.5 flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-slate-600" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Connected Terminals
              </h3>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              3 Active
            </span>
          </div>

          <div className="flex flex-col divide-y divide-slate-200/60">
            {[
              { name: "Sarah Jenkins", role: "POS Lead", action: "Reviewing Quote #1042" },
              { name: "David Chen", role: "Cashier", action: "Checkout Gateway" },
              { name: "Amelia Khan", role: "Appraiser", action: "Jewelry Valuation S-2" },
            ].map((user, i) => (
              <div key={i} className="flex items-center justify-between py-2 first:pt-1 last:pb-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700 font-mono">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.action}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">SYNC</span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. WORKFLOW ACTIONS REQUIRED (Scrolls internally on Desktop) */}
        <section className="flex-1 flex flex-col min-h-[300px] lg:min-h-0 rounded-xl border border-slate-200 bg-[#FAFAFA] p-3.5">
          <div className="mb-2.5 flex items-center justify-between shrink-0 pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <AlertCircle size={13} className="text-slate-600" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Action Queue
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
              4 Pending
            </span>
          </div>

          <div className="flex-1 lg:overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-2 pb-2">
            <ActionCard
              title="Estimate Approval"
              desc="Review requested estimate #1042 for Elena Gilbert."
              time="Due in 2h"
              urgent
            />
            <ActionCard
              title="Karigar Bullion Issue"
              desc="15g fine gold pending transfer to workshop 02."
              time="Due today"
            />
            <ActionCard
              title="Outstanding Balance"
              desc="Receivable of ₹45,000 for order #899."
              time="Overdue"
              urgent
            />
            <ActionCard
              title="Inventory Audit"
              desc="Monthly stock count ledger discrepancy check."
              time="Due tomorrow"
            />
          </div>
        </section>

      </div>
    </div>
  );
}

// Enterprise Action Card
function ActionCard({ title, desc, time, urgent }) {
  return (
    <div
      className={`group relative flex flex-col rounded-lg border p-3 transition-all cursor-pointer bg-white ${
        urgent
          ? "border-amber-200/90 hover:border-amber-300"
          : "border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${urgent ? "bg-amber-500" : "bg-slate-300"}`} />
          <p className="text-xs font-semibold text-slate-800 truncate">
            {title}
          </p>
        </div>
        <span
          className={`flex items-center gap-1 shrink-0 text-[10px] font-mono font-medium rounded px-1.5 py-0.5 ${
            urgent
              ? "bg-amber-50 text-amber-800 border border-amber-200/60"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <Clock size={10} />
          {time}
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2 pl-3">
        {desc}
      </p>

      <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-100 pl-3">
        <span className="text-[10px] text-slate-400 font-mono">CODE: ERP-TASK</span>
        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-700 transition-transform group-hover:translate-x-0.5">
          Execute <ChevronRight size={12} strokeWidth={2.4} />
        </span>
      </div>
    </div>
  );
}