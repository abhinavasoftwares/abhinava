import { useEffect, useMemo, useState } from "react";
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
  Settings2,
  UserRound,
  Wallet,
  X,
  FileText,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Lock
} from "lucide-react";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

import { useInvestmentInvestors } from "../hooks/useInvestmentInvestors";
import { useInvestmentAccountsForInvestors } from "../hooks/useInvestmentAccountsForInvestors";
import { useInvestmentSearch } from "../hooks/useInvestmentSearch";
import { useInvestmentSchemes } from "../hooks/useInvestmentSchemes";
import {
  createInvestmentInvestor,
  updateInvestmentInvestor,
  updateInvestmentInvestorStatus,
  deleteInvestmentInvestor,
} from "../services/investmentInvestors";
import { createInvestmentAccount } from "../services/investmentAccounts";
import { createInvestmentAuditLog } from "../services/investmentAudit";
import { getCrmFirestore } from "../../../firebase";

// ============================================================
// CONSTANTS & HELPERS
// ============================================================
const INITIAL_FORM = { fullName: "", mobileNumber: "", alternateMobileNumber: "", email: "", dateOfBirth: "", gender: "", address: "", city: "", pincode: "" };
const INITIAL_ACCOUNT = {
  schemeId: "",
  contributionValue: "",
  startDate: "",
  previousAccountId: "",
  minimumRestrictionEnabled: true,

  // Initial transaction
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
const INVESTMENT_ACCOUNTS_COLLECTION = "investmentAccounts";
const ITEMS_PER_PAGE = 15;

function clean(value) { return String(value ?? "").trim(); }
function normalizeMobile(value) { return clean(value).replace(/\D/g, ""); }
function formatCurrency(value) { return `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }
function formatGold(value) { return `${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} g`; }
function isClosedAccount(account) { return String(account?.status || "ACTIVE").toUpperCase() === "CLOSED"; }
function isActiveAccount(account) { return !isClosedAccount(account); }

function isGoldScheme(scheme) {
  const type = String(scheme?.schemeType || "").toUpperCase();
  const name = String(scheme?.schemeName || "").toUpperCase();
  const unit = String(scheme?.installmentConfig?.unit || "").toUpperCase();
  return type.includes("GOLD") || name.includes("GOLD SIP") || unit === "GOLD_GRAMS";
}

function isGoldAccount(account) {
  const type = String(account?.schemeSnapshot?.schemeType || "").toUpperCase();
  const unit = String(account?.contribution?.unit || "").toUpperCase();
  return type.includes("GOLD") || unit === "GOLD_GRAMS" || Number(account?.totalGoldCredited || 0) > 0 || Number(account?.openingBalanceGoldGrams || 0) > 0;
}

function getSchemeMinimum(scheme) {
  if (!scheme) return 0;
  if (isGoldScheme(scheme)) return Number(scheme?.installmentConfig?.minimumGrams ?? scheme?.minimumGrams ?? 0);
  return Number(scheme?.installmentConfig?.amount ?? scheme?.minimumAmount ?? scheme?.monthlyAmount ?? 0);
}

function getSchemeMinimumLabel(scheme) {
  if (!scheme) return "";
  const minimum = getSchemeMinimum(scheme);
  return isGoldScheme(scheme) ? formatGold(minimum) : formatCurrency(minimum);
}

function getSchemeFrequencyLabel(scheme) {
  const frequency = String(
    scheme?.paymentFrequency || "MONTHLY"
  ).toUpperCase();

  const labels = {
    MONTHLY: "Monthly",
    WEEKLY: "Weekly",
    QUARTERLY: "Quarterly",
    HALF_YEARLY: "Half-Yearly",
    YEARLY: "Yearly",
    DAILY: "Daily",
  };

  return labels[frequency] || frequency.replaceAll("_", " ");
}

function getSchemeDuration(scheme) {
  const duration = Number(scheme?.durationMonths || 0);
  return Number.isInteger(duration) && duration > 0
    ? duration
    : 0;
}

function getSchemeInstallmentLabel(scheme) {
  if (!scheme) return "";

  const gold = isGoldScheme(scheme);
  const amount = Number(
    scheme?.installmentConfig?.amount ?? 0
  );

  if (gold) {
    const grams = Number(
      scheme?.installmentConfig?.minimumGrams ??
      scheme?.installmentConfig?.amount ??
      0
    );

    return grams > 0
      ? `${grams} g`
      : "Gold-based";
  }

  return amount > 0
    ? formatCurrency(amount)
    : "Variable";
}

function getTransactionMonthOptions(scheme) {
  const duration = getSchemeDuration(scheme);

  return Array.from(
    { length: duration || 1 },
    (_, index) => {
      const number = index + 1;

      return {
        value: `M${number}`,
        label: `M${number}`,
      };
    }
  );
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
  const prefix = clean(scheme?.accountNumberConfig?.prefix || scheme?.accountNumberConfig?.theme || "").toUpperCase();
  if (!prefix) return "";
  const padding = Number(scheme?.accountNumberConfig?.padding ?? 6);
  const safePadding = Number.isInteger(padding) && padding > 0 ? padding : 6;
  const seq = Number(scheme?.nextAccountNumber ?? scheme?.accountNumberConfig?.nextSequence ?? 1);
  const nextNumber = Number.isInteger(seq) && seq > 0 ? seq : 1;
  return `${prefix}-${String(nextNumber).padStart(safePadding, "0")}`;
}

function getAccountAmountBalance(account) { return Number(account?.openingBalanceAmount || 0) + Number(account?.totalPaid || 0); }
function getAccountGoldBalance(account) { return Number(account?.openingBalanceGoldGrams || 0) + Number(account?.totalGoldCredited || 0); }

function getInitialTransactionPreview({ selectedScheme, accountForm, transferCalculation, accountMode }) {
  const gold = isGoldScheme(selectedScheme);
  const rows = [];
  let runningAmount = 0;
  let runningGold = 0;

  if (accountMode === "CARRY_FORWARD" && transferCalculation?.resultValue != null) {
    if (transferCalculation.resultUnit === "GOLD_GRAMS") runningGold = Number(transferCalculation.resultValue) || 0;
    else runningAmount = Number(transferCalculation.resultValue) || 0;

    rows.push({
      id: "transfer",
      receiptNumber: "Generated on save",
      type: "Transfer",
      goldPrice: transferCalculation.goldPrice || null,
      amountPaid: transferCalculation.interScheme ? transferCalculation.sourceAmount ?? transferCalculation.sourceValue ?? 0 : gold ? 0 : runningAmount,
      goldGrams: runningGold,
      balance: gold ? runningGold : runningAmount,
    });
  }

  if (accountForm.addFirstTransaction) {
    const amountPaid = Number(accountForm.transactionAmount);
    if (Number.isFinite(amountPaid) && amountPaid > 0) {
      if (gold) {
        const goldPrice = Number(accountForm.transactionGoldPrice);
        const goldGrams = Number.isFinite(goldPrice) && goldPrice > 0 ? amountPaid / goldPrice : 0;
        runningGold += goldGrams;
        rows.push({ id: "initial", receiptNumber: "Generated on save", type: "Credit", goldPrice: goldPrice > 0 ? goldPrice : null, amountPaid, goldGrams, balance: runningGold });
      } else {
        runningAmount += amountPaid;
        rows.push({ id: "initial", receiptNumber: "Generated on save", type: "Credit", goldPrice: null, amountPaid, goldGrams: 0, balance: runningAmount });
      }
    }
  }
  return { rows, totalAmount: runningAmount, totalGold: runningGold };
}

function calculateInvestorSummary(investorId, accounts) {
  const investorAccounts = accounts.filter((account) => account.investorId === investorId);
  const activeAccounts = investorAccounts.filter(isActiveAccount);
  let totalAmount = 0, totalGold = 0, hasAmountAccount = false, hasGoldAccount = false;

  activeAccounts.forEach((account) => {
    if (isGoldAccount(account)) { hasGoldAccount = true; totalGold += getAccountGoldBalance(account); } 
    else { hasAmountAccount = true; totalAmount += getAccountAmountBalance(account); }
  });
  return { accounts: investorAccounts, activeAccounts, totalAmount, totalGold, hasAmountAccount, hasGoldAccount };
}

// ============================================================
// SHARED UI COMPONENTS (Flat & Minimalist)
// ============================================================
function InputField({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false, prefix = "" }) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex w-full items-center overflow-hidden rounded-md border border-slate-300 bg-white transition-colors focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 shadow-sm disabled:bg-slate-50 disabled:opacity-70">
        {prefix && <span className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">{prefix}</span>}
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500" />
      </div>
    </div>
  );
}

function SelectField({ label, name, value, onChange, children, required = false, disabled = false }) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select name={name} value={value} onChange={onChange} disabled={disabled} className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm font-medium text-slate-900 transition-colors focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500">
          {children}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const active = String(status || "ACTIVE").toUpperCase() === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${active ? "bg-emerald-100/50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function InvestmentInvestorsPage() {
  const navigate = useNavigate();

  // ============================================================
  // UI STATE
  // ============================================================

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [checkMobile, setCheckMobile] = useState("");
  const [existingInvestor, setExistingInvestor] = useState(null);
  const [existingAccounts, setExistingAccounts] = useState([]);
  const [selectedPreviousAccountId, setSelectedPreviousAccountId] =
    useState("");
  const [transferGoldPrice, setTransferGoldPrice] = useState("");
  const [accountMode, setAccountMode] = useState(null);
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [accountForm, setAccountForm] = useState({
    ...INITIAL_ACCOUNT,
  });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [sidebarInvestor, setSidebarInvestor] = useState(null);

  const [summaryUnlocked, setSummaryUnlocked] = useState(false);
  const [summaryPasscode, setSummaryPasscode] = useState("");
  const [summaryUnlocking, setSummaryUnlocking] = useState(false);

  // ============================================================
  // DATA HOOKS
  // ============================================================

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
  } = useInvestmentSchemes();

  const displayedInvestors = search.trim()
    ? searchResults
    : investors;

  const investorIds = useMemo(
    () =>
      displayedInvestors.map(
        (investor) => investor.id
      ),
    [displayedInvestors]
  );

  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
  } = useInvestmentAccountsForInvestors(
    investorIds
  );

 

  const activeSchemes = useMemo(() => schemes.filter((s) => String(s.status || "").toUpperCase() === "ACTIVE"), [schemes]);
  const selectedScheme = useMemo(() => activeSchemes.find((s) => s.id === accountForm.schemeId) || null, [activeSchemes, accountForm.schemeId]);
  const selectedSchemeIsGold = selectedScheme ? isGoldScheme(selectedScheme) : false;
  const hasSchemeMinimum = selectedScheme ? getSchemeMinimum(selectedScheme) > 0 : false;
  
  const selectedPreviousAccount = useMemo(() => existingAccounts.find((a) => a.id === selectedPreviousAccountId) || null, [existingAccounts, selectedPreviousAccountId]);
  const previousAccountIsGold = selectedPreviousAccount ? isGoldAccount(selectedPreviousAccount) : false;



  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

 

  const investorSummaries = useMemo(() => {
  const map = new Map();

  displayedInvestors.forEach((inv) => {
    map.set(
      inv.id,
      calculateInvestorSummary(
        inv.id,
        accounts
      )
    );
  });

  return map;
}, [displayedInvestors, accounts]);

  const aggregatedSummaryData = useMemo(() => {
    const stats = {};
    schemes.forEach((scheme) => {
      stats[scheme.id] = { scheme, activeInvestors: 0, inactiveInvestors: 0, totalAmount: 0, totalGold: 0 };
    });

    accounts.forEach((acc) => {
      if (stats[acc.schemeId]) {
        const active = !isClosedAccount(acc);
        if (active) stats[acc.schemeId].activeInvestors++;
        else stats[acc.schemeId].inactiveInvestors++;

        if (isGoldAccount(acc)) stats[acc.schemeId].totalGold += getAccountGoldBalance(acc);
        else stats[acc.schemeId].totalAmount += getAccountAmountBalance(acc);
      }
    });

    return Object.values(stats);
  }, [schemes, accounts]);

  const processedInvestors = useMemo(() => {
  if (activeTab === "SUMMARY") return [];

  const sourceInvestors = search.trim()
    ? searchResults
    : investors;

  let filtered = sourceInvestors.filter(
    (investor) => {
      const summary =
        investorSummaries.get(investor.id);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(
          investor.status || "ACTIVE"
        ).toUpperCase() === statusFilter;

      const matchesTab =
        activeTab === "ALL" ||
        (
          summary?.accounts?.some(
            (a) => a.schemeId === activeTab
          ) || false
        );

      return (
        matchesStatus &&
        matchesTab
      );
    }
  );

  filtered.sort((a, b) => {
    const sumA =
      investorSummaries.get(a.id);

    const sumB =
      investorSummaries.get(b.id);

    let valA;
    let valB;

    switch (sortConfig.key) {
      case "fullName":
        valA = String(
          a.fullName || ""
        ).toLowerCase();

        valB = String(
          b.fullName || ""
        ).toLowerCase();
        break;

      case "totalAmount":
        valA =
          sumA?.totalAmount || 0;

        valB =
          sumB?.totalAmount || 0;
        break;

      case "totalGold":
        valA =
          sumA?.totalGold || 0;

        valB =
          sumB?.totalGold || 0;
        break;

      default:
        valA =
          a.createdAt?.seconds || 0;

        valB =
          b.createdAt?.seconds || 0;
    }

    if (valA < valB) {
      return sortConfig.direction === "asc"
        ? -1
        : 1;
    }

    if (valA > valB) {
      return sortConfig.direction === "asc"
        ? 1
        : -1;
    }

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

  const paginatedInvestors = processedInvestors;

 

  function requestSort(key) {
    setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc" });
    setCurrentPage(1);
  }

  function SortIcon({ columnKey }) {
    if (sortConfig.key !== columnKey) return <ChevronsUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  const transferCalculation = useMemo(() => {
    if (accountMode !== "CARRY_FORWARD" || !selectedPreviousAccount || !selectedScheme) return null;
    const sourceAmount = getAccountAmountBalance(selectedPreviousAccount);
    const sourceGoldGrams = getAccountGoldBalance(selectedPreviousAccount);

    if (previousAccountIsGold === selectedSchemeIsGold) {
      return { interScheme: false, sourceUnit: previousAccountIsGold ? "GOLD_GRAMS" : "AMOUNT", destinationUnit: selectedSchemeIsGold ? "GOLD_GRAMS" : "AMOUNT", sourceAmount, sourceGoldGrams, goldPrice: null, resultValue: previousAccountIsGold ? sourceGoldGrams : sourceAmount, resultUnit: selectedSchemeIsGold ? "GOLD_GRAMS" : "AMOUNT", requiredGoldPrice: false };
    }

    const price = Number(transferGoldPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return { interScheme: true, sourceUnit: previousAccountIsGold ? "GOLD_GRAMS" : "AMOUNT", destinationUnit: selectedSchemeIsGold ? "GOLD_GRAMS" : "AMOUNT", sourceAmount, sourceGoldGrams, goldPrice: null, resultValue: null, resultUnit: selectedSchemeIsGold ? "GOLD_GRAMS" : "AMOUNT", requiredGoldPrice: true };
    }

    if (!previousAccountIsGold && selectedSchemeIsGold) {
      return { interScheme: true, sourceUnit: "AMOUNT", destinationUnit: "GOLD_GRAMS", sourceAmount, sourceGoldGrams: 0, goldPrice: price, resultValue: sourceAmount / price, resultUnit: "GOLD_GRAMS", requiredGoldPrice: true };
    }
    return { interScheme: true, sourceUnit: "GOLD_GRAMS", destinationUnit: "AMOUNT", sourceAmount: 0, sourceGoldGrams, goldPrice: price, resultValue: sourceGoldGrams * price, resultUnit: "AMOUNT", requiredGoldPrice: true };
  }, [accountMode, selectedPreviousAccount, selectedScheme, previousAccountIsGold, selectedSchemeIsGold, transferGoldPrice]);

  const previewData = useMemo(() => {
    return getInitialTransactionPreview({ selectedScheme, accountForm, transferCalculation, accountMode });
  }, [selectedScheme, accountForm, transferCalculation, accountMode]);

  // Handlers
  function openCreate() {
    setEditingId(null); setFormData({ ...INITIAL_FORM }); setAccountForm({ ...INITIAL_ACCOUNT });
    setCheckMobile(""); setExistingInvestor(null); setExistingAccounts([]); setSelectedPreviousAccountId("");
    setTransferGoldPrice(""); setTransferConfirmed(false); setAccountMode(null); setModalStep(1); setModalOpen(true);
  }

  function handleCheckMobile(e) {
    e.preventDefault();
    const mobile = normalizeMobile(checkMobile);
    if (!/^[0-9]{10}$/.test(mobile)) return setToast({ type: "error", message: "Enter a valid 10-digit mobile number." });
    
    const investor = investors.find((item) => normalizeMobile(item.mobileNumber) === mobile);
    if (!investor) {
      setFormData({ ...INITIAL_FORM, mobileNumber: mobile });
      setExistingInvestor(null); setExistingAccounts([]); setSelectedPreviousAccountId("");
      setAccountMode("FRESH"); setModalStep(2); return;
    }

    const investorAccounts = accounts.filter((a) => a.investorId === investor.id);
    setExistingInvestor(investor); setExistingAccounts(investorAccounts);
    setSelectedPreviousAccountId(""); setTransferGoldPrice("");

    if (investorAccounts.length > 0) setModalStep(1.5);
    else {
      setFormData({ fullName: investor.fullName || "", mobileNumber: mobile, alternateMobileNumber: investor.alternateMobileNumber || "", email: investor.email || "", dateOfBirth: investor.dateOfBirth || "", gender: investor.gender || "", address: investor.address || "", city: investor.city || "", pincode: investor.pincode || "" });
      setAccountMode("FRESH"); setModalStep(2);
    }
  }

  function chooseExistingAccountMode(mode) {
    if (!existingInvestor) return;
    if (mode === "CARRY_FORWARD" && !selectedPreviousAccountId) return setToast({ type: "error", message: "Select the account to close and transfer." });
    if (mode === "CARRY_FORWARD") {
      const selected = existingAccounts.find((a) => a.id === selectedPreviousAccountId);
      if (!selected) return setToast({ type: "error", message: "Source account not found." });
      if (isClosedAccount(selected)) return setToast({ type: "error", message: "A closed account cannot be transferred." });
    }
    setAccountMode(mode);
    setTransferGoldPrice("");
    setTransferConfirmed(false);
    setFormData({ fullName: existingInvestor.fullName || "", mobileNumber: existingInvestor.mobileNumber || "", alternateMobileNumber: existingInvestor.alternateMobileNumber || "", email: existingInvestor.email || "", dateOfBirth: existingInvestor.dateOfBirth || "", gender: existingInvestor.gender || "", address: existingInvestor.address || "", city: existingInvestor.city || "", pincode: existingInvestor.pincode || "" });
    setAccountForm({ ...INITIAL_ACCOUNT, previousAccountId: mode === "CARRY_FORWARD" ? selectedPreviousAccountId : "" });
    setModalStep(2);
  }

  function openEdit(investor) {
    setEditingId(investor.id);
    setFormData({ fullName: investor.fullName || "", mobileNumber: investor.mobileNumber || "", alternateMobileNumber: investor.alternateMobileNumber || "", email: investor.email || "", dateOfBirth: investor.dateOfBirth || "", gender: investor.gender || "", address: investor.address || "", city: investor.city || "", pincode: investor.pincode || "" });
    setAccountForm({ ...INITIAL_ACCOUNT });
    setModalStep(2); setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setTimeout(() => { setEditingId(null); setFormData({ ...INITIAL_FORM }); setAccountForm({ ...INITIAL_ACCOUNT }); setCheckMobile(""); setExistingInvestor(null); setExistingAccounts([]); setSelectedPreviousAccountId(""); setTransferGoldPrice(""); setAccountMode(null); setModalStep(1); }, 300);
  }

  function handleChange(e) { const { name, value } = e.target; setFormData((c) => ({ ...c, [name]: value })); }
  function handleAccountChange(e) {
  const {
    name,
    value,
    type,
    checked,
  } = e.target;

  setAccountForm((current) => {
    const next = {
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
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
  if (!accountForm.addFirstTransaction) {
    return;
  }

  const amountPaid = Number(
    accountForm.transactionAmount
  );

  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    throw new Error(
      selectedSchemeIsGold
        ? "Enter a valid amount paid for the Gold SIP."
        : "Enter a valid first transaction amount."
    );
  }

  const transactionDate = clean(
    accountForm.transactionDate ||
    accountForm.startDate
  );

  if (!transactionDate) {
    throw new Error(
      "Select the first transaction date."
    );
  }

  if (!clean(accountForm.paymentMode)) {
    throw new Error("Select payment mode.");
  }

  if (!clean(accountForm.transactionReference)) {
    throw new Error(
      "Enter the transaction reference."
    );
  }

  if (!clean(accountForm.transactionPasscode)) {
    throw new Error(
      "Enter CRM passcode."
    );
  }

  /*
   * INITIAL TRANSACTION MINIMUM
   *
   * The first actual payment must satisfy the
   * scheme minimum when the restriction is enabled.
   *
   * Cash:
   *   amountPaid >= scheme minimum
   *
   * Gold:
   *   amountPaid / goldPrice >= minimum grams
   *
   * When restriction is disabled, this validation
   * is intentionally skipped.
   */
  const schemeMinimum =
    selectedScheme
      ? getSchemeMinimum(selectedScheme)
      : 0;

  if (
    accountForm.minimumRestrictionEnabled &&
    schemeMinimum > 0
  ) {
    if (selectedSchemeIsGold) {
      const goldPrice = Number(
        accountForm.transactionGoldPrice
      );

      if (
        !Number.isFinite(goldPrice) ||
        goldPrice <= 0
      ) {
        throw new Error(
          "Enter today's 1g gold price for the Gold SIP."
        );
      }

      const goldCredited =
        amountPaid / goldPrice;

      if (goldCredited < schemeMinimum) {
        throw new Error(
          `First transaction must be at least ${formatGold(
            schemeMinimum
          )}.`
        );
      }
    } else {
      if (amountPaid < schemeMinimum) {
        throw new Error(
          `First transaction must be at least ${formatCurrency(
            schemeMinimum
          )}.`
        );
      }
    }
  }

  /*
   * Gold SIP always requires today's price
   * because the ledger stores the gold credited.
   */
  if (selectedSchemeIsGold) {
    const goldPrice = Number(
      accountForm.transactionGoldPrice
    );

    if (
      !Number.isFinite(goldPrice) ||
      goldPrice <= 0
    ) {
      throw new Error(
        "Enter today's 1g gold price for the Gold SIP."
      );
    }
  }
}

  async function handleSubmit(e) {
      e.preventDefault();
      if (saving) return;

      let createdInvestorId = null;
      let accountCreatedSuccessfully = false;
    try {
      const fullName = clean(formData.fullName);
      const mobileNumber = normalizeMobile(formData.mobileNumber);
      if (!fullName) throw new Error("Investor name is required.");
      if (!/^[0-9]{10}$/.test(mobileNumber)) throw new Error("Enter a valid 10-digit mobile number.");

      setSaving(true);

      if (editingId) {
        await updateInvestmentInvestor(editingId, { fullName, mobileNumber, alternateMobileNumber: formData.alternateMobileNumber, email: formData.email, dateOfBirth: formData.dateOfBirth, gender: formData.gender, address: formData.address, city: formData.city, pincode: formData.pincode });
        setToast({ type: "success", message: "Investor profile updated." });
        closeModal(); return;
      }

      if (!accountForm.schemeId) throw new Error("Select an investment scheme.");
      if (!accountForm.startDate) throw new Error("Select enrollment date.");
      const scheme = activeSchemes.find((item) => item.id === accountForm.schemeId);
      if (!scheme) throw new Error("Selected scheme is no longer active.");

      const gold = isGoldScheme(scheme);
      const contribution = Number(accountForm.contributionValue);
      const schemeMinimum = getSchemeMinimum(scheme);

      if (!Number.isFinite(contribution) || contribution <= 0) throw new Error(gold ? "Enter a valid gold quantity." : "Enter a valid investment amount.");
      if (accountForm.minimumRestrictionEnabled && schemeMinimum > 0 && contribution < schemeMinimum) {
        throw new Error(gold ? `Minimum investment is ${formatGold(schemeMinimum)}.` : `Minimum investment is ${formatCurrency(schemeMinimum)}.`);
      }

      if (accountMode === "CARRY_FORWARD") {
        if (!selectedPreviousAccountId || !selectedPreviousAccount) throw new Error("Source account missing.");
        if (isClosedAccount(selectedPreviousAccount)) throw new Error("Closed account cannot be transferred.");
        if (!transferCalculation || transferCalculation.resultValue === null) throw new Error("Enter gold price to calculate conversion.");
      }

      if (accountForm.addFirstTransaction) {
        const transactionMonth = clean(accountForm.transactionMonth);

        if (transactionMonth !== "M1") {
          throw new Error("The initial transaction must be M1.");
        }

        const transactionDate = clean(
          accountForm.transactionDate || accountForm.startDate
        );

        if (!transactionDate) {
          throw new Error("Select transaction date.");
        }

        const amountPaid = Number(accountForm.transactionAmount);

        if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
          throw new Error(
            gold
              ? "Enter a valid amount paid for the Gold SIP."
              : "Enter a valid transaction amount."
          );
        }

        if (!clean(accountForm.paymentMode)) {
          throw new Error("Select payment mode.");
        }

        if (!clean(accountForm.transactionReference)) {
          throw new Error("Enter the transaction reference.");
        }

        if (!clean(accountForm.transactionPasscode)) {
          throw new Error("Enter CRM passcode.");
        }

        if (gold) {
          const goldPrice = Number(accountForm.transactionGoldPrice);

          if (!Number.isFinite(goldPrice) || goldPrice <= 0) {
            throw new Error(
              "Enter today's 1g gold price for the Gold SIP."
            );
          }
        }
      }

      let investorId = existingInvestor?.id || null;
      if (!investorId) {
        const inv = await createInvestmentInvestor({
          fullName,
          mobileNumber,
          alternateMobileNumber: formData.alternateMobileNumber,
          email: formData.email,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          status: "ACTIVE",
        });

        investorId = inv.id;
        createdInvestorId = inv.id;
      }

      let previousAccountId = null;
      let accountOrigin = "NEW";

      if (accountMode === "CARRY_FORWARD") {
        if (!selectedPreviousAccount) {
          throw new Error(
            "Source account missing."
          );
        }

        previousAccountId =
          selectedPreviousAccount.id;

        accountOrigin = "CARRY_FORWARD";
      }

      const account = await createInvestmentAccount({
        investorId,
        scheme,
        contributionValue: contribution,
        startDate: accountForm.startDate,

        minimumRestrictionEnabled: Boolean(
          accountForm.minimumRestrictionEnabled
        ),

        /*
        * IMPORTANT:
        * Carry-forward balance is calculated atomically
        * inside investmentAccounts.js.
        *
        * Do NOT pass transferCalculation.resultValue
        * as an opening balance here.
        */
        openingBalanceAmount: 0,
        openingBalanceGoldGrams: 0,

        accountOrigin,
        previousAccountId,

        transferGoldPrice:
          accountMode === "CARRY_FORWARD"
            ? Number(transferGoldPrice)
            : null,

        initialTransaction:
          accountForm.addFirstTransaction
            ? {
                transactionMonth:
                  clean(accountForm.transactionMonth) || "M1",

                transactionType:
                  clean(accountForm.transactionType) || "CREDIT",

                transactionCategory:
                  clean(accountForm.transactionCategory) || "INITIAL",

                amountPaid:
                  Number(accountForm.transactionAmount),

                goldPrice:
                  gold
                    ? Number(accountForm.transactionGoldPrice)
                    : null,

                date:
                  clean(accountForm.transactionDate) ||
                  clean(accountForm.startDate),

                paymentMode:
                  clean(accountForm.paymentMode),

                transactionReference:
                  clean(accountForm.transactionReference),

                passcode:
                  clean(accountForm.transactionPasscode),
              }
            : null,
      });

      accountCreatedSuccessfully = true;



      if (previousAccountId) {
        await createInvestmentAuditLog({
          action:
            "INVESTMENT_ACCOUNT_TRANSFER_COMPLETED",

          entityType:
            "INVESTMENT_ACCOUNT",

          entityId:
            previousAccountId,

          description:
            `Account ${
              selectedPreviousAccount?.accountNumber ||
              previousAccountId
            } was transferred to ${
              account.accountNumber
            }.`,

          metadata: {
            previousAccountId,

            previousAccountNumber:
              selectedPreviousAccount?.accountNumber ||
              "",

            newAccountId:
              account.id,

            newAccountNumber:
              account.accountNumber,

            transferType:
              transferCalculation?.resultUnit ||
              null,

            goldPrice:
              transferGoldPrice
                ? Number(transferGoldPrice)
                : null,

            transferredAmount:
              transferCalculation?.resultUnit ===
              "AMOUNT"
                ? Number(
                    transferCalculation?.resultValue ||
                      0
                  )
                : 0,

            transferredGoldGrams:
              transferCalculation?.resultUnit ===
              "GOLD_GRAMS"
                ? Number(
                    transferCalculation?.resultValue ||
                      0
                  )
                : 0,
          },
        });
      }

      await createInvestmentAuditLog({ action: "INVESTMENT_ACCOUNT_CREATED", entityType: "INVESTMENT_ACCOUNT", entityId: account.id, description: `Account ${account.accountNumber} created.`, metadata: { investorId, schemeId: scheme.id, accountNumber: account.accountNumber, accountOrigin, previousAccountId, contributionValue: contribution, contributionUnit: gold ? "GOLD_GRAMS" : "AMOUNT", firstTransactionAdded: Boolean(accountForm.addFirstTransaction) } });

      setToast({ type: "success", message: accountMode === "CARRY_FORWARD" ? `Transfer complete. ${account.accountNumber} created.` : `Account ${account.accountNumber} created successfully.` });
      closeModal();
    } catch (err) {
        console.error("Investment enrollment failed:", err);

        /*
        * If this operation created a brand-new investor but the
        * account creation failed, remove the orphan investor.
        *
        * Existing investors are NEVER deleted here.
        */
        if (
          createdInvestorId &&
          !accountCreatedSuccessfully
        ) {
          try {
            await deleteInvestmentInvestor(
              createdInvestorId
            );
          } catch (rollbackError) {
            console.error(
              "Failed to rollback newly created investor:",
              rollbackError
            );
          }
        }

        setToast({
          type: "error",
          message:
            err.message ||
            "Failed to create investment account.",
        });
      } finally {
        setSaving(false);
      }
  }

  function confirmTransfer() {
  if (accountMode !== "CARRY_FORWARD") {
    return;
  }

  if (!selectedPreviousAccount) {
    setToast({
      type: "error",
      message: "Select the account to close and transfer.",
    });
    return;
  }

  if (!selectedScheme) {
    setToast({
      type: "error",
      message: "Select the new investment scheme.",
    });
    return;
  }

  if (!transferCalculation) {
    setToast({
      type: "error",
      message: "Transfer calculation is not available.",
    });
    return;
  }

  if (transferCalculation.requiredGoldPrice) {
    const price = Number(transferGoldPrice);

    if (!Number.isFinite(price) || price <= 0) {
      setToast({
        type: "error",
        message: "Enter today's valid 1g gold price.",
      });
      return;
    }
  }

  if (
    transferCalculation.resultValue === null ||
    !Number.isFinite(Number(transferCalculation.resultValue))
  ) {
    setToast({
      type: "error",
      message: "Unable to calculate the transfer amount.",
    });
    return;
  }

  setTransferConfirmed(true);

  setToast({
    type: "success",
    message: "Transfer amount calculated and confirmed.",
  });
}

  async function handleToggleStatus(investor) {
    try {
      const nextStatus = String(investor.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await updateInvestmentInvestorStatus(investor.id, nextStatus);
      setToast({ type: "success", message: `Investor marked as ${nextStatus.toLowerCase()}.` });
    } catch (err) { setToast({ type: "error", message: "Failed to update status." }); }
  }

  function handleExportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Full Name,Mobile,Email,Accounts,Total Amount,Total Gold,Status\n";
    processedInvestors.forEach((investor) => {
      const summary = investorSummaries.get(investor.id);
      const accountNumbers = summary?.accounts?.map((a) => a.accountNumber).join(" | ") || "";
      csvContent += `"${investor.fullName || ""}","${investor.mobileNumber || ""}","${investor.email || ""}","${accountNumbers}","${summary?.totalAmount || 0}","${summary?.totalGold || 0}","${investor.status || "ACTIVE"}"\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent); link.download = `Investors_Directory_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FAFAFA] p-0 sm:p-4 lg:p-6 lg:overflow-hidden relative">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col overflow-hidden bg-white sm:border sm:border-gray-200 sm:rounded-2xl shadow-sm animate-in fade-in duration-300">

        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-bottom-6 duration-300 ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> : <AlertCircle size={18} className="shrink-0 text-rose-600" />}
            <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
          </div>
        )}

        {/* ==================================================
            COMPACT HEADER & TOOLBAR
        ================================================== */}
        <div className="shrink-0 border-b border-gray-100 px-5 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <Briefcase size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Investors Directory</h1>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">Manage {investors.length} client portfolios</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Link to="/crm/investment/schemes" className="flex flex-1 sm:flex-none h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                <Settings2 size={14} /> <span className="hidden sm:inline">Schemes</span>
              </Link>
              <button onClick={handleExportCSV} className="flex flex-1 sm:flex-none h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                <Download size={14} /> <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={openCreate} className="flex flex-1 sm:flex-none h-9 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors">
                <Plus size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">New Investor</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex w-full lg:w-auto gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setActiveTab("SUMMARY")} className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${activeTab === "SUMMARY" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}>
                 Summary
              </button>
              <button onClick={() => setActiveTab("ALL")} className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${activeTab === "ALL" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}>
                All Investors
              </button>
              {activeSchemes.map((scheme) => (
                <button key={scheme.id} onClick={() => setActiveTab(scheme.id)} className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${activeTab === scheme.id ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}>
                  {scheme.schemeName}
                </button>
              ))}
            </div>
            
            {activeTab !== "SUMMARY" && (
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search investors..." className="w-full rounded-md border border-gray-200 bg-gray-50/50 py-1.5 pl-8 pr-3 text-xs font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 transition-colors" />
                </div>
                <div className="relative shrink-0 w-28">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none rounded-md border border-gray-200 bg-gray-50/50 py-1.5 pl-3 pr-8 text-[11px] font-semibold text-gray-600 outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 transition-colors">
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            )}
          </div>
          {(error ||  searchError || accountsError || schemesError) && (
            <div className="mt-3 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              <AlertCircle size={14} /> {error || searchError || accountsError || schemesError}
            </div>
          )}
        </div>

        {/* ==================================================
            MAIN CONTENT AREA
        ================================================== */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
          
          {/* ----- SUMMARY TAB ----- */}
          {activeTab === "SUMMARY" ? (
            <div className="flex h-full flex-col overflow-hidden bg-[#FAFAFA]">
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                
                {/* Desktop Pivot Table */}
                <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th rowSpan={2} className="px-5 py-3 border-r border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500">S.No</th>
                          <th rowSpan={2} className="px-5 py-3 border-r border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500">Scheme Name</th>
                          <th colSpan={2} className="px-5 py-2 border-r border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">Total Investors</th>
                          <th colSpan={2} className="px-5 py-2 border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">Total Collection</th>
                        </tr>
                        <tr>
                          <th className="px-5 py-2 border-r border-gray-200 text-[10px] font-bold uppercase tracking-wider text-emerald-600 text-center bg-emerald-50/30">Active</th>
                          <th className="px-5 py-2 border-r border-gray-200 text-[10px] font-bold uppercase tracking-wider text-rose-600 text-center bg-rose-50/30">Inactive</th>
                          <th className="px-5 py-2 border-r border-gray-200 text-[10px] font-bold uppercase tracking-wider text-indigo-600 text-center bg-indigo-50/30">Amount (₹)</th>
                          <th className="px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 text-center bg-amber-50/30">Gold (g)</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {aggregatedSummaryData.map((data, idx) => (
                          <tr key={data.scheme.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 border-r border-gray-100 text-xs font-mono text-gray-400">{(idx + 1).toString().padStart(2, '0')}</td>
                            <td className="px-5 py-3 border-r border-gray-100 text-sm font-semibold text-gray-900">{data.scheme.schemeName}</td>
                            <td className="px-5 py-3 border-r border-gray-100 text-sm font-black font-mono text-center text-emerald-700">{data.activeInvestors}</td>
                            <td className="px-5 py-3 border-r border-gray-100 text-sm font-black font-mono text-center text-rose-700">{data.inactiveInvestors}</td>
                            <td className="px-5 py-3 border-r border-gray-100 text-sm font-black font-mono text-right text-gray-900">{formatCurrency(data.totalAmount)}</td>
                            <td className="px-5 py-3 text-sm font-black font-mono text-right text-amber-600">{formatGold(data.totalGold)}</td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
                </div>

                {/* Mobile Cards for Summary */}
                <div className="flex lg:hidden flex-col gap-4">
                  {aggregatedSummaryData.map((data) => (
                    <div key={data.scheme.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                       <h4 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{data.scheme.schemeName}</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Investors</p>
                             <div className="flex justify-between items-center bg-emerald-50 rounded px-2 py-1 text-xs"><span className="text-emerald-700 font-semibold">Active:</span> <span className="font-mono font-black">{data.activeInvestors}</span></div>
                             <div className="flex justify-between items-center bg-rose-50 rounded px-2 py-1 text-xs"><span className="text-rose-700 font-semibold">Inactive:</span> <span className="font-mono font-black">{data.inactiveInvestors}</span></div>
                          </div>
                          <div className="space-y-2">
                             <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Collection</p>
                             <div className="flex flex-col bg-indigo-50/50 rounded p-1.5 text-right"><span className="text-[9px] text-indigo-600 font-semibold">AMOUNT</span> <span className="font-mono text-xs font-black text-gray-900">{formatCurrency(data.totalAmount)}</span></div>
                             <div className="flex flex-col bg-amber-50/50 rounded p-1.5 text-right"><span className="text-[9px] text-amber-700 font-semibold">GOLD</span> <span className="font-mono text-xs font-black text-amber-600">{formatGold(data.totalGold)}</span></div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ) : (
            /* ----- REGULAR LIST TAB ----- */
            <>
              {loading || searchLoading || accountsLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                </div>
              ) : processedInvestors.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8 bg-gray-50/50 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 shadow-sm">
                    <UserRound size={24} />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">No Investors Found</h2>
                  <p className="mt-1 text-sm text-gray-500">Adjust your filters or register a new investor profile.</p>
                </div>
              ) : (
                <>
                  {/* DESKTOP TABLE */}
                  <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-white border-b border-gray-100">
                          <tr>
                            <th className="px-5 py-3"><button onClick={() => requestSort("fullName")} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 hover:text-indigo-600">Investor Profile <SortIcon columnKey="fullName" /></button></th>
                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Accounts & Contact</th>
                            <th className="px-5 py-3 text-right"><button onClick={() => requestSort("totalAmount")} className="flex w-full justify-end items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 hover:text-indigo-600">Total Funds <SortIcon columnKey="totalAmount" /></button></th>
                            <th className="px-5 py-3 text-right"><button onClick={() => requestSort("totalGold")} className="flex w-full justify-end items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 hover:text-indigo-600">Total Gold <SortIcon columnKey="totalGold" /></button></th>
                            <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {paginatedInvestors.map((investor) => {
                            const summary = investorSummaries.get(investor.id) || { accounts: [], totalAmount: 0, totalGold: 0, hasGoldAccount: false, hasAmountAccount: false };
                            return (
                              <tr key={investor.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="whitespace-nowrap px-5 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                                      {(investor.fullName || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{investor.fullName}</p>
                                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500"><MapPin size={10}/> {investor.city || "No Location"}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3">
                                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 mb-1.5"><Phone size={12} className="text-gray-400"/> {investor.mobileNumber}</p>
                                  <div className="flex items-center gap-1">
                                    {summary.accounts.length === 0 ? <span className="text-[10px] text-gray-400 italic">No accounts</span> : (
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex items-center -space-x-2">
                                          {summary.accounts.slice(0, 3).map((acc, i) => (
                                            <div key={acc.id} className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold ${isClosedAccount(acc) ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'} relative z-[${3-i}] shadow-sm`} title={acc.accountNumber}>
                                              {acc.accountNumber?.slice(-2)}
                                            </div>
                                          ))}
                                        </div>
                                        <button type="button" className="text-[10px] font-medium text-gray-500 ml-1 hover:text-indigo-600 cursor-pointer" onClick={() => setSidebarInvestor(investor)}>
                                          {summary.accounts.length} Account{summary.accounts.length !== 1 && 's'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3 text-right">
                                  <span className={`text-sm font-semibold font-mono ${summary.hasAmountAccount ? "text-gray-900" : "text-gray-400"}`}>
                                    {summary.hasAmountAccount ? formatCurrency(summary.totalAmount) : "—"}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3 text-right">
                                  <span className={`text-sm font-semibold font-mono ${summary.hasGoldAccount ? "text-amber-600" : "text-gray-400"}`}>
                                    {summary.hasGoldAccount ? formatGold(summary.totalGold) : "—"}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3 text-center">
                                  <StatusBadge status={investor.status} />
                                </td>
                                <td className="whitespace-nowrap px-5 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button onClick={() => navigate(`/crm/investment/investors/${investor.id}`)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors" title="View Profile"><Eye size={16} /></button>
                                    <button onClick={() => openEdit(investor)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors" title="Edit Profile"><Edit3 size={16} /></button>
                                    <button onClick={() => handleToggleStatus(investor)} className="rounded p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors" title="Toggle Status"><Power size={16} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* MOBILE / TABLET LIST */}
                  <div className="flex lg:hidden flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    <div className="divide-y divide-gray-100">
                      {paginatedInvestors.map((investor) => {
                        const summary = investorSummaries.get(investor.id) || { accounts: [], totalAmount: 0, totalGold: 0, hasGoldAccount: false, hasAmountAccount: false };
                        return (
                          <div key={investor.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                                  {(investor.fullName || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{investor.fullName}</p>
                                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10}/> {investor.mobileNumber}</p>
                                </div>
                              </div>
                              <StatusBadge status={investor.status} />
                            </div>

                            <div className="flex items-center gap-4 mb-3">
                               <div className="flex-1">
                                 <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5 block">Funds</span>
                                 <span className="text-xs font-semibold font-mono text-gray-900">{summary.hasAmountAccount ? formatCurrency(summary.totalAmount) : "—"}</span>
                               </div>
                               <div className="flex-1">
                                 <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5 block">Gold</span>
                                 <span className="text-xs font-semibold font-mono text-amber-600">{summary.hasGoldAccount ? formatGold(summary.totalGold) : "—"}</span>
                               </div>
                               <div className="flex-1 text-right">
                                 <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5 block">Accounts</span>
                                 {summary.accounts.length === 0 ? (
                                   <span className="text-xs text-gray-400 italic">None</span>
                                 ) : (
                                   <button type="button" onClick={() => setSidebarInvestor(investor)} className="text-xs font-bold text-indigo-600 hover:underline flex items-center justify-end gap-1 ml-auto">
                                     {summary.accounts.length} <ChevronRight size={12}/>
                                   </button>
                                 )}
                               </div>
                            </div>

                            <div className="flex gap-2">
                              <button onClick={() => navigate(`/crm/investment/investors/${investor.id}`)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-[11px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                                <Eye size={14} /> View
                              </button>
                              <button onClick={() => openEdit(investor)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-[11px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                                <Edit3 size={14} /> Edit
                              </button>
                              <button onClick={() => handleToggleStatus(investor)} className="flex-none flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-400 shadow-sm hover:text-rose-600 hover:bg-rose-50">
                                <Power size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PAGINATION FOOTER */}
                  {(hasPreviousPage || hasNextPage) && (
                      <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-5 py-3 bg-white">
                        <p className="text-[11px] font-medium text-gray-500">
                          Page{" "}
                          <span className="font-semibold text-gray-900">
                            {currentPage}
                          </span>
                          {" "}•{" "}
                          <span className="font-semibold text-gray-900">
                            {pageSize}
                          </span>{" "}
                          records per page
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={previousPage}
                            disabled={!hasPreviousPage || loading || accountsLoading}
                            className="px-3 py-1.5 text-[11px] font-semibold rounded-md border border-gray-200 bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-50 shadow-sm transition-colors"
                          >
                            Prev
                          </button>

                          <button
                            onClick={nextPage}
                            disabled={!hasNextPage || loading || accountsLoading}
                            className="px-3 py-1.5 text-[11px] font-semibold rounded-md border border-gray-200 bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-50 shadow-sm transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          ACCOUNT SELECTOR SIDEBAR (Desktop & Mobile)
      ====================================================== */}
      {sidebarInvestor && (
        <>
          <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSidebarInvestor(null)} />
          <div className="fixed z-[70] flex flex-col bg-white shadow-2xl transition-all inset-x-0 bottom-0 max-h-[85vh] rounded-t-[2rem] animate-in slide-in-from-bottom-full lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto lg:h-full lg:w-full lg:max-w-sm lg:max-h-none lg:rounded-none lg:border-l lg:border-gray-200 lg:slide-in-from-right-full duration-300">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">{sidebarInvestor.fullName}'s Accounts</h3>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">Select an account to view ledger</p>
              </div>
              <button type="button" onClick={() => setSidebarInvestor(null)} className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition-colors">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
              {investorSummaries.get(sidebarInvestor.id)?.accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CreditCard size={24} className="text-gray-300 mb-2"/>
                  <p className="text-sm font-medium text-gray-500">No accounts found.</p>
                </div>
              ) : (
                investorSummaries.get(sidebarInvestor.id)?.accounts.map(acc => {
                  const closed = isClosedAccount(acc);
                  const gold = isGoldAccount(acc);
                  return (
                    <button key={acc.id} onClick={() => { setSidebarInvestor(null); navigate(`/crm/investment/accounts/${acc.id}`); }} className={`flex w-full flex-col rounded-xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 ${closed ? "border-rose-100 bg-white" : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"}`}>
                      <div className="flex w-full items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${closed ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-600"}`}>
                            <CreditCard size={14} />
                          </div>
                          <div>
                            <span className={`text-sm font-bold ${closed ? "text-rose-900" : "text-gray-900"}`}>{acc.accountNumber}</span>
                            <p className="text-[10px] font-medium text-gray-500 mt-0.5">{acc.schemeSnapshot?.schemeName || acc.schemeId}</p>
                          </div>
                        </div>
                        {closed ? (
                          <span className="rounded bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700 uppercase tracking-wider">Closed</span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Active</span>
                        )}
                      </div>
                      <div className="w-full flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Current Balance</span>
                        <span className={`font-mono text-sm font-black ${gold ? "text-amber-600" : "text-gray-900"}`}>
                          {gold ? formatGold(getAccountGoldBalance(acc)) : formatCurrency(getAccountAmountBalance(acc))}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ======================================================
          CREATE / EDIT WIZARD MODAL (Clean Document Style)
      ====================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex h-full w-full flex-col bg-white sm:max-h-[95vh] sm:max-w-3xl sm:rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  {modalStep === 1 ? "Verify Identity" : modalStep === 1.5 ? "Link Account" : editingId ? "Edit Profile" : "Register Investor"}
                </h2>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  {modalStep === 1 ? "Step 1 of 2: Check for existing profile." : modalStep === 1.5 ? "Step 1.5: Review existing profile." : editingId ? "Update personal details." : "Step 2 of 2: Complete profile & scheme."}
                </p>
              </div>
              <button onClick={closeModal} disabled={saving} className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* STEP 1: MOBILE CHECK */}
            {modalStep === 1 && (
              <form onSubmit={handleCheckMobile} className="flex-1 flex flex-col p-6 sm:p-12 bg-white overflow-y-auto">
                <div className="mx-auto w-full max-w-md flex flex-col justify-center h-full min-h-[400px]">
                  <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Let's get started.</h3>
                  <p className="text-sm font-medium text-gray-500 mb-8">
                    Enter the investor's mobile number. We'll search the directory to ensure no duplicate profiles are created.
                  </p>
                  <div className="w-full text-left space-y-6">
                    <InputField label="10-Digit Mobile Number" name="checkMobile" value={checkMobile} onChange={(e) => setCheckMobile(e.target.value)} type="tel" prefix="+91" required placeholder="e.g. 9876543210" />
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700">
                      Verify & Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 1.5: EXISTING ACCOUNTS FOUND */}
            {modalStep === 1.5 && (
              <div className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-10">
                <div className="mx-auto max-w-2xl flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                  
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-900 mb-2">
                      <AlertCircle size={20} strokeWidth={2.5}/> 
                      <h3 className="text-base font-bold">Existing Profile Found</h3>
                    </div>
                    <p className="text-sm font-medium text-amber-800 leading-relaxed">
                      <span className="font-bold">{existingInvestor?.fullName}</span> already has <span className="font-bold">{existingAccounts.length}</span> investment account(s) registered under this mobile number.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Active Accounts Overview</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {existingAccounts.map((account) => {
                        const closed = isClosedAccount(account);
                        const gold = isGoldAccount(account);
                        const selected = selectedPreviousAccountId === account.id;

                        return (
                          <button
                            key={account.id}
                            type="button"
                            disabled={closed}
                            onClick={() => { setSelectedPreviousAccountId(account.id); setTransferGoldPrice(""); }}
                            className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left transition-all ${
                              closed ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60" 
                              : selected ? "border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600" : "border-gray-200 bg-white hover:border-gray-400"
                            }`}
                          >
                            <div>
                              <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                <CreditCard size={14} className={closed ? "text-gray-400" : "text-indigo-500"} />
                                {account.accountNumber}
                                {closed && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[8px] font-bold text-rose-700">CLOSED</span>}
                              </p>
                              <p className="mt-1 text-[10px] font-medium text-gray-500 truncate max-w-[150px]">
                                {account?.schemeSnapshot?.schemeName || account.schemeId}
                              </p>
                            </div>
                            <span className={`font-mono text-sm font-black ${gold ? "text-amber-600" : "text-gray-900"}`}>
                              {gold ? formatGold(getAccountGoldBalance(account)) : formatCurrency(getAccountAmountBalance(account))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    <button type="button" disabled={!selectedPreviousAccountId} onClick={() => chooseExistingAccountMode("CARRY_FORWARD")} className="flex flex-col items-start rounded-xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-indigo-600 disabled:cursor-not-allowed disabled:opacity-50">
                      <div className="flex items-center gap-2 mb-2"><ArrowRightLeft size={16} className="text-indigo-600"/><p className="text-sm font-bold text-gray-900">Close Old & Carry Balance</p></div>
                      <p className="text-xs text-gray-500 leading-relaxed">Close the selected account and securely transfer its accumulated balance into the newly created account.</p>
                    </button>
                    <button type="button" onClick={() => chooseExistingAccountMode("FRESH")} className="flex flex-col items-start rounded-xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-indigo-600">
                      <div className="flex items-center gap-2 mb-2"><Plus size={16} className="text-indigo-600"/><p className="text-sm font-bold text-gray-900">Create Fresh Enrollment</p></div>
                      <p className="text-xs text-gray-500 leading-relaxed">Create a completely standalone investment account for this profile without linking or transferring old balances.</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: FLAT FORM */}
            {modalStep === 2 && (
              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 animate-in fade-in duration-300 bg-white">
                <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 [&::-webkit-scrollbar]:hidden">
                  
                  <div className="mx-auto max-w-2xl space-y-10">
                    
                    {/* SECTION: PROFILE */}
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Personal Information</h3>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <InputField label="Full Legal Name" name="fullName" value={formData.fullName} onChange={handleChange} required disabled={saving || Boolean(existingInvestor)} />
                        </div>
                        <InputField label="Primary Mobile" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} type="tel" prefix="+91" required disabled={true} />
                        <InputField label="Alternate Mobile" name="alternateMobileNumber" value={formData.alternateMobileNumber} onChange={handleChange} type="tel" disabled={saving} />
                        <div className="sm:col-span-2">
                          <InputField label="Email Address" name="email" value={formData.email} onChange={handleChange} type="email" disabled={saving} />
                        </div>
                        <InputField label="Date of Birth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} type="date" disabled={saving} />
                        <SelectField label="Gender" name="gender" value={formData.gender} onChange={handleChange} disabled={saving}>
                          <option value="">Select Gender</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </SelectField>
                      </div>
                    </section>

                    <hr className="border-slate-200" />

                    {/* SECTION: LOCATION */}
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Location Details</h3>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Full Address</label>
                          <textarea name="address" value={formData.address} onChange={handleChange} disabled={saving} rows={3} className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors shadow-sm disabled:bg-slate-50" />
                        </div>
                        <InputField label="City" name="city" value={formData.city} onChange={handleChange} disabled={saving} />
                        <InputField label="Postal Code" name="pincode" value={formData.pincode} onChange={handleChange} disabled={saving} />
                      </div>
                    </section>

                    {/* SECTION: INVESTMENT SETUP (ONLY ON CREATE) */}
                    {!editingId && (
                      <>
                        <hr className="border-slate-200" />
                        
                        <section>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Account Configuration</h3>
                          
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <SelectField label="Select Scheme" name="schemeId" value={accountForm.schemeId} onChange={handleAccountChange} required disabled={saving || schemesLoading}>
                                <option value="">{schemesLoading ? "Loading..." : "Select an investment scheme"}</option>
                                {activeSchemes.map((scheme) => (
                                  <option key={scheme.id} value={scheme.id}>{scheme.schemeName} — {getSchemeMinimumLabel(scheme)}</option>
                                ))}
                              </SelectField>
                            </div>

                            {/* DYNAMIC TRANSFER LOGIC DIRECTLY BELOW SCHEME */}
                            {accountMode === "CARRY_FORWARD" && selectedPreviousAccount && selectedScheme && (
                              <div className="sm:col-span-2 mt-2 bg-slate-50 rounded-xl p-5 border border-slate-200 animate-in fade-in duration-300">
                                <h4 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <ArrowRightLeft size={16} className="text-slate-500" /> Transfer Balance Breakdown
                                </h4>
                                
                                <div className="flex flex-col md:flex-row items-stretch gap-4">
                                  <div className="flex-1 w-full bg-white border border-rose-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1">Closing Account</span>
                                      <p className="font-mono text-xl font-black text-gray-900">{selectedPreviousAccount.accountNumber}</p>
                                      <p className="text-[10px] font-medium text-gray-500 mt-1 truncate">{selectedPreviousAccount.schemeSnapshot?.schemeName}</p>
                                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-500">Balance</span>
                                        <span className={`text-base font-black ${previousAccountIsGold ? 'text-amber-700' : 'text-gray-900'}`}>
                                          {previousAccountIsGold ? formatGold(getAccountGoldBalance(selectedPreviousAccount)) : formatCurrency(getAccountAmountBalance(selectedPreviousAccount))}
                                        </span>
                                      </div>
                                  </div>
                                  
                                  <div className="hidden md:flex flex-col justify-center text-gray-300"><ArrowRight size={24} /></div>
                                  
                                  <div className="flex-1 w-full bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Opening Account</span>
                                      <p className="font-mono text-xl font-black text-gray-900">{previewAccountNumber(selectedScheme) || "Pending..."}</p>
                                      <p className="text-[10px] font-medium text-gray-500 mt-1 truncate">{selectedScheme.schemeName}</p>
                                      <div className="mt-4 pt-4 border-t border-emerald-200/60 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-500">Initial Balance</span>
                                        <span className="text-base font-black text-emerald-600">
                                          {transferCalculation?.resultValue != null 
                                            ? (transferCalculation.resultUnit === "GOLD_GRAMS" ? formatGold(transferCalculation.resultValue) : formatCurrency(transferCalculation.resultValue)) 
                                            : "Awaiting Rate"}
                                        </span>
                                      </div>
                                  </div>
                                </div>

                                {transferCalculation?.requiredGoldPrice && (
                                  <div className="mt-6 bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
                                    <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5"><AlertCircle size={14}/> Unit Conversion Required</p>
                                    <p className="text-[10px] font-medium text-amber-800 mb-4 leading-relaxed">
                                      Transferring between Gold and Cash schemes requires today's 1 Gram Gold Price for an exact conversion.
                                    </p>
                                    <div className="max-w-sm">
                                      <InputField label="Today's 1g Gold Price" name="transferGoldPrice" value={transferGoldPrice} onChange={(e) => { setTransferGoldPrice(e.target.value); setTransferConfirmed(false); }} type="number" prefix="₹" required disabled={saving} />
                                    </div>
                                  </div>
                                )}

                                {!transferConfirmed ? (
                                  <button type="button" onClick={confirmTransfer} disabled={transferCalculation?.resultValue == null} className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
                                    <CheckCircle2 size={18} /> Confirm Transfer Amount
                                  </button>
                                ) : (
                                  <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-emerald-800 text-sm font-bold animate-in fade-in">
                                    <CheckCircle2 size={18} className="text-emerald-600"/> Transfer amount locked and confirmed.
                                  </div>
                                )}
                              </div>
                            )}

                            {selectedScheme && (
                              <div className="sm:col-span-2 flex items-center justify-between mt-2">
                                <div>
                                  <p className="text-xs font-bold text-gray-900">Enforce Scheme Minimum</p>
                                  <p className="mt-0.5 text-[10px] text-gray-500">
                                    Standard minimum is <span className="font-bold text-gray-900">{getSchemeMinimumLabel(selectedScheme)}</span>
                                  </p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center">
                                  <input type="checkbox" name="minimumRestrictionEnabled" checked={accountForm.minimumRestrictionEnabled} onChange={handleAccountChange} disabled={saving || !hasSchemeMinimum} className="peer sr-only" />
                                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-focus:outline-none disabled:opacity-50"></div>
                                </label>
                              </div>
                            )}

                            <div className="space-y-1 w-full sm:col-span-2 mt-4">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Account Preview</label>
                              <div className="flex h-[42px] w-full items-center rounded-lg border border-slate-300 bg-slate-50 px-3">
                                {selectedScheme ? (
                                  <span className="font-bold font-mono tracking-widest text-indigo-700 text-base">{previewAccountNumber(selectedScheme)}</span>
                                ) : <span className="text-xs font-medium italic text-gray-400">Select scheme</span>}
                              </div>
                            </div>

                            <div className="space-y-1 w-full mt-2">
                              <InputField label={selectedSchemeIsGold ? "Monthly Gold" : "Monthly Amount"} name="contributionValue" value={accountForm.contributionValue} onChange={handleAccountChange} type="number" prefix={selectedSchemeIsGold ? "g" : "₹"} required disabled={saving || !selectedScheme} />
                              {selectedScheme && hasSchemeMinimum && accountForm.minimumRestrictionEnabled && accountForm.contributionValue !== "" && Number(accountForm.contributionValue) < getSchemeMinimum(selectedScheme) && (
                                <p className="text-[10px] font-bold text-red-600 flex items-center gap-1 mt-1 animate-in fade-in">
                                  <AlertCircle size={12} /> Must be at least {getSchemeMinimumLabel(selectedScheme)}.
                                </p>
                              )}
                            </div>

                            <div className="w-full mt-2">
                              <InputField label="Enrollment Date" name="startDate" value={accountForm.startDate} onChange={handleAccountChange} type="date" required disabled={saving} />
                            </div>
                          </div>
                        </section>

                        <hr className="border-gray-100 mb-10" />

                        {/* SECTION 3: INITIAL TRANSACTION (ONLY ON CREATE) */}

                      <section>
                        <div className="flex items-start justify-between gap-4 mb-6">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              Initial Transaction
                              <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                                M1
                              </span>
                            </h3>

                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                              Record the first actual payment received at account opening.
                              This creates M1 in the transaction ledger.
                            </p>
                          </div>

                          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                            <input
                              type="checkbox"
                              name="addFirstTransaction"
                              checked={accountForm.addFirstTransaction}
                              onChange={handleAccountChange}
                              disabled={saving || !selectedScheme}
                              className="peer sr-only"
                            />

                            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-focus:outline-none disabled:opacity-50" />
                          </label>
                        </div>

                        {!selectedScheme && (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
                            <p className="text-xs font-bold text-slate-600">
                              Select a scheme first.
                            </p>

                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                              Transaction fields will be configured automatically according
                              to the selected scheme.
                            </p>
                          </div>
                        )}

                        {selectedScheme && !accountForm.addFirstTransaction && (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
                            <div className="flex items-start gap-3">
                              <FileText
                                size={17}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />

                              <div>
                                <p className="text-xs font-bold text-slate-700">
                                  No initial transaction will be recorded.
                                </p>

                                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                                  The account will be created with zero transaction collections.
                                  You can record M1 later from the account ledger.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedScheme && accountForm.addFirstTransaction && (
                          <div className="ml-0 sm:ml-2 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-300">

                            {/* SCHEME CONTEXT */}
                            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                    Transaction Scheme
                                  </p>

                                  <p className="mt-1 text-sm font-black text-slate-900">
                                    {selectedScheme.schemeName}
                                  </p>

                                  <p className="mt-1 text-[10px] font-medium text-slate-500">
                                    {selectedScheme.schemeCode || "—"}
                                    {" • "}
                                    {getSchemeFrequencyLabel(selectedScheme)}
                                    {" • "}
                                    {getSchemeDuration(selectedScheme)} months
                                  </p>
                                </div>

                                <div className="rounded-lg bg-indigo-50 px-3 py-2 text-right">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                                    Installment
                                  </p>

                                  <p className="mt-0.5 text-xs font-black text-indigo-700">
                                    {getSchemeInstallmentLabel(selectedScheme)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* TRANSACTION IDENTITY */}
                            <div className="mb-6">
                              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Transaction Identity
                              </p>

                              <div className="grid gap-5 sm:grid-cols-2">

                                {/* MONTH */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                      Transaction Month <span className="text-red-500">*</span>
                                    </label>

                                    <div className="flex h-[43px] items-center rounded-md border border-indigo-200 bg-indigo-50 px-3 shadow-sm">
                                      <span className="font-mono text-sm font-black text-indigo-700">
                                        M1
                                      </span>

                                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                                        Initial
                                      </span>
                                    </div>
                                </div>

                                {/* TYPE */}
                                <SelectField
                                  label="Transaction Type"
                                  name="transactionType"
                                  value="CREDIT"
                                  onChange={handleAccountChange}
                                  required
                                  disabled
                                >
                                  <option value="CREDIT">
                                    Credit
                                  </option>
                                </SelectField>

                                {/* CATEGORY */}
                                <SelectField
                                  label="Transaction Category"
                                  name="transactionCategory"
                                  value="INITIAL"
                                  onChange={handleAccountChange}
                                  required
                                  disabled
                                >
                                  <option value="INITIAL">
                                    Initial Transaction
                                  </option>
                                </SelectField>

                                {/* DATE */}
                                <InputField
                                  label="Transaction Date"
                                  name="transactionDate"
                                  value={accountForm.transactionDate || accountForm.startDate}
                                  onChange={handleAccountChange}
                                  type="date"
                                  required
                                  disabled={saving}
                                />
                              </div>
                            </div>

                            {/* PAYMENT */}
                            <div className="mb-6">
                              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Payment Details
                              </p>

                              <div className="grid gap-5 sm:grid-cols-2">

                                <InputField
                                  label="Amount Paid"
                                  name="transactionAmount"
                                  value={accountForm.transactionAmount}
                                  onChange={handleAccountChange}
                                  type="number"
                                  prefix="₹"
                                  required
                                  disabled={saving}
                                  placeholder="Enter amount received"
                                />

                                <SelectField
                                  label="Payment Mode"
                                  name="paymentMode"
                                  value={accountForm.paymentMode}
                                  onChange={handleAccountChange}
                                  required
                                  disabled={saving}
                                >
                                  <option value="">
                                    Select payment mode
                                  </option>

                                  {getPaymentModes().map((mode) => (
                                    <option
                                      key={mode.value}
                                      value={mode.value}
                                    >
                                      {mode.label}
                                    </option>
                                  ))}
                                </SelectField>

                                <div className="sm:col-span-2">
                                  <InputField
                                    label="Transaction Reference"
                                    name="transactionReference"
                                    value={accountForm.transactionReference}
                                    onChange={handleAccountChange}
                                    required
                                    disabled={saving}
                                    placeholder="UPI reference / cheque number / bank reference"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* GOLD SIP */}
                            {selectedSchemeIsGold && (
                              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">

                                <div className="flex items-start gap-3">
                                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                                    <Wallet size={16} />
                                  </div>

                                  <div className="flex-1">
                                    <p className="text-xs font-black text-amber-900">
                                      Gold SIP Calculation
                                    </p>

                                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-800">
                                      Gold credited is calculated as:
                                      <span className="font-black">
                                        {" "}Amount Paid ÷ Today's 1g Gold Price
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-5 grid gap-5 sm:grid-cols-2">

                                  <InputField
                                    label="Today's 1g Gold Price"
                                    name="transactionGoldPrice"
                                    value={accountForm.transactionGoldPrice}
                                    onChange={handleAccountChange}
                                    type="number"
                                    prefix="₹"
                                    required
                                    disabled={saving}
                                    placeholder="e.g. 12500"
                                  />

                                  <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                      Gold Credited
                                    </label>

                                    <div className="flex h-[43px] items-center rounded-md border border-amber-200 bg-white px-3 font-mono text-sm font-black text-amber-700 shadow-sm">
                                      {(() => {
                                        const amount = Number(
                                          accountForm.transactionAmount
                                        );

                                        const price = Number(
                                          accountForm.transactionGoldPrice
                                        );

                                        if (
                                          Number.isFinite(amount) &&
                                          amount > 0 &&
                                          Number.isFinite(price) &&
                                          price > 0
                                        ) {
                                          return `${(
                                            amount / price
                                          ).toFixed(3)} g`;
                                        }

                                        return "—";
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* RECEIPT */}
                            <div className="mb-6">
                              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Receipt
                              </p>

                              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                                    <FileText size={16} />
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold text-slate-700">
                                      Receipt Number
                                    </p>

                                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                                      Automatically allocated from the global receipt
                                      sequence when the transaction is committed.
                                    </p>
                                  </div>

                                  <span className="ml-auto rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-[10px] font-bold text-slate-500">
                                    AUTO
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* SECURITY */}
                            <div>
                              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Authorization
                              </p>

                              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-5">

                                <div className="flex items-start gap-3">
                                  <ShieldCheck
                                    size={17}
                                    className="mt-0.5 shrink-0 text-rose-600"
                                  />

                                  <div>
                                    <p className="text-xs font-black text-rose-900">
                                      CRM Passcode Required
                                    </p>

                                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-rose-800">
                                      This authorizes the financial transaction.
                                      The passcode is verified by the CRM security
                                      layer and is never stored as plaintext.
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <InputField
                                    label="CRM Passcode"
                                    name="transactionPasscode"
                                    value={accountForm.transactionPasscode}
                                    onChange={handleAccountChange}
                                    type="password"
                                    placeholder="Enter CRM security passcode"
                                    required
                                    disabled={saving}
                                  />
                                </div>
                              </div>
                            </div>

                          </div>
                        )}
                      </section>

                        <hr className="border-gray-100 my-10" />

                        {/* SECTION 4: PREVIEW (ONLY ON CREATE) */}
                        {(accountMode === "CARRY_FORWARD" || accountForm.addFirstTransaction) && (
                          <section>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                              <FileText size={16} className="text-gray-400" /> Ledger Preview
                            </h3>
                            <div className="ml-8 overflow-hidden rounded-xl border border-gray-200">
                              <table className="w-full text-left table-fixed">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="w-16 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">No.</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Type</th>
                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Paid</th>
                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Balance</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700 bg-white">
                                  {previewData.rows.length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-400 italic">No transactions to preview</td></tr>
                                  ) : (
                                    previewData.rows.map((row, i) => (
                                      <tr key={row.id}>
                                        <td className="px-3 py-3 text-gray-400 font-mono">0{i+1}</td>
                                        <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${row.type === "Transfer"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-emerald-100 text-emerald-800"}`}>{row.type}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3 text-right font-mono text-gray-900">{formatCurrency(row.amountPaid)}</td>
                                        <td className="px-3 py-3 text-right font-mono font-bold text-gray-900">{selectedSchemeIsGold ? formatGold(row.balance) : formatCurrency(row.balance)}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* MODAL FOOTER ACTIONS */}
                <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-white px-6 py-5">
                  <button type="button" onClick={() => {
                    if (editingId) closeModal();
                    else if (modalStep === 2 && existingInvestor && existingAccounts.length > 0) setModalStep(1.5);
                    else setModalStep(1);
                  }} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50">
                    {!editingId ? "← Back" : "Cancel"}
                  </button>
                  <button type="submit" disabled={saving || (accountMode === "CARRY_FORWARD" && !transferConfirmed)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                    {editingId ? "Save Profile" : accountMode === "CARRY_FORWARD" ? "Complete Transfer" : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}