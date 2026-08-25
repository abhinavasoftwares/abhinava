import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock3,
  Hammer,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  CalendarDays,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";

import { useKareegarLedger } from "../hooks/useKareegarLedger";

// ============================================================
// HELPERS
// ============================================================
function formatWeight(value) {
  return `${Number(value || 0).toFixed(3)} g`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return { date: "—", time: "—" };
  try {
    const dateObj = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(dateObj.getTime())) return { date: "—", time: "—" };
    return {
      date: dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      time: dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return { date: "—", time: "—" };
  }
}

function formatDate(value) {
  return formatDateTime(value).date;
}

// ============================================================
// COMPACT UI ELEMENTS
// ============================================================
function CompactStat({ label, value, icon: Icon, colorClass = "text-[#345343]" }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-[#E2E8E4] bg-white px-3 py-2 shadow-sm">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F7F5] ${colorClass}`}>
        <Icon size={14} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">{label}</p>
        <p className="text-xs font-black text-[#1B241E]">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "OUTSTANDING" || status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {status}
      </span>
    );
  }
  if (status === "EXCESS RETURN" || status === "DISABLED" || status === "INACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200/60 bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {status || "BALANCED"}
    </span>
  );
}

// ============================================================
// EMPLOYEE PROFILE (LEDGER DETAILED VIEW)
// ============================================================
function EmployeeTransactionProfile({ employee, onBack }) {
  const [transactionType, setTransactionType] = useState("ALL");

  const allTransactions = [
    ...employee.assignments.map((item) => ({ ...item, transactionType: "ASSIGNMENT" })),
    ...employee.returns.map((item) => ({ ...item, transactionType: "RETURN" })),
  ].sort((a, b) => {
    const first = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const second = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return second.getTime() - first.getTime();
  });

  const transactions = transactionType === "ALL" ? allTransactions : allTransactions.filter((item) => item.transactionType === transactionType);

  const balanceStatus = employee.status === "ACTIVE"
    ? employee.balance > 0.001 ? "OUTSTANDING" : employee.balance < -0.001 ? "EXCESS RETURN" : "BALANCED"
    : "DISABLED";

  return (
    <div className="flex h-full flex-col bg-[#F5F7F5] lg:bg-white p-3 sm:p-5 lg:p-6 animate-in slide-in-from-right-8 duration-300 min-h-0">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col min-h-0">
        
        {/* ======================================================
            ULTRA-COMPACT HEADER & PERSONAL DETAILS
        ====================================================== */}
        <div className="shrink-0 flex flex-col gap-3 pb-3">
          <button type="button" onClick={onBack} className="flex w-max items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C] transition-colors hover:text-[#345343]">
            <ArrowLeft size={14} /> Back to Master Ledger
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[#E2E8E4]/60 pb-4">
            
            {/* Identity & Contact */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E2E8E4] text-[#345343] shadow-sm">
                {employee.type === "B2B" ? <Building2 size={20} /> : <Hammer size={20} />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-[#1B241E]">{employee.name}</h1>
                  <span className="rounded-md border border-[#E2E8E4] bg-[#F5F7F5] px-2 py-0.5 text-[10px] font-bold text-[#345343] shadow-sm">{employee.kareegarId || employee.id}</span>
                  <StatusBadge status={employee.status} />
                  <StatusBadge status={balanceStatus} />
                </div>
                
                {/* Horizontal Contact & Personal Info Strip */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold tracking-wider text-[#68786D]">
                  <span className="flex items-center gap-1.5"><Phone size={12} /> {employee.mobileNumber || employee.phone || "No Mobile"}</span>
                  <span className="flex items-center gap-1.5"><Mail size={12} /> {employee.email || "No Email"}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={12} /> {employee.city || "No City"}</span>
                  {employee.dateOfBirth && <span className="flex items-center gap-1.5"><CalendarDays size={12} /> {formatDate(employee.dateOfBirth)}</span>}
                  <span className={`flex items-center gap-1.5 ${employee.loginEnabled ? "text-indigo-600" : "text-[#87968C]"}`}>
                    {employee.loginEnabled ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                    {employee.loginEnabled ? "Portal Access" : "No Access"}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Stats */}
            <div className="flex flex-wrap gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <CompactStat label="Assigned" value={formatWeight(employee.totalAssigned)} icon={TrendingUp} />
              <CompactStat label="Returned" value={formatWeight(employee.totalReturned)} icon={TrendingDown} />
              <CompactStat label="Net Balance" value={formatWeight(Math.abs(employee.balance))} icon={Wallet} colorClass={employee.balance > 0.001 ? "text-amber-600" : employee.balance < -0.001 ? "text-rose-600" : "text-emerald-600"} />
            </div>

          </div>
        </div>

        {/* ======================================================
            TRANSACTION FILTER BAR
        ====================================================== */}
        <div className="flex shrink-0 items-center justify-between pb-3">
          <div className="flex rounded-md border border-[#E2E8E4] bg-[#F5F7F5] p-0.5 shadow-sm">
            {[["ALL", "All History"], ["ASSIGNMENT", "Assignments"], ["RETURN", "Returns"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTransactionType(value)}
                className={`rounded px-4 py-1.5 text-[10px] font-bold transition-all ${
                  transactionType === value ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60" : "text-[#87968C] hover:text-[#1B241E] border border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#87968C] hidden sm:block">
            {transactions.length} Records
          </span>
        </div>

        {/* ======================================================
            PROFESSIONAL DESKTOP TABLE (Takes ~70vh)
        ====================================================== */}
        <div className="flex-1 min-h-[60vh] flex flex-col overflow-hidden rounded-[1.5rem] border border-[#E2E8E4] bg-white shadow-sm">
          {transactions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-10 text-center bg-[#F5F7F5]/30">
              <Clock3 size={28} className="text-[#87968C] mb-3" />
              <h3 className="text-sm font-bold text-[#1B241E]">No Transactions Found</h3>
              <p className="mt-1 text-xs font-medium text-[#68786D]">Assignments and returns will appear here automatically.</p>
            </div>
          ) : (
            <>
              {/* --- NATIVE HTML TABLE FOR LARGE SCREENS --- */}
              <div className="hidden lg:block flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#F5F7F5]/90 backdrop-blur-md shadow-sm">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#87968C] whitespace-nowrap">Date & Time</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Details</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Weight Metrics</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Financials</th>
                      <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E4]/60">
                    {transactions.map((tx) => {
                      const isAssignment = tx.transactionType === "ASSIGNMENT";
                      const { date, time } = formatDateTime(tx.createdAt);
                      
                      return (
                        <tr key={`${tx.transactionType}-${tx.id}`} className="group hover:bg-[#F5F7F5]/40 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-xs font-bold text-[#1B241E]">{date}</p>
                            <p className="mt-0.5 text-[10px] font-bold text-[#87968C]">{time}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${isAssignment ? "bg-amber-50 text-amber-700 border border-amber-200/50" : "bg-emerald-50 text-emerald-700 border border-emerald-200/50"}`}>
                                {isAssignment ? "ASSIGNMENT" : "RETURN"}
                              </span>
                              <p className="text-xs font-bold text-[#1B241E]">{isAssignment ? "Raw Material" : tx.ornamentCategoryName || "Material"}</p>
                            </div>
                            <p className="mt-1.5 text-[10px] font-bold tracking-wider text-[#68786D]">Purity: <span className="text-[#345343]">{tx.rawMaterialPurity ?? tx.purity ?? "—"}%</span></p>
                            {tx.remarks && <p className="mt-1 text-[10px] font-medium text-[#87968C] italic">"{tx.remarks}"</p>}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">{isAssignment ? "Raw:" : "Ret:"} <span className="text-[#1B241E]">{formatWeight(isAssignment ? tx.rawMaterialWeight : tx.returnedWeight)}</span></p>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#345343]">Eff: {formatWeight(isAssignment ? tx.effectiveGoldAssigned : tx.effectiveGoldReturned)}</p>
                              {!isAssignment && tx.wastage > 0 && <p className="text-[9px] font-bold uppercase tracking-wider text-rose-600">Waste: {formatWeight(tx.wastage)}</p>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">{isAssignment ? "Advance Paid" : "Stone Charges"}</p>
                            <p className="text-xs font-bold text-[#1B241E]">{formatCurrency(isAssignment ? tx.advanceCashPaid : tx.stoneCharges)}</p>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <StatusBadge status={tx.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* --- DETAILED CARDS FOR MOBILE / TABLET --- */}
              <div className="flex flex-col gap-4 lg:hidden flex-1 overflow-y-auto p-4 bg-[#F5F7F5] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {transactions.map((tx) => {
                  const isAssignment = tx.transactionType === "ASSIGNMENT";
                  const { date, time } = formatDateTime(tx.createdAt);

                  return (
                    <div key={`${tx.transactionType}-${tx.id}`} className="rounded-2xl border border-[#E2E8E4] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between border-b border-[#E2E8E4]/60 pb-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isAssignment ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {isAssignment ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1B241E]">{isAssignment ? "Material Assigned" : tx.ornamentCategoryName || "Material Returned"}</p>
                            <p className="mt-0.5 text-[9px] font-bold tracking-wider text-[#87968C]">{date} • {time}</p>
                          </div>
                        </div>
                        <StatusBadge status={tx.status} />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">{isAssignment ? "Raw Wt" : "Ret Wt"}</p>
                          <p className="mt-1 text-xs font-bold text-[#1B241E]">{formatWeight(isAssignment ? tx.rawMaterialWeight : tx.returnedWeight)}</p>
                        </div>
                        <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Purity</p>
                          <p className="mt-1 text-xs font-bold text-[#345343]">{tx.rawMaterialPurity ?? tx.purity ?? "—"}%</p>
                        </div>
                        <div className="rounded-xl bg-white p-2 text-center border border-[#E2E8E4] shadow-sm">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Effective</p>
                          <p className="mt-1 text-xs font-black text-[#1B241E]">{formatWeight(isAssignment ? tx.effectiveGoldAssigned : tx.effectiveGoldReturned)}</p>
                        </div>
                        
                        <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40 col-span-1">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">{isAssignment ? "Advance" : "Charges"}</p>
                          <p className="mt-1 text-xs font-bold text-[#1B241E]">{formatCurrency(isAssignment ? tx.advanceCashPaid : tx.stoneCharges)}</p>
                        </div>
                        {!isAssignment && tx.wastage > 0 && (
                          <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40 col-span-2">
                            <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Wastage</p>
                            <p className="mt-1 text-xs font-bold text-rose-600">{formatWeight(tx.wastage)}</p>
                          </div>
                        )}
                      </div>

                      {tx.remarks && (
                        <div className="mt-3 rounded-lg border border-[#E2E8E4]/60 bg-[#F5F7F5]/50 px-3 py-2">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Remarks</p>
                          <p className="mt-0.5 text-[10px] font-medium text-[#68786D]">{tx.remarks}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ============================================================
// MAIN LEDGER PAGE
// ============================================================
export default function KareegarLedgerPage() {
  const { ledger, totals, loading, error } = useKareegarLedger();
  const [type, setType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const filteredLedger = useMemo(() => {
    return ledger
      .filter((employee) => type === "ALL" || employee.type === type)
      .filter((employee) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          employee.name?.toLowerCase().includes(query) ||
          employee.kareegarId?.toLowerCase().includes(query) ||
          employee.mobile?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [ledger, type, search]);

  const selectedEmployee = ledger.find((emp) => emp.id === selectedEmployeeId);

  if (selectedEmployee) {
    return <EmployeeTransactionProfile employee={selectedEmployee} onBack={() => setSelectedEmployeeId(null)} />;
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 size={32} className="animate-spin text-[#345343]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto text-rose-500 mb-3" />
          <p className="text-sm font-bold text-rose-900">Ledger Error</p>
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#F5F7F5] lg:bg-white p-3 sm:p-5 lg:p-6 lg:overflow-hidden min-h-0">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col min-h-0 animate-in fade-in duration-300">
        
        {/* ====================================================
            ULTRA COMPACT TOP SECTION (Header + Search + Stats)
        ==================================================== */}
        <div className="shrink-0 flex flex-col gap-3 pb-3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#1B241E]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F7F5] text-[#345343] border border-[#E2E8E4]/60">
                <Wallet size={16} strokeWidth={2.5} />
              </div>
              <h1 className="text-lg font-bold tracking-tight">Master Ledger</h1>
            </div>
            
            <div className="relative w-full sm:w-72 lg:w-80">
              <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87968C]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-lg border border-[#E2E8E4] bg-white py-2 pl-9 pr-4 text-xs font-semibold text-[#1B241E] outline-none transition focus:border-[#345343] focus:ring-1 focus:ring-[#345343] shadow-sm placeholder:text-[#A3B0AA]"
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E2E8E4]/60 pb-3">
            <div className="flex flex-wrap gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <CompactStat label="Active" value={filteredLedger.length} icon={Users} />
              <CompactStat label="Disbursed" value={formatWeight(filteredLedger.reduce((sum, item) => sum + item.totalAssigned, 0))} icon={TrendingUp} />
              <CompactStat label="Retrieved" value={formatWeight(filteredLedger.reduce((sum, item) => sum + item.totalReturned, 0))} icon={TrendingDown} />
              <CompactStat label="Outstanding" value={formatWeight(filteredLedger.filter(item => item.balance > 0.001).reduce((sum, item) => sum + item.balance, 0))} icon={Wallet} colorClass="text-amber-600" />
            </div>

            <div className="inline-flex shrink-0 rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] p-0.5 shadow-sm">
              {[["ALL", "All"], ["B2B", "B2B"], ["B2J", "Retail"]].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`rounded-md px-4 py-1.5 text-[10px] font-bold transition-all ${
                    type === value ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60" : "text-[#87968C] hover:text-[#1B241E] border border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ====================================================
            PROFESSIONAL LEDGER TABLE (~70vh Desktop)
        ==================================================== */}
        <div className="flex-1 min-h-[65vh] flex flex-col overflow-hidden rounded-[1.5rem] border border-[#E2E8E4] bg-white shadow-sm mt-1">
          {filteredLedger.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F7F5] text-[#87968C]">
                <Wallet size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#1B241E]">No Ledger Data</h3>
            </div>
          ) : (
            <>
              {/* --- NATIVE HTML TABLE FOR LARGE SCREENS --- */}
              <div className="hidden lg:block flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#F5F7F5]/90 backdrop-blur-md shadow-sm">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Goldsmith Profile</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Total Assigned</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Total Returned</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Net Balance</th>
                      <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8E4]/60">
                    {filteredLedger.map((employee) => (
                      <tr 
                        key={employee.id} 
                        onClick={() => setSelectedEmployeeId(employee.id)}
                        className="group cursor-pointer hover:bg-[#F5F7F5]/40 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#E2E8E4] text-[#345343] shadow-sm transition-colors group-hover:bg-[#345343] group-hover:text-white">
                              {employee.type === "B2B" ? <Building2 size={16} /> : <Hammer size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-bold text-[#1B241E]">{employee.name}</p>
                              <p className="mt-0.5 text-[9px] font-bold tracking-wider text-[#87968C]">
                                {employee.kareegarId || employee.id} <span className="mx-0.5">•</span> <span className="uppercase">{employee.type}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <p className="text-sm font-bold text-[#1B241E]">{formatWeight(employee.totalAssigned)}</p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <p className="text-sm font-bold text-[#1B241E]">{formatWeight(employee.totalReturned)}</p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <p className={`text-sm font-black ${employee.balance > 0.001 ? "text-amber-700" : employee.balance < -0.001 ? "text-rose-700" : "text-emerald-700"}`}>
                            {formatWeight(employee.balance)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <StatusBadge status={employee.status} />
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <ArrowRight size={16} className="inline-block text-[#87968C] transition-transform group-hover:translate-x-1 group-hover:text-[#345343]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- DETAILED CARDS FOR MOBILE / TABLET --- */}
              <div className="flex flex-col gap-4 lg:hidden flex-1 overflow-y-auto p-4 bg-[#F5F7F5] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {filteredLedger.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className="flex flex-col rounded-2xl border border-[#E2E8E4] bg-white p-5 text-left shadow-sm transition-all hover:border-[#345343]/30 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between w-full border-b border-[#E2E8E4]/60 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343]">
                          {employee.type === "B2B" ? <Building2 size={18} /> : <Hammer size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#1B241E]">{employee.name}</p>
                          <p className="mt-0.5 text-[9px] font-bold tracking-wider text-[#87968C]">
                            {employee.kareegarId || employee.id} <span className="mx-0.5">•</span> {employee.type}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[#87968C]" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 w-full">
                      <div className="rounded-lg bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Assigned</p>
                        <p className="mt-0.5 text-xs font-black text-[#1B241E]">{formatWeight(employee.totalAssigned)}</p>
                      </div>
                      <div className="rounded-lg bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Returned</p>
                        <p className="mt-0.5 text-xs font-black text-[#1B241E]">{formatWeight(employee.totalReturned)}</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 text-center border border-[#E2E8E4] shadow-sm">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Balance</p>
                        <p className={`mt-0.5 text-xs font-black ${employee.balance > 0.001 ? "text-amber-700" : employee.balance < -0.001 ? "text-rose-700" : "text-emerald-700"}`}>
                          {formatWeight(employee.balance)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center w-full mt-3">
                      <StatusBadge status={employee.status} />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}