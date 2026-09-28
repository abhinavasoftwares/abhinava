import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit3,
  Loader2,
  Plus,
  Power,
  Save,
  X,
  Download,
  Search,
  Settings2,
  Activity,
  Wallet,
  Percent,
  CalendarDays,
  Lock,
  Mail,
} from "lucide-react";

import { useTenant } from "../../../context/TenantContext";
import { useInvestmentSchemes } from "../hooks/useInvestmentSchemes";
import {
  createInvestmentScheme,
  updateInvestmentScheme,
} from "../services/investmentSchemes";
import {
  createAccountNumberChangeRequest,
  notifyAccountNumberChangeRequest,
} from "../services/investmentAccountNumberChangeRequests";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const INITIAL_FORM = {
  schemeCode: "",
  schemeName: "",
  schemeType: "FIXED_INSTALLMENT",
  durationMonths: "12",
  paymentFrequency: "MONTHLY",
  installmentType: "FIXED",
  minimumAmount: "",
  minimumGrams: "",
  benefitType: "NONE",
  benefitValue: "",
  interestEnabled: false,
  interestStrategyId: "STANDARD_INTEREST_V1",
  annualRate: "",
  calculationMethod: "SIMPLE",
  compoundingFrequency: "NONE",
  dayCountConvention: "ACTUAL_365",
  roundingScale: "2",
  accountPrefix: "",
  accountPadding: "6",
};

const ITEMS_PER_PAGE = 15;

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  disabled = false,
  unit = "",
  min,
  step,
}) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <div className="flex overflow-hidden rounded-md border border-slate-200 bg-slate-50 transition-all focus-within:border-slate-400 focus-within:bg-white shadow-2xs disabled:opacity-60">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          step={step}
          className="w-full bg-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        {unit && (
          <span className="flex items-center border-l border-slate-200 bg-slate-100/80 px-2.5 text-[11px] font-mono font-bold text-slate-600">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectField({
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
          className="w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 pr-7 text-xs font-semibold text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {children}
        </select>

        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "ACTIVE";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider border ${
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />

      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function TypeBadge({ type }) {
  const isGoldSip = type === "GOLD_SIP";

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider ${
        isGoldSip
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      {isGoldSip ? "Gold SIP" : "Fixed Installment"}
    </span>
  );
}

function calculateSampleInterest({
  amount,
  durationMonths,
  annualRate,
  calculationMethod,
  paymentFrequency,
  dayCountConvention,
}) {
  const installment = Number(amount || 0);
  const months = Number(durationMonths || 0);
  const rate = Number(annualRate || 0);

  if (
    !Number.isFinite(installment) ||
    installment <= 0 ||
    !Number.isFinite(months) ||
    months <= 0 ||
    !Number.isFinite(rate) ||
    rate < 0
  ) {
    return {
      totalContribution: 0,
      estimatedInterest: 0,
      maturityValue: 0,
      effectiveRate: 0,
      schedule: [],
    };
  }

  let periods = months;

  if (paymentFrequency === "QUARTERLY") {
    periods = Math.ceil(months / 3);
  } else if (paymentFrequency === "HALF_YEARLY") {
    periods = Math.ceil(months / 6);
  } else if (paymentFrequency === "YEARLY") {
    periods = Math.ceil(months / 12);
  }

  const periodMonths =
    paymentFrequency === "QUARTERLY"
      ? 3
      : paymentFrequency === "HALF_YEARLY"
      ? 6
      : paymentFrequency === "YEARLY"
      ? 12
      : 1;

  const schedule = [];
  let totalInterest = 0;
  let totalContribution = 0;

  for (let index = 0; index < periods; index += 1) {
    const investedMonths = Math.max(
      months - index * periodMonths,
      0
    );

    if (investedMonths <= 0) continue;

    const principal = installment;
    let interest = 0;

    if (calculationMethod === "COMPOUND") {
      let compoundsPerYear = 1;

      if (paymentFrequency === "MONTHLY") {
        compoundsPerYear = 12;
      }

      const years = investedMonths / 12;

      interest =
        principal *
        (Math.pow(
          1 + rate / 100 / compoundsPerYear,
          compoundsPerYear * years
        ) -
          1);
    } else {
      const years = investedMonths / 12;
      interest = principal * (rate / 100) * years;
    }

    interest = Number(interest.toFixed(2));
    totalContribution += principal;
    totalInterest += interest;

    schedule.push({
      installment: index + 1,
      principal,
      investedMonths,
      interest,
      maturity: Number(
        (principal + interest).toFixed(2)
      ),
    });
  }

  totalInterest = Number(totalInterest.toFixed(2));

  return {
    totalContribution: Number(
      totalContribution.toFixed(2)
    ),
    estimatedInterest: totalInterest,
    maturityValue: Number(
      (totalContribution + totalInterest).toFixed(2)
    ),
    effectiveRate: rate,
    schedule,
    dayCountConvention:
      dayCountConvention || "ACTUAL_365",
  };
}

export default function InvestmentSchemesPage() {
  const { tenant } = useTenant();

  const crmSlug =
    tenant?.slug ||
    tenant?.id ||
    window.location.pathname.split("/")[1] ||
    "default";

  const {
    schemes,
    loading,
    error: schemesError,
    canWrite,
    canDelete,
  } = useInvestmentSchemes();

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] =
    useState(INITIAL_FORM);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);

  const [requestModal, setRequestModal] =
    useState(null);

  const [requestReason, setRequestReason] =
    useState("");

  const [requesting, setRequesting] =
    useState(false);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(
      () => setToast(null),
      3500
    );

    return () => clearTimeout(timer);
  }, [toast]);

  const processedSchemes = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    let filtered = schemes.filter((scheme) => {
      const matchesSearch =
        !searchValue ||
        String(
          scheme.schemeName || ""
        )
          .toLowerCase()
          .includes(searchValue) ||
        String(
          scheme.schemeCode || ""
        )
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" ||
        scheme.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let valA;
      let valB;

      switch (sortConfig.key) {
        case "schemeName":
          valA = String(
            a.schemeName || ""
          ).toLowerCase();

          valB = String(
            b.schemeName || ""
          ).toLowerCase();
          break;

        case "schemeType":
          valA = String(
            a.schemeType || ""
          ).toLowerCase();

          valB = String(
            b.schemeType || ""
          ).toLowerCase();
          break;

        case "minimum":
          valA =
            a.schemeType === "GOLD_SIP"
              ? Number(
                  a.installmentConfig
                    ?.minimumGrams || 0
                )
              : Number(
                  (a.installmentConfig
                    ?.minimumAmount ??
                    a.installmentConfig
                      ?.amount) || 0
                );

          valB =
            b.schemeType === "GOLD_SIP"
              ? Number(
                  b.installmentConfig
                    ?.minimumGrams || 0
                )
              : Number(
                  (b.installmentConfig
                    ?.minimumAmount ??
                    b.installmentConfig
                      ?.amount) || 0
                );
          break;

        case "createdAt":
        default:
          valA =
            a.createdAt?.seconds || 0;

          valB =
            b.createdAt?.seconds || 0;
          break;
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
    schemes,
    search,
    statusFilter,
    sortConfig,
  ]);

  const totalPages = Math.ceil(
    processedSchemes.length / ITEMS_PER_PAGE
  );

  const paginatedSchemes = useMemo(() => {
    const start =
      (currentPage - 1) * ITEMS_PER_PAGE;

    return processedSchemes.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [
    processedSchemes,
    currentPage,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const requestSort = (key) => {
    let direction = "asc";

    if (
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }

    setSortConfig({
      key,
      direction,
    });

    setCurrentPage(1);
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <ChevronsUpDown
          size={11}
          className="opacity-30"
        />
      );
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp size={11} />
    ) : (
      <ChevronDown size={11} />
    );
  };

  function openCreate() {
    if (!canWrite) {
      setToast({
        type: "error",
        message:
          "You do not have permission to create investment schemes.",
      });

      return;
    }

    setEditingId(null);
    setFormData({
      ...INITIAL_FORM,
    });

    setModalOpen(true);
  }

  function openEdit(scheme) {
    if (!canWrite) {
      setToast({
        type: "error",
        message:
          "You do not have permission to edit investment schemes.",
      });

      return;
    }

    const isGoldSip =
      scheme.schemeType === "GOLD_SIP";

    setEditingId(scheme.id);

    setFormData({
      schemeCode:
        scheme.schemeCode || "",

      schemeName:
        scheme.schemeName || "",

      schemeType:
        scheme.schemeType ||
        "FIXED_INSTALLMENT",

      durationMonths: isGoldSip
        ? ""
        : String(
            scheme.durationMonths ?? "12"
          ),

      paymentFrequency:
        scheme.paymentFrequency ||
        "MONTHLY",

      installmentType:
        scheme.installmentConfig?.type ||
        "FIXED",

      minimumAmount: isGoldSip
        ? ""
        : String(
            scheme.installmentConfig
              ?.minimumAmount ??
              scheme.installmentConfig
                ?.amount ??
              ""
          ),

      minimumGrams: isGoldSip
        ? String(
            scheme.installmentConfig
              ?.minimumGrams ?? ""
          )
        : "",

      benefitType:
        scheme.benefitConfig?.type ||
        "NONE",

      benefitValue:
        scheme.benefitConfig?.type &&
        scheme.benefitConfig.type !==
          "NONE"
          ? String(
              scheme.benefitConfig?.value ??
                ""
            )
          : "",

      interestEnabled:
        Boolean(
          scheme.interestConfig?.enabled
        ),

      interestStrategyId:
        scheme.interestConfig?.strategyId ||
        "STANDARD_INTEREST_V1",

      annualRate:
        scheme.interestConfig?.enabled
          ? String(
              scheme.interestConfig
                ?.annualRate ?? ""
            )
          : "",

      calculationMethod:
        scheme.interestConfig
          ?.calculationMethod ||
        "SIMPLE",

      compoundingFrequency:
        scheme.interestConfig
          ?.compoundingFrequency ||
        "NONE",

      dayCountConvention:
        scheme.interestConfig
          ?.dayCountConvention ||
        "ACTUAL_365",

      roundingScale: String(
        scheme.interestConfig
          ?.roundingScale ?? 2
      ),

      accountPrefix:
        scheme.accountNumberConfig
          ?.prefix || "",

      accountPadding: String(
        scheme.accountNumberConfig
          ?.padding ?? 6
      ),
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);

    setTimeout(() => {
      setEditingId(null);
      setFormData({
        ...INITIAL_FORM,
      });
    }, 200);
  }

  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((current) => {
      const next = {
        ...current,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      };

      if (
        name === "schemeType" &&
        value === "GOLD_SIP"
      ) {
        next.durationMonths = "";
        next.minimumAmount = "";
        next.installmentType = "FIXED";
      }

      if (
        name === "schemeType" &&
        value !== "GOLD_SIP"
      ) {
        if (!next.durationMonths) {
          next.durationMonths = "12";
        }

        next.minimumGrams = "";
      }

      if (
        name === "calculationMethod" &&
        value === "SIMPLE"
      ) {
        next.compoundingFrequency = "NONE";
      }

      return next;
    });
  }

  function openChangeRequest(scheme) {
    setRequestReason("");
    setRequestModal(scheme);
  }

  async function submitChangeRequest() {
    if (!requestModal) return;

    if (!requestReason.trim()) {
      setToast({
        type: "error",
        message:
          "Please provide a reason for the change request.",
      });

      return;
    }

    try {
      setRequesting(true);

      const result =
        await createAccountNumberChangeRequest({
          schemeId: requestModal.id,
          schemeName:
            requestModal.schemeName,

          currentTheme: {
            prefix:
              requestModal
                .accountNumberConfig
                ?.prefix || "",

            padding: Number(
              requestModal
                .accountNumberConfig
                ?.padding || 6
            ),
          },

          reason:
            requestReason.trim(),
        });

      await notifyAccountNumberChangeRequest({
        crmSlug,
        requestId: result.id,
      });

      setRequestModal(null);
      setRequestReason("");

      setToast({
        type: "success",
        message:
          "Change request submitted successfully. Administrator notified.",
      });
    } catch (err) {
      console.error(
        "Account number change request failed:",
        err
      );

      setToast({
        type: "error",
        message:
          err.message ||
          "Failed to submit account-number change request.",
      });
    } finally {
      setRequesting(false);
    }
  }

  const isGoldSip =
    formData.schemeType === "GOLD_SIP";

  const interestSample = useMemo(() => {
    if (
      !formData.interestEnabled ||
      isGoldSip
    ) {
      return null;
    }

    return calculateSampleInterest({
      amount: Number(
        formData.minimumAmount || 0
      ),

      durationMonths: Number(
        formData.durationMonths || 0
      ),

      annualRate: Number(
        formData.annualRate || 0
      ),

      calculationMethod:
        formData.calculationMethod,

      paymentFrequency:
        formData.paymentFrequency,

      dayCountConvention:
        formData.dayCountConvention,
    });
  }, [
    formData.interestEnabled,
    formData.minimumAmount,
    formData.durationMonths,
    formData.annualRate,
    formData.calculationMethod,
    formData.paymentFrequency,
    formData.dayCountConvention,
    isGoldSip,
  ]);

  function buildPayload() {
    const schemeType =
      formData.schemeType;

    const goldSip =
      schemeType === "GOLD_SIP";

    const minimumAmount = Number(
      formData.minimumAmount || 0
    );

    const minimumGrams = Number(
      formData.minimumGrams || 0
    );

    const durationMonths = goldSip
      ? null
      : Number(formData.durationMonths);

    return {
      schemeCode:
        formData.schemeCode
          .trim()
          .toUpperCase(),

      schemeName:
        formData.schemeName.trim(),

      schemeType,

      durationMonths,

      paymentFrequency:
        formData.paymentFrequency,

      installmentConfig: goldSip
        ? {
            type: "FIXED",
            unit: "GOLD_GRAMS",
            minimumGrams:
              Number.isFinite(
                minimumGrams
              )
                ? minimumGrams
                : 0,
          }
        : {
            type:
              formData.installmentType,
            unit: "AMOUNT",
            minimumAmount:
              Number.isFinite(
                minimumAmount
              )
                ? minimumAmount
                : 0,
            amount:
              Number.isFinite(
                minimumAmount
              )
                ? minimumAmount
                : 0,
          },

      benefitConfig:
        formData.benefitType === "NONE"
          ? {
              type: "NONE",
              value: 0,
            }
          : {
              type:
                formData.benefitType,
              value: Number(
                formData.benefitValue || 0
              ),
            },

      interestConfig:
        formData.interestEnabled
          ? {
              enabled: true,
              strategyId:
                formData.interestStrategyId,
              annualRate: Number(
                formData.annualRate || 0
              ),
              calculationMethod:
                formData.calculationMethod,
              compoundingFrequency:
                formData.compoundingFrequency,
              dayCountConvention:
                formData.dayCountConvention,
              roundingScale: Number(
                formData.roundingScale || 2
              ),
            }
          : {
              enabled: false,
              strategyId: null,
              annualRate: 0,
              calculationMethod: null,
              compoundingFrequency:
                null,
              dayCountConvention:
                null,
              roundingScale: 2,
            },

      calculationStrategyId: goldSip
        ? "GOLD_SIP_V1"
        : "FIXED_INSTALLMENT_V1",

      calculationVersion: 1,

      accountNumberConfig: {
        prefix:
          formData.accountPrefix
            .trim()
            .toUpperCase(),

        padding: Number(
          formData.accountPadding || 6
        ),

        locked: true,
      },
    };
  }

  function validatePayload(payload) {
    if (!payload.schemeCode) {
      throw new Error(
        "Scheme code is required."
      );
    }

    if (!payload.schemeName) {
      throw new Error(
        "Scheme name is required."
      );
    }

    if (!payload.paymentFrequency) {
      throw new Error(
        "Payment frequency is required."
      );
    }

    if (
      payload.schemeType ===
      "GOLD_SIP"
    ) {
      const grams = Number(
        payload.installmentConfig
          ?.minimumGrams
      );

      if (
        !Number.isFinite(grams) ||
        grams <= 0
      ) {
        throw new Error(
          "Minimum gold contribution must be > 0."
        );
      }
    } else {
      const duration = Number(
        payload.durationMonths
      );

      if (
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        throw new Error(
          "Duration must be > 0."
        );
      }

      const minimumAmount = Number(
        payload.installmentConfig
          ?.minimumAmount
      );

      if (
        payload.installmentConfig
          .type !== "VARIABLE" &&
        (!Number.isFinite(
          minimumAmount
        ) ||
          minimumAmount <= 0)
      ) {
        throw new Error(
          "Minimum contribution amount must be > 0."
        );
      }
    }

    if (
      payload.interestConfig?.enabled
    ) {
      const rate = Number(
        payload.interestConfig
          .annualRate
      );

      if (
        !Number.isFinite(rate) ||
        rate < 0
      ) {
        throw new Error(
          "Interest rate cannot be negative."
        );
      }
    }

    const prefix =
      payload.accountNumberConfig
        ?.prefix;

    if (!prefix) {
      throw new Error(
        "Account prefix is required."
      );
    }

    if (
      !/^[A-Z0-9_-]{1,20}$/.test(
        prefix
      )
    ) {
      throw new Error(
        "Prefix may contain only letters, numbers, hyphens and underscores."
      );
    }

    const padding = Number(
      payload.accountNumberConfig
        ?.padding
    );

    if (
      !Number.isInteger(padding) ||
      padding < 3 ||
      padding > 10
    ) {
      throw new Error(
        "Padding must be between 3 and 10."
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canWrite) {
      setToast({
        type: "error",
        message:
          "You do not have permission to modify investment schemes.",
      });

      return;
    }

    if (saving) return;

    try {
      const payload = buildPayload();

      validatePayload(payload);

      setSaving(true);

      if (editingId) {
        const existing = schemes.find(
          (s) => s.id === editingId
        );

        const oldConfig =
          existing?.accountNumberConfig;

        const oldPrefix = String(
          oldConfig?.prefix || ""
        )
          .trim()
          .toUpperCase();

        const oldPadding = Number(
          oldConfig?.padding || 0
        );

        if (
          oldConfig?.locked &&
          (oldPrefix !==
            payload.accountNumberConfig
              .prefix ||
            oldPadding !==
              payload.accountNumberConfig
                .padding)
        ) {
          throw new Error(
            "Account numbering is locked. Please use 'Request Change'."
          );
        }

        await updateInvestmentScheme(
          editingId,
          payload
        );

        setToast({
          type: "success",
          message:
            "Scheme updated successfully.",
        });
      } else {
        await createInvestmentScheme({
          ...payload,
          nextAccountNumber: 1,
        });

        setToast({
          type: "success",
          message:
            payload.schemeType ===
            "GOLD_SIP"
              ? "Gold SIP scheme created."
              : "Investment scheme created.",
        });
      }

      closeModal();
    } catch (err) {
      console.error(err);

      setToast({
        type: "error",
        message:
          err.message ||
          "Failed to save scheme.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(
    scheme
  ) {
    if (!canWrite) {
      setToast({
        type: "error",
        message:
          "You do not have permission to change scheme status.",
      });

      return;
    }

    try {
      const nextStatus =
        scheme.status === "ACTIVE"
          ? "INACTIVE"
          : "ACTIVE";

      await updateInvestmentScheme(
        scheme.id,
        {
          status: nextStatus,
        }
      );

      setToast({
        type: "success",
        message:
          nextStatus === "ACTIVE"
            ? "Scheme activated."
            : "Scheme deactivated.",
      });
    } catch (err) {
      console.error(err);

      setToast({
        type: "error",
        message:
          err.message ||
          "Failed to update status.",
      });
    }
  }

  function handleExportCSV() {
    let csv =
      "data:text/csv;charset=utf-8,Scheme Code,Scheme Name,Type,Duration,Frequency,Unit,Minimum,Interest Enabled,Interest Rate,Account Prefix,Padding,Status\n";

    processedSchemes.forEach(
      (scheme) => {
        const isGold =
          scheme.schemeType ===
          "GOLD_SIP";

        const unit =
          scheme.installmentConfig
            ?.unit ||
          (isGold
            ? "GOLD_GRAMS"
            : "AMOUNT");

        const minimum = isGold
          ? scheme.installmentConfig
              ?.minimumGrams || 0
          : (scheme.installmentConfig
              ?.minimumAmount ??
              scheme.installmentConfig
                ?.amount) || 0;

        const duration = isGold
          ? "OPEN_ENDED"
          : scheme.durationMonths ||
            "";

        const interestEnabled =
          scheme.interestConfig
            ?.enabled
            ? "YES"
            : "NO";

        const interestRate =
          scheme.interestConfig?.enabled
            ? scheme.interestConfig
                ?.annualRate || 0
            : "";

        csv +=
          [
            scheme.schemeCode || "",
            scheme.schemeName || "",
            scheme.schemeType || "",
            duration,
            scheme.paymentFrequency ||
              "",
            unit,
            minimum,
            interestEnabled,
            interestRate,
            scheme.accountNumberConfig
              ?.prefix || "",
            scheme.accountNumberConfig
              ?.padding || "",
            scheme.status || "",
          ]
            .map(
              (v) =>
                `"${String(v).replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join(",") + "\n";
      }
    );

    const link =
      document.createElement("a");

    link.href = encodeURI(csv);

    link.download = `Investment_Schemes_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex max-w-sm items-center gap-2 rounded-lg border px-3 py-2 shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2
              size={14}
              className="text-emerald-600 shrink-0"
            />
          ) : (
            <AlertCircle
              size={14}
              className="text-rose-600 shrink-0"
            />
          )}

          <span className="flex-1">
            {toast.message}
          </span>

          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 ml-1"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 py-2.5 md:py-0 md:h-14 z-10">
        <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs">
              <Settings2
                size={13}
                strokeWidth={2.2}
              />
            </div>

            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-slate-900 uppercase font-mono truncate">
                  Scheme Management
                </h1>

                <span className="inline-flex rounded-md bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 text-[9.5px] font-mono font-medium text-slate-600 shrink-0">
                  {schemes.length} Total
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs"
              title="Export CSV"
            >
              <Download size={12} />
            </button>

            {canWrite && (
              <button
                type="button"
                onClick={openCreate}
                className="h-7 inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 text-[11px] font-medium text-white hover:bg-slate-800 shadow-2xs cursor-pointer"
              >
                <Plus size={12} />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Cluster */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-56 md:w-60 shrink-0">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search scheme or code..."
              className="h-7.5 w-full rounded-md border border-slate-200 bg-slate-50 pl-7.5 pr-6 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="appearance-none h-7.5 rounded-md border border-slate-200 bg-slate-50 pl-2.5 pr-6 text-[10.5px] font-mono font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white cursor-pointer"
            >
              <option value="ALL">
                All Status
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>
            </select>

            <ChevronDown
              size={11}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="hidden md:block h-4 w-px bg-slate-200 shrink-0 mx-0.5" />

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-7.5 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>

            {canWrite && (
              <button
                type="button"
                onClick={openCreate}
                className="h-7.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
              >
                <Plus
                  size={13}
                  strokeWidth={2.2}
                />
                <span>New Scheme</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {schemesError && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-1.5 text-xs font-mono font-medium text-rose-700 flex items-center justify-between">
          <span>{schemesError}</span>
        </div>
      )}

      {/* Main Workspace */}
      <main
        className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${noScroll} z-10`}
      >
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20 text-slate-500 space-y-1.5">
              <Loader2
                size={18}
                className="animate-spin text-slate-700"
              />

              <span className="text-xs font-mono uppercase tracking-wider">
                Syncing investment schemes...
              </span>
            </div>
          ) : processedSchemes.length ===
            0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/80 p-10 text-center shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                <Activity size={18} />
              </div>

              <h3 className="mt-2.5 text-xs font-semibold text-slate-900">
                No Investment Schemes Configured
              </h3>

              <p className="mt-1 max-w-xs text-[11px] text-slate-500 leading-relaxed">
                {search
                  ? "No plans match your search query."
                  : "Establish your first recurring investment or gold SIP plan above."}
              </p>

              {!search && canWrite && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Create Scheme</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs flex flex-col">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            requestSort(
                              "schemeName"
                            )
                          }
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          <span>
                            Scheme Identifier
                          </span>

                          <SortIcon columnKey="schemeName" />
                        </button>
                      </th>

                      <th className="px-4 py-2">
                        Tenure & Cadence
                      </th>

                      <th className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            requestSort(
                              "minimum"
                            )
                          }
                          className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto"
                        >
                          <span>
                            Contribution Rules
                          </span>

                          <SortIcon columnKey="minimum" />
                        </button>
                      </th>

                      <th className="px-4 py-2 text-center">
                        Status
                      </th>

                      <th className="px-4 py-2 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedSchemes.map(
                      (scheme) => {
                        const isGold =
                          scheme.schemeType ===
                          "GOLD_SIP";

                        const unit =
                          scheme
                            .installmentConfig
                            ?.unit ||
                          (isGold
                            ? "GOLD_GRAMS"
                            : "AMOUNT");

                        const contribution =
                          Number(
                            isGold
                              ? scheme
                                  .installmentConfig
                                  ?.minimumGrams
                              : (scheme
                                  .installmentConfig
                                  ?.minimumAmount ??
                                  scheme
                                    .installmentConfig
                                    ?.amount) ||
                                  0
                          );

                        const interestEnabled =
                          Boolean(
                            scheme
                              .interestConfig
                              ?.enabled
                          );

                        return (
                          <tr
                            key={scheme.id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {
                                  scheme.schemeName
                                }
                              </p>

                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="rounded bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-slate-600">
                                  {
                                    scheme.schemeCode
                                  }
                                </span>

                                <TypeBadge
                                  type={
                                    scheme.schemeType
                                  }
                                />
                              </div>
                            </td>

                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <p className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                                <CalendarDays
                                  size={11}
                                  className="text-slate-400"
                                />

                                {isGold
                                  ? "Open-ended"
                                  : `${scheme.durationMonths || 0} Months`}
                              </p>

                              <p className="mt-0.5 text-[9.5px] font-mono uppercase tracking-wider text-slate-400">
                                {scheme.paymentFrequency ||
                                  "MONTHLY"}
                              </p>
                            </td>

                            <td className="px-4 py-2.5 whitespace-nowrap text-right">
                              <p className="text-xs font-bold font-mono text-slate-900">
                                {unit ===
                                "GOLD_GRAMS"
                                  ? `${contribution} g`
                                  : `₹${contribution.toLocaleString(
                                      "en-IN"
                                    )}`}

                                <span className="text-[9px] font-normal text-slate-400 ml-1 uppercase">
                                  Min
                                </span>
                              </p>

                              <p className="mt-0.5 text-[10px] font-mono font-medium text-emerald-700 flex items-center justify-end gap-1">
                                {interestEnabled ? (
                                  <>
                                    <Percent size={9} />

                                    {Number(
                                      scheme
                                        .interestConfig
                                        ?.annualRate ||
                                        0
                                    ).toFixed(1)}
                                    % Yield
                                  </>
                                ) : (
                                  <span className="text-slate-400">
                                    No Interest
                                  </span>
                                )}
                              </p>
                            </td>

                            <td className="px-4 py-2.5 whitespace-nowrap text-center">
                              <StatusBadge
                                status={
                                  scheme.status
                                }
                              />
                            </td>

                            <td className="px-4 py-2.5 whitespace-nowrap text-right">
                              <div className="inline-flex items-center gap-1">
                                {canWrite && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openEdit(
                                          scheme
                                        )
                                      }
                                      className="h-6.5 w-6.5 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                                      title="Edit Scheme"
                                    >
                                      <Edit3
                                        size={11}
                                      />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleStatus(
                                          scheme
                                        )
                                      }
                                      className="h-6.5 w-6.5 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-2xs"
                                      title="Toggle Active Status"
                                    >
                                      <Power
                                        size={11}
                                      />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-slate-100">
                {paginatedSchemes.map(
                  (scheme) => {
                    const isGold =
                      scheme.schemeType ===
                      "GOLD_SIP";

                    const unit =
                      scheme
                        .installmentConfig
                        ?.unit ||
                      (isGold
                        ? "GOLD_GRAMS"
                        : "AMOUNT");

                    const contribution =
                      Number(
                        isGold
                          ? scheme
                              .installmentConfig
                              ?.minimumGrams
                          : (scheme
                              .installmentConfig
                              ?.minimumAmount ??
                              scheme
                                .installmentConfig
                                ?.amount) ||
                              0
                      );

                    return (
                      <div
                        key={scheme.id}
                        className="p-3.5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {
                                scheme.schemeName
                              }
                            </p>

                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-slate-600">
                                {
                                  scheme.schemeCode
                                }
                              </span>

                              <TypeBadge
                                type={
                                  scheme.schemeType
                                }
                              />
                            </div>
                          </div>

                          <StatusBadge
                            status={
                              scheme.status
                            }
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="p-2 rounded bg-slate-50 border border-slate-100">
                            <span className="text-[9px] uppercase text-slate-400 block">
                              Duration
                            </span>

                            <span className="font-semibold text-slate-800">
                              {isGold
                                ? "Open-ended"
                                : `${scheme.durationMonths} Mo`}
                            </span>
                          </div>

                          <div className="p-2 rounded bg-slate-50 border border-slate-100 text-right">
                            <span className="text-[9px] uppercase text-slate-400 block">
                              Min Contribution
                            </span>

                            <span className="font-semibold text-slate-900">
                              {unit ===
                              "GOLD_GRAMS"
                                ? `${contribution} g`
                                : `₹${contribution.toLocaleString(
                                    "en-IN"
                                  )}`}
                            </span>
                          </div>
                        </div>

                        {canWrite && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  scheme
                                )
                              }
                              className="flex-1 h-7 inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700"
                            >
                              <Edit3 size={11} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleStatus(
                                  scheme
                                )
                              }
                              className="h-7 px-2.5 rounded-md border border-slate-200 bg-white text-xs text-slate-500 hover:text-rose-600"
                            >
                              <Power size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-2 bg-slate-50 text-[10px] font-mono text-slate-500">
                  <span>
                    {(currentPage - 1) *
                      ITEMS_PER_PAGE +
                      1}{" "}
                    -{" "}
                    {Math.min(
                      currentPage *
                        ITEMS_PER_PAGE,
                      processedSchemes.length
                    )}{" "}
                    of{" "}
                    {processedSchemes.length}
                  </span>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          (p) =>
                            Math.max(
                              1,
                              p - 1
                            )
                        )
                      }
                      disabled={
                        currentPage === 1
                      }
                      className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-50"
                    >
                      Prev
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          (p) =>
                            Math.min(
                              totalPages,
                              p + 1
                            )
                        )
                      }
                      disabled={
                        currentPage ===
                        totalPages
                      }
                      className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-50"
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

      {/* CREATE / EDIT MODAL */}
      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={closeModal}
          >
            <div
              className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-900">
                    {editingId
                      ? "Update Investment Scheme"
                      : "Create Investment Scheme"}
                  </h2>

                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Configure tenure, contribution thresholds, and automated ledger theme
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div
                  className={`min-h-0 flex-1 overflow-y-auto p-4 space-y-5 ${noScroll}`}
                >
                  {/* General Parameters */}
                  <div>
                    <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 mb-2.5">
                      1. General Parameters
                    </span>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <InputField
                        label="Scheme Code"
                        name="schemeCode"
                        value={
                          formData.schemeCode
                        }
                        onChange={handleChange}
                        placeholder="e.g. GLD12"
                        required
                        disabled={Boolean(
                          editingId
                        )}
                      />

                      <InputField
                        label="Scheme Name"
                        name="schemeName"
                        value={
                          formData.schemeName
                        }
                        onChange={handleChange}
                        placeholder="e.g. Gold Savings Plus"
                        required
                        disabled={saving}
                      />

                      <SelectField
                        label="Scheme Type"
                        name="schemeType"
                        value={
                          formData.schemeType
                        }
                        onChange={handleChange}
                        required
                        disabled={saving}
                      >
                        <option value="FIXED_INSTALLMENT">
                          Fixed Installment
                        </option>

                        <option value="GOLD_SIP">
                          Gold SIP
                        </option>
                      </SelectField>

                      <SelectField
                        label="Payment Frequency"
                        name="paymentFrequency"
                        value={
                          formData.paymentFrequency
                        }
                        onChange={handleChange}
                        disabled={
                          saving ||
                          isGoldSip
                        }
                      >
                        <option value="MONTHLY">
                          Monthly
                        </option>

                        {!isGoldSip && (
                          <option value="QUARTERLY">
                            Quarterly
                          </option>
                        )}

                        {!isGoldSip && (
                          <option value="HALF_YEARLY">
                            Half Yearly
                          </option>
                        )}

                        {!isGoldSip && (
                          <option value="YEARLY">
                            Yearly
                          </option>
                        )}
                      </SelectField>

                      {!isGoldSip && (
                        <div className="sm:col-span-2">
                          <InputField
                            label="Duration (Months)"
                            name="durationMonths"
                            value={
                              formData.durationMonths
                            }
                            onChange={
                              handleChange
                            }
                            type="number"
                            unit="Months"
                            required
                            disabled={saving}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contribution Rules */}
                  <div>
                    <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 mb-2.5">
                      2. Contribution Bounds
                    </span>

                    {isGoldSip ? (
                      <div className="space-y-2.5">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-900">
                          <Wallet
                            size={15}
                            className="mt-0.5 text-amber-700 shrink-0"
                          />

                          <p className="text-[11px] leading-relaxed">
                            Gold SIP plans are open-ended without fixed durations. Contributions accumulate physical grams directly into customer metal ledgers.
                          </p>
                        </div>

                        <InputField
                          label="Minimum Gold Contribution"
                          name="minimumGrams"
                          value={
                            formData.minimumGrams
                          }
                          onChange={
                            handleChange
                          }
                          type="number"
                          unit="g"
                          placeholder="e.g. 1"
                          min="0.001"
                          step="0.001"
                          required
                          disabled={saving}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <SelectField
                          label="Contribution Type"
                          name="installmentType"
                          value={
                            formData.installmentType
                          }
                          onChange={
                            handleChange
                          }
                          disabled={saving}
                        >
                          <option value="FIXED">
                            Fixed Minimum
                          </option>

                          <option value="VARIABLE">
                            Variable Flexible
                          </option>
                        </SelectField>

                        <InputField
                          label="Minimum Amount"
                          name="minimumAmount"
                          value={
                            formData.minimumAmount
                          }
                          onChange={
                            handleChange
                          }
                          type="number"
                          unit="₹"
                          disabled={
                            saving ||
                            formData.installmentType ===
                              "VARIABLE"
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Interest */}
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                        3. Yield & Interest Strategy
                      </span>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          name="interestEnabled"
                          checked={
                            formData.interestEnabled
                          }
                          onChange={
                            handleChange
                          }
                          disabled={saving}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-0"
                        />

                        <span className="text-[10.5px] font-mono font-semibold text-slate-700">
                          Enable Interest
                        </span>
                      </label>
                    </div>

                    {formData.interestEnabled ? (
                      <div className="space-y-3">
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <InputField
                            label="Annual Rate"
                            name="annualRate"
                            value={
                              formData.annualRate
                            }
                            onChange={
                              handleChange
                            }
                            type="number"
                            unit="%"
                            required
                            disabled={saving}
                            min="0"
                            step="0.01"
                          />

                          <SelectField
                            label="Calculation Method"
                            name="calculationMethod"
                            value={
                              formData.calculationMethod
                            }
                            onChange={
                              handleChange
                            }
                            disabled={saving}
                          >
                            <option value="SIMPLE">
                              Simple Interest
                            </option>

                            <option value="COMPOUND">
                              Compound Interest
                            </option>
                          </SelectField>

                          <SelectField
                            label="Compounding"
                            name="compoundingFrequency"
                            value={
                              formData.compoundingFrequency
                            }
                            onChange={
                              handleChange
                            }
                            disabled={
                              saving ||
                              formData.calculationMethod !==
                                "COMPOUND"
                            }
                          >
                            <option value="NONE">
                              None
                            </option>

                            <option value="MONTHLY">
                              Monthly
                            </option>

                            <option value="QUARTERLY">
                              Quarterly
                            </option>

                            <option value="YEARLY">
                              Yearly
                            </option>
                          </SelectField>

                          <SelectField
                            label="Day Count Standard"
                            name="dayCountConvention"
                            value={
                              formData.dayCountConvention
                            }
                            onChange={
                              handleChange
                            }
                            disabled={saving}
                          >
                            <option value="ACTUAL_365">
                              Actual / 365
                            </option>

                            <option value="ACTUAL_360">
                              Actual / 360
                            </option>

                            <option value="ACTUAL_366">
                              Actual / 366
                            </option>
                          </SelectField>
                        </div>

                        {!isGoldSip &&
                          interestSample && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-500 uppercase text-[10px]">
                                  Projected Illustration:
                                </span>

                                <span className="font-semibold text-slate-800">
                                  Tenure:{" "}
                                  {formData.durationMonths ||
                                    12}{" "}
                                  Mo @{" "}
                                  {formData.annualRate ||
                                    0}
                                  %
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                                <div className="p-2 rounded bg-white border border-slate-200">
                                  <span className="text-[9px] text-slate-400 block uppercase">
                                    Invested
                                  </span>

                                  <span className="font-bold text-slate-900 text-xs">
                                    ₹
                                    {interestSample.totalContribution.toLocaleString(
                                      "en-IN"
                                    )}
                                  </span>
                                </div>

                                <div className="p-2 rounded bg-white border border-slate-200">
                                  <span className="text-[9px] text-slate-400 block uppercase">
                                    Est. Yield
                                  </span>

                                  <span className="font-bold text-emerald-700 text-xs">
                                    ₹
                                    {interestSample.estimatedInterest.toLocaleString(
                                      "en-IN"
                                    )}
                                  </span>
                                </div>

                                <div className="p-2 rounded bg-white border border-slate-200">
                                  <span className="text-[9px] text-slate-400 block uppercase">
                                    Maturity
                                  </span>

                                  <span className="font-bold text-slate-900 text-xs">
                                    ₹
                                    {interestSample.maturityValue.toLocaleString(
                                      "en-IN"
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 font-mono italic">
                        Accounts in this scheme accrue no automated financial yield.
                      </p>
                    )}
                  </div>

                  {/* Account Number */}
                  <div>
                    <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 mb-2.5">
                      4. Account Generation Format
                    </span>

                    {editingId &&
                    schemes.find(
                      (s) => s.id === editingId
                    )?.accountNumberConfig
                      ?.locked ? (
                      <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Lock size={12} />
                          Theme locked to prevent ledger fragmentation.
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            closeModal();

                            openChangeRequest(
                              schemes.find(
                                (s) =>
                                  s.id ===
                                  editingId
                              )
                            );
                          }}
                          className="text-[10.5px] font-bold text-amber-800 underline"
                        >
                          Request Change
                        </button>
                      </div>
                    ) : null}

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <InputField
                        label="Account Prefix"
                        name="accountPrefix"
                        value={
                          formData.accountPrefix
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="e.g. SIP"
                        required
                        disabled={
                          saving ||
                          Boolean(
                            editingId &&
                              schemes.find(
                                (s) =>
                                  s.id ===
                                  editingId
                              )
                                ?.accountNumberConfig
                                ?.locked
                          )
                        }
                      />

                      <InputField
                        label="Zero Padding"
                        name="accountPadding"
                        value={
                          formData.accountPadding
                        }
                        onChange={
                          handleChange
                        }
                        type="number"
                        placeholder="6"
                        required
                        disabled={
                          saving ||
                          Boolean(
                            editingId &&
                              schemes.find(
                                (s) =>
                                  s.id ===
                                  editingId
                              )
                                ?.accountNumberConfig
                                ?.locked
                          )
                        }
                      />

                      <div className="sm:col-span-2 rounded-md bg-slate-50 border border-slate-200 p-2.5 text-center">
                        <span className="text-[9px] font-mono uppercase text-slate-400 block">
                          Format Sample
                        </span>

                        <span className="text-sm font-mono font-bold text-slate-900 tracking-wider">
                          {formData.accountPrefix ||
                            "INV"}
                          -
                          {String(1).padStart(
                            Number(
                              formData.accountPadding ||
                                6
                            ),
                            "0"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="h-7.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  {canWrite && (
                    <button
                      type="submit"
                      disabled={
                        saving || !canWrite
                      }
                      className="h-7.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-medium text-white hover:bg-slate-800 transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <Loader2
                            size={12}
                            className="animate-spin"
                          />

                          <span>
                            Saving...
                          </span>
                        </>
                      ) : (
                        <>
                          <Save size={12} />

                          <span>
                            {editingId
                              ? "Save Changes"
                              : "Create Scheme"}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* CHANGE REQUEST MODAL */}
      {requestModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() =>
              setRequestModal(null)
            }
          >
            <div
              className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Lock
                      size={13}
                      className="text-amber-600"
                    />

                    <span>
                      Theme Change Request
                    </span>
                  </h2>

                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {requestModal.schemeName}{" "}
                    (
                    {
                      requestModal.schemeCode
                    }
                    )
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setRequestModal(null)
                  }
                  disabled={requesting}
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 space-y-3 font-mono text-xs">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900 leading-relaxed">
                  Existing customer passbooks and ledger references rely on this prefix. Modifications require administrator review to prevent historical breaks.
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase text-slate-400 block">
                      Active Prefix
                    </span>

                    <span className="font-bold text-slate-900 text-xs">
                      {requestModal
                        .accountNumberConfig
                        ?.prefix || "—"}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase text-slate-400 block">
                      Padding
                    </span>

                    <span className="font-bold text-slate-900 text-xs">
                      {requestModal
                        .accountNumberConfig
                        ?.padding || "—"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Justification / Reason *
                  </label>

                  <textarea
                    value={requestReason}
                    onChange={(e) =>
                      setRequestReason(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Specify why the account sequence theme must be changed..."
                    disabled={requesting}
                    className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-sans text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setRequestModal(null)
                  }
                  disabled={requesting}
                  className="h-7.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    submitChangeRequest
                  }
                  disabled={requesting}
                  className="h-7.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-medium text-white hover:bg-slate-800 transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  {requesting ? (
                    <>
                      <Loader2
                        size={12}
                        className="animate-spin"
                      />

                      <span>
                        Sending...
                      </span>
                    </>
                  ) : (
                    <>
                      <Mail size={12} />

                      <span>
                        Submit Request
                      </span>
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