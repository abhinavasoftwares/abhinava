import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Hammer,
  Search,
  Users,
  Wallet,
  Download,
  CalendarDays,
  Loader2
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

function getDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = getDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  const date = getDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isWithinDateRange(value, startDate, endDate) {
  const date = getDate(value);
  if (!date) return false;

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

// ============================================================
// SHARED UI COMPONENTS
// ============================================================
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

function TypeBadge({ type }) {
  const isB2B = type === "B2B";
  return (
    <span className={`inline-flex w-max items-center rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isB2B ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800"}`}>
      {isB2B ? "B2B Pro" : "B2J Retail"}
    </span>
  );
}

function StatCard({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E2E8E4] bg-white p-4 shadow-sm transition-all hover:border-[#345343]/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">{label}</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-[#1B241E]">{value}</p>
          {helper && <p className="mt-1 text-[10px] font-semibold text-[#87968C]">{helper}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343]">
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN REPORTS PAGE
// ============================================================
export default function KareegarReportsPage() {
  const { employees, assignments, returns, loading, error } = useKareegarLedger();

  const [activeReport, setActiveReport] = useState("overview");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ==========================================================
  // FILTERING LOGIC
  // ==========================================================
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesType = typeFilter === "ALL" || employee.type === typeFilter;
      const matchesSearch = !query || 
        employee.name?.toLowerCase().includes(query) || 
        employee.kareegarId?.toLowerCase().includes(query) || 
        employee.mobileNumber?.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [employees, typeFilter, search]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => isWithinDateRange(item.createdAt, startDate, endDate));
  }, [assignments, startDate, endDate]);

  const filteredReturns = useMemo(() => {
    return returns.filter((item) => isWithinDateRange(item.createdAt, startDate, endDate));
  }, [returns, startDate, endDate]);

  const transactions = useMemo(() => {
    const employeeMap = new Map(filteredEmployees.map(emp => [emp.id, emp]));
    return [
      ...filteredAssignments.map(item => ({ ...item, transactionType: "ASSIGNMENT" })),
      ...filteredReturns.map(item => ({ ...item, transactionType: "RETURN" })),
    ]
      .filter(item => employeeMap.has(item.employeeId))
      .sort((a, b) => (getDate(b.createdAt)?.getTime() || 0) - (getDate(a.createdAt)?.getTime() || 0));
  }, [filteredAssignments, filteredReturns, filteredEmployees]);

  // ==========================================================
  // AGGREGATE TOTALS
  // ==========================================================
  const totals = useMemo(() => {
    const visibleEmployeeIds = new Set(filteredEmployees.map(e => e.id));
    const visibleAssignments = filteredAssignments.filter(item => visibleEmployeeIds.has(item.employeeId));
    const visibleReturns = filteredReturns.filter(item => visibleEmployeeIds.has(item.employeeId));

    const assigned = visibleAssignments.reduce((total, item) => total + Number(item.type === "B2B" ? item.rawMaterialWeight || 0 : item.effectiveGoldAssigned || 0), 0);
    const returned = visibleReturns.reduce((total, item) => total + Number(item.effectiveGoldReturned || item.returnedWeight || 0), 0);
    const wastage = visibleReturns.reduce((total, item) => total + Number(item.wastage || 0), 0);
    const stoneCharges = visibleReturns.reduce((total, item) => total + Number(item.stoneCharges || 0), 0);
    const advanceCash = visibleAssignments.reduce((total, item) => total + Number(item.advanceCashPaid || 0), 0);

    return {
      kareegars: filteredEmployees.length,
      b2b: filteredEmployees.filter(e => e.type === "B2B").length,
      b2j: filteredEmployees.filter(e => e.type === "B2J").length,
      assignments: visibleAssignments.length,
      returns: visibleReturns.length,
      assigned,
      returned,
      balance: assigned - returned,
      wastage,
      stoneCharges,
      advanceCash,
    };
  }, [filteredEmployees, filteredAssignments, filteredReturns]);

  // ==========================================================
  // EXPORT TO CSV
  // ==========================================================
  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    if (activeReport === "material" || activeReport === "performance") {
      csvContent += "Kareegar ID,Name,Type,Assignments,Returns,Total Assigned (g),Total Returned (g),Balance (g),Status\n";
      filteredEmployees.forEach(emp => {
        csvContent += `${emp.kareegarId || emp.id},${emp.name},${emp.type},${emp.assignmentCount},${emp.returnCount},${emp.totalAssigned},${emp.totalReturned},${emp.balance},${emp.status}\n`;
      });
    } else if (activeReport === "transactions") {
      csvContent += "Date,Time,Kareegar ID,Name,Type,Transaction,Item/Category,Weight (g),Purity %,Effective Gold (g),Amount (INR),Remarks\n";
      transactions.forEach(tx => {
        const emp = filteredEmployees.find(e => e.id === tx.employeeId);
        const isAssign = tx.transactionType === "ASSIGNMENT";
        csvContent += `${formatDate(tx.createdAt)},${formatTime(tx.createdAt)},${emp?.kareegarId || "—"},${emp?.name || tx.employeeName || "—"},${emp?.type || "—"},${isAssign ? "ASSIGNMENT" : "RETURN"},${isAssign ? "Raw Material" : tx.ornamentCategoryName || "Material"},${isAssign ? tx.rawMaterialWeight : tx.returnedWeight},${tx.rawMaterialPurity ?? tx.purity ?? ""},${isAssign ? tx.effectiveGoldAssigned : tx.effectiveGoldReturned},${isAssign ? tx.advanceCashPaid : tx.stoneCharges},${tx.remarks || ""}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kareegar_${activeReport}_Report_${new Date().toLocaleDateString('en-IN')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================================
  // RENDER STATES
  // ==========================================================
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F5F7F5] lg:bg-white">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto animate-spin text-[#345343]" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#87968C]">Compiling Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F5F7F5] lg:bg-white p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center max-w-sm">
          <Activity size={32} className="mx-auto text-rose-500 mb-3" />
          <h2 className="text-sm font-bold text-rose-800">Report Generation Failed</h2>
          <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#F5F7F5] lg:bg-white p-3 lg:p-4 lg:overflow-hidden min-h-0">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col min-h-0 animate-in fade-in duration-300">
        
        {/* ======================================================
            ULTRA-COMPACT CONTROL STRIP
        ====================================================== */}
        <div className="shrink-0 flex flex-col gap-3 pb-3 border-b border-[#E2E8E4]/60">
          
          {/* Row 1: Report Tabs & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3> Reports </h3>
            <div className="flex w-full sm:w-auto overflow-x-auto rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] p-1 shadow-sm [&::-webkit-scrollbar]:hidden">
              {[["overview", "Overview"], ["material", "Material Summary"], ["performance", "Performance"], ["transactions", "Transactions"]].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveReport(value)}
                  className={`flex-1 sm:flex-none whitespace-nowrap rounded-md px-4 py-1.5 text-[10px] font-bold transition-all ${
                    activeReport === value ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60" : "text-[#87968C] hover:text-[#1B241E] border border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button onClick={handleExport} className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white border border-[#E2E8E4] px-4 text-[10px] font-bold text-[#345343] shadow-sm transition-all hover:bg-[#F5F7F5] hover:border-[#345343] w-full sm:w-auto">
              <Download size={13} /> Export CSV
            </button>
          </div>

          {/* Row 2: Filters (Hidden on Overview) */}
          {activeReport !== "overview" && (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              
              <div className="flex w-full lg:w-auto rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] p-0.5 shadow-sm">
                {[["ALL", "All Workflows"], ["B2B", "B2B Only"], ["B2J", "Retail Only"]].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTypeFilter(value)}
                    className={`flex-1 rounded-md px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all ${
                      typeFilter === value ? "bg-[#345343] text-white shadow-sm" : "text-[#87968C] hover:text-[#1B241E]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87968C]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or ID..."
                    className="w-full rounded-lg border border-[#E2E8E4] bg-white py-1.5 pl-8 pr-3 text-xs font-semibold text-[#1B241E] outline-none shadow-sm focus:border-[#345343] focus:ring-1 focus:ring-[#345343]"
                  />
                </div>
                
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <CalendarDays size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#87968C]" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-[130px] rounded-lg border border-[#E2E8E4] bg-white py-1.5 pl-8 pr-2 text-[10px] font-bold text-[#68786D] outline-none shadow-sm focus:border-[#345343]"
                    />
                  </div>
                  <span className="text-[#87968C] text-[10px] font-bold px-1">to</span>
                  <div className="relative flex-1 sm:flex-none">
                    <CalendarDays size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#87968C]" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full sm:w-[130px] rounded-lg border border-[#E2E8E4] bg-white py-1.5 pl-8 pr-2 text-[10px] font-bold text-[#68786D] outline-none shadow-sm focus:border-[#345343]"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ======================================================
            REPORT CONTENT AREA (Maximizes available space)
        ====================================================== */}
        <div className="flex-1 min-h-0 flex flex-col mt-3">
          {activeReport === "overview" && <OverviewReport totals={totals} />}
          {activeReport === "material" && <MaterialReport employees={filteredEmployees} />}
          {activeReport === "performance" && <PerformanceReport employees={filteredEmployees} />}
          {activeReport === "transactions" && <TransactionReport transactions={transactions} employees={filteredEmployees} />}
        </div>

      </div>
    </div>
  );
}

// ============================================================
// 1. OVERVIEW REPORT
// ============================================================
function OverviewReport({ totals }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-0 lg:p-2 [&::-webkit-scrollbar]:hidden">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard icon={Users} label="Total Goldsmiths" value={totals.kareegars} helper={`${totals.b2b} B2B • ${totals.b2j} Retail`} />
        <StatCard icon={ArrowUpFromLine} label="Assignments" value={totals.assignments} helper={`${formatWeight(totals.assigned)} Total`} />
        <StatCard icon={ArrowDownToLine} label="Returns" value={totals.returns} helper={`${formatWeight(totals.returned)} Total`} />
        <StatCard icon={Wallet} label="Global Outstanding" value={formatWeight(totals.balance)} helper="Material pending return" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-[#E2E8E4] bg-[#F5F7F5]/50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Aggregate Assigned</p>
          <p className="mt-1 text-lg font-black text-[#1B241E]">{formatWeight(totals.assigned)}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8E4] bg-[#F5F7F5]/50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Aggregate Returned</p>
          <p className="mt-1 text-lg font-black text-[#1B241E]">{formatWeight(totals.returned)}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8E4] bg-[#F5F7F5]/50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Total Wastage Accounted</p>
          <p className="mt-1 text-lg font-black text-rose-700">{formatWeight(totals.wastage)}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8E4] bg-[#F5F7F5]/50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Stone Charges</p>
          <p className="mt-1 text-lg font-black text-[#68786D]">{formatCurrency(totals.stoneCharges)}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8E4] bg-[#F5F7F5]/50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Advance Cash Paid</p>
          <p className="mt-1 text-lg font-black text-[#68786D]">{formatCurrency(totals.advanceCash)}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8E4] bg-emerald-50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Net Liability (Balance)</p>
          <p className="mt-1 text-lg font-black text-emerald-900">{formatWeight(totals.balance)}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 2. MATERIAL REPORT
// ============================================================
function MaterialReport({ employees }) {
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-[1.5rem] bg-transparent lg:bg-white lg:border lg:border-[#E2E8E4] lg:shadow-sm">
      {/* DESKTOP TABLE */}
      <div className="hidden lg:flex flex-col h-full overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#F5F7F5] border-b border-[#E2E8E4] shadow-sm">
            <tr>
              <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Goldsmith</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Total Assigned</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Total Returned</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Net Balance</th>
              <th className="px-6 py-3 text-center text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Ledger Status</th>
            </tr>
          </thead>
          <tbody className="overflow-y-auto divide-y divide-[#E2E8E4]/60 [&::-webkit-scrollbar]:hidden">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-[#F5F7F5]/40 transition-colors">
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#E2E8E4] text-[#345343] shadow-sm">
                      {emp.type === "B2B" ? <Building2 size={14} /> : <Hammer size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1B241E]">{emp.name}</p>
                      <p className="text-[9px] font-bold text-[#87968C]">{emp.kareegarId || emp.id} <span className="mx-1">•</span> <TypeBadge type={emp.type} /></p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 text-right whitespace-nowrap text-sm font-bold text-[#1B241E]">{formatWeight(emp.totalAssigned)}</td>
                <td className="px-6 py-3 text-right whitespace-nowrap text-sm font-bold text-[#1B241E]">{formatWeight(emp.totalReturned)}</td>
                <td className={`px-6 py-3 text-right whitespace-nowrap text-sm font-black ${emp.balance > 0.001 ? "text-amber-700" : emp.balance < -0.001 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatWeight(emp.balance)}
                </td>
                <td className="px-6 py-3 text-center whitespace-nowrap"><StatusBadge status={emp.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="flex lg:hidden flex-col gap-3 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden">
        {employees.map((emp) => (
          <div key={emp.id} className="rounded-2xl border border-[#E2E8E4] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E2E8E4]/60 pb-3 mb-3">
              <div>
                <p className="text-sm font-bold text-[#1B241E]">{emp.name}</p>
                <p className="text-[10px] font-medium text-[#87968C]">{emp.kareegarId} • {emp.type}</p>
              </div>
              <StatusBadge status={emp.status} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Assigned</p>
                <p className="mt-0.5 text-xs font-black text-[#1B241E]">{formatWeight(emp.totalAssigned)}</p>
              </div>
              <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Returned</p>
                <p className="mt-0.5 text-xs font-black text-[#1B241E]">{formatWeight(emp.totalReturned)}</p>
              </div>
              <div className="rounded-xl bg-white p-2 text-center border border-[#E2E8E4] shadow-sm">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Balance</p>
                <p className={`mt-0.5 text-xs font-black ${emp.balance > 0.001 ? "text-amber-700" : "text-emerald-700"}`}>{formatWeight(emp.balance)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 3. PERFORMANCE REPORT
// ============================================================
function PerformanceReport({ employees }) {
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-[1.5rem] bg-transparent lg:bg-white lg:border lg:border-[#E2E8E4] lg:shadow-sm">
      {/* DESKTOP TABLE */}
      <div className="hidden lg:flex flex-col h-full overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#F5F7F5] border-b border-[#E2E8E4] shadow-sm">
            <tr>
              <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Goldsmith</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Tx Count</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Avg Assigned</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Avg Returned</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Total Wastage</th>
            </tr>
          </thead>
          <tbody className="overflow-y-auto divide-y divide-[#E2E8E4]/60 [&::-webkit-scrollbar]:hidden">
            {employees.map((emp) => {
              const totalTx = emp.assignmentCount + emp.returnCount;
              const avgAssign = emp.assignmentCount > 0 ? emp.totalAssigned / emp.assignmentCount : 0;
              const avgReturn = emp.returnCount > 0 ? emp.totalReturned / emp.returnCount : 0;

              return (
                <tr key={emp.id} className="hover:bg-[#F5F7F5]/40 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <p className="text-xs font-bold text-[#1B241E]">{emp.name}</p>
                    <p className="text-[9px] font-bold text-[#87968C]">{emp.kareegarId} <span className="mx-1">•</span> <TypeBadge type={emp.type} /></p>
                  </td>
                  <td className="px-6 py-3 text-right whitespace-nowrap text-xs font-bold text-[#1B241E]">
                    {totalTx} <span className="text-[9px] font-medium text-[#87968C] ml-1">({emp.assignmentCount}A / {emp.returnCount}R)</span>
                  </td>
                  <td className="px-6 py-3 text-right whitespace-nowrap text-xs font-bold text-[#68786D]">{formatWeight(avgAssign)}</td>
                  <td className="px-6 py-3 text-right whitespace-nowrap text-xs font-bold text-[#68786D]">{formatWeight(avgReturn)}</td>
                  <td className="px-6 py-3 text-right whitespace-nowrap text-xs font-black text-rose-700">{formatWeight(emp.totalWastage || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="flex lg:hidden flex-col gap-3 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden">
        {employees.map((emp) => (
          <div key={emp.id} className="rounded-2xl border border-[#E2E8E4] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E2E8E4]/60 pb-3 mb-3">
              <div>
                <p className="text-sm font-bold text-[#1B241E]">{emp.name}</p>
                <p className="text-[10px] font-medium text-[#87968C]">{emp.kareegarId} • {emp.type}</p>
              </div>
              <span className="rounded-lg bg-[#F5F7F5] px-3 py-1 text-[10px] font-bold text-[#345343]">
                {emp.assignmentCount + emp.returnCount} Txns
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Avg Assigned</p>
                <p className="mt-0.5 text-xs font-bold text-[#68786D]">{formatWeight(emp.assignmentCount > 0 ? emp.totalAssigned / emp.assignmentCount : 0)}</p>
              </div>
              <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Avg Returned</p>
                <p className="mt-0.5 text-xs font-bold text-[#68786D]">{formatWeight(emp.returnCount > 0 ? emp.totalReturned / emp.returnCount : 0)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 4. TRANSACTION REPORT
// ============================================================
function TransactionReport({ transactions, employees }) {
  const employeeMap = useMemo(() => new Map(employees.map((emp) => [emp.id, emp])), [employees]);

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-[1.5rem] bg-transparent lg:bg-white lg:border lg:border-[#E2E8E4] lg:shadow-sm">
      {/* DESKTOP TABLE */}
      <div className="hidden lg:flex flex-col h-full overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#F5F7F5] border-b border-[#E2E8E4] shadow-sm">
            <tr>
              <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Date & Time</th>
              <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Kareegar</th>
              <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Details</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Weights</th>
              <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-[#87968C]">Financials</th>
            </tr>
          </thead>
          <tbody className="overflow-y-auto divide-y divide-[#E2E8E4]/60 [&::-webkit-scrollbar]:hidden">
            {transactions.map((tx) => {
              const isAssignment = tx.transactionType === "ASSIGNMENT";
              const emp = employeeMap.get(tx.employeeId);
              return (
                <tr key={`${tx.transactionType}-${tx.id}`} className="hover:bg-[#F5F7F5]/40 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <p className="text-xs font-bold text-[#1B241E]">{formatDate(tx.createdAt)}</p>
                    <p className="text-[9px] font-semibold text-[#87968C]">{formatTime(tx.createdAt)}</p>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <p className="text-xs font-bold text-[#1B241E]">{emp?.name || tx.employeeName || "—"}</p>
                    <p className="text-[9px] font-semibold text-[#87968C]"><TypeBadge type={emp?.type || tx.type} /></p>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${isAssignment ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {isAssignment ? "ASSIGNMENT" : "RETURN"}
                    </span>
                    <p className="mt-1 text-xs font-bold text-[#1B241E]">{isAssignment ? "Raw Material" : tx.ornamentCategoryName || "Material"}</p>
                    <p className="text-[9px] font-bold text-[#87968C]">Purity: <span className="text-[#345343]">{tx.rawMaterialPurity ?? tx.purity ?? "—"}%</span></p>
                  </td>
                  <td className="px-6 py-3 text-right whitespace-nowrap">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">{isAssignment ? "Raw" : "Ret"}: <span className="text-[#1B241E]">{formatWeight(isAssignment ? tx.rawMaterialWeight : tx.returnedWeight)}</span></p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#345343]">Eff: {formatWeight(isAssignment ? tx.effectiveGoldAssigned : tx.effectiveGoldReturned)}</p>
                  </td>
                  <td className="px-6 py-3 text-right whitespace-nowrap">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#87968C]">{isAssignment ? "Advance" : "Charges"}</p>
                    <p className="text-xs font-bold text-[#1B241E]">{formatCurrency(isAssignment ? tx.advanceCashPaid : tx.stoneCharges)}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="flex lg:hidden flex-col gap-3 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden">
        {transactions.map((tx) => {
          const isAssignment = tx.transactionType === "ASSIGNMENT";
          const emp = employeeMap.get(tx.employeeId);
          return (
            <div key={`${tx.transactionType}-${tx.id}`} className="rounded-2xl border border-[#E2E8E4] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E2E8E4]/60 pb-3 mb-3">
                <div>
                  <p className="text-xs font-bold text-[#1B241E]">{emp?.name || tx.employeeName || "—"}</p>
                  <p className="text-[9px] font-medium text-[#87968C]">{formatDate(tx.createdAt)} • {formatTime(tx.createdAt)}</p>
                </div>
                <span className={`inline-flex rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${isAssignment ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {isAssignment ? "ASSIGNED" : "RETURNED"}
                </span>
              </div>
              <div className="mb-3">
                <p className="text-sm font-bold text-[#1B241E]">{isAssignment ? "Raw Material" : tx.ornamentCategoryName || "Material"}</p>
                <p className="text-[9px] font-medium text-[#87968C]">Purity: <span className="font-bold text-[#345343]">{tx.rawMaterialPurity ?? tx.purity ?? "—"}%</span></p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">Effective Weight</p>
                  <p className="mt-0.5 text-xs font-black text-[#1B241E]">{formatWeight(isAssignment ? tx.effectiveGoldAssigned : tx.effectiveGoldReturned)}</p>
                </div>
                <div className="rounded-xl bg-[#F5F7F5] p-2 text-center border border-[#E2E8E4]/40">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-[#87968C]">{isAssignment ? "Advance" : "Charges"}</p>
                  <p className="mt-0.5 text-xs font-bold text-[#1B241E]">{formatCurrency(isAssignment ? tx.advanceCashPaid : tx.stoneCharges)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}