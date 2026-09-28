import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  Eye,
  FileText,
  History,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
  Send,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
  AlertCircle,
  Loader2,
  Check,
  Filter,
  CreditCard,
  Layers,
  Sparkles,
  Scale,
  Gem,
  Lock,
} from "lucide-react";

import useInvestmentInvestorProfile from "../hooks/useInvestmentInvestorProfile";
import { useCrmAuth } from "../../../context/CrmAuthContext";
import { useTenant } from "../../../context/TenantContext";

import { createInvestmentCommunication } from "../services/investmentCommunication";
import { sendInvestmentAccountOpeningEmail } from "../services/investmentEmail";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const TABS = {
  OVERVIEW: "overview",
  TRANSACTIONS: "transactions",
  COMMUNICATIONS: "communications",
  HISTORY: "history",
};

const TAB_CONFIG = [
  { id: TABS.OVERVIEW, label: "Overview & Portfolios", icon: UserRound, desc: "Personal coordinates, aggregated funds & accounts" },
  { id: TABS.TRANSACTIONS, label: "Account Ledgers", icon: Receipt, desc: "Account-specific receipts, installments & deposits" },
  { id: TABS.COMMUNICATIONS, label: "Dispatched Notices", icon: MessageCircle, desc: "Email notices, templates & delivery telemetry" },
  { id: TABS.HISTORY, label: "Audit Timeline", icon: History, desc: "Immutable security & transaction event log" },
];

const MESSAGE_TYPES = [
  { value: "ACCOUNT_OPENING", label: "Account Opening Confirmation" },
  { value: "PAYMENT_RECEIPT", label: "Payment Receipt Notice" },
  { value: "INVESTMENT_STATEMENT", label: "Investment Statement Summary" },
  { value: "ACCOUNT_STATEMENT", label: "Account Audit Statement" },
  { value: "CUSTOM", label: "Custom Executive Communication" },
];

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatGold(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} g`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    if (typeof value === "string") {
      const dateOnly = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        const [year, month, day] = dateOnly.split("-").map(Number);
        return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
    if (value?.toDate) {
      return value.toDate().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    if (value instanceof Date) {
      return value.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    let date;
    if (value?.toDate) date = value.toDate();
    else if (value instanceof Date) date = value;
    else date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getAccountSchemeName(account) {
  return (
    account?.schemeSnapshot?.schemeName ||
    account?.schemeName ||
    account?.scheme?.schemeName ||
    "Investment Scheme"
  );
}

function isGoldAccount(account) {
  const type = upper(
    account?.schemeSnapshot?.schemeType || account?.schemeType
  );
  const unit = upper(
    account?.contribution?.unit || account?.contributionUnit
  );
  return (
    type.includes("GOLD") ||
    unit === "GOLD_GRAMS" ||
    Number(account?.totalGoldCredited || 0) > 0 ||
    Number(account?.openingBalanceGoldGrams || 0) > 0
  );
}

function getTransactionAmount(transaction) {
  return (
    transaction?.amountPaid ??
    transaction?.amount ??
    transaction?.transactionAmount ??
    0
  );
}

function getTransactionGold(transaction) {
  return transaction?.goldGrams ?? transaction?.goldQuantity ?? 0;
}

function statusBadge(status) {
  const value = upper(status);
  if (value === "ACTIVE" || value === "SENT") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider border border-emerald-200 bg-emerald-50 text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {status}
      </span>
    );
  }
  if (value === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider border border-rose-200 bg-rose-50 text-rose-800">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider border border-slate-200 bg-slate-100 text-slate-600">
      {status || "Archived"}
    </span>
  );
}

export default function InvestmentInvestorProfilePage() {
  const navigate = useNavigate();
  const { investorId } = useParams();
  const { tenant } = useTenant();
  const { hasModuleAccess } = useCrmAuth();

  const canWrite = Boolean(hasModuleAccess?.("investments", "write"));

  const {
    investor,
    accounts,
    transactions,
    transactionsByAccount,
    auditLogs,
    communications,
    summary,
    loading,
    error,
  } = useInvestmentInvestorProfile(investorId);

  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [showTabDrawer, setShowTabDrawer] = useState(false);
  const [selectedTxAccountId, setSelectedTxAccountId] = useState("");

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [communicationChannel, setCommunicationChannel] = useState("EMAIL");
  const [messageType, setMessageType] = useState("ACCOUNT_OPENING");
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sendingCommunication, setSendingCommunication] = useState(false);
  const [communicationError, setCommunicationError] = useState("");
  const [communicationSuccess, setCommunicationSuccess] = useState("");

  useEffect(() => {
    if (accounts?.length > 0 && !selectedTxAccountId) {
      setSelectedTxAccountId(accounts[0].id);
    }
  }, [accounts, selectedTxAccountId]);

  const selectedTxAccount = useMemo(
    () => accounts.find((acc) => acc.id === selectedTxAccountId) || accounts[0] || null,
    [accounts, selectedTxAccountId]
  );

  const selectedAccount = useMemo(
    () => accounts.find((acc) => acc.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const investorName = investor?.fullName || investor?.name || "Investor";
  const investorEmail = investor?.email || "";
  const investorMobile = investor?.mobileNumber || investor?.mobile || "";

  const displayedTransactions = useMemo(() => {
    if (!selectedTxAccount) return [];
    return (
      transactionsByAccount?.[selectedTxAccount.id] ||
      transactions.filter((tx) => tx.accountId === selectedTxAccount.id)
    );
  }, [selectedTxAccount, transactions, transactionsByAccount]);

  const currentTabObj = useMemo(
    () => TAB_CONFIG.find((t) => t.id === activeTab) || TAB_CONFIG[0],
    [activeTab]
  );

  function openCommunication(accountId = "") {
    setCommunicationError("");
    setCommunicationSuccess("");
    const defaultAcc =
      accounts.find((item) => item.id === accountId) || accounts[0] || null;
    setSelectedAccountId(defaultAcc?.id || "");
    setCommunicationChannel("EMAIL");
    setMessageType("ACCOUNT_OPENING");
    setCustomSubject("");
    setCustomMessage("");
    setShowCommunicationModal(true);
  }

  function closeCommunication() {
    if (sendingCommunication) return;
    setShowCommunicationModal(false);
    setCommunicationError("");
    setCommunicationSuccess("");
  }

  async function handleSendCommunication() {
    if (sendingCommunication) return;
    setCommunicationError("");
    setCommunicationSuccess("");

    if (!canWrite) {
      setCommunicationError("You do not have write access for investor communications.");
      return;
    }
    if (!selectedAccountId || !selectedAccount) {
      setCommunicationError("Please associate an active investment account with this dispatch.");
      return;
    }
    if (communicationChannel === "EMAIL" && !investorEmail) {
      setCommunicationError("This investor has no email address configured on file.");
      return;
    }
    if (messageType === "CUSTOM" && !clean(customMessage)) {
      setCommunicationError("Please write a custom dispatch message.");
      return;
    }

    setSendingCommunication(true);

    try {
      const accountNumber =
        selectedAccount.accountNumber || selectedAccount.accountNo || "";
      const schemeName = getAccountSchemeName(selectedAccount);
      let providerResult = null;

      if (communicationChannel === "EMAIL") {
        if (messageType !== "ACCOUNT_OPENING") {
          throw new Error(
            "Only Account Opening confirmation delivery is currently active. Statement and Receipt PDF delivery will connect in an upcoming update."
          );
        }

        providerResult = await sendInvestmentAccountOpeningEmail({
          crmSlug: tenant?.crm_slug,
          recipientEmail: investorEmail,
          investorName,
          accountNumber,
          schemeName,
          contributionValue: selectedAccount.contribution?.value || 0,
          startDate: selectedAccount.startDate || "",
          language: investor?.emailPreferences?.language || "EN",
          clientName: tenant?.business_name || "",
          clientLogoUrl: tenant?.logo_url || "",
          clientPhone: tenant?.phone || tenant?.phone_number || "",
          clientEmail: tenant?.email || "",
          clientWebsite: tenant?.website || "",
          hasInitialTransaction: Boolean(
            transactionsByAccount?.[selectedAccount.id]?.length
          ),
          transactionAmount: transactionsByAccount?.[selectedAccount.id]?.[0]
            ? getTransactionAmount(transactionsByAccount[selectedAccount.id][0])
            : null,
          receiptNumber:
            selectedAccount.initialReceiptNumber ||
            selectedAccount.firstReceiptNumber ||
            "",
          loginUrl: `${window.location.origin}/crm`,
          attachments: [],
        });
      } else {
        throw new Error(`${communicationChannel} channel delivery is not enabled.`);
      }

      const providerMessageId =
        providerResult?.messageId || providerResult?.id || providerResult?.data?.id || null;
      const recipient = communicationChannel === "EMAIL" ? investorEmail : investorMobile;

      await createInvestmentCommunication({
        investorId,
        accountId: selectedAccount.id,
        channel: communicationChannel,
        subject:
          messageType === "CUSTOM"
            ? customSubject
            : MESSAGE_TYPES.find((m) => m.value === messageType)?.label || "Investment Notice",
        templateId: messageType,
        messageReference: providerMessageId,
        status: "SENT",
        providerMessageId,
        recipient,
        metadata: {
          messageType,
          accountNumber,
          schemeId: selectedAccount.schemeId || null,
          schemeName,
          customMessage: messageType === "CUSTOM" ? customMessage : null,
        },
      });

      setCommunicationSuccess("Communication logged and dispatched successfully.");
      setTimeout(() => {
        setShowCommunicationModal(false);
        setActiveTab(TABS.COMMUNICATIONS);
        setCommunicationSuccess("");
      }, 700);
    } catch (err) {
      console.error("Communication dispatch failed:", err);
      setCommunicationError(err?.message || "Failed to dispatch communication.");
    } finally {
      setSendingCommunication(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
          <Loader2 size={16} className="animate-spin text-slate-700" />
          <span>Synchronizing investor portfolio...</span>
        </div>
      </div>
    );
  }

  if (error || !investor) {
    return (
      <div className="p-6 bg-[#F8FAFC] h-full flex flex-col items-center justify-center text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
          <AlertCircle size={20} />
        </div>
        <h3 className="text-xs font-bold text-slate-900 uppercase font-mono">
          {error ? "Profile Load Error" : "Investor Record Missing"}
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          {error?.message || "The requested client portfolio was not located in this tenant boundary."}
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
        >
          <ArrowLeft size={13} />
          <span>Return to Investors</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      
      {/* -------------------------------------------------------------
          BACKGROUND WHATSAPP-STYLE JEWELRY / SECURITY DOODLES
      ------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        <div className="absolute top-12 left-8 text-slate-900/[0.035] -rotate-12">
          <Scale size={130} strokeWidth={1.2} />
        </div>
        <div className="absolute top-1/4 right-12 text-slate-900/[0.03] rotate-12">
          <Gem size={110} strokeWidth={1.2} />
        </div>
        <div className="absolute bottom-20 left-16 text-slate-900/[0.035] rotate-45">
          <Lock size={120} strokeWidth={1.2} />
        </div>
        <div className="absolute bottom-10 right-20 text-slate-900/[0.03] -rotate-12">
          <Wallet size={125} strokeWidth={1.2} />
        </div>
        <svg
          className="absolute top-1/2 left-1/3 h-24 w-24 text-slate-900/[0.025] -rotate-45"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="4 4"
        >
          <circle cx="50" cy="50" r="40" />
          <path d="M50 30v40M30 50h40" />
        </svg>
      </div>

      {/* 1. Header Toolbar */}
      <header className="shrink-0 h-14 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
            title="Back to Investors"
          >
            <ArrowLeft size={13} />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white font-mono shadow-2xs">
              {investorName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight uppercase font-mono truncate">
                  {investorName}
                </h1>
                {statusBadge(investor.status)}
              </div>
              <p className="text-[10.5px] font-mono text-slate-400 mt-0.5 truncate">
                {investorMobile} {investorEmail && `· ${investorEmail}`} {investor.city && `· ${investor.city}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canWrite && (
            <button
              type="button"
              onClick={() => openCommunication("")}
              className="h-7.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98] transition-all shadow-2xs shrink-0 cursor-pointer"
            >
              <Send size={12} />
              <span>Send Notice</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Top Dropdown Bar (Triggers Bottom Sheet Drawer) */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 sm:px-6 py-2 flex items-center justify-between gap-3 z-10">
        <button
          type="button"
          onClick={() => setShowTabDrawer(true)}
          className="h-8 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 px-3 text-xs font-mono text-slate-800 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
        >
          <currentTabObj.icon size={13} className="text-slate-700" />
          <span className="font-bold uppercase tracking-wider">{currentTabObj.label}</span>
          <ChevronDown size={13} className="text-slate-400 ml-1" />
        </button>

        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
          TAP SELECTION TO SWITCH VIEWS FROM BOTTOM DRAWER
        </span>
      </div>

      {/* 3. Main Workspace Container */}
      <main className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${noScroll} z-10`}>
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* =========================================================
              TAB 1: PORTFOLIO & CLIENT OVERVIEW
          ========================================================= */}
          {activeTab === TABS.OVERVIEW && (
            <div className="space-y-4">
              {/* Financial Ticker Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs font-mono hover:border-slate-300 transition-all">
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">
                    Accounts Held
                  </span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">
                    {summary?.totalAccounts || 0}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({summary?.activeAccounts || 0} active)
                    </span>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs font-mono hover:border-slate-300 transition-all">
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">
                    Total Deposited
                  </span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">
                    {formatCurrency(summary?.totalAmount || 0)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs font-mono hover:border-slate-300 transition-all">
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">
                    Gold Accumulated
                  </span>
                  <span className="text-base font-bold text-amber-700 mt-0.5 block">
                    {formatGold(summary?.totalGold || 0)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs font-mono hover:border-slate-300 transition-all">
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">
                    Total Transactions
                  </span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">
                    {transactions.length}
                  </span>
                </div>
              </div>

              {/* Personal Details Matrix */}
              <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  <span>Client Identification Record</span>
                  <span>TENANT #{tenant?.id || "001"}</span>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Legal Name</span>
                    <span className="font-semibold text-slate-900 font-sans">{investorName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Primary Mobile</span>
                    <span className="font-semibold text-slate-900">{investorMobile || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Email Address</span>
                    <span className="font-semibold text-slate-900 truncate block">{investorEmail || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Date of Birth</span>
                    <span className="font-semibold text-slate-900">{formatDate(investor?.dateOfBirth)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Gender</span>
                    <span className="font-semibold text-slate-900">{investor?.gender || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">City</span>
                    <span className="font-semibold text-slate-900 font-sans">{investor?.city || "—"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block uppercase">Mailing Address</span>
                    <span className="font-semibold text-slate-900 font-sans truncate block">{investor?.address || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Investment Accounts List */}
              <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  <span>Investment Accounts & Ledgers ({accounts.length})</span>
                  <span>TAP TO ISOLATE PASSBOOK</span>
                </div>

                {accounts.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-400">
                    No active accounts registered for this profile.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {accounts.map((acc) => {
                      const gold = isGoldAccount(acc);
                      const accTxs = transactionsByAccount?.[acc.id] || [];

                      return (
                        <div
                          key={acc.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {acc.accountNumber || acc.id}
                              </span>
                              {statusBadge(acc.status)}
                              {gold && (
                                <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-800">
                                  GOLD SIP
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {getAccountSchemeName(acc)} · Started {formatDate(acc.startDate)}
                            </p>
                          </div>

                          <div className="flex items-center gap-6 font-mono text-xs">
                            <div className="text-right">
                              <span className="text-[9.5px] uppercase text-slate-400 block">Total Paid</span>
                              <span className="font-bold text-slate-900">{formatCurrency(acc.totalPaid || 0)}</span>
                            </div>

                            {gold && (
                              <div className="text-right">
                                <span className="text-[9.5px] uppercase text-slate-400 block">Gold Accrued</span>
                                <span className="font-bold text-amber-700">{formatGold(acc.totalGoldCredited || 0)}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTxAccountId(acc.id);
                                  setActiveTab(TABS.TRANSACTIONS);
                                }}
                                className="h-7 px-2.5 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
                              >
                                View Ledger ({accTxs.length})
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: ACCOUNT-SPECIFIC TRANSACTION LEDGER
          ========================================================= */}
          {activeTab === TABS.TRANSACTIONS && (
            <div className="space-y-3">
              {/* Account Selection Ribbon */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1">
                    <CreditCard size={11} /> Selected Investment Account:
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {displayedTransactions.length} Total Transactions
                  </span>
                </div>

                {accounts.length === 0 ? (
                  <p className="text-xs text-slate-400 font-mono italic">
                    No accounts available.
                  </p>
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                    {accounts.map((acc) => {
                      const isSelected = selectedTxAccount?.id === acc.id;
                      const accCount = (transactionsByAccount?.[acc.id] || []).length;

                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setSelectedTxAccountId(acc.id)}
                          className={`p-2.5 rounded-lg border text-left font-mono transition-all shrink-0 min-w-[200px] cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">
                              {acc.accountNumber || acc.id}
                            </span>
                            <span
                              className={`text-[9px] px-1 rounded uppercase ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {accCount} txs
                            </span>
                          </div>
                          <p
                            className={`text-[10px] truncate mt-0.5 ${
                              isSelected ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {getAccountSchemeName(acc)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Account Metadata Strip */}
                {selectedTxAccount && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10.5px]">SCHEME:</span>
                      <span className="font-semibold text-slate-900">
                        {getAccountSchemeName(selectedTxAccount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-slate-400 text-[10.5px] mr-1.5">
                          TOTAL PAID:
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(selectedTxAccount.totalPaid || 0)}
                        </span>
                      </div>

                      {isGoldAccount(selectedTxAccount) && (
                        <div>
                          <span className="text-slate-400 text-[10.5px] mr-1.5">
                            GOLD ACCRUED:
                          </span>
                          <span className="font-bold text-amber-700">
                            {formatGold(selectedTxAccount.totalGoldCredited || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions Ledger View */}
              <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                {displayedTransactions.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-slate-400">
                    No transactions recorded for this account passbook.
                  </div>
                ) : (
                  <>
                    {/* DESKTOP TABLE VIEW (lg: and up) */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Receipt & Type</th>
                            <th className="px-4 py-2 text-right">Amount (₹)</th>
                            <th className="px-4 py-2 text-right">Gold (g)</th>
                            <th className="px-4 py-2">Payment Mode</th>
                            <th className="px-4 py-2">Reference</th>
                            <th className="px-4 py-2 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedTransactions.map((tx) => (
                            <tr
                              key={tx.id}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="px-4 py-2.5 whitespace-nowrap text-slate-900 font-semibold">
                                {formatDate(tx.transactionDate || tx.date)}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold uppercase mr-1.5">
                                  {tx.transactionType || tx.type || "CREDIT"}
                                </span>
                                <span className="text-slate-500 text-[11px] font-semibold">
                                  {tx.receiptNumber ||
                                    tx.initialReceiptNumber ||
                                    "—"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-right font-bold text-slate-900">
                                {formatCurrency(getTransactionAmount(tx))}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-right font-bold text-amber-700">
                                {getTransactionGold(tx)
                                  ? formatGold(getTransactionGold(tx))
                                  : "—"}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                                {tx.paymentMode || "—"}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 text-[11px] truncate max-w-[140px]">
                                {tx.transactionReference ||
                                  tx.reference ||
                                  "—"}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-right text-[10px] text-slate-400">
                                {formatDateTime(tx.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* MOBILE & TABLET CARD VIEW (< lg) */}
                    <div className="lg:hidden divide-y divide-slate-100">
                      {displayedTransactions.map((tx) => (
                        <div key={tx.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase text-slate-700">
                                  {tx.transactionType || tx.type || "CREDIT"}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-900">
                                  {tx.receiptNumber ||
                                    tx.initialReceiptNumber ||
                                    "No Receipt"}
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Date: {formatDate(tx.transactionDate || tx.date)} ·{" "}
                                {formatDateTime(tx.createdAt)}
                              </p>
                            </div>

                            <div className="text-right font-mono">
                              <span className="text-xs font-bold text-slate-900 block">
                                {formatCurrency(getTransactionAmount(tx))}
                              </span>
                              {getTransactionGold(tx) > 0 && (
                                <span className="text-[11px] font-bold text-amber-700 block">
                                  {formatGold(getTransactionGold(tx))}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10.5px] font-mono pt-1.5 border-t border-slate-100 text-slate-500">
                            <span>
                              Mode:{" "}
                              <strong className="text-slate-700">
                                {tx.paymentMode || "—"}
                              </strong>
                            </span>
                            <span className="truncate max-w-[180px]">
                              Ref: {tx.transactionReference || tx.reference || "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: DISPATCHED COMMUNICATIONS LOG
          ========================================================= */}
          {activeTab === TABS.COMMUNICATIONS && (
            <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                <span>Dispatched Messages & Templates ({communications.length})</span>
                <span>CHANNEL: EMAIL</span>
              </div>

              {communications.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-slate-400">
                  No automated or manual communications logged for this investor.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {communications.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                          {c.channel === "EMAIL" ? (
                            <Mail size={14} />
                          ) : (
                            <MessageCircle size={14} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {c.subject || "Investment Notice"}
                            </h4>
                            {statusBadge(c.status)}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            To: {c.recipient} · Ref:{" "}
                            {c.messageReference || c.providerMessageId || "DIRECT"}
                          </p>
                          {c.metadata?.accountNumber && (
                            <span className="inline-block mt-1 font-mono text-[9.5px] rounded bg-slate-100 px-1.5 py-0.2 text-slate-600">
                              Account: {c.metadata.accountNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono text-[10.5px] text-slate-400 shrink-0">
                        {formatDateTime(c.sentAt || c.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 4: DETAILED AUDIT HISTORY
          ========================================================= */}
          {activeTab === TABS.HISTORY && (
            <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                <span>Cryptographic & Operational Audit Trail ({auditLogs.length})</span>
                <span>IMMUTABLE SYSTEM EVENTS</span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-slate-400">
                  No historical audit entries found for this investor.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 font-mono text-xs">
                  {auditLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {log.action || log.event || "AUDIT_EVENT"}
                          </span>
                          {log.status && statusBadge(log.status)}
                        </div>
                        <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                          {log.description || "System transaction record committed."}
                        </p>
                      </div>

                      <div className="text-right text-[10px] text-slate-400 shrink-0">
                        {formatDateTime(log.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          DRAWER PORTAL: NAVIGATION BOTTOM SHEET
      ========================================================================= */}
      {showTabDrawer &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4"
            onClick={() => setShowTabDrawer(false)}
          >
            <div
              className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Navigate Workspace View
                </span>
                <button
                  type="button"
                  onClick={() => setShowTabDrawer(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5">
                {TAB_CONFIG.map((t) => {
                  const Icon = t.icon;
                  const isSelected = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(t.id);
                        setShowTabDrawer(false);
                      }}
                      className={`w-full p-3 rounded-lg border text-left flex items-start gap-3 transition-all cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-2xs font-semibold"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold font-mono uppercase">{t.label}</p>
                        <p className={`text-[10px] mt-0.5 leading-snug ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}>
                          {t.desc}
                        </p>
                      </div>
                      {isSelected && <Check size={14} className="text-white mt-1 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =========================================================================
          MODAL PORTAL: SEND COMMUNICATION DIALOG
      ========================================================================= */}
      {showCommunicationModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={closeCommunication}
          >
            <div
              className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-900">
                    Dispatch Investor Notice
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Target: {investorName} ({investorEmail || "No Email"})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCommunication}
                  disabled={sendingCommunication}
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className={`min-h-0 flex-1 overflow-y-auto p-4 space-y-3.5 ${noScroll}`}>
                {communicationError && (
                  <div className="p-2.5 rounded-md border border-rose-200 bg-rose-50 text-xs font-mono font-medium text-rose-700">
                    {communicationError}
                  </div>
                )}
                {communicationSuccess && (
                  <div className="p-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs font-mono font-medium text-emerald-800">
                    {communicationSuccess}
                  </div>
                )}

                {/* Target Account Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                    Associated Account *
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    disabled={sendingCommunication}
                    className="w-full h-8.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white font-mono"
                  >
                    <option value="">Select an account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber || acc.id} — {getAccountSchemeName(acc)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Communication Channel */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                    Channel Rail
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCommunicationChannel("EMAIL")}
                      className={`h-8 rounded-md border text-xs font-mono flex items-center justify-between px-2.5 hover:border-slate-300 transition-all ${
                        communicationChannel === "EMAIL"
                          ? "border-slate-900 bg-white font-bold text-slate-900 shadow-2xs"
                          : "border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      <span className="flex items-center gap-1.5"><Mail size={12} /> Email</span>
                      {communicationChannel === "EMAIL" && <Check size={11} />}
                    </button>
                    <button
                      type="button"
                      disabled
                      className="h-8 rounded-md border border-slate-200 bg-slate-100 text-xs font-mono text-slate-400 flex items-center justify-between px-2.5 cursor-not-allowed opacity-60"
                    >
                      <span className="flex items-center gap-1.5"><MessageCircle size={12} /> WhatsApp (Soon)</span>
                    </button>
                  </div>
                </div>

                {/* Message Template Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                    Notice Template
                  </label>
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value)}
                    disabled={sendingCommunication}
                    className="w-full h-8.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  >
                    {MESSAGE_TYPES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Body if applicable */}
                {messageType === "CUSTOM" && (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Custom Subject
                      </label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Subject title..."
                        className="w-full h-8 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Body Content
                      </label>
                      <textarea
                        rows={4}
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Type message content..."
                        className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                <button
                  type="button"
                  onClick={closeCommunication}
                  disabled={sendingCommunication}
                  className="h-7.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSendCommunication}
                  disabled={sendingCommunication || !selectedAccountId || !canWrite}
                  className="h-7.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-medium text-white hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  {sendingCommunication ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      <span>Dispatch Notice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}