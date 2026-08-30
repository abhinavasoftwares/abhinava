import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  History,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import { useInvestmentInvestorProfile } from "../hooks/useInvestmentInvestorProfile";
import { createInvestmentTransaction } from "../services/investmentTransactions";
import { closeInvestmentAccount } from "../services/investmentAccounts";
import { verifyTransactionPasscode } from "../services/investmentTransactionSecurity";

/* ============================================================
   HELPERS
============================================================ */

const PAGE_SIZE = 40;

function clean(value) {
  return String(value ?? "").trim();
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value) {
  return `₹${number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatGold(value) {
  return `${number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} g`;
}

function toDate(value) {
  if (!value) return null;
  try {
    if (typeof value === "object" && typeof value.toDate === "function") {
      return value.toDate();
    }
    if (typeof value === "object" && value.seconds !== undefined) {
      return new Date(number(value.seconds) * 1000);
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function timestamp(value) {
  const d = toDate(value);
  return d ? d.getTime() : 0;
}

function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isClosedAccount(account) {
  return clean(account?.status).toUpperCase() === "CLOSED";
}

function isActiveAccount(account) {
  return !isClosedAccount(account);
}

function getSchemeName(account) {
  return (
    clean(account?.schemeSnapshot?.schemeName) ||
    clean(account?.schemeName) ||
    "Investment"
  );
}

function getSchemeType(account) {
  return (
    clean(account?.schemeSnapshot?.schemeType) || clean(account?.schemeType)
  ).toUpperCase();
}

function isGoldAccount(account) {
  const type = getSchemeType(account);
  const unit = clean(account?.contribution?.unit).toUpperCase();
  const name = getSchemeName(account).toUpperCase();

  return (
    type.includes("GOLD") ||
    unit === "GOLD_GRAMS" ||
    name.includes("GOLD SIP") ||
    number(account?.totalGoldCredited) > 0 ||
    number(account?.openingBalanceGoldGrams) > 0
  );
}

function getDuration(account) {
  const duration = number(
    account?.schemeSnapshot?.durationMonths ?? account?.durationMonths
  );
  return Number.isInteger(duration) && duration > 0 ? duration : null;
}

function getMonthLimit(account) {
  const duration = getDuration(account);
  return duration ? duration + 1 : 13;
}

function getTransactionAmount(transaction) {
  return number(
    transaction?.amountPaid ??
      transaction?.amount ??
      transaction?.contribution?.amount
  );
}

function getTransactionGold(transaction) {
  return number(
    transaction?.goldGrams ??
      transaction?.creditedGoldGrams ??
      transaction?.goldQuantity
  );
}

function getTransactionType(transaction) {
  return clean(
    transaction?.type || transaction?.transactionType || "CREDIT"
  ).toUpperCase();
}

function getTransactionDate(transaction) {
  return (
    transaction?.transactionDate ||
    transaction?.date ||
    transaction?.paymentDate ||
    transaction?.createdAt
  );
}

function getTransactionMode(transaction) {
  return (
    clean(transaction?.paymentMode || transaction?.transactionMode).toUpperCase() ||
    "—"
  );
}

function getTransactionMonth(transaction) {
  return transaction?.transactionMonth || transaction?.month || "—";
}

function getTransactionBalance(transaction, account) {
  if (isGoldAccount(account)) {
    return number(
      transaction?.balanceGoldGrams ??
        transaction?.goldBalanceAfter ??
        transaction?.runningGoldBalance
    );
  }
  return number(
    transaction?.balanceAmount ??
      transaction?.balanceAfter ??
      transaction?.runningBalance ??
      transaction?.balance
  );
}

function getAccountAmountBalance(account) {
  return number(account?.openingBalanceAmount) + number(account?.totalPaid);
}

function getAccountGoldBalance(account) {
  return (
    number(account?.openingBalanceGoldGrams) +
    number(account?.totalGoldCredited)
  );
}

function getMinimumRestriction(account) {
  if (typeof account?.minimumRestrictionEnabled === "boolean") {
    return account.minimumRestrictionEnabled;
  }
  return Boolean(
    account?.schemeSnapshot?.minimumRestrictionEnabled ??
      account?.minimumRestrictionEnabled ??
      true
  );
}

/* ============================================================
   PAGED / INFINITE DISPLAY
============================================================ */

function useInfiniteList(items, pageSize = PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setVisibleCount((current) => Math.min(current + pageSize, items.length));
  }, [hasMore, pageSize, items.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;
    const root = node.closest("[data-scroll-root]");

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { root: root || null, rootMargin: "160px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return {
    visible: items.slice(0, visibleCount),
    hasMore,
    sentinelRef,
  };
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function InvestmentInvestorProfilePage() {
  const navigate = useNavigate();
  const { investorId } = useParams();

  const profile = useInvestmentInvestorProfile(investorId);

  const investor = profile?.investor || null;
  const accounts = Array.isArray(profile?.accounts) ? profile.accounts : [];
  const allTransactions = Array.isArray(profile?.transactions) ? profile.transactions : [];
  const communications = Array.isArray(profile?.communications) ? profile.communications : [];
  const auditLogs = Array.isArray(profile?.auditLogs) ? profile.auditLogs : [];

  const loading = profile?.loading === true;
  const error = profile?.error || "";

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [activeView, setActiveView] = useState("TRANSACTIONS");
  const [txSearch, setTxSearch] = useState("");
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [toast, setToast] = useState(null);
  const [transactionModal, setTransactionModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showAccountSheet, setShowAccountSheet] = useState(false);

  const [transactionForm, setTransactionForm] = useState({
    month: "",
    date: "",
    amountPaid: "",
    goldPrice: "",
    paymentMode: "UPI",
    transactionReference: "",
  });

  /* ----------------------------------------------------------
     AUTO SELECT ACCOUNT
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!accounts.length) {
      setSelectedAccountId(null);
      return;
    }
    const exists = accounts.some((account) => account.id === selectedAccountId);
    if (exists) return;

    const active = accounts.find((account) => isActiveAccount(account));
    setSelectedAccountId(active?.id || accounts[0]?.id || null);
  }, [accounts, selectedAccountId]);

  /* ----------------------------------------------------------
     TOAST
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const selectedIsGold = isGoldAccount(selectedAccount);
  const minimumRestriction = getMinimumRestriction(selectedAccount);

  /* ----------------------------------------------------------
     TRANSACTIONS & DATA
  ---------------------------------------------------------- */
  const selectedTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    const search = clean(txSearch).toLowerCase();

    return allTransactions
      .filter((transaction) => transaction.accountId === selectedAccountId)
      .filter((transaction) => {
        if (!search) return true;
        const haystack = [
          transaction.receiptNumber,
          transaction.transactionReference,
          transaction.referenceNumber,
          transaction.type,
          transaction.transactionType,
          transaction.transactionMonth,
          transaction.paymentMode,
          transaction.amountPaid,
          transaction.goldPrice,
        ]
          .map(clean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      })
      .sort((a, b) => timestamp(getTransactionDate(b)) - timestamp(getTransactionDate(a)));
  }, [allTransactions, selectedAccountId, txSearch]);

  const transactionList = useInfiniteList(selectedTransactions);

  const communicationList = useInfiniteList(
    [...communications].sort(
      (a, b) => timestamp(b?.sentAt || b?.createdAt) - timestamp(a?.sentAt || a?.createdAt)
    ),
    25
  );

  const auditList = useInfiniteList(
    [...auditLogs].sort((a, b) => timestamp(b?.createdAt) - timestamp(a?.createdAt)),
    25
  );

  const activeAccounts = accounts.filter(isActiveAccount);
  const closedAccounts = accounts.filter(isClosedAccount);

  const totalPaid = activeAccounts.reduce(
    (sum, account) => sum + getAccountAmountBalance(account),
    0
  );

  const totalGold = activeAccounts.reduce(
    (sum, account) => sum + getAccountGoldBalance(account),
    0
  );

  /* ----------------------------------------------------------
     OPEN TRANSACTION
  ---------------------------------------------------------- */
  function openTransactionModal() {
    if (!selectedAccount) {
      setToast({ type: "error", message: "Select an account first." });
      return;
    }
    if (isClosedAccount(selectedAccount)) {
      setToast({ type: "error", message: "Closed accounts cannot receive transactions." });
      return;
    }

    const existingMonths = allTransactions
      .filter((transaction) => transaction.accountId === selectedAccount.id)
      .map((transaction) =>
        Number(clean(transaction.transactionMonth).replace("M", ""))
      )
      .filter(Number.isFinite);

    const nextMonth = existingMonths.length ? Math.max(...existingMonths) + 1 : 1;
    const limit = getMonthLimit(selectedAccount);

    setTransactionForm({
      month: nextMonth <= limit ? `M${nextMonth}` : `M${limit}`,
      date: new Date().toISOString().slice(0, 10),
      amountPaid: "",
      goldPrice: "",
      paymentMode: "UPI",
      transactionReference: "",
    });

    setPasscode("");
    setTransactionModal(true);
  }

  /* ----------------------------------------------------------
     CREATE TRANSACTION
  ---------------------------------------------------------- */
  async function submitTransaction(event) {
    event.preventDefault();
    if (!selectedAccount) return;

    try {
      setActionLoading(true);

      if (!transactionForm.month) throw new Error("Select transaction month.");
      if (!transactionForm.date) throw new Error("Select transaction date.");

      const amount = number(transactionForm.amountPaid);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid amount paid.");
      }

      if (selectedIsGold) {
        const price = number(transactionForm.goldPrice);
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error("Today's gold price is required for Gold SIP.");
        }
      }

      if (!clean(transactionForm.transactionReference)) {
        throw new Error("Transaction reference number is required.");
      }

      if (!clean(passcode)) {
        throw new Error("CRM transaction passcode is required.");
      }

      await verifyTransactionPasscode(passcode);

      await createInvestmentTransaction({
        accountId: selectedAccount.id,
        transactionMonth: transactionForm.month,
        transactionDate: transactionForm.date,
        amountPaid: amount,
        goldPrice: selectedIsGold ? number(transactionForm.goldPrice) : null,
        paymentMode: transactionForm.paymentMode,
        transactionReference: transactionForm.transactionReference,
        passcode,
      });

      setTransactionModal(false);
      setPasscode("");
      setToast({ type: "success", message: "Transaction recorded successfully." });
    } catch (submitError) {
      setToast({
        type: "error",
        message: submitError?.message || "Failed to record transaction.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  /* ----------------------------------------------------------
     CLOSE ACCOUNT
  ---------------------------------------------------------- */
  function openCloseAccount() {
    if (!selectedAccount || isClosedAccount(selectedAccount)) return;
    setPasscode("");
    setCloseModal(true);
  }

  async function confirmCloseAccount(event) {
    event.preventDefault();
    if (!selectedAccount) return;

    try {
      setActionLoading(true);
      if (!clean(passcode)) throw new Error("CRM security passcode is required.");

      await verifyTransactionPasscode(passcode);
      await closeInvestmentAccount(selectedAccount.id, null, "ACCOUNT_CLOSED_FROM_INVESTOR_PROFILE");

      setCloseModal(false);
      setPasscode("");
      setToast({
        type: "success",
        message: `${selectedAccount.accountNumber || "Account"} has been closed.`,
      });
    } catch (closeError) {
      setToast({
        type: "error",
        message: closeError?.message || "Failed to close account.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  /* ----------------------------------------------------------
     EXPORT & PRINT
  ---------------------------------------------------------- */
  function exportTransactions() {
    if (!selectedTransactions.length) {
      setToast({ type: "error", message: "There are no transactions to export." });
      return;
    }

    const headers = selectedIsGold
      ? ["S.No", "Date & Time", "Type", "Receipt Number", "Month", "Amount Paid", "Gold Rate", "Gold Credited", "Transaction Reference"]
      : ["S.No", "Date & Time", "Type", "Receipt Number", "Month", "Amount Paid", "Transaction Mode", "Transaction Reference"];

    const rows = selectedTransactions.map((transaction, index) => {
      const base = [
        index + 1,
        formatDateTime(getTransactionDate(transaction)),
        getTransactionType(transaction),
        transaction.receiptNumber || "",
        getTransactionMonth(transaction),
        getTransactionAmount(transaction),
      ];

      if (selectedIsGold) {
        return [
          ...base,
          number(transaction.goldPrice),
          getTransactionGold(transaction),
          transaction.transactionReference || "",
        ];
      }

      return [...base, getTransactionMode(transaction), transaction.transactionReference || ""];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedAccount?.accountNumber || "investment"}_transactions.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToast({ type: "success", message: "Transactions exported." });
  }

  function printReceipt(transaction) {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${transaction.receiptNumber || "Receipt"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin-bottom: 4px; font-size: 20px; color: #0f172a; }
            .muted { color: #64748b; font-size: 12px; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .label { color: #475569; font-size: 12px; }
            .value { font-weight: bold; font-size: 12px; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Investment Receipt</h1>
          <p class="muted">${getSchemeName(selectedAccount)}</p>
          <div style="margin-top: 24px;">
            <div class="row"><span class="label">Account</span><span class="value">${selectedAccount?.accountNumber || "—"}</span></div>
            <div class="row"><span class="label">Receipt Number</span><span class="value">${transaction.receiptNumber || "—"}</span></div>
            <div class="row"><span class="label">Date</span><span class="value">${formatDateTime(getTransactionDate(transaction))}</span></div>
            <div class="row"><span class="label">Month</span><span class="value">${getTransactionMonth(transaction)}</span></div>
            <div class="row"><span class="label">Type</span><span class="value">${getTransactionType(transaction)}</span></div>
            <div class="row"><span class="label">Amount Paid</span><span class="value">${formatCurrency(getTransactionAmount(transaction))}</span></div>
            ${selectedIsGold 
              ? `<div class="row"><span class="label">Gold Rate</span><span class="value">${formatCurrency(transaction.goldPrice)}</span></div>
                 <div class="row"><span class="label">Gold Credited</span><span class="value">${formatGold(getTransactionGold(transaction))}</span></div>`
              : `<div class="row"><span class="label">Payment Mode</span><span class="value">${getTransactionMode(transaction)}</span></div>`
            }
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) return setToast({ type: "error", message: "Please allow pop-ups to print." });
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  }

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  if (loading && !investor) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <Loader2 size={24} className="animate-spin text-slate-800" />
      </div>
    );
  }

  if (error || (!investor && !loading)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CircleAlert size={36} className="mx-auto mb-4 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-900">Profile Not Found</h2>
          <p className="mt-2 text-[11px] text-slate-500">{error || "This investor profile could not be loaded."}</p>
          <button onClick={() => navigate("/crm/investment/investors")} className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-slate-800">
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  // A sleek, minimal invisible scrollbar strictly applied via Tailwind arbitrary variants
  const hideScrollbar = "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex max-w-sm items-center gap-2 rounded-lg border px-4 py-3 shadow-lg transition-all ${
          toast.type === "success" ? "border-slate-200 bg-white text-slate-900" : "border-rose-200 bg-rose-50 text-rose-900"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} className="text-slate-900" /> : <AlertCircle size={16} />}
          <span className="text-[11px] font-bold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* HEADER - Compact */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/crm/investment/investors")} className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900">
              <ArrowLeft size={14} />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-[#F7E7CE]">
              {clean(investor.fullName).charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[13px] font-bold text-slate-900">{investor.fullName}</h1>
                <StatusBadge active={clean(investor.status).toUpperCase() !== "INACTIVE"} />
                {minimumRestriction && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-600"><ShieldCheck size={10} className="inline mr-0.5" /> Min Restrict</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
                <span className="flex items-center gap-1"><Phone size={10} /> {investor.mobileNumber || "—"}</span>
                {investor.email && <span className="flex items-center gap-1"><Mail size={10} /> {investor.email}</span>}
                {investor.city && <span className="flex items-center gap-1"><MapPin size={10} /> {investor.city}</span>}
              </div>
            </div>
          </div>
          <button onClick={() => setProfileExpanded(v => !v)} className="flex h-7 px-2 shrink-0 items-center gap-1.5 rounded border border-slate-200 text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition">
            {profileExpanded ? "Hide" : "Stats"} {profileExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
        </div>
        
        {profileExpanded && (
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-6 animate-in slide-in-from-top-2">
            <MiniMetric label="Accounts" value={accounts.length} />
            <MiniMetric label="Active" value={activeAccounts.length} />
            <MiniMetric label="Closed" value={closedAccounts.length} />
            <MiniMetric label="Total Tx" value={allTransactions.length} />
            <MiniMetric label="Total Paid" value={formatCurrency(totalPaid)} />
            <MiniMetric label="Total Gold" value={formatGold(totalGold)} color="text-amber-700" />
          </div>
        )}
      </header>

      {/* NAV & ACCOUNTS BAR */}
      <nav className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between">
        
        {/* Desktop Accounts list */}
        <div className="hidden md:flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2 pr-4 no-scrollbar">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mr-2 shrink-0">Ledger</span>
          {!accounts.length && <span className="text-[10px] text-slate-400 italic">No accounts</span>}
          {accounts.map((account) => {
            const selected = account.id === selectedAccountId;
            const closed = isClosedAccount(account);
            const gold = isGoldAccount(account);
            return (
              <button key={account.id} onClick={() => { setSelectedAccountId(account.id); setTxSearch(""); }}
                className={`shrink-0 rounded flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold transition border ${
                  selected 
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                    : closed 
                      ? "bg-white border-slate-200 text-slate-400 opacity-70" 
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}>
                <span>{account.accountNumber}</span>
                {gold && <span className={`text-[8px] uppercase tracking-widest ${selected ? "text-[#F7E7CE]" : "text-amber-600"}`}>Gold</span>}
                {closed && <span className="text-[8px] uppercase tracking-widest opacity-60">Closed</span>}
              </button>
            );
          })}
        </div>

        {/* Mobile Account Selector Trigger */}
        <div className="md:hidden py-2 border-b border-slate-100 flex items-center justify-between">
          <button onClick={() => setShowAccountSheet(true)} className="flex items-center gap-2 text-[11px] font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded">
            <WalletCards size={14} className="text-slate-500"/>
            {selectedAccount?.accountNumber || "Select Account"}
            <ChevronDown size={14} className="text-slate-500"/>
          </button>
        </div>

        {/* Views Tab */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 no-scrollbar shrink-0">
          <TabButton active={activeView === "TRANSACTIONS"} onClick={() => setActiveView("TRANSACTIONS")} label="Transactions" />
          <TabButton active={activeView === "COMMUNICATIONS"} onClick={() => setActiveView("COMMUNICATIONS")} label="Comms" count={communications.length} />
          <TabButton active={activeView === "AUDIT"} onClick={() => setActiveView("AUDIT")} label="History" count={auditLogs.length} />
        </div>
      </nav>

      {/* WORKSPACE (Strict height containment) */}
      <main className="flex-1 min-h-0 flex flex-col p-2 sm:p-4 bg-slate-50/50">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative">
          
          {/* TRANSACTIONS VIEW */}
          {activeView === "TRANSACTIONS" && (
            <>
              {/* Toolbar */}
              <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white p-3 z-10">
                <div className="relative w-full max-w-[240px]">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={txSearch} onChange={(e) => setTxSearch(e.target.value)} placeholder="Search transactions..."
                    className="h-8 w-full rounded bg-slate-50 pl-8 pr-3 text-[11px] font-medium outline-none transition focus:bg-white focus:ring-1 focus:ring-slate-900 border border-transparent focus:border-slate-300 placeholder:text-slate-400" />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={exportTransactions} disabled={!selectedTransactions.length} className="hidden sm:flex h-8 items-center gap-1.5 rounded border border-slate-200 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                    <Download size={12} /> Export
                  </button>
                  <button onClick={openTransactionModal} disabled={!selectedAccount || isClosedAccount(selectedAccount)} className="flex h-8 items-center gap-1.5 rounded bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:opacity-40">
                    <Plus size={12} /> Add
                  </button>
                  <button onClick={openCloseAccount} disabled={!selectedAccount || isClosedAccount(selectedAccount)} className="flex h-8 items-center justify-center w-8 rounded border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Responsive Container for Table / Cards */}
              <div data-scroll-root className={`flex-1 min-h-0 overflow-y-auto ${hideScrollbar}`}>
                
                {/* Desktop Table (Hidden on small screens) */}
                <div className="hidden sm:block">
                  {selectedIsGold ? (
                    <GoldTable transactions={transactionList.visible} account={selectedAccount} onPrint={printReceipt} />
                  ) : (
                    <RegularTable transactions={transactionList.visible} account={selectedAccount} onPrint={printReceipt} />
                  )}
                </div>

                {/* Mobile Cards (Hidden on sm and up) */}
                <div className="block sm:hidden p-2 space-y-2">
                  {!selectedAccount ? (
                    <EmptyState icon={<WalletCards size={20}/>} title="Select Account" text="Choose an account to view." />
                  ) : transactionList.visible.length === 0 ? (
                    <EmptyState icon={<FileText size={20}/>} title="No Transactions" text="No records match your criteria." />
                  ) : (
                    transactionList.visible.map((tx, idx) => (
                      <MobileTxCard key={tx.id || idx} transaction={tx} account={selectedAccount} index={idx} onPrint={printReceipt} />
                    ))
                  )}
                </div>

                <LoadMore hasMore={transactionList.hasMore} shown={transactionList.visible.length} total={selectedTransactions.length} innerRef={transactionList.sentinelRef} />
              </div>
            </>
          )}

          {/* COMMUNICATIONS VIEW */}
          {activeView === "COMMUNICATIONS" && (
            <div data-scroll-root className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${hideScrollbar}`}>
              {communicationList.visible.length === 0 ? (
                <EmptyState icon={<MessageSquare size={20} />} title="No Communications" text="Messages sent will appear here." />
              ) : (
                <div className="mx-auto max-w-3xl space-y-3">
                  {communicationList.visible.map((comm, idx) => (
                    <div key={comm.id || idx} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500"><MessageSquare size={14} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2 mb-1">
                          <h4 className="text-[12px] font-bold text-slate-900 truncate">{comm.subject || comm.templateName || "Message"}</h4>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 shrink-0">{formatDateTime(comm.sentAt || comm.createdAt)}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-600 mb-2">{comm.message || comm.body || comm.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {comm.channel && <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">{comm.channel}</span>}
                          {comm.status && <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${String(comm.status).toUpperCase() === 'SENT' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500'}`}>{comm.status}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <LoadMore hasMore={communicationList.hasMore} shown={communicationList.visible.length} total={communications.length} innerRef={communicationList.sentinelRef} />
                </div>
              )}
            </div>
          )}

          {/* AUDIT VIEW */}
          {activeView === "AUDIT" && (
            <div data-scroll-root className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${hideScrollbar}`}>
              {auditList.visible.length === 0 ? (
                <EmptyState icon={<History size={20} />} title="No Activity Logs" text="System actions will be recorded here." />
              ) : (
                <div className="mx-auto max-w-2xl relative pl-4">
                  <div className="absolute top-2 bottom-2 left-[15px] w-px bg-slate-200" />
                  <div className="space-y-5">
                    {auditList.visible.map((log, idx) => (
                      <div key={log.id || idx} className="relative flex items-start gap-4">
                        <div className="relative z-10 mt-1 flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-slate-400 ring-4 ring-white" />
                        <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-900">{clean(log.action || "ACTION").replaceAll("_", " ")}</p>
                            <span className="text-[9px] font-bold text-slate-400 shrink-0">{formatDateTime(log.createdAt)}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-600">{log.description}</p>
                          {(log.actorName || log.entityType) && (
                            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              {log.actorName && <span>By: <strong className="text-slate-700">{log.actorName}</strong></span>}
                              {log.entityType && <span>Entity: <strong className="text-slate-700">{log.entityType}</strong></span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <LoadMore hasMore={auditList.hasMore} shown={auditList.visible.length} total={auditLogs.length} innerRef={auditList.sentinelRef} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MOBILE ACCOUNT SHEET */}
      {showAccountSheet && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm md:hidden">
          <div className="animate-in slide-in-from-bottom flex max-h-[75vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl pb-safe">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="text-[13px] font-bold text-slate-900">Select Account</h3>
              </div>
              <button onClick={() => setShowAccountSheet(false)} className="rounded-full bg-slate-100 p-1.5 text-slate-500"><X size={14} /></button>
            </div>
            <div className={`flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-slate-50 ${hideScrollbar}`}>
              {!accounts.length && <p className="py-8 text-center text-[11px] font-medium text-slate-400">No accounts.</p>}
              {accounts.map(acc => {
                const selected = acc.id === selectedAccountId;
                const closed = isClosedAccount(acc);
                const gold = isGoldAccount(acc);
                return (
                  <button key={acc.id} onClick={() => { setSelectedAccountId(acc.id); setTxSearch(""); setShowAccountSheet(false); }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selected ? "bg-slate-900 border-slate-900 text-white" : closed ? "bg-white border-slate-200 opacity-60" : "bg-white border-slate-200"
                    }`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-mono text-[13px] font-black">{acc.accountNumber}</span>
                      {selected && <CheckCircle2 size={14} className={gold ? "text-[#F7E7CE]" : "text-white"} />}
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        {gold && <span className={`text-[8px] uppercase tracking-widest ${selected ? "text-[#F7E7CE]" : "text-amber-600"}`}>Gold SIP</span>}
                        {closed && <span className="ml-1 bg-slate-200 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded">Closed</span>}
                      </div>
                      <span className={`font-mono text-sm font-black ${selected ? "text-white" : "text-slate-900"}`}>
                        {gold ? formatGold(getAccountGoldBalance(acc)) : formatCurrency(getAccountAmountBalance(acc))}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {transactionModal && (
        <Modal title="Record Transaction" subtitle={selectedAccount?.accountNumber} onClose={() => !actionLoading && setTransactionModal(false)}>
          <form onSubmit={submitTransaction} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Month" required>
                <select value={transactionForm.month} onChange={e => setTransactionForm(c => ({...c, month: e.target.value}))} className="w-full h-9 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium outline-none transition focus:border-slate-900" disabled={actionLoading}>
                  <option value="" disabled>Select Month</option>
                  {Array.from({ length: getMonthLimit(selectedAccount) }, (_, i) => {
                    const month = `M${i + 1}`;
                    const exists = allTransactions.some(tx => tx.accountId === selectedAccount?.id && getTransactionMonth(tx) === month);
                    return <option key={month} value={month} disabled={exists}>{month}{exists ? " (Recorded)" : ""}</option>;
                  })}
                </select>
              </Field>
              <Field label="Date" required>
                <input type="date" value={transactionForm.date} onChange={e => setTransactionForm(c => ({...c, date: e.target.value}))} className="w-full h-9 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium outline-none transition focus:border-slate-900" disabled={actionLoading} />
              </Field>
              <Field label="Amount Paid" required>
                <input type="number" min="0.01" step="0.01" placeholder="0.00" value={transactionForm.amountPaid} onChange={e => setTransactionForm(c => ({...c, amountPaid: e.target.value}))} className="w-full h-9 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium outline-none transition focus:border-slate-900" disabled={actionLoading} />
              </Field>
              {!selectedIsGold ? (
                <Field label="Mode" required>
                  <select value={transactionForm.paymentMode} onChange={e => setTransactionForm(c => ({...c, paymentMode: e.target.value}))} className="w-full h-9 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium outline-none transition focus:border-slate-900" disabled={actionLoading}>
                    <option value="UPI">UPI</option>
                    <option value="CASH">CASH</option>
                    <option value="NEFT">NEFT</option>
                  </select>
                </Field>
              ) : (
                <Field label="Gold Price / g" required>
                  <input type="number" min="0.01" step="0.01" placeholder="0.00" value={transactionForm.goldPrice} onChange={e => setTransactionForm(c => ({...c, goldPrice: e.target.value}))} className="w-full h-9 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium outline-none transition focus:border-slate-900" disabled={actionLoading} />
                </Field>
              )}
              <Field label="Reference" required>
                <input type="text" placeholder="Txn Ref" value={transactionForm.transactionReference} onChange={e => setTransactionForm(c => ({...c, transactionReference: e.target.value}))} className="w-full h-9 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium outline-none transition focus:border-slate-900" disabled={actionLoading} />
              </Field>
              {selectedIsGold && (
                <Field label="Gold Est.">
                  <div className="w-full h-9 flex items-center rounded border border-transparent bg-amber-50 px-2 text-[11px] font-black font-mono text-amber-700">
                    {number(transactionForm.amountPaid) > 0 && number(transactionForm.goldPrice) > 0 ? formatGold(number(transactionForm.amountPaid) / number(transactionForm.goldPrice)) : "—"}
                  </div>
                </Field>
              )}
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 p-3 mt-4">
              <p className="text-[10px] font-black text-slate-900 mb-2">CRM Security Passcode</p>
              <input type="password" placeholder="Passcode required" value={passcode} onChange={e => setPasscode(e.target.value)} autoComplete="off" className="w-full h-9 rounded border border-slate-200 bg-white px-2 text-[11px] font-medium outline-none transition focus:border-slate-900" disabled={actionLoading} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTransactionModal(false)} disabled={actionLoading} className="rounded border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={actionLoading} className="flex items-center gap-1.5 rounded bg-slate-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50">
                {actionLoading && <Loader2 size={12} className="animate-spin" />} Confirm
              </button>
            </div>
          </form>
        </Modal>
      )}

      {closeModal && (
        <Modal title="Close Account" subtitle={selectedAccount?.accountNumber} onClose={() => !actionLoading && setCloseModal(false)}>
          <form onSubmit={confirmCloseAccount} className="space-y-4">
            <div className="rounded border border-rose-200 bg-rose-50 p-3">
              <p className="text-[11px] font-black text-rose-900">Close Account {selectedAccount?.accountNumber}?</p>
              <p className="mt-1 text-[10px] leading-relaxed text-rose-800">This sets the account to read-only.</p>
            </div>
            <Field label="Passcode" required>
              <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} className="w-full h-9 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" disabled={actionLoading} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCloseModal(false)} disabled={actionLoading} className="rounded border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">Cancel</button>
              <button type="submit" disabled={actionLoading} className="flex items-center gap-1.5 rounded bg-rose-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50">
                {actionLoading && <Loader2 size={12} className="animate-spin" />} Close
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   TABLE & CARD COMPONENTS
============================================================ */

function RegularTable({ transactions, account, onPrint }) {
  if (!account) return <EmptyState icon={<WalletCards size={20}/>} title="Select Account" text="Choose an account above." />;
  if (!transactions.length) return <EmptyState icon={<FileText size={20}/>} title="No Transactions" text="No records found." />;

  return (
    <table className="w-full border-collapse text-left whitespace-nowrap">
      <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_0_#e2e8f0]">
        <tr className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <th className="px-4 py-2 w-10">#</th>
          <th className="px-4 py-2">Date</th>
          <th className="px-4 py-2">Type</th>
          <th className="px-4 py-2">Receipt</th>
          <th className="px-4 py-2">Month</th>
          <th className="px-4 py-2 text-right">Amount</th>
          <th className="px-4 py-2">Mode</th>
          <th className="px-4 py-2 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {transactions.map((tx, idx) => {
          const type = getTransactionType(tx);
          const debit = type === "DEBIT" || type.includes("REVERSAL");
          return (
            <tr key={tx.id || idx} className="hover:bg-slate-50">
              <td className="px-4 py-2 text-[10px] font-bold text-slate-400">{String(idx + 1).padStart(2, "0")}</td>
              <td className="px-4 py-2 text-[10px] font-medium text-slate-600">{formatDateTime(getTransactionDate(tx))}</td>
              <td className="px-4 py-2"><TypeBadge type={type} debit={debit} /></td>
              <td className="px-4 py-2 font-mono text-[11px] font-black text-slate-900">{tx.receiptNumber || "—"}</td>
              <td className="px-4 py-2 font-mono text-[10px] font-black text-slate-600">{getTransactionMonth(tx)}</td>
              <td className="px-4 py-2 text-right font-mono text-[11px] font-black">{formatCurrency(getTransactionAmount(tx))}</td>
              <td className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">{getTransactionMode(tx)}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onPrint(tx)} className="h-6 w-6 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 transition"><Printer size={12}/></button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GoldTable({ transactions, account, onPrint }) {
  if (!account) return <EmptyState icon={<WalletCards size={20}/>} title="Select Account" text="Choose an account above." />;
  if (!transactions.length) return <EmptyState icon={<FileText size={20}/>} title="No Transactions" text="No records found." />;

  return (
    <table className="w-full border-collapse text-left whitespace-nowrap">
      <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_0_#e2e8f0]">
        <tr className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <th className="px-4 py-2 w-10">#</th>
          <th className="px-4 py-2">Date</th>
          <th className="px-4 py-2">Type</th>
          <th className="px-4 py-2">Receipt</th>
          <th className="px-4 py-2">Month</th>
          <th className="px-4 py-2 text-right">Amount</th>
          <th className="px-4 py-2 text-right">Rate</th>
          <th className="px-4 py-2 text-right">Gold</th>
          <th className="px-4 py-2 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {transactions.map((tx, idx) => {
          const type = getTransactionType(tx);
          const debit = type === "DEBIT" || type.includes("REVERSAL");
          return (
            <tr key={tx.id || idx} className="hover:bg-slate-50">
              <td className="px-4 py-2 text-[10px] font-bold text-slate-400">{String(idx + 1).padStart(2, "0")}</td>
              <td className="px-4 py-2 text-[10px] font-medium text-slate-600">{formatDateTime(getTransactionDate(tx))}</td>
              <td className="px-4 py-2"><TypeBadge type={type} debit={debit} /></td>
              <td className="px-4 py-2 font-mono text-[11px] font-black text-slate-900">{tx.receiptNumber || "—"}</td>
              <td className="px-4 py-2 font-mono text-[10px] font-black text-slate-600">{getTransactionMonth(tx)}</td>
              <td className="px-4 py-2 text-right font-mono text-[11px] font-black">{formatCurrency(getTransactionAmount(tx))}</td>
              <td className="px-4 py-2 text-right font-mono text-[10px] font-black text-amber-600">{tx.goldPrice ? formatCurrency(tx.goldPrice) : "—"}</td>
              <td className="px-4 py-2 text-right font-mono text-[11px] font-black text-amber-700">{getTransactionGold(tx) > 0 ? formatGold(getTransactionGold(tx)) : "—"}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onPrint(tx)} className="h-6 w-6 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 transition"><Printer size={12}/></button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MobileTxCard({ transaction, account, index, onPrint }) {
  const gold = isGoldAccount(account);
  const type = getTransactionType(transaction);
  const debit = type === "DEBIT" || type.includes("REVERSAL");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">#{String(index + 1).padStart(2, "0")}</span>
          <TypeBadge type={type} debit={debit} />
        </div>
        <span className="text-[9px] font-bold text-slate-400">{formatDateTime(getTransactionDate(transaction))}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Receipt / Month</p>
          <p className="text-[11px] font-mono font-black text-slate-900">{transaction.receiptNumber || "—"} <span className="text-slate-400">({getTransactionMonth(transaction)})</span></p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Amount</p>
          <p className="text-[11px] font-mono font-black text-slate-900">{formatCurrency(getTransactionAmount(transaction))}</p>
        </div>
        {gold && (
          <>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-amber-600/70">Rate</p>
              <p className="text-[11px] font-mono font-black text-amber-600">{transaction.goldPrice ? formatCurrency(transaction.goldPrice) : "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold uppercase tracking-widest text-amber-700/70">Gold</p>
              <p className="text-[11px] font-mono font-black text-amber-700">{getTransactionGold(transaction) > 0 ? formatGold(getTransactionGold(transaction)) : "—"}</p>
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
        <span className="text-[9px] font-medium text-slate-500 truncate max-w-[150px]">{transaction.transactionReference || "No Ref"}</span>
        <button onClick={() => onPrint(transaction)} className="p-1 text-slate-400 hover:text-slate-900"><Printer size={14}/></button>
      </div>
    </div>
  );
}

/* ============================================================
   UI COMPONENTS
============================================================ */

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${
      active ? "border-slate-200 bg-slate-50 text-slate-700" : "border-rose-200 bg-rose-50 text-rose-700"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-slate-500" : "bg-rose-500"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TypeBadge({ type, debit }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest border ${
      debit ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-700"
    }`}>
      {debit ? <ArrowUpRight size={9} /> : <ArrowDownLeft size={9} />}
      {type.replaceAll("_", " ")}
    </span>
  );
}

function MiniMetric({ label, value, color = "text-slate-900" }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-2">
      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 truncate font-mono text-[11px] font-black ${color}`}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, label, count }) {
  return (
    <button onClick={onClick} className={`relative h-9 flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
      active ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
    }`}>
      {label}
      {count > 0 && <span className={`rounded px-1 py-0.5 text-[8px] ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />}
    </button>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Modal({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-[2px]">
      <div className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-[13px] font-black text-slate-900">{title}</h2>
            {subtitle && <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X size={14} /></button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoadMore({ hasMore, shown, total, innerRef }) {
  if (!total) return null;
  return (
    <div ref={innerRef} className="flex min-h-[40px] items-center justify-center gap-2 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
      {hasMore ? <><Loader2 size={12} className="animate-spin text-slate-900" /> Loading...</> : `${shown} / ${total} loaded`}
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 shadow-sm">{icon}</div>
      <p className="text-[11px] font-black text-slate-900">{title}</p>
      <p className="mt-1 max-w-xs text-[10px] font-medium text-slate-500">{text}</p>
    </div>
  );
}