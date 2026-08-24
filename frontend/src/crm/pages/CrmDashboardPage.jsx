import {
  Activity,
  Boxes,
  IndianRupee,
  ShoppingCart,
  Users,
  TrendingUp,
  Receipt,
  PackagePlus,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { useTenant } from "../context/TenantContext";

export default function CrmDashboardPage() {
  const { tenant } = useTenant();
  const businessName = tenant?.business_name || "Your Boutique";

  const metrics = [
    { label: "Customers", value: "1,240", trend: "+12 this week", icon: Users },
    { label: "Inventory", value: "482", trend: "18 new", icon: Boxes },
    { label: "Sales Today", value: "₹3.4L", trend: "+12.0%", icon: ShoppingCart },
    { label: "Stock Value", value: "₹1.2 Cr", trend: "Stable", icon: IndianRupee },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 min-h-full lg:h-full lg:overflow-hidden bg-white">
      
      {/* ===================================================
          LEFT COLUMN: Header, KPIs, & Fluid Graph
      ==================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden gap-6 lg:gap-8">
        
        {/* HEADER */}
        <header className="shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#1B241E] sm:text-3xl">
            Good morning.
          </h1>
          <p className="mt-1 text-sm font-medium text-[#68786D]">
            Welcome to the <span className="font-bold text-[#345343]">{businessName}</span> workspace.
          </p>
        </header>

        {/* KPI STRIP (Clean & Bright) */}
        <section className="shrink-0 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {metrics.map(({ label, value, trend, icon: Icon }) => (
            <div key={label} className="flex flex-col rounded-2xl border border-[#E2E8E4] bg-[#F5F7F5]/60 p-4 transition hover:bg-white hover:shadow-sm">
              <div className="flex items-center gap-1.5 text-[#87968C]">
                <Icon size={12} strokeWidth={2.5} />
                <p className="text-[9px] font-bold uppercase tracking-[0.15em]">{label}</p>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-[#1B241E]">{value}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <TrendingUp size={10} strokeWidth={3} />
                <span>{trend}</span>
              </div>
            </div>
          ))}
        </section>

        {/* INSIGHTS GRAPH (Stretches to fill vertical space) */}
        <section className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
          <div className="mb-3 flex items-center justify-between shrink-0">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#1B241E]">
              Revenue Analytics
            </h3>
            <select className="cursor-pointer bg-transparent text-xs font-semibold text-[#68786D] outline-none transition hover:text-[#345343]">
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
          </div>
          
          <div className="flex-1 flex items-center justify-center rounded-3xl bg-gradient-to-br from-[#F5F7F5] to-white border border-[#E2E8E4]/80 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex h-full w-full items-end justify-center gap-1.5 sm:gap-3 p-6 opacity-80">
              {[30, 50, 25, 70, 45, 60, 40, 80, 55, 90, 65, 100].map((height, i) => (
                <div 
                  key={i} 
                  className="w-full max-w-[20px] rounded-t-sm bg-gradient-to-t from-[#345343]/20 to-[#345343]/50 transition-all duration-1000 ease-out hover:from-[#345343]/40 hover:to-[#345343]/70" 
                  style={{ height: `${height}%` }} 
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ===================================================
          RIGHT COLUMN: Tools, Live Sessions, Actions
      ==================================================== */}
      <div className="w-full lg:w-[320px] xl:w-[360px] flex flex-col shrink-0 gap-6 lg:h-full lg:overflow-hidden">
        
        {/* 1. QUICK TOOLS */}
        <section className="shrink-0 flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1B241E] px-4 py-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#345343] hover:shadow-[0_4px_15px_rgba(52,83,67,0.25)]">
            <Receipt size={14} />
            Quick Receipt
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] px-4 py-3.5 text-xs font-bold text-[#1B241E] shadow-sm transition hover:bg-white hover:border-[#345343]/30">
            <PackagePlus size={14} />
            Add Stock
          </button>
        </section>

        {/* 2. COMPACT LIVE SESSIONS */}
        <section className="shrink-0 flex flex-col">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-[#345343]" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#87968C]">
                Live Sessions
              </h3>
            </div>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="flex flex-col rounded-2xl border border-[#E2E8E4] bg-[#F5F7F5]/50 p-1">
            {[
              { name: "Sarah J.", action: "Viewing Portfolio" },
              { name: "David C.", action: "Checkout Pending" },
              { name: "Amelia K.", action: "Browsing Rings" },
            ].map((user, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl p-2.5 transition hover:bg-white hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#345343] border border-[#E2E8E4] shadow-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1B241E]">{user.name}</p>
                    <p className="text-[9px] font-medium text-[#68786D] mt-0.5">{user.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. ACTIONS REQUIRED (Scrolls internally on Desktop) */}
        <section className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
          <div className="mb-2.5 flex items-center justify-between shrink-0 pt-2">
            <div className="flex items-center gap-2">
              <ClipboardList size={13} className="text-rose-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#87968C]">
                Actions Required
              </h3>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">
              4 Pending
            </span>
          </div>

          <div className="flex-1 lg:overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-2.5 pb-6 lg:pb-0">
            <ActionCard 
              title="Estimate Approval" 
              desc="Review requested estimate #1042 for Elena Gilbert." 
              time="Due in 2h" 
              urgent 
            />
            <ActionCard 
              title="Kareegar Gold Issue" 
              desc="15g fine gold pending transfer to Raj." 
              time="Due today" 
            />
            <ActionCard 
              title="Pending Payment" 
              desc="Balance of ₹45,000 for bespoke order #899." 
              time="Overdue" 
              urgent 
            />
            <ActionCard 
              title="Stock Audit" 
              desc="Monthly inventory reconciliation required." 
              time="Due tomorrow" 
            />
          </div>
        </section>

      </div>
    </div>
  );
}

// Minimal action card
function ActionCard({ title, desc, time, urgent }) {
  return (
    <div className={`group flex flex-col rounded-2xl border p-3.5 transition-colors cursor-pointer ${
      urgent 
        ? "border-rose-100 bg-rose-50/40 hover:border-rose-200 hover:bg-rose-50/80" 
        : "border-[#E2E8E4] bg-[#F5F7F5]/50 hover:bg-white hover:shadow-sm"
    }`}>
      <div className="flex items-start justify-between">
        <p className={`text-xs font-bold ${urgent ? "text-rose-900" : "text-[#1B241E]"}`}>
          {title}
        </p>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${urgent ? "text-rose-600" : "text-[#87968C]"}`}>
          {time}
        </span>
      </div>
      <p className={`mt-1 text-[10px] font-medium leading-relaxed ${urgent ? "text-rose-700/80" : "text-[#68786D]"}`}>
        {desc}
      </p>
      <div className={`mt-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-transform group-hover:translate-x-1 ${urgent ? "text-rose-600" : "text-[#345343]"}`}>
        Resolve <ArrowRight size={10} strokeWidth={3} />
      </div>
    </div>
  );
}