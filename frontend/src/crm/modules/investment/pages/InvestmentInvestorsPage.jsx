import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CreditCard,
  Download,
  Edit3,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Power,
  Search,
  UserRound,
  Wallet,
  X,
  FileText,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Check,
  Filter,
  Sparkles,
  Lock,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { useInvestmentInvestors } from "../hooks/useInvestmentInvestors";
import { useInvestmentAccountsForInvestors } from "../hooks/useInvestmentAccountsForInvestors";
import { useInvestmentSearch } from "../hooks/useInvestmentSearch";
import { useInvestmentSchemes } from "../hooks/useInvestmentSchemes";
import {
  updateInvestmentInvestor,
  updateInvestmentInvestorStatus,
  findInvestmentInvestorByMobile,
} from "../services/investmentInvestors";
import { createInvestmentAccount } from "../services/investmentAccounts";
import { createInvestmentAuditLog } from "../services/investmentAudit";
import { getCrmFirestore } from "../../../firebase";
import { useTenant } from "../../../context/TenantContext";
import { createInvestmentCommunication } from "../services/investmentCommunication";
import { sendInvestmentAccountOpeningEmail } from "../services/investmentEmail";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

// ============================================================
// CONSTANTS & HELPERS (100% PRESERVED)
// ============================================================
const INITIAL_FORM = {
  fullName: "",
  mobileNumber: "",
  alternateMobileNumber: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  city: "",
  pincode: "",
  emailPreferences: {
    enabled: false,
    language: "EN",
  },
};

const INITIAL_ACCOUNT = {
  schemeId: "",
  contributionValue: "",
  startDate: "",
  previousAccountId: "",
  minimumRestrictionEnabled: true,
  addFirstTransaction: false,
  transactionMonth: "M1",
  transactionDate: "",
  transactionType: "CREDIT",
  transactionCategory: "INITIAL",
  transactionAmount: "",
  transactionGoldPrice: "",
  paymentMode: "",
  transactionReference: "",
  transactionPasscode: "",
};

function clean(value) {
  return String(value ?? "").trim();
}
function normalizeMobile(value) {
  return clean(value).replace(/\D/g, "");
}
function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
function formatGold(value) {
  return `${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} g`;
}
function isClosedAccount(account) {
  return String(account?.status || "ACTIVE").toUpperCase() === "CLOSED";
}
function isActiveAccount(account) {
  return !isClosedAccount(account);
}

function isGoldScheme(scheme) {
  const type = String(scheme?.schemeType || "").toUpperCase();
  const name = String(scheme?.schemeName || "").toUpperCase();
  const unit = String(scheme?.installmentConfig?.unit || "").toUpperCase();
  return (
    type.includes("GOLD") || name.includes("GOLD SIP") || unit === "GOLD_GRAMS"
  );
}

function isGoldAccount(account) {
  const type = String(account?.schemeSnapshot?.schemeType || "").toUpperCase();
  const unit = String(account?.contribution?.unit || "").toUpperCase();
  return (
    type.includes("GOLD") ||
    unit === "GOLD_GRAMS" ||
    Number(account?.totalGoldCredited || 0) > 0 ||
    Number(account?.openingBalanceGoldGrams || 0) > 0
  );
}

function getSchemeMinimum(scheme) {
  if (!scheme) return 0;
  if (isGoldScheme(scheme))
    return Number(
      scheme?.installmentConfig?.minimumGrams ?? scheme?.minimumGrams ?? 0
    );
  return Number(
    scheme?.installmentConfig?.amount ??
      scheme?.minimumAmount ??
      scheme?.monthlyAmount ??
      0
  );
}

function getSchemeMinimumLabel(scheme) {
  if (!scheme) return "";
  const minimum = getSchemeMinimum(scheme);
  return isGoldScheme(scheme) ? formatGold(minimum) : formatCurrency(minimum);
}

function getSchemeDuration(scheme) {
  const duration = Number(scheme?.durationMonths || 0);
  return Number.isInteger(duration) && duration > 0 ? duration : 0;
}

function getPaymentModes() {
  return [
    { value: "CASH", label: "Cash" },
    { value: "UPI", label: "UPI" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "CARD", label: "Card" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "OTHER", label: "Other" },
  ];
}

function previewAccountNumber(scheme) {
  if (!scheme) return "";
  const prefix = clean(
    scheme?.accountNumberConfig?.prefix ||
      scheme?.accountNumberConfig?.theme ||
      ""
  ).toUpperCase();
  if (!prefix) return "";
  const padding = Number(scheme?.accountNumberConfig?.padding ?? 6);
  const safePadding = Number.isInteger(padding) && padding > 0 ? padding : 6;
  const seq = Number(
    scheme?.nextAccountNumber ?? scheme?.accountNumberConfig?.nextSequence ?? 1
  );
  const nextNumber = Number.isInteger(seq) && seq > 0 ? seq : 1;
  return `${prefix}-${String(nextNumber).padStart(safePadding, "0")}`;
}

function getAccountAmountBalance(account) {
  return (
    Number(account?.openingBalanceAmount || 0) +
    Number(account?.totalPaid || 0)
  );
}
function getAccountGoldBalance(account) {
  return (
    Number(account?.openingBalanceGoldGrams || 0) +
    Number(account?.totalGoldCredited || 0)
  );
}

function getInitialTransactionPreview({
  selectedScheme,
  accountForm,
  transferCalculation,
  accountMode,
}) {
  const gold = isGoldScheme(selectedScheme);
  const rows = [];
  let runningAmount = 0;
  let runningGold = 0;

  if (
    accountMode === "CARRY_FORWARD" &&
    transferCalculation?.resultValue != null
  ) {
    if (transferCalculation.resultUnit === "GOLD_GRAMS")
      runningGold = Number(transferCalculation.resultValue) || 0;
    else runningAmount = Number(transferCalculation.resultValue) || 0;

    rows.push({
      id: "transfer",
      receiptNumber: "Generated on save",
      type: "Transfer",
      goldPrice: transferCalculation.goldPrice || null,
      amountPaid: transferCalculation.interScheme
        ? transferCalculation.sourceAmount ??
          transferCalculation.sourceValue ??
          0
        : gold
        ? 0
        : runningAmount,
      goldGrams: runningGold,
      balance: gold ? runningGold : runningAmount,
    });
  }

  if (accountForm.addFirstTransaction) {
    const amountPaid = Number(accountForm.transactionAmount);
    if (Number.isFinite(amountPaid) && amountPaid > 0) {
      if (gold) {
        const goldPrice = Number(accountForm.transactionGoldPrice);
        const goldGrams =
          Number.isFinite(goldPrice) && goldPrice > 0
            ? amountPaid / goldPrice
            : 0;
        runningGold += goldGrams;
        rows.push({
          id: "initial",
          receiptNumber: "Generated on save",
          type: "Credit",
          goldPrice: goldPrice > 0 ? goldPrice : null,
          amountPaid,
          goldGrams,
          balance: runningGold,
        });
      } else {
        runningAmount += amountPaid;
        rows.push({
          id: "initial",
          receiptNumber: "Generated on save",
          type: "Credit",
          goldPrice: null,
          amountPaid,
          goldGrams: 0,
          balance: runningAmount,
        });
      }
    }
  }
  return { rows, totalAmount: runningAmount, totalGold: runningGold };
}

function calculateInvestorSummary(investorId, accounts) {
  const investorAccounts = accounts.filter(
    (account) => account.investorId === investorId
  );
  const activeAccounts = investorAccounts.filter(isActiveAccount);
  let totalAmount = 0,
    totalGold = 0,
    hasAmountAccount = false,
    hasGoldAccount = false;

  activeAccounts.forEach((account) => {
    if (isGoldAccount(account)) {
      hasGoldAccount = true;
      totalGold += getAccountGoldBalance(account);
    } else {
      hasAmountAccount = true;
      totalAmount += getAccountAmountBalance(account);
    }
  });
  return {
    accounts: investorAccounts,
    activeAccounts,
    totalAmount,
    totalGold,
    hasAmountAccount,
    hasGoldAccount,
  };
}

// ============================================================
// COMPACT FORM FIELDS
// ============================================================
function FormInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  disabled = false,
  prefix = "",
}) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70 transition-all focus-within:border-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/5 shadow-2xs disabled:opacity-60">
        {prefix && (
          <span className="flex items-center border-r border-slate-200 bg-slate-100/70 px-2.5 text-[11px] font-mono font-bold text-slate-600">
            {prefix}
          </span>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>
    </div>
  );
}

function FormSelect({
  label,
  name,
  value,
  onChange,
  children,
  required = false,
  disabled = false,
}) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 pr-7 text-xs font-semibold text-slate-900 outline-none transition-all focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900/5 shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {children}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const active = String(status || "ACTIVE").toUpperCase() === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border ${
        active
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function InvestmentInvestorsPage() {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  // Wizard state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [wizardSection, setWizardSection] = useState(1);
  const [checkMobile, setCheckMobile] = useState("");
  const [existingInvestor, setExistingInvestor] = useState(null);
  const [existingAccounts, setExistingAccounts] = useState([]);
  const [selectedPreviousAccountId, setSelectedPreviousAccountId] =
    useState("");
  const [transferGoldPrice, setTransferGoldPrice] = useState("");
  const [accountMode, setAccountMode] = useState(null);
  const [transferConfirmed, setTransferConfirmed] = useState(false);

  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [accountForm, setAccountForm] = useState({ ...INITIAL_ACCOUNT });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("ALL");
  const [showTabDrawer, setShowTabDrawer] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [sidebarInvestor, setSidebarInvestor] = useState(null);

  // Hooks
  const {
    investors,
    loading,
    error,
    currentPage,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
  } = useInvestmentInvestors();

  const {
    results: searchResults,
    loading: searchLoading,
    error: searchError,
  } = useInvestmentSearch(search);

  const {
    schemes,
    loading: schemesLoading,
    error: schemesError,
    canWrite,
  } = useInvestmentSchemes();

  const displayedInvestors = search.trim() ? searchResults : investors;
  const investorIds = useMemo(
    () => displayedInvestors.map((i) => i.id),
    [displayedInvestors]
  );

  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
  } = useInvestmentAccountsForInvestors(investorIds);

  const activeSchemes = useMemo(
    () =>
      schemes.filter(
        (s) => String(s.status || "").toUpperCase() === "ACTIVE"
      ),
    [schemes]
  );
  const selectedScheme = useMemo(
    () =>
      activeSchemes.find((s) => s.id === accountForm.schemeId) || null,
    [activeSchemes, accountForm.schemeId]
  );
  const selectedSchemeIsGold = selectedScheme
    ? isGoldScheme(selectedScheme)
    : false;
  const hasSchemeMinimum = selectedScheme
    ? getSchemeMinimum(selectedScheme) > 0
    : false;

  const selectedPreviousAccount = useMemo(
    () =>
      existingAccounts.find((a) => a.id === selectedPreviousAccountId) ||
      null,
    [existingAccounts, selectedPreviousAccountId]
  );
  const previousAccountIsGold = selectedPreviousAccount
    ? isGoldAccount(selectedPreviousAccount)
    : false;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const investorSummaries = useMemo(() => {
    const map = new Map();
    displayedInvestors.forEach((inv) => {
      map.set(inv.id, calculateInvestorSummary(inv.id, accounts));
    });
    return map;
  }, [displayedInvestors, accounts]);

  const aggregatedSummaryData = useMemo(() => {
    const stats = {};
    schemes.forEach((scheme) => {
      stats[scheme.id] = {
        scheme,
        activeInvestors: 0,
        inactiveInvestors: 0,
        totalAmount: 0,
        totalGold: 0,
      };
    });

    accounts.forEach((acc) => {
      if (stats[acc.schemeId]) {
        const active = !isClosedAccount(acc);
        if (active) stats[acc.schemeId].activeInvestors++;
        else stats[acc.schemeId].inactiveInvestors++;

        if (isGoldAccount(acc))
          stats[acc.schemeId].totalGold += getAccountGoldBalance(acc);
        else stats[acc.schemeId].totalAmount += getAccountAmountBalance(acc);
      }
    });

    return Object.values(stats);
  }, [schemes, accounts]);

  const processedInvestors = useMemo(() => {
    if (activeTab === "SUMMARY") return [];
    const sourceInvestors = search.trim() ? searchResults : investors;

    let filtered = sourceInvestors.filter((investor) => {
      const summary = investorSummaries.get(investor.id);
      const matchesStatus =
        statusFilter === "ALL" ||
        String(investor.status || "ACTIVE").toUpperCase() === statusFilter;
      const matchesTab =
        activeTab === "ALL" ||
        summary?.accounts?.some((a) => a.schemeId === activeTab);
      return matchesStatus && matchesTab;
    });

    filtered.sort((a, b) => {
      const sumA = investorSummaries.get(a.id);
      const sumB = investorSummaries.get(b.id);
      let valA, valB;

      switch (sortConfig.key) {
        case "fullName":
          valA = String(a.fullName || "").toLowerCase();
          valB = String(b.fullName || "").toLowerCase();
          break;
        case "totalAmount":
          valA = sumA?.totalAmount || 0;
          valB = sumB?.totalAmount || 0;
          break;
        case "totalGold":
          valA = sumA?.totalGold || 0;
          valB = sumB?.totalGold || 0;
          break;
        default:
          valA = a.createdAt?.seconds || 0;
          valB = b.createdAt?.seconds || 0;
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    investors,
    searchResults,
    search,
    statusFilter,
    activeTab,
    sortConfig,
    investorSummaries,
  ]);

  function requestSort(key) {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  }

  function SortIcon({ columnKey }) {
    if (sortConfig.key !== columnKey)
      return <ChevronsUpDown size={11} className="opacity-30" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp size={11} />
    ) : (
      <ChevronDown size={11} />
    );
  }

  const transferCalculation = useMemo(() => {
    if (
      accountMode !== "CARRY_FORWARD" ||
      !selectedPreviousAccount ||
      !selectedScheme
    )
      return null;
    const sourceAmount = getAccountAmountBalance(selectedPreviousAccount);
    const sourceGoldGrams = getAccountGoldBalance(selectedPreviousAccount);

    if (previousAccountIsGold === selectedSchemeIsGold) {
      return {
        interScheme: false,
        sourceUnit: previousAccountIsGold ? "GOLD_GRAMS" : "AMOUNT",
        destinationUnit: selectedSchemeIsGold ? "GOLD_GRAMS" : "AMOUNT",
        sourceAmount,
        sourceGoldGrams,
        goldPrice: null,
        resultValue: previousAccountIsGold ? sourceGoldGrams : sourceAmount,
        resultUnit: selectedSchemeIsGold ? "GOLD_GRAMS" : "AMOUNT",
        requiredGoldPrice: false,
      };
    }

    const price = Number(transferGoldPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return {
        interScheme: true,
        sourceUnit: previousAccountIsGold ? "GOLD_GRAMS" : "AMOUNT",
        destinationUnit: selectedSchemeIsGold ? "GOLD_GRAMS" : "AMOUNT",
        sourceAmount,
        sourceGoldGrams,
        goldPrice: null,
        resultValue: null,
        resultUnit: selectedSchemeIsGold ? "GOLD_GRAMS" : "AMOUNT",
        requiredGoldPrice: true,
      };
    }

    if (!previousAccountIsGold && selectedSchemeIsGold) {
      return {
        interScheme: true,
        sourceUnit: "AMOUNT",
        destinationUnit: "GOLD_GRAMS",
        sourceAmount,
        sourceGoldGrams: 0,
        goldPrice: price,
        resultValue: sourceAmount / price,
        resultUnit: "GOLD_GRAMS",
        requiredGoldPrice: true,
      };
    }
    return {
      interScheme: true,
      sourceUnit: "GOLD_GRAMS",
      destinationUnit: "AMOUNT",
      sourceAmount: 0,
      sourceGoldGrams,
      goldPrice: price,
      resultValue: sourceGoldGrams * price,
      resultUnit: "AMOUNT",
      requiredGoldPrice: true,
    };
  }, [
    accountMode,
    selectedPreviousAccount,
    selectedScheme,
    previousAccountIsGold,
    selectedSchemeIsGold,
    transferGoldPrice,
  ]);

  const previewData = useMemo(() => {
    return getInitialTransactionPreview({
      selectedScheme,
      accountForm,
      transferCalculation,
      accountMode,
    });
  }, [selectedScheme, accountForm, transferCalculation, accountMode]);

  function openCreate() {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
    setAccountForm({ ...INITIAL_ACCOUNT });
    setCheckMobile("");
    setExistingInvestor(null);
    setExistingAccounts([]);
    setSelectedPreviousAccountId("");
    setTransferGoldPrice("");
    setTransferConfirmed(false);
    setAccountMode(null);
    setModalStep(1);
    setWizardSection(1);
    setModalOpen(true);
  }

  async function handleCheckMobile(e) {
    e.preventDefault();
    const mobile = normalizeMobile(checkMobile);
    if (!/^[0-9]{10}$/.test(mobile)) {
      setToast({
        type: "error",
        message: "Enter a valid 10-digit mobile number.",
      });
      return;
    }

    try {
      setSaving(true);
      const investor = await findInvestmentInvestorByMobile(mobile);

      if (!investor) {
        setFormData({ ...INITIAL_FORM, mobileNumber: mobile });
        setExistingInvestor(null);
        setExistingAccounts([]);
        setSelectedPreviousAccountId("");
        setTransferGoldPrice("");
        setTransferConfirmed(false);
        setAccountMode("FRESH");
        setModalStep(2);
        setWizardSection(1);
        return;
      }

      const db = getCrmFirestore();
      const accountsQuery = query(
        collection(db, "investmentAccounts"),
        where("investorId", "==", investor.id)
      );
      const accountsSnapshot = await getDocs(accountsQuery);
      const investorAccounts = accountsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setExistingInvestor(investor);
      setExistingAccounts(investorAccounts);
      setSelectedPreviousAccountId("");
      setTransferGoldPrice("");
      setTransferConfirmed(false);

      if (investorAccounts.length > 0) {
        setModalStep(1.5);
        return;
      }

      setFormData({
        fullName: investor.fullName || "",
        mobileNumber: mobile,
        alternateMobileNumber: investor.alternateMobileNumber || "",
        email: investor.email || "",
        dateOfBirth: investor.dateOfBirth || "",
        gender: investor.gender || "",
        address: investor.address || "",
        city: investor.city || "",
        pincode: investor.pincode || "",
        emailPreferences: {
          enabled: investor.emailPreferences?.enabled === true,
          language: investor.emailPreferences?.language || "EN",
        },
      });
      setAccountMode("FRESH");
      setAccountForm({ ...INITIAL_ACCOUNT });
      setModalStep(2);
      setWizardSection(1);
    } catch (err) {
      setToast({
        type: "error",
        message: err?.message || "Unable to verify mobile number.",
      });
    } finally {
      setSaving(false);
    }
  }

  function chooseExistingAccountMode(mode) {
    if (!existingInvestor) return;
    if (mode === "CARRY_FORWARD" && !selectedPreviousAccountId) {
      setToast({
        type: "error",
        message: "Select the account to close and transfer.",
      });
      return;
    }
    if (mode === "CARRY_FORWARD") {
      const selected = existingAccounts.find(
        (a) => a.id === selectedPreviousAccountId
      );
      if (!selected)
        return setToast({
          type: "error",
          message: "Source account not found.",
        });
      if (isClosedAccount(selected))
        return setToast({
          type: "error",
          message: "A closed account cannot be transferred.",
        });
    }

    setAccountMode(mode);
    setTransferGoldPrice("");
    setTransferConfirmed(false);
    setFormData({
      fullName: existingInvestor.fullName || "",
      mobileNumber: existingInvestor.mobileNumber || "",
      alternateMobileNumber: existingInvestor.alternateMobileNumber || "",
      email: existingInvestor.email || "",
      dateOfBirth: existingInvestor.dateOfBirth || "",
      gender: existingInvestor.gender || "",
      address: existingInvestor.address || "",
      city: existingInvestor.city || "",
      pincode: existingInvestor.pincode || "",
      emailPreferences: {
        enabled: existingInvestor.emailPreferences?.enabled === true,
        language: existingInvestor.emailPreferences?.language || "EN",
      },
    });
    setAccountForm({
      ...INITIAL_ACCOUNT,
      previousAccountId:
        mode === "CARRY_FORWARD" ? selectedPreviousAccountId : "",
    });
    setModalStep(2);
    setWizardSection(1);
  }

  function openEdit(investor) {
    setEditingId(investor.id);
    setFormData({
      fullName: investor.fullName || "",
      mobileNumber: investor.mobileNumber || "",
      alternateMobileNumber: investor.alternateMobileNumber || "",
      email: investor.email || "",
      dateOfBirth: investor.dateOfBirth || "",
      gender: investor.gender || "",
      address: investor.address || "",
      city: investor.city || "",
      pincode: investor.pincode || "",
      emailPreferences: {
        enabled: investor.emailPreferences?.enabled === true,
        language: investor.emailPreferences?.language || "EN",
      },
    });
    setAccountForm({ ...INITIAL_ACCOUNT });
    setModalStep(2);
    setWizardSection(1);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setFormData({ ...INITIAL_FORM });
      setAccountForm({ ...INITIAL_ACCOUNT });
      setCheckMobile("");
      setExistingInvestor(null);
      setExistingAccounts([]);
      setSelectedPreviousAccountId("");
      setTransferGoldPrice("");
      setAccountMode(null);
      setModalStep(1);
      setWizardSection(1);
    }, 200);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((c) => ({ ...c, [name]: value }));
  }

  function handleAccountChange(e) {
    const { name, value, type, checked } = e.target;
    setAccountForm((cur) => {
      const next = {
        ...cur,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "schemeId") {
        next.transactionMonth = "M1";
        next.transactionDate = "";
        next.transactionType = "CREDIT";
        next.transactionCategory = "INITIAL";
        next.transactionAmount = "";
        next.transactionGoldPrice = "";
        next.paymentMode = "";
        next.transactionReference = "";
        next.transactionPasscode = "";
      }
      return next;
    });
    if (name === "schemeId") {
      setTransferGoldPrice("");
      setTransferConfirmed(false);
    }
  }

  function validateFirstTransaction() {
    if (!accountForm.addFirstTransaction) return;
    const amountPaid = Number(accountForm.transactionAmount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      throw new Error(
        selectedSchemeIsGold
          ? "Enter valid amount paid for Gold SIP."
          : "Enter valid first transaction amount."
      );
    }
    const txDate = clean(
      accountForm.transactionDate || accountForm.startDate
    );
    if (!txDate) throw new Error("Select first transaction date.");
    if (!clean(accountForm.paymentMode)) throw new Error("Select payment mode.");
    if (!clean(accountForm.transactionReference))
      throw new Error("Enter transaction reference.");
    if (!clean(accountForm.transactionPasscode))
      throw new Error("Enter CRM passcode.");

    const schemeMin = selectedScheme ? getSchemeMinimum(selectedScheme) : 0;
    if (accountForm.minimumRestrictionEnabled && schemeMin > 0) {
      if (selectedSchemeIsGold) {
        const goldPrice = Number(accountForm.transactionGoldPrice);
        if (!Number.isFinite(goldPrice) || goldPrice <= 0)
          throw new Error("Enter today's 1g gold price.");
        if (amountPaid / goldPrice < schemeMin)
          throw new Error(`Must be at least ${formatGold(schemeMin)}.`);
      } else {
        if (amountPaid < schemeMin)
          throw new Error(`Must be at least ${formatCurrency(schemeMin)}.`);
      }
    }
    if (selectedSchemeIsGold) {
      const goldPrice = Number(accountForm.transactionGoldPrice);
      if (!Number.isFinite(goldPrice) || goldPrice <= 0)
        throw new Error("Enter today's 1g gold price.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    try {
      const fullName = clean(formData.fullName);
      const mobileNumber = normalizeMobile(formData.mobileNumber);
      const email = clean(formData.email).toLowerCase();

      const emailPreferences = {
        enabled: formData.emailPreferences?.enabled === true,
        language: formData.emailPreferences?.language || "EN",
      };

      if (emailPreferences.enabled && !email) {
        throw new Error(
          "An email address is required when Email Preferences is enabled."
        );
      }

      if (
        emailPreferences.enabled &&
        !["EN", "KN"].includes(emailPreferences.language)
      ) {
        throw new Error("Select a valid email communication language.");
      }
      if (!fullName) throw new Error("Investor name is required.");
      if (!/^[0-9]{10}$/.test(mobileNumber))
        throw new Error("Enter a valid 10-digit mobile number.");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid email address.");
      }

      setSaving(true);

      if (editingId) {
        await updateInvestmentInvestor(editingId, {
          fullName,
          mobileNumber,
          alternateMobileNumber: formData.alternateMobileNumber,
          email: formData.email,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          emailPreferences: {
            enabled: formData.emailPreferences?.enabled === true,
            language: formData.emailPreferences?.language || "EN",
          },
        });
        setToast({ type: "success", message: "Investor profile updated." });
        closeModal();
        return;
      }

      if (!accountForm.schemeId) throw new Error("Select an investment scheme.");
      if (!accountForm.startDate) throw new Error("Select enrollment date.");

      const scheme = activeSchemes.find((s) => s.id === accountForm.schemeId);
      if (!scheme) throw new Error("Selected scheme is no longer active.");

      const gold = isGoldScheme(scheme);
      const contribution = Number(accountForm.contributionValue);
      const schemeMinimum = getSchemeMinimum(scheme);

      if (!Number.isFinite(contribution) || contribution <= 0) {
        throw new Error(
          gold
            ? "Enter valid gold quantity."
            : "Enter valid investment amount."
        );
      }

      if (
        accountForm.minimumRestrictionEnabled &&
        schemeMinimum > 0 &&
        contribution < schemeMinimum
      ) {
        throw new Error(
          gold
            ? `Minimum investment is ${formatGold(schemeMinimum)}.`
            : `Minimum investment is ${formatCurrency(schemeMinimum)}.`
        );
      }

      if (accountMode === "CARRY_FORWARD") {
        if (!selectedPreviousAccountId || !selectedPreviousAccount)
          throw new Error("Source account missing.");
        if (isClosedAccount(selectedPreviousAccount))
          throw new Error("Closed account cannot be transferred.");
        if (!transferCalculation || transferCalculation.resultValue === null)
          throw new Error("Enter gold price to calculate conversion.");
        if (!transferConfirmed)
          throw new Error("Confirm transfer amount before continuing.");
      }

      if (accountForm.addFirstTransaction) {
        validateFirstTransaction();
      }

      let investorId = existingInvestor?.id || null;

      const newInvestorData = !investorId
        ? {
            fullName,
            mobileNumber,
            alternateMobileNumber: clean(formData.alternateMobileNumber),
            email,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            address: formData.address,
            city: formData.city,
            pincode: formData.pincode,
            emailPreferences,
            status: "ACTIVE",
          }
        : null;

      let previousAccountId = null;
      let accountOrigin = "NEW";

      if (accountMode === "CARRY_FORWARD") {
        previousAccountId = selectedPreviousAccount.id;
        accountOrigin = "CARRY_FORWARD";
      }

      const account = await createInvestmentAccount({
        investorId,
        investorData: newInvestorData,
        scheme,
        contributionValue: contribution,
        startDate: accountForm.startDate,
        minimumRestrictionEnabled: Boolean(
          accountForm.minimumRestrictionEnabled
        ),
        openingBalanceAmount: 0,
        openingBalanceGoldGrams: 0,
        accountOrigin,
        previousAccountId,
        transferGoldPrice:
          accountMode === "CARRY_FORWARD" ? Number(transferGoldPrice) : null,
        initialTransaction: accountForm.addFirstTransaction
          ? {
              transactionMonth: "M1",
              transactionType: "CREDIT",
              transactionCategory: "INITIAL",
              amountPaid: Number(accountForm.transactionAmount),
              goldPrice: gold ? Number(accountForm.transactionGoldPrice) : null,
              date: clean(
                accountForm.transactionDate || accountForm.startDate
              ),
              paymentMode: clean(accountForm.paymentMode),
              transactionReference: clean(accountForm.transactionReference),
              passcode: clean(accountForm.transactionPasscode),
            }
          : null,
        transferPasscode: clean(accountForm.transactionPasscode),
      });

      if (!investorId && account?.investorId) {
        investorId = account.investorId;
      }

      let welcomeEmailResult = null;
      let welcomeEmailError = null;

      if (emailPreferences.enabled && email) {
        const schemeName =
          account?.schemeSnapshot?.schemeName ||
          account?.schemeName ||
          scheme?.schemeName ||
          "Investment Scheme";

        const contributionValue =
          account?.contribution?.value ??
          account?.contributionValue ??
          contribution;

        const receiptNumber =
          account?.initialReceiptNumber ||
          account?.firstReceiptNumber ||
          "";

        try {
          welcomeEmailResult = await sendInvestmentAccountOpeningEmail({
            crmSlug: tenant?.crm_slug,
            recipientEmail: email,
            investorName: fullName,
            accountNumber: account?.accountNumber || "",
            schemeName,
            contributionValue,
            startDate: account?.startDate || accountForm.startDate,
            language: emailPreferences.language,
            clientName: tenant?.business_name || "",
            clientLogoUrl: tenant?.logo_url || "",
            hasInitialTransaction: Boolean(
              accountForm.addFirstTransaction
            ),
            transactionAmount: accountForm.addFirstTransaction
              ? Number(accountForm.transactionAmount)
              : null,
            receiptNumber,
            loginUrl: `${window.location.origin}/crm`,
          });

          try {
            await createInvestmentCommunication({
              investorId,
              accountId: account?.id || null,
              channel: "EMAIL",
              subject:
                welcomeEmailResult?.subject ||
                "Your Investment Account Has Been Created",
              templateId: "ACCOUNT_OPENING",
              messageReference:
                welcomeEmailResult?.provider_message_id || null,
              status: "SENT",
              providerMessageId:
                welcomeEmailResult?.provider_message_id || null,
              recipient: email,
              metadata: {
                automatic: true,
                language: emailPreferences.language,
              },
            });
          } catch (commError) {
            console.error("Communication record error:", commError);
          }
        } catch (emailError) {
          welcomeEmailError =
            emailError?.message || "Welcome email could not be sent.";
          console.error("Investment welcome email failed:", emailError);
        }
      }

      if (account?.transferTransactionId && previousAccountId) {
        await createInvestmentAuditLog({
          action: "INVESTMENT_ACCOUNT_TRANSFER_COMPLETED",
          entityType: "INVESTMENT_ACCOUNT",
          entityId: previousAccountId,
          description: `Account ${
            selectedPreviousAccount?.accountNumber || previousAccountId
          } transferred to ${account.accountNumber}.`,
          metadata: {
            previousAccountId,
            newAccountId: account.id,
            newAccountNumber: account.accountNumber,
          },
        });
      }

      await createInvestmentAuditLog({
        action: "INVESTMENT_ACCOUNT_CREATED",
        entityType: "INVESTMENT_ACCOUNT",
        entityId: account.id,
        description: `Account ${account.accountNumber} created.`,
        metadata: {
          investorId: account.investorId,
          schemeId: scheme.id,
          accountNumber: account.accountNumber,
        },
      });

      setToast({
        type: welcomeEmailError ? "error" : "success",
        message:
          accountMode === "CARRY_FORWARD"
            ? `Transfer complete. ${account.accountNumber} created.`
            : welcomeEmailResult
            ? `Account ${account.accountNumber} opened successfully. Welcome email sent.`
            : `Account ${account.accountNumber} opened successfully.`,
      });

      closeModal();
    } catch (err) {
      console.error("Investment enrollment failed:", err);
      setToast({
        type: "error",
        message: err?.message || "Failed to create investment account.",
      });
    } finally {
      setSaving(false);
    }
  }

  function confirmTransfer() {
    if (accountMode !== "CARRY_FORWARD" || !transferCalculation) return;
    if (transferCalculation.requiredGoldPrice) {
      const price = Number(transferGoldPrice);
      if (!Number.isFinite(price) || price <= 0) {
        setToast({ type: "error", message: "Enter today's 1g gold price." });
        return;
      }
    }
    setTransferConfirmed(true);
    setToast({ type: "success", message: "Transfer calculation verified." });
  }

  async function handleToggleStatus(investor) {
    try {
      const nextStatus =
        String(investor.status || "ACTIVE").toUpperCase() === "ACTIVE"
          ? "INACTIVE"
          : "ACTIVE";
      await updateInvestmentInvestorStatus(investor.id, nextStatus);
      setToast({
        type: "success",
        message: `Investor marked as ${nextStatus.toLowerCase()}.`,
      });
    } catch {
      setToast({ type: "error", message: "Failed to update status." });
    }
  }

  function handleExportCSV() {
    let csvContent =
      "data:text/csv;charset=utf-8,Full Name,Mobile,Email,Accounts,Total Amount,Total Gold,Status\n";
    processedInvestors.forEach((investor) => {
      const summary = investorSummaries.get(investor.id);
      const accountNumbers =
        summary?.accounts?.map((a) => a.accountNumber).join(" | ") || "";
      csvContent += `"${investor.fullName || ""}","${
        investor.mobileNumber || ""
      }","${investor.email || ""}","${accountNumbers}","${
        summary?.totalAmount || 0
      }","${summary?.totalGold || 0}","${investor.status || "ACTIVE"}"\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Investors_Directory_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const activeTabLabel = useMemo(() => {
    if (activeTab === "ALL") return `All Portfolios (${investors.length})`;
    if (activeTab === "SUMMARY") return "Metrics Summary";
    const scheme = schemes.find((s) => s.id === activeTab);
    return scheme ? scheme.schemeName : "Select Portfolio Scope";
  }, [activeTab, investors.length, schemes]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      
      {/* =========================================================
          WHATSAPP-STYLE ARTISANAL VECTOR WATERMARK LAYER
      ========================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        <svg
          className="absolute -top-16 -right-16 h-80 w-80 text-slate-900/[0.03] -rotate-12"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <polygon points="100,20 170,70 140,160 60,160 30,70" />
          <polygon points="100,50 145,85 125,145 75,145 55,85" />
          <line x1="100" y1="20" x2="100" y2="50" />
          <line x1="170" y1="70" x2="145" y2="85" />
          <line x1="140" y1="160" x2="125" y2="145" />
          <line x1="60" y1="160" x2="75" y2="145" />
          <line x1="30" y1="70" x2="55" y2="85" />
          <circle cx="100" cy="105" r="28" strokeDasharray="3 3" />
        </svg>

        <svg
          className="absolute top-1/3 -left-20 h-96 w-96 text-slate-900/[0.025] rotate-45"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <circle cx="100" cy="100" r="85" strokeDasharray="6 6" />
          <circle cx="100" cy="100" r="70" />
          <ellipse cx="100" cy="100" rx="90" ry="35" transform="rotate(0 100 100)" />
          <ellipse cx="100" cy="100" rx="90" ry="35" transform="rotate(30 100 100)" />
          <ellipse cx="100" cy="100" rx="90" ry="35" transform="rotate(60 100 100)" />
          <ellipse cx="100" cy="100" rx="90" ry="35" transform="rotate(90 100 100)" />
          <ellipse cx="100" cy="100" rx="90" ry="35" transform="rotate(120 100 100)" />
          <ellipse cx="100" cy="100" rx="90" ry="35" transform="rotate(150 100 100)" />
        </svg>

        <svg
          className="absolute -bottom-14 right-1/4 h-72 w-72 text-slate-900/[0.03] rotate-6"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <line x1="100" y1="25" x2="100" y2="175" strokeWidth="2" />
          <line x1="40" y1="55" x2="160" y2="55" strokeWidth="2" />
          <path d="M40 55 L20 120 Q40 140 60 120 Z" />
          <path d="M160 55 L140 120 Q160 140 180 120 Z" />
          <circle cx="100" cy="40" r="6" />
        </svg>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex max-w-sm items-center gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === "success"
              ? "border-emerald-200 bg-white/95 text-emerald-800 backdrop-blur-md"
              : "border-rose-200 bg-white/95 text-rose-800 backdrop-blur-md"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 1. Header Toolbar */}
      <header className="shrink-0 h-14 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10">
            <Briefcase size={15} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 uppercase font-mono truncate">
                Investor Portfolios
              </h1>
              <span className="hidden sm:inline-flex rounded-full bg-slate-100 border border-slate-200/80 px-2 py-0.5 text-[9px] font-mono font-bold text-slate-600">
                {investors.length} Accounts
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="h-8 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
            >
              <Plus size={14} strokeWidth={2.4} />
              <span>Enroll Investor</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Scheme Filter & Sub-Nav Strip */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 z-10">
        
        {/* DESKTOP VIEW (lg: and up): Direct Horizontal Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`h-7.5 px-3 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white font-bold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            All Portfolios ({investors.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SUMMARY")}
            className={`h-7.5 px-3 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
              activeTab === "SUMMARY"
                ? "bg-slate-900 text-white font-bold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Metrics Summary
          </button>
          {activeSchemes.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              onClick={() => setActiveTab(scheme.id)}
              className={`h-7.5 px-3 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === scheme.id
                  ? "bg-slate-900 text-white font-bold shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {scheme.schemeName}
            </button>
          ))}
        </div>

        {/* MOBILE & TABLET VIEW (< lg): Dropdown Button */}
        <div className="flex lg:hidden items-center justify-between w-full">
          <button
            type="button"
            onClick={() => setShowTabDrawer(true)}
            className="h-8 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 text-xs font-mono font-bold text-slate-800 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <span className="truncate max-w-[200px]">{activeTabLabel}</span>
            <ChevronDown size={13} className="text-slate-500 shrink-0" />
          </button>
        </div>

        {/* Search & Status Filters */}
        {activeTab !== "SUMMARY" && (
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 sm:w-60">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search investor..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none h-8 rounded-lg border border-slate-200 bg-slate-50/70 pl-3 pr-7 text-[11px] font-mono font-semibold text-slate-700 outline-none focus:border-slate-800 focus:bg-white cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Global Error Notice */}
      {(error || searchError || accountsError || schemesError) && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs font-mono font-medium text-rose-700 flex items-center justify-between">
          <span>{error || searchError || accountsError || schemesError}</span>
        </div>
      )}

      {/* 3. Main Workspace */}
      <main className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${noScroll} z-10`}>
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {activeTab === "SUMMARY" ? (
            /* AGGREGATED METRICS SUMMARY TABLE */
            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Scheme Identifier</th>
                    <th className="px-5 py-3 text-center">Active Investors</th>
                    <th className="px-5 py-3 text-center">Closed/Inactive</th>
                    <th className="px-5 py-3 text-right">Total Cash Funds</th>
                    <th className="px-5 py-3 text-right">Total Gold Grams</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {aggregatedSummaryData.map((data) => (
                    <tr key={data.scheme.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold font-sans text-xs text-slate-900">
                          {data.scheme.schemeName}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {data.scheme.schemeCode || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-emerald-700">
                        {data.activeInvestors}
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-400">
                        {data.inactiveInvestors}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(data.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-amber-700">
                        {formatGold(data.totalGold)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : loading || searchLoading || accountsLoading ? (
            <div className="flex flex-1 items-center justify-center py-24 text-slate-500 space-y-2">
              <Loader2 size={20} className="animate-spin text-slate-800" />
              <span className="text-xs font-mono uppercase tracking-wider">
                Accessing ledger registry...
              </span>
            </div>
          ) : processedInvestors.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center shadow-xs backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 shadow-xs">
                <UserRound size={22} />
              </div>
              <h3 className="mt-3 text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                No Investor Portfolios Located
              </h3>
              <p className="mt-1 max-w-xs text-xs text-slate-500 leading-relaxed">
                {search
                  ? "No investor records match your query."
                  : "Enroll your first client to configure schemes and generate ledgers."}
              </p>
              {!search && canWrite && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                >
                  <Plus size={14} />
                  <span>Enroll Investor</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs flex flex-col">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => requestSort("fullName")}
                          className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                        >
                          <span>Investor Profile</span>
                          <SortIcon columnKey="fullName" />
                        </button>
                      </th>
                      <th className="px-5 py-3">Passbooks & Communications</th>
                      <th className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => requestSort("totalAmount")}
                          className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto cursor-pointer"
                        >
                          <span>Total Cash Funds</span>
                          <SortIcon columnKey="totalAmount" />
                        </button>
                      </th>
                      <th className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => requestSort("totalGold")}
                          className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto cursor-pointer"
                        >
                          <span>Total Gold</span>
                          <SortIcon columnKey="totalGold" />
                        </button>
                      </th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedInvestors.map((investor) => {
                      const summary = investorSummaries.get(investor.id) || {
                        accounts: [],
                        totalAmount: 0,
                        totalGold: 0,
                        hasGoldAccount: false,
                        hasAmountAccount: false,
                      };

                      return (
                        <tr
                          key={investor.id}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-xs shadow-2xs">
                                {investor.fullName?.charAt(0)?.toUpperCase() || "I"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 group-hover:text-slate-950 transition-colors truncate">
                                  {investor.fullName}
                                </p>
                                <span className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} /> {investor.city || "Unassigned"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <p className="flex items-center gap-1.5 text-xs font-mono text-slate-700 mb-1">
                              <Phone size={11} className="text-slate-400" />
                              {investor.mobileNumber}
                            </p>
                            <div className="flex items-center gap-1.5">
                              {summary.accounts.length === 0 ? (
                                <span className="text-[10px] text-slate-400 italic font-mono">
                                  No passbooks
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSidebarInvestor(investor)}
                                  className="text-[10.5px] font-mono font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200/80 px-2 py-0.5 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                                >
                                  <span>{summary.accounts.length} Passbook{summary.accounts.length !== 1 && "s"}</span>
                                  <ChevronRight size={11} />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono">
                            <span
                              className={`text-xs font-bold ${
                                summary.hasAmountAccount
                                  ? "text-slate-900"
                                  : "text-slate-300"
                              }`}
                            >
                              {summary.hasAmountAccount
                                ? formatCurrency(summary.totalAmount)
                                : "—"}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono">
                            <span
                              className={`text-xs font-bold ${
                                summary.hasGoldAccount
                                  ? "text-amber-700"
                                  : "text-slate-300"
                              }`}
                            >
                              {summary.hasGoldAccount
                                ? formatGold(summary.totalGold)
                                : "—"}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            <StatusBadge status={investor.status} />
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/crm/${tenant?.crm_slug}/investment/investors/${investor.id}`
                                  )
                                }
                                className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Open Profile"
                              >
                                <Eye size={12} />
                              </button>
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(investor)}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title="Edit Details"
                                >
                                  <Edit3 size={12} />
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(investor)}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title="Toggle Status"
                                >
                                  <Power size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Atelier Cards */}
              <div className="lg:hidden divide-y divide-slate-100">
                {processedInvestors.map((investor) => {
                  const summary = investorSummaries.get(investor.id) || {
                    accounts: [],
                    totalAmount: 0,
                    totalGold: 0,
                    hasGoldAccount: false,
                    hasAmountAccount: false,
                  };

                  return (
                    <div key={investor.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {investor.fullName}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {investor.mobileNumber} · {investor.city || "No City Recorded"}
                          </p>
                        </div>
                        <StatusBadge status={investor.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                            Cash Funds
                          </span>
                          <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                            {summary.hasAmountAccount
                              ? formatCurrency(summary.totalAmount)
                              : "—"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-right">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                            Gold SIP
                          </span>
                          <span className="font-bold text-amber-700 text-xs mt-0.5 block">
                            {summary.hasGoldAccount
                              ? formatGold(summary.totalGold)
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/crm/${tenant?.crm_slug}/investment/investors/${investor.id}`
                            )
                          }
                          className="flex-1 h-7.5 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye size={12} /> Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setSidebarInvestor(investor)}
                          className="flex-1 h-7.5 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                        >
                          {summary.accounts.length} Ledgers
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => openEdit(investor)}
                            className="h-7.5 w-7.5 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {(hasPreviousPage || hasNextPage) && (
                <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-5 py-2.5 bg-slate-50/70 text-[10.5px] font-mono text-slate-500">
                  <span>Page {currentPage} · {pageSize} records</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={previousPage}
                      disabled={!hasPreviousPage || loading || accountsLoading}
                      className="px-3 py-1 rounded-md border border-slate-200 bg-white font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={nextPage}
                      disabled={!hasNextPage || loading || accountsLoading}
                      className="px-3 py-1 rounded-md border border-slate-200 bg-white font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          DRAWER PORTAL: CATEGORY SELECTOR BOTTOM SHEET (Small & Med Screens)
      ========================================================================= */}
      {showTabDrawer &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9998] flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0"
            onClick={() => setShowTabDrawer(false)}
          >
            <div
              className="w-full bg-white rounded-t-2xl border border-slate-200 shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-200 max-h-[75vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Select Portfolio Scope
                </span>
                <button
                  type="button"
                  onClick={() => setShowTabDrawer(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ALL");
                    setShowTabDrawer(false);
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between font-mono text-xs transition-all cursor-pointer active:scale-[0.99] ${
                    activeTab === "ALL"
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>All Portfolios ({investors.length})</span>
                  {activeTab === "ALL" && <Check size={14} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("SUMMARY");
                    setShowTabDrawer(false);
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between font-mono text-xs transition-all cursor-pointer active:scale-[0.99] ${
                    activeTab === "SUMMARY"
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>Metrics Summary</span>
                  {activeTab === "SUMMARY" && <Check size={14} />}
                </button>

                {activeSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(scheme.id);
                      setShowTabDrawer(false);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between font-mono text-xs transition-all cursor-pointer active:scale-[0.99] ${
                      activeTab === scheme.id
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>{scheme.schemeName}</span>
                    {activeTab === scheme.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =========================================================================
          MODAL PORTAL: ENROLLMENT & JOURNEY WIZARD
      ========================================================================= */}
      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={closeModal}
          >
            <div
              className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
                <div>
                  <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-900">
                    {modalStep === 1
                      ? "Enrollment Verification"
                      : modalStep === 1.5
                      ? "Portfolio Link Selection"
                      : editingId
                      ? "Update Investor Coordinates"
                      : "Investor & Scheme Provisioning"}
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {modalStep === 1
                      ? "STAGE 01 // DUPLICATE IDENTITY SAFEGUARD"
                      : modalStep === 1.5
                      ? "STAGE 02 // CARRY-FORWARD OR FRESH ACCOUNT"
                      : editingId
                      ? "COORDINATES EDIT // IDENTITY RECORD"
                      : `STAGE 0${wizardSection} OF 05 // SECTIONAL ONBOARDING`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* STAGE 1: MOBILE LOOKUP */}
              {modalStep === 1 && (
                <form
                  onSubmit={handleCheckMobile}
                  className="flex-1 flex flex-col p-6 sm:p-10 justify-center items-center text-center"
                >
                  <div className="w-full max-w-sm space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 shadow-2xs">
                      <UserRound size={22} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wide">
                        Verify Client Contact
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Enter the 10-digit mobile number to search for existing portfolios and prevent fragmented records.
                      </p>
                    </div>

                    <FormInput
                      label="10-Digit Mobile"
                      name="checkMobile"
                      value={checkMobile}
                      onChange={(e) => setCheckMobile(e.target.value)}
                      type="tel"
                      prefix="+91"
                      placeholder="e.g. 9876543210"
                      required
                    />

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full h-9 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <span>Verify & Continue</span>
                      )}
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </form>
              )}

              {/* STAGE 1.5: PROFILE LINK SELECTION */}
              {modalStep === 1.5 && (
                <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${noScroll}`}>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle size={14} /> Active Profile Located
                    </p>
                    <p className="text-[11px] mt-0.5 text-amber-800">
                      <span className="font-bold">{existingInvestor?.fullName}</span> already holds {existingAccounts.length} account(s). Choose to transfer or create a standalone enrollment.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Existing Accounts (Select to Carry Forward)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {existingAccounts.map((account) => {
                        const closed = isClosedAccount(account);
                        const selected = selectedPreviousAccountId === account.id;

                        return (
                          <button
                            key={account.id}
                            type="button"
                            disabled={closed}
                            onClick={() => {
                              setSelectedPreviousAccountId(account.id);
                              setTransferGoldPrice("");
                            }}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              closed
                                ? "opacity-50 border-slate-200 bg-slate-100 cursor-not-allowed"
                                : selected
                                ? "border-slate-900 bg-white font-semibold shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <p className="text-xs font-bold text-slate-900 font-mono">
                              {account.accountNumber}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {account?.schemeSnapshot?.schemeName || account.schemeId}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={!selectedPreviousAccountId}
                      onClick={() => chooseExistingAccountMode("CARRY_FORWARD")}
                      className="p-4 rounded-xl border border-slate-200 bg-white text-left hover:border-slate-400 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ArrowRightLeft size={13} className="text-slate-700" />
                        <span>Close Old & Carry Forward</span>
                      </p>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                        Close selected account and transfer its ledger balance into the new scheme.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => chooseExistingAccountMode("FRESH")}
                      className="p-4 rounded-xl border border-slate-200 bg-white text-left hover:border-slate-400 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                    >
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Plus size={13} className="text-slate-700" />
                        <span>Standalone Enrollment</span>
                      </p>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                        Open a clean, independent account for this profile without touching prior ledgers.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: JOURNEY FLOW FORM */}
              {modalStep === 2 && (
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                  {/* Section Stepper Track */}
                  {!editingId && (
                    <div className="shrink-0 border-b border-slate-200/80 bg-slate-50/80 px-4 py-2 flex items-center gap-1.5 text-[10.5px] font-mono overflow-x-auto [&::-webkit-scrollbar]:hidden">
                      {[
                        { id: 1, label: "Identity" },
                        { id: 2, label: "Location" },
                        { id: 3, label: "Scheme" },
                        { id: 4, label: "Deposit M1" },
                        { id: 5, label: "Review" },
                      ].map((sec) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setWizardSection(sec.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all shrink-0 cursor-pointer ${
                            wizardSection === sec.id
                              ? "bg-slate-900 text-white font-bold shadow-2xs"
                              : wizardSection > sec.id
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                              : "text-slate-400 hover:text-slate-700"
                          }`}
                        >
                          <span>0{sec.id}.</span>
                          <span>{sec.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 ${noScroll}`}>
                    {/* SECTION 1: PERSONAL COORDINATES */}
                    {(editingId || wizardSection === 1) && (
                      <div className="space-y-3 animate-in fade-in duration-150">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                          1. Personal Details
                        </span>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <FormInput
                              label="Full Legal Name"
                              name="fullName"
                              value={formData.fullName}
                              onChange={handleChange}
                              required
                              disabled={saving || Boolean(existingInvestor)}
                              placeholder="e.g. Anand Murthy"
                            />
                          </div>
                          <FormInput
                            label="Primary Mobile"
                            name="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            type="tel"
                            prefix="+91"
                            required
                            disabled={true}
                          />
                          <FormInput
                            label="Alternate Contact"
                            name="alternateMobileNumber"
                            value={formData.alternateMobileNumber}
                            onChange={handleChange}
                            type="tel"
                            disabled={saving}
                            placeholder="Optional backup"
                          />
                          <div className="sm:col-span-2">
                            <FormInput
                              label="Email Address"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              type="email"
                              disabled={saving}
                              placeholder="client@mail.com"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-xs font-bold text-slate-900 block">
                                    Email Communications
                                  </span>
                                  <p className="text-[10.5px] text-slate-500 leading-snug">
                                    Receive automated ledger receipts, statements, and alerts via email.
                                  </p>
                                </div>

                                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(formData.emailPreferences?.enabled)}
                                    onChange={(e) =>
                                      setFormData((cur) => ({
                                        ...cur,
                                        emailPreferences: {
                                          ...cur.emailPreferences,
                                          enabled: e.target.checked,
                                        },
                                      }))
                                    }
                                    disabled={saving}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700">
                                    Enable
                                  </span>
                                </label>
                              </div>

                              {formData.emailPreferences?.enabled && (
                                <div className="border-t border-slate-200 pt-2.5">
                                  <FormSelect
                                    label="Communication Language"
                                    name="emailLanguage"
                                    value={formData.emailPreferences?.language || "EN"}
                                    onChange={(e) =>
                                      setFormData((cur) => ({
                                        ...cur,
                                        emailPreferences: {
                                          ...cur.emailPreferences,
                                          language: e.target.value,
                                        },
                                      }))
                                    }
                                    disabled={saving}
                                    required
                                  >
                                    <option value="EN">English</option>
                                    <option value="KN">ಕನ್ನಡ (Kannada)</option>
                                  </FormSelect>
                                </div>
                              )}
                            </div>
                          </div>
                          <FormInput
                            label="Date of Birth"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            type="date"
                            disabled={saving}
                          />
                          <FormSelect
                            label="Gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            disabled={saving}
                          >
                            <option value="">Select Gender</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </FormSelect>
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: LOCATION COORDINATES */}
                    {(editingId || wizardSection === 2) && (
                      <div className="space-y-3 animate-in fade-in duration-150">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                          2. Address & Delivery Coordinates
                        </span>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Street / House Address
                            </label>
                            <textarea
                              name="address"
                              value={formData.address}
                              onChange={handleChange}
                              disabled={saving}
                              rows={2}
                              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all"
                              placeholder="Complete mailing address"
                            />
                          </div>
                          <FormInput
                            label="City"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            disabled={saving}
                            placeholder="e.g. Bangalore"
                          />
                          <FormInput
                            label="PIN Code"
                            name="pincode"
                            value={formData.pincode}
                            onChange={handleChange}
                            disabled={saving}
                            placeholder="560001"
                          />
                        </div>
                      </div>
                    )}

                    {/* SECTION 3: SCHEME SETUP & CARRY FORWARD */}
                    {!editingId && wizardSection === 3 && (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                          3. Scheme Selection & Ledger Bounds
                        </span>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <FormSelect
                              label="Investment Scheme"
                              name="schemeId"
                              value={accountForm.schemeId}
                              onChange={handleAccountChange}
                              required
                              disabled={saving || schemesLoading}
                            >
                              <option value="">Choose an active scheme...</option>
                              {activeSchemes.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.schemeName} ({getSchemeMinimumLabel(s)} min)
                                </option>
                              ))}
                            </FormSelect>
                          </div>

                          {/* DYNAMIC CARRY FORWARD RATE ENGINE */}
                          {accountMode === "CARRY_FORWARD" &&
                            selectedPreviousAccount &&
                            selectedScheme && (
                              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                                  Balance Transfer Conversion Engine
                                </span>

                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                                    <span className="text-[9px] uppercase text-slate-400 block font-bold">
                                      Closing Account
                                    </span>
                                    <span className="font-bold text-slate-900 text-xs">
                                      {selectedPreviousAccount.accountNumber}
                                    </span>
                                    <span className="block text-[10.5px] text-slate-500 mt-0.5">
                                      {previousAccountIsGold
                                        ? formatGold(getAccountGoldBalance(selectedPreviousAccount))
                                        : formatCurrency(getAccountAmountBalance(selectedPreviousAccount))}
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                                    <span className="text-[9px] uppercase text-slate-400 block font-bold">
                                      Transfer Yield
                                    </span>
                                    <span className="font-bold text-emerald-700 text-xs">
                                      {transferCalculation?.resultValue != null
                                        ? transferCalculation.resultUnit === "GOLD_GRAMS"
                                          ? formatGold(transferCalculation.resultValue)
                                          : formatCurrency(transferCalculation.resultValue)
                                        : "Rate Needed"}
                                    </span>
                                  </div>
                                </div>

                                {transferCalculation?.requiredGoldPrice && (
                                  <div className="pt-1">
                                    <FormInput
                                      label="Today's 1g Gold Market Rate"
                                      name="transferGoldPrice"
                                      value={transferGoldPrice}
                                      onChange={(e) => {
                                        setTransferGoldPrice(e.target.value);
                                        setTransferConfirmed(false);
                                      }}
                                      type="number"
                                      prefix="₹"
                                      required
                                      placeholder="e.g. 12500"
                                    />
                                  </div>
                                )}

                                {!transferConfirmed ? (
                                  <button
                                    type="button"
                                    onClick={confirmTransfer}
                                    disabled={transferCalculation?.resultValue == null}
                                    className="w-full h-8.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                                  >
                                    Verify Transfer Calculation
                                  </button>
                                ) : (
                                  <span className="block text-center text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 py-1.5 rounded-lg">
                                    Conversion confirmed.
                                  </span>
                                )}
                              </div>
                            )}

                          <FormInput
                            label={selectedSchemeIsGold ? "Monthly Gold Grams" : "Monthly Installment"}
                            name="contributionValue"
                            value={accountForm.contributionValue}
                            onChange={handleAccountChange}
                            type="number"
                            prefix={selectedSchemeIsGold ? "g" : "₹"}
                            required
                            disabled={saving || !selectedScheme}
                            placeholder="Contribution rate"
                          />

                          <FormInput
                            label="Enrollment Date"
                            name="startDate"
                            value={accountForm.startDate}
                            onChange={handleAccountChange}
                            type="date"
                            required
                            disabled={saving}
                          />

                          <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200">
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                Enforce Scheme Minimum
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                Standard: {getSchemeMinimumLabel(selectedScheme)}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              name="minimumRestrictionEnabled"
                              checked={accountForm.minimumRestrictionEnabled}
                              onChange={handleAccountChange}
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 4: INITIAL DEPOSIT (M1) */}
                    {!editingId && wizardSection === 4 && (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                            4. First Installment (M1 Record)
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              name="addFirstTransaction"
                              checked={accountForm.addFirstTransaction}
                              onChange={handleAccountChange}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-[11px] font-mono font-semibold text-slate-900">
                              Collect M1 Now
                            </span>
                          </label>
                        </div>

                        {accountForm.addFirstTransaction ? (
                          <div className="space-y-3.5">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <FormInput
                                label="Amount Paid"
                                name="transactionAmount"
                                value={accountForm.transactionAmount}
                                onChange={handleAccountChange}
                                type="number"
                                prefix="₹"
                                required
                                placeholder="Cash/Transfer amount"
                              />

                              <FormSelect
                                label="Payment Mode"
                                name="paymentMode"
                                value={accountForm.paymentMode}
                                onChange={handleAccountChange}
                                required
                              >
                                <option value="">Select Mode</option>
                                {getPaymentModes().map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </FormSelect>

                              {selectedSchemeIsGold && (
                                <FormInput
                                  label="Today's 1g Gold Rate"
                                  name="transactionGoldPrice"
                                  value={accountForm.transactionGoldPrice}
                                  onChange={handleAccountChange}
                                  type="number"
                                  prefix="₹"
                                  required
                                  placeholder="e.g. 12500"
                                />
                              )}

                              <FormInput
                                label="Transaction Reference"
                                name="transactionReference"
                                value={accountForm.transactionReference}
                                onChange={handleAccountChange}
                                required
                                placeholder="UPI ref / bank ref"
                              />
                            </div>

                            {/* TRANSACTION PREVIEW BOX */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-500 uppercase text-[10px]">
                                  Transaction Receipt Details:
                                </span>
                                <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                                  AUTO-NUMBERED RECEIPT
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-center">
                                <div className="p-2 rounded-lg bg-white border border-slate-200">
                                  <span className="text-[9px] text-slate-400 block uppercase">
                                    Month
                                  </span>
                                  <span className="font-bold text-slate-900 text-xs">
                                    {accountForm.transactionMonth || "M1"}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-slate-200">
                                  <span className="text-[9px] text-slate-400 block uppercase">
                                    Paid Amount
                                  </span>
                                  <span className="font-bold text-slate-900 text-xs">
                                    {formatCurrency(accountForm.transactionAmount || 0)}
                                  </span>
                                </div>
                                {selectedSchemeIsGold && (
                                  <div className="p-2 rounded-lg bg-white border border-slate-200 col-span-2 sm:col-span-1">
                                    <span className="text-[9px] text-slate-400 block uppercase">
                                      Gold Credited
                                    </span>
                                    <span className="font-bold text-amber-700 text-xs">
                                      {(() => {
                                        const amount = Number(accountForm.transactionAmount);
                                        const price = Number(accountForm.transactionGoldPrice);
                                        return Number.isFinite(amount) && Number.isFinite(price) && price > 0
                                          ? formatGold(amount / price)
                                          : "—";
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* PASSCODE BOX */}
                            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-2">
                              <div className="flex items-center gap-2 text-rose-900 text-xs font-bold font-mono">
                                <ShieldCheck size={14} className="text-rose-600 shrink-0" />
                                <span>Security PIN Authorization Required</span>
                              </div>
                              <p className="text-[10.5px] text-rose-800 leading-relaxed font-sans">
                                Authorize this opening deposit with your Master Terminal PIN. Plain-text passcodes are never stored.
                              </p>
                              <FormInput
                                label="Master Security PIN"
                                name="transactionPasscode"
                                value={accountForm.transactionPasscode}
                                onChange={handleAccountChange}
                                type="password"
                                required
                                placeholder="Enter Security PIN"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
                            <p className="text-xs font-semibold text-slate-700">
                              No Opening Deposit
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              The account will open with zero ledger transactions. You can issue M1 from the passbook at any time.
                            </p>
                            {!existingInvestor && (
                              <div className="mt-3.5 text-left">
                                <FormInput
                                  label="Required Master PIN for New Investor"
                                  name="transactionPasscode"
                                  value={accountForm.transactionPasscode}
                                  onChange={handleAccountChange}
                                  type="password"
                                  required
                                  placeholder="Enter PIN to authorize new profile"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTION 5: FULL PRE-COMMIT LEDGER TABLE */}
                    {!editingId && wizardSection === 5 && (
                      <div className="space-y-3.5 animate-in fade-in duration-150">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                          5. Pre-Commit Ledger Verification & Statement
                        </span>

                        <div className="rounded-xl border border-slate-200 overflow-hidden font-mono text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                              <tr>
                                <th className="w-12 px-3.5 py-2.5 text-center">No.</th>
                                <th className="px-3.5 py-2.5">Receipt & Type</th>
                                <th className="px-3.5 py-2.5 text-right">Amount Paid</th>
                                <th className="px-3.5 py-2.5 text-right">Running Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {previewData.rows.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-5 text-center text-slate-400 italic">
                                    No opening transactions. Account will open with 0 balance.
                                  </td>
                                </tr>
                              ) : (
                                previewData.rows.map((row, idx) => (
                                  <tr key={row.id} className="hover:bg-slate-50/70">
                                    <td className="px-3.5 py-2.5 text-center text-slate-400 text-[11px]">
                                      0{idx + 1}
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`inline-flex rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                          row.type === "Transfer"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                          {row.type}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {row.receiptNumber}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                                      {formatCurrency(row.amountPaid)}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700">
                                      {selectedSchemeIsGold
                                        ? formatGold(row.balance)
                                        : formatCurrency(row.balance)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {previewData.rows.length > 0 && (
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
                            <span className="text-slate-500 uppercase text-[10px] font-bold">
                              Summary Initial Ledger Total:
                            </span>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 mr-2">
                                {formatCurrency(previewData.totalAmount)}
                              </span>
                              {selectedSchemeIsGold && (
                                <span className="font-bold text-amber-700">
                                  ({formatGold(previewData.totalGold)})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Wizard Footer Controls */}
                  <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingId) closeModal();
                        else if (wizardSection > 1)
                          setWizardSection((s) => s - 1);
                        else setModalStep(1);
                      }}
                      disabled={saving}
                      className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      {editingId || wizardSection === 1 ? "Cancel" : "← Previous"}
                    </button>

                    <div className="flex items-center gap-2">
                      {!editingId && wizardSection < 5 && (
                        <button
                          type="button"
                          onClick={() => setWizardSection((s) => s + 1)}
                          className="h-8 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <span>Next Section</span>
                          <ArrowRight size={13} />
                        </button>
                      )}

                      {(editingId || wizardSection === 5) && (
                        <button
                          type="submit"
                          disabled={
                            saving ||
                            (accountMode === "CARRY_FORWARD" &&
                              !transferConfirmed)
                          }
                          className="h-8 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition-all disabled:opacity-50 shadow-2xs cursor-pointer active:scale-95"
                        >
                          {saving ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Committing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} />
                              <span>{editingId ? "Save Coordinates" : "Commit Enrollment"}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* =========================================================================
          DRAWER PORTAL: ACCOUNT SELECTOR SIDEBAR
      ========================================================================= */}
      {sidebarInvestor &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setSidebarInvestor(null)}
            />
            <div className="fixed z-[9999] top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3.5">
                <div>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 truncate">
                    {sidebarInvestor.fullName}'s Passbooks
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Select an account to view transactions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarInvestor(null)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto p-3.5 space-y-2.5 ${noScroll}`}>
                {investorSummaries.get(sidebarInvestor.id)?.accounts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-mono">
                    No active accounts found.
                  </div>
                ) : (
                  investorSummaries
                    .get(sidebarInvestor.id)
                    ?.accounts.map((acc) => {
                      const closed = isClosedAccount(acc);
                      const gold = isGoldAccount(acc);

                      return (
                        <button
                          key={acc.id}
                          onClick={() => {
                            setSidebarInvestor(null);
                            navigate(`/crm/investment/accounts/${acc.id}`);
                          }}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                            closed
                              ? "border-slate-200 bg-slate-50/70 opacity-60"
                              : "border-slate-200 bg-white hover:border-slate-400 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {acc.accountNumber}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase ${
                                closed
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {closed ? "Closed" : "Active"}
                            </span>
                          </div>

                          <p className="text-[10.5px] text-slate-500 truncate mb-2.5">
                            {acc.schemeSnapshot?.schemeName || acc.schemeId}
                          </p>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-xs">
                            <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">
                              Balance
                            </span>
                            <span
                              className={`font-bold ${
                                gold ? "text-amber-700" : "text-slate-900"
                              }`}
                            >
                              {gold
                                ? formatGold(getAccountGoldBalance(acc))
                                : formatCurrency(getAccountAmountBalance(acc))}
                            </span>
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}