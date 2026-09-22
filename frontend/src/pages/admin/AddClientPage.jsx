import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileText,
  Upload,
  UserRound,
  ChevronRight,
  ChevronLeft,
  Check,
  Package,
  Users,
  Receipt,
  Wallet,
  BarChart3,
  MessageCircle,
  Hammer,
  Sparkles,
  MapPinned,
  Tag,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Database,
  Mail,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";

const API_URL = import.meta.env.VITE_API_BASE_URL;

/* ============================================================================
   ABHINAVA ENTERPRISE THEME
   ========================================================================== */

const THEMES = {
  light: {
    mode: "light",
    background: "#F8F9FA",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F4F6",
    surfaceHover: "#EBECEF",

    border: "#E4E7EB",
    borderStrong: "#CBD0D7",

    text: "#0F1117",
    textSoft: "#363B45",
    textMuted: "#6B7280",
    textLight: "#9CA3AF",

    primary: "#0F1117",
    primaryText: "#FFFFFF",
    primaryHover: "#1F2430",
    primarySoft: "#F0F2F5",

    success: "#047857",
    successSoft: "#ECFDF5",
    warning: "#B45309",
    warningSoft: "#FFFBEB",
    danger: "#B91C1C",
    dangerSoft: "#FEF2F2",
  },

  dark: {
    mode: "dark",
    background: "#090A0D",
    surface: "#111318",
    surfaceAlt: "#181B22",
    surfaceHover: "#20242D",

    border: "#20242D",
    borderStrong: "#2E3442",

    text: "#F9FAFB",
    textSoft: "#D1D5DB",
    textMuted: "#88909F",
    textLight: "#545B6B",

    primary: "#FFFFFF",
    primaryText: "#090A0D",
    primaryHover: "#E5E7EB",
    primarySoft: "#1C2029",

    success: "#34D399",
    successSoft: "rgba(52, 211, 153, 0.12)",
    warning: "#FBBF24",
    warningSoft: "rgba(251, 191, 36, 0.12)",
    danger: "#F87171",
    dangerSoft: "rgba(248, 113, 113, 0.12)",
  },
};

function getInitialTheme() {
  try {
    const stored = localStorage.getItem("abhinava-admin-theme");

    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  return "light";
}

/* ============================================================================
   STEPS CONFIGURATION
   ========================================================================== */

const STEPS = [
  {
    id: 0,
    title: "Business",
    subtitle: "Identity & Legal",
    icon: Building2,
    fields: [
      "businessName",
      "legalBusinessName",
      "businessType",
      "country",
      "businessEmail",
      "businessPhone",
    ],
  },

  {
    id: 1,
    title: "Primary Contact",
    subtitle: "Authorized User",
    icon: UserRound,
    fields: [
      "ownerName",
      "ownerEmail",
      "ownerPhone",
      "ownerRole",
    ],
  },

  {
    id: 2,
    title: "Verification",
    subtitle: "Statutory Docs",
    icon: FileText,
    fields: [
      "pan",
      "gstin",
      "aadhaar",
    ],
  },

  {
    id: 3,
    title: "Subscription",
    subtitle: "Plan & Modules",
    icon: CreditCard,
    fields: [
      "subscriptionPlanId",
      "",
      "",
      "billingCycle",
      "subscriptionStatus",
      "startDate",
    ],
  },

  {
    id: 4,
    title: "Workspace",
    subtitle: "Database Isolation",
    icon: Database,
    fields: [
      "firebaseProjectId",
      "domain",
    ],
  },

  {
    id: 5,
    title: "Review",
    subtitle: "Audit & Provision",
    icon: ShieldCheck,
    fields: [],
  },
];

/* ============================================================================
   HELPERS
   ========================================================================== */

function money(value) {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function clean(value) {
  return String(value ?? "").trim();
}

function getModuleName(module) {
  if (typeof module === "string") {
    return module;
  }

  return (
    module?.module_name ||
    module?.name ||
    module?.module_key ||
    module?.key ||
    "Module"
  );
}

function getModuleKey(module) {
  if (typeof module === "string") {
    return module;
  }

  return module?.module_key || module?.key || "";
}

function formatBusinessType(value) {
  const map = {
    proprietorship: "Proprietorship",
    partnership: "Partnership",
    llp: "LLP",
    private_limited: "Private Limited",
  };

  return map[value] || value || "—";
}

function formatBillingCycle(value) {
  if (value === "annual") {
    return "Annual";
  }

  if (value === "monthly") {
    return "Monthly";
  }

  return value || "—";
}

function ModuleIcon({ moduleKey, size = 14 }) {
  const key = String(moduleKey || "").toLowerCase();

  if (key.includes("customer")) {
    return <Users size={size} />;
  }

  if (key.includes("stock") || key.includes("inventory")) {
    return <Package size={size} />;
  }

  if (key.includes("invoice") || key.includes("sales")) {
    return <Receipt size={size} />;
  }

  if (key.includes("investment")) {
    return <Wallet size={size} />;
  }

  if (key.includes("kareegar")) {
    return <Hammer size={size} />;
  }

  if (key.includes("whatsapp") || key.includes("message")) {
    return <MessageCircle size={size} />;
  }

  if (key.includes("report") || key.includes("analytic")) {
    return <BarChart3 size={size} />;
  }

  return <Sparkles size={size} />;
}

/* ============================================================================
   TOAST NOTIFICATION CONTAINER
   ========================================================================== */

function ToastContainer({ toasts, removeToast, theme }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all duration-200"
          style={{
            backgroundColor: theme.surface,
            borderColor:
              toast.type === "error"
                ? theme.danger
                : toast.type === "success"
                ? theme.success
                : theme.border,
          }}
        >
          <div className="flex items-start gap-2.5">
            {toast.type === "error" && (
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0"
                style={{ color: theme.danger }}
              />
            )}

            {toast.type === "success" && (
              <Check
                size={16}
                className="mt-0.5 shrink-0"
                style={{ color: theme.success }}
              />
            )}

            {toast.type === "warning" && (
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0"
                style={{ color: theme.warning }}
              />
            )}

            {toast.type === "info" && (
              <Sparkles
                size={16}
                className="mt-0.5 shrink-0"
                style={{ color: theme.textSoft }}
              />
            )}

            <div>
              <p
                className="text-[12px] font-bold"
                style={{ color: theme.text }}
              >
                {toast.title}
              </p>

              <p
                className="mt-0.5 text-[11px] leading-relaxed"
                style={{ color: theme.textMuted }}
              >
                {toast.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="rounded p-1 transition opacity-60 hover:opacity-100"
            style={{ color: theme.textMuted }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   MAIN COMPONENT
   ========================================================================== */

function AddClientPage() {
  const navigate = useNavigate();

  const [themeMode, setThemeMode] = useState(getInitialTheme);
  const theme = THEMES[themeMode] || THEMES.light;

  /* --------------------------------------------------------------------------
     THEME SYNC
     -------------------------------------------------------------------------- */

  useEffect(() => {
    const handleCustomChange = (e) => {
      if (
        e.detail &&
        (e.detail === "dark" || e.detail === "light")
      ) {
        setThemeMode(e.detail);
      }
    };

    const handleStorageChange = (e) => {
      if (
        e.key === "abhinava-admin-theme" &&
        (e.newValue === "dark" || e.newValue === "light")
      ) {
        setThemeMode(e.newValue);
      }
    };

    window.addEventListener(
      "abhinava-theme-change",
      handleCustomChange
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "abhinava-theme-change",
        handleCustomChange
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  /* --------------------------------------------------------------------------
     TOASTS
     -------------------------------------------------------------------------- */

  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    (title, message, type = "info") => {
      const id = Date.now() + Math.random();

      setToasts((prev) => [
        ...prev,
        {
          id,
          title,
          message,
          type,
        },
      ]);

      setTimeout(() => {
        setToasts((prev) =>
          prev.filter((toast) => toast.id !== id)
        );
      }, 4500);
    },
    []
  );

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.filter((toast) => toast.id !== id)
    );
  }, []);

  /* --------------------------------------------------------------------------
     GENERAL STATE
     -------------------------------------------------------------------------- */

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* --------------------------------------------------------------------------
     SUBSCRIPTION STATE
     -------------------------------------------------------------------------- */

  const [plans, setPlans] = useState([]);

  const [subscriptionLoading, setSubscriptionLoading] =
    useState(true);

  const [subscriptionError, setSubscriptionError] =
    useState("");

  const [resolvedSubscription, setResolvedSubscription] =
    useState(null);

  const [resolvingSubscription, setResolvingSubscription] =
    useState(false);

  /* --------------------------------------------------------------------------
     REFERRAL STATE
     -------------------------------------------------------------------------- */

  const [referralCode, setReferralCode] = useState("");
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralResult, setReferralResult] = useState(null);
  const [referralError, setReferralError] = useState("");

  /* --------------------------------------------------------------------------
     DOCUMENT STATE
     -------------------------------------------------------------------------- */

  const [agreementFile, setAgreementFile] = useState(null);

  /* --------------------------------------------------------------------------
     REACT HOOK FORM
     -------------------------------------------------------------------------- */

  const {
    control,
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    mode: "onChange",

    defaultValues: {
      domain: "jewelry",

      /*
       * IMPORTANT:
       * Nothing is automatically selected for:
       * - Plan
       * - City Tier
       * - Turnover Band
       */
      subscriptionPlanId: "",

      billingCycle: "monthly",
      subscriptionStatus: "active",

      startDate: new Date()
        .toISOString()
        .slice(0, 10),
    },
  });

  /* --------------------------------------------------------------------------
     SUBSCRIPTION WATCHERS
     -------------------------------------------------------------------------- */

  const selectedPlanId = useWatch({
    control,
    name: "subscriptionPlanId",
  });

  const selectedBillingCycle = useWatch({
    control,
    name: "billingCycle",
  });

  /* --------------------------------------------------------------------------
     SELECTED OBJECTS
     -------------------------------------------------------------------------- */

  const selectedPlan = useMemo(
    () =>
      plans.find(
        (plan) =>
          Number(plan.id) === Number(selectedPlanId)
      ),
    [plans, selectedPlanId]
  );

  /* --------------------------------------------------------------------------
     LOAD SUBSCRIPTION CONFIGURATION
     -------------------------------------------------------------------------- */

  const loadSubscriptionConfiguration = async () => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionError("");

      const response = await fetch(
        `${API_URL}/subscriptions/plans`,
        { credentials: "include" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to load subscription plans."
        );
      }

      const activePlans = (
        Array.isArray(data) ? data : data.plans || []
      ).filter((plan) => plan.is_active !== false);

      setPlans(activePlans);
    } catch (error) {
      console.error("Subscription configuration error:", error);
      setSubscriptionError(
        error instanceof Error
          ? error.message
          : "Unable to load subscription plans."
      );
      addToast(
        "Configuration Error",
        "Could not load subscription plans from server.",
        "error"
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionConfiguration();
  }, []);

  /* --------------------------------------------------------------------------
     RESOLVE SUBSCRIPTION PRICE
     -------------------------------------------------------------------------- */

  useEffect(() => {
    const planId = Number(selectedPlanId);

    if (!planId || !selectedBillingCycle) {
      setResolvedSubscription(null);
      setResolvingSubscription(false);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      try {
        setResolvingSubscription(true);

        const params = new URLSearchParams({
          subscription_plan_id: String(selectedPlanId),
          billing_cycle: selectedBillingCycle,
        });

        const response = await fetch(
          `${API_URL}/subscriptions/resolve?${params.toString()}`,
          { credentials: "include" }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to resolve subscription."
          );
        }

        if (!cancelled) {
          setResolvedSubscription(data);
          setReferralResult(null);
          setReferralError("");
        }
      } catch (error) {
        console.error("Subscription resolution error:", error);
        if (!cancelled) setResolvedSubscription(null);
      } finally {
        if (!cancelled) setResolvingSubscription(false);
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [selectedPlanId, selectedBillingCycle]);

  /* --------------------------------------------------------------------------
     REFERRAL CODE
     -------------------------------------------------------------------------- */

  const applyReferralCode = async () => {
    const code = clean(referralCode);

    if (!code) {
      setReferralError("Enter a promo code.");
      setReferralResult(null);
      return;
    }

    if (!selectedPlanId || !selectedBillingCycle) {
      addToast(
        "Parameters Incomplete",
        "Select a subscription plan and billing cycle first.",
        "warning"
      );
      return;
    }

    try {
      setReferralLoading(true);
      setReferralError("");
      setReferralResult(null);

      const params = new URLSearchParams({
        code,
        subscription_plan_id: String(selectedPlanId),
        billing_cycle: selectedBillingCycle,
      });

      const response = await fetch(
        `${API_URL}/referrals/validate?${params.toString()}`,
        {
          credentials: "include",
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Invalid referral code."
        );
      }

      setReferralResult(data);

      addToast(
        "Discount Applied",
        `Applied ${data.code} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(
        "Referral validation error:",
        error
      );

      const msg =
        error instanceof Error
          ? error.message
          : "Invalid promo code.";

      setReferralError(msg);

      addToast(
        "Validation Failed",
        msg,
        "error"
      );
    } finally {
      setReferralLoading(false);
    }
  };

  /* --------------------------------------------------------------------------
     PRICING
     -------------------------------------------------------------------------- */

  const pricing = useMemo(() => {
    const basePrice = Number(
      resolvedSubscription?.price_before_tax || 0
    );

    const taxRate = Number(
      resolvedSubscription?.tax_rate ?? 18
    );

    const discountAmount = Number(
      referralResult?.discount_amount || 0
    );

    const taxableAmount = Math.max(
      0,
      basePrice - discountAmount
    );

    const taxAmount =
      taxableAmount * (taxRate / 100);

    const total =
      taxableAmount + taxAmount;

    return {
      basePrice,
      taxRate,
      discountAmount,
      taxableAmount,
      taxAmount,
      total,
    };
  }, [
    resolvedSubscription,
    referralResult,
  ]);

  /* --------------------------------------------------------------------------
     MODULES
     -------------------------------------------------------------------------- */

  const resolvedModules =
    resolvedSubscription?.modules ||
    selectedPlan?.modules ||
    [];

  /* --------------------------------------------------------------------------
     AGREEMENT FILE
     -------------------------------------------------------------------------- */

  const handleAgreementChange = (event) => {
    const file =
      event.target.files?.[0] || null;

    setAgreementFile(file);

    if (file) {
      addToast(
        "Document Staged",
        `Selected: ${file.name}`,
        "info"
      );
    }
  };

  /* --------------------------------------------------------------------------
     SUBMIT
     -------------------------------------------------------------------------- */

  const onSubmit = async (data) => {
    if (!resolvedSubscription) {
      addToast(
        "Pricing Missing",
        "Please wait for subscription pricing to finish loading.",
        "error"
      );

      return;
    }

    if (referralCode && !referralResult) {
      addToast(
        "Unverified Referral",
        "Apply the referral code before proceeding.",
        "warning"
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const modules = {};

      resolvedModules.forEach((module) => {
        const key = getModuleKey(module);

        if (key) {
          modules[key] = true;
        }
      });

      const clientData = {
        business_name:
          data.businessName,

        legal_business_name:
          data.legalBusinessName,

        business_type:
          data.businessType,

        country:
          data.country,

        business_email:
          data.businessEmail,

        business_phone:
          data.businessPhone,

        owner_name:
          data.ownerName,

        owner_email:
          data.ownerEmail,

        owner_phone:
          data.ownerPhone,

        owner_role:
          data.ownerRole,

        pan:
          data.pan,

        gstin:
          data.gstin || null,

        plan:
          selectedPlan?.name ||
          data.plan ||
          "",

        billing_cycle:
          data.billingCycle,

        subscription_status:
          data.subscriptionStatus,

        start_date:
          data.startDate,

        subscription_plan_id:
          Number(data.subscriptionPlanId),


        referral_code:
          referralResult?.code || null,

        domain:
          data.domain || null,

        firebase_project_id:
          data.firebaseProjectId,

        modules,
      };

      const response = await fetch(
        `${API_URL}/clients`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            clientData
          ),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        let message =
          "Unable to create client.";

        if (
          Array.isArray(
            result?.detail
          )
        ) {
          message = result.detail
            .map((item) => {
              const location =
                Array.isArray(item.loc)
                  ? item.loc.join(" → ")
                  : "";

              return `${
                location
                  ? `${location}: `
                  : ""
              }${
                item.msg ||
                "Invalid value"
              }`;
            })
            .join("\n");
        } else if (
          typeof result?.detail ===
          "string"
        ) {
          message =
            result.detail;
        }

        throw new Error(
          message
        );
      }

      addToast(
        "Client Created",
        `${data.businessName} has been initialized successfully.`,
        "success"
      );

      setTimeout(() => {
        navigate(
          "/admin/clients",
          {
            state: {
              successMessage:
                `${data.businessName} created successfully.`,
            },
          }
        );
      }, 900);
    } catch (error) {
      console.error(
        "Client creation failed:",
        error
      );

      const msg =
        error instanceof Error
          ? error.message
          : "An error occurred while creating client.";

      addToast(
        "Provisioning Failed",
        msg,
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------------------------------------------------------
     NAVIGATION
     -------------------------------------------------------------------------- */

  const handleNext = async () => {
    /*
     * Subscription step requires an actual
     * resolved subscription.
     */
    if (
      currentStep === 3 &&
      !resolvedSubscription
    ) {
      addToast(
        "Subscription Incomplete",
        "Please select a subscription plan and billing cycle with valid pricing.",
        "error"
      );

      return;
    }

    if (currentStep === 5) {
      return;
    }

    const fields =
      STEPS[currentStep].fields;

    const valid =
      fields.length === 0
        ? true
        : await trigger(fields);

    if (!valid) {
      addToast(
        "Validation Warning",
        "Please fill all mandatory fields properly.",
        "warning"
      );

      return;
    }

    setCurrentStep(
      (prev) =>
        Math.min(
          prev + 1,
          STEPS.length - 1
        )
    );
  };

  const handlePrev = () => {
    setCurrentStep(
      (prev) =>
        Math.max(prev - 1, 0)
    );
  };

  /* --------------------------------------------------------------------------
     GENERAL FORM WATCH
     -------------------------------------------------------------------------- */

  const watchedData = watch();

  const submittedDocuments = [
    watchedData.pan
      ? "PAN"
      : null,

    watchedData.gstin
      ? "GSTIN"
      : null,

    watchedData.aadhaar
      ? "Aadhaar Card"
      : null,

    agreementFile
      ? "Client Agreement"
      : null,
  ].filter(Boolean);

  const pendingDocuments = [
    !watchedData.gstin
      ? "GSTIN"
      : null,

    !watchedData.aadhaar
      ? "Aadhaar Card"
      : null,

    !agreementFile
      ? "Client Agreement"
      : null,
  ].filter(Boolean);

  /* ==========================================================================
     RENDER
     ======================================================================== */

  return (
    <div
      className="abhinava-scroll relative flex h-full w-full flex-col gap-4 overflow-y-auto p-4 sm:p-6 lg:p-8"
      style={{
        backgroundColor:
          theme.background,
        color: theme.text,
      }}
    >
      <ToastContainer
        toasts={toasts}
        removeToast={removeToast}
        theme={theme}
      />

      {/* HEADER SECTION */}

      <div className="flex shrink-0 items-center justify-between">
        <div className="text-right">
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: theme.textMuted,
            }}
          >
            Step {currentStep + 1} of{" "}
            {STEPS.length}
          </p>

          <p
            className="text-xs font-bold"
            style={{
              color: theme.text,
            }}
          >
            {STEPS[currentStep].title}
          </p>
        </div>
      </div>

      {/* STEPPER PROGRESS */}

      <div className="hidden shrink-0 sm:block">
        <div
          className="flex items-center justify-between rounded-xl border p-1.5 shadow-sm"
          style={{
            backgroundColor:
              theme.surface,
            borderColor:
              theme.border,
          }}
        >
          {STEPS.map(
            (step, index) => {
              const Icon = step.icon;

              const isActive =
                currentStep === index;

              const isCompleted =
                currentStep > index;

              return (
                <div
                  key={step.id}
                  className="flex flex-1 items-center justify-center gap-2.5 rounded-lg px-3 py-2 transition"
                  style={{
                    backgroundColor:
                      isActive
                        ? theme.surfaceAlt
                        : "transparent",

                    color: isActive
                      ? theme.text
                      : isCompleted
                      ? theme.success
                      : theme.textLight,
                  }}
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold transition-all"
                    style={{
                      backgroundColor:
                        isActive
                          ? theme.primary
                          : isCompleted
                          ? theme.successSoft
                          : theme.surfaceAlt,

                      color: isActive
                        ? theme.primaryText
                        : isCompleted
                        ? theme.success
                        : theme.textMuted,
                    }}
                  >
                    {isCompleted ? (
                      <Check
                        size={13}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Icon size={13} />
                    )}
                  </div>

                  <div className="hidden text-left lg:block">
                    <p
                      className="text-[11px] font-bold"
                      style={{
                        color: isActive
                          ? theme.text
                          : theme.textMuted,
                      }}
                    >
                      {step.title}
                    </p>

                    <p
                      className="text-[9px] uppercase tracking-wider"
                      style={{
                        color:
                          theme.textLight,
                      }}
                    >
                      {step.subtitle}
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* FORM WORKSPACE */}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm"
        style={{
          backgroundColor:
            theme.surface,
          borderColor:
            theme.border,
        }}
      >
        <form
          onSubmit={handleSubmit(
            onSubmit
          )}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              currentStep !==
                STEPS.length - 1
            ) {
              event.preventDefault();
            }
          }}
          className="abhinava-scroll flex h-full flex-col overflow-y-auto p-4 sm:p-6"
        >
          {/* STEP CONTROLS */}

          <div
            className="mb-5 flex shrink-0 items-center justify-between border-b pb-4"
            style={{
              borderColor:
                theme.border,
            }}
          >
            <button
              type="button"
              onClick={handlePrev}
              disabled={
                currentStep === 0 ||
                isSubmitting
              }
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                currentStep === 0
                  ? "invisible"
                  : "border"
              }`}
              style={{
                backgroundColor:
                  theme.surfaceAlt,
                borderColor:
                  theme.border,
                color:
                  theme.textSoft,
              }}
            >
              <ChevronLeft size={14} />
              Back
            </button>

            {currentStep <
            STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold shadow-sm transition hover:opacity-90 active:scale-[0.99]"
                style={{
                  backgroundColor:
                    theme.primary,
                  color:
                    theme.primaryText,
                }}
              >
                Continue
                <ChevronRight
                  size={14}
                />
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !resolvedSubscription
                }
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor:
                    theme.primary,
                  color:
                    theme.primaryText,
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw
                      size={13}
                      className="animate-spin"
                    />
                    Provisioning...
                  </>
                ) : (
                  <>
                    Register &
                    Initialize
                    <Check
                      size={14}
                      strokeWidth={2.5}
                    />
                  </>
                )}
              </button>
            )}
          </div>

          {/* ==================================================================
              STEP 0: BUSINESS DETAILS
              ================================================================== */}

          {currentStep === 0 && (
            <Section
              title="Business Identification"
              description="Establish the legal entity identity and corporate contact channels."
              theme={theme}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Display Business Name"
                  placeholder="e.g. Acme Jewels"
                  required
                  theme={theme}
                  {...register(
                    "businessName",
                    {
                      required:
                        "Business name is required.",
                    }
                  )}
                  error={
                    errors.businessName
                  }
                />

                <InputField
                  label="Registered Corporate Name"
                  placeholder="e.g. Acme Jewels Private Limited"
                  required
                  theme={theme}
                  {...register(
                    "legalBusinessName",
                    {
                      required:
                        "Legal business name is required.",
                    }
                  )}
                  error={
                    errors.legalBusinessName
                  }
                />

                <SelectField
                  label="Entity Legal Structure"
                  required
                  theme={theme}
                  {...register(
                    "businessType",
                    {
                      required:
                        "Business type is required.",
                    }
                  )}
                  error={
                    errors.businessType
                  }
                >
                  <option value="">
                    Select structure
                  </option>

                  <option value="proprietorship">
                    Sole Proprietorship
                  </option>

                  <option value="partnership">
                    Partnership Firm
                  </option>

                  <option value="llp">
                    Limited Liability Partnership
                    (LLP)
                  </option>

                  <option value="private_limited">
                    Private Limited Company
                  </option>
                </SelectField>

                <SelectField
                  label="Operating Jurisdiction"
                  required
                  theme={theme}
                  {...register(
                    "country",
                    {
                      required:
                        "Country is required.",
                    }
                  )}
                  error={
                    errors.country
                  }
                >
                  <option value="India">
                    India (IN)
                  </option>

                  <option value="US">
                    United States (US)
                  </option>
                </SelectField>

                <InputField
                  label="Primary Billing Email"
                  type="email"
                  placeholder="accounts@acme.com"
                  required
                  theme={theme}
                  {...register(
                    "businessEmail",
                    {
                      required:
                        "Business email is required.",

                      pattern: {
                        value:
                          /^\S+@\S+$/i,
                        message:
                          "Invalid email syntax.",
                      },
                    }
                  )}
                  error={
                    errors.businessEmail
                  }
                />

                <InputField
                  label="Business Contact Number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  required
                  theme={theme}
                  {...register(
                    "businessPhone",
                    {
                      required:
                        "Business phone is required.",
                    }
                  )}
                  error={
                    errors.businessPhone
                  }
                />
              </div>
            </Section>
          )}

          {/* ==================================================================
              STEP 1: PRIMARY CONTACT
              ================================================================== */}

          {currentStep === 1 && (
            <Section
              title="Authorizing Authority"
              description="Primary contact credentials for tenant administrative ownership."
              theme={theme}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Full Legal Name"
                  placeholder="Contact legal name"
                  required
                  theme={theme}
                  {...register(
                    "ownerName",
                    {
                      required:
                        "Owner name is required.",
                    }
                  )}
                  error={
                    errors.ownerName
                  }
                />

                <InputField
                  label="Direct Work Email"
                  type="email"
                  placeholder="admin@acme.com"
                  required
                  theme={theme}
                  {...register(
                    "ownerEmail",
                    {
                      required:
                        "Owner email is required.",

                      pattern: {
                        value:
                          /^\S+@\S+$/i,
                        message:
                          "Invalid email syntax.",
                      },
                    }
                  )}
                  error={
                    errors.ownerEmail
                  }
                />

                <InputField
                  label="Direct Contact Number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  required
                  theme={theme}
                  {...register(
                    "ownerPhone",
                    {
                      required:
                        "Owner phone is required.",
                    }
                  )}
                  error={
                    errors.ownerPhone
                  }
                />

                <SelectField
                  label="Account Authorization"
                  theme={theme}
                  {...register(
                    "ownerRole"
                  )}
                >
                  <option value="owner">
                    Primary Owner / Director
                  </option>

                  <option value="admin">
                    System Administrator
                  </option>
                </SelectField>
              </div>
            </Section>
          )}

          {/* ==================================================================
              STEP 2: DOCUMENTS
              ================================================================== */}

          {currentStep === 2 && (
            <Section
              title="Statutory Verification"
              description="Record official verification identifiers for fiscal audit compliance."
              theme={theme}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Permanent Account Number (PAN)"
                  placeholder="ABCDE1234F"
                  required
                  theme={theme}
                  {...register(
                    "pan",
                    {
                      required:
                        "PAN is mandatory.",

                      pattern: {
                        value:
                          /^[A-Z]{5}[0-9]{4}[A-Z]$/,

                        message:
                          "Invalid PAN structure (Format: ABCDE1234F).",
                      },
                    }
                  )}
                  error={
                    errors.pan
                  }
                  className="uppercase font-mono"
                />

                <InputField
                  label="Goods & Services Tax Identifier (GSTIN)"
                  placeholder="22AAAAA0000A1Z5"
                  theme={theme}
                  {...register("gstin")}
                  className="uppercase font-mono"
                />

                <InputField
                  label="National Identity (Aadhaar / Passport)"
                  placeholder="12-digit number"
                  theme={theme}
                  {...register(
                    "aadhaar"
                  )}
                  className="font-mono"
                />

                <div>
                  <FieldLabel theme={theme}>
                    Client Agreement
                    Documentation
                  </FieldLabel>

                  <label
                    className="mt-1 flex min-h-[42px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed px-3.5 py-2.5 transition"
                    style={{
                      backgroundColor:
                        theme.surfaceAlt,

                      borderColor:
                        theme.border,
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Upload
                        size={14}
                        style={{
                          color:
                            theme.textMuted,
                        }}
                      />

                      <span
                        className="truncate text-xs font-semibold"
                        style={{
                          color:
                            theme.text,
                        }}
                      >
                        {agreementFile
                          ? agreementFile.name
                          : "Attach signed agreement"}
                      </span>
                    </div>

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={
                        handleAgreementChange
                      }
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </Section>
          )}

          {/* ==================================================================
              STEP 3: SUBSCRIPTION
              ================================================================== */}

          {currentStep === 3 && (
            <div className="space-y-5">
              {/* PLAN SELECTION */}

              <Section
                title="Service Tier Selection"
                description="Choose the subscription plan to provision workspace capability."
                theme={theme}
              >
                {subscriptionLoading ? (
                  <LoadingBox
                    text="Loading available plans..."
                    theme={theme}
                  />
                ) : subscriptionError ? (
                  <ErrorBox
                    message={
                      subscriptionError
                    }
                    onRetry={
                      loadSubscriptionConfiguration
                    }
                    theme={theme}
                  />
                ) : plans.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed p-4 text-center text-xs"
                    style={{
                      borderColor:
                        theme.border,

                      color:
                        theme.textMuted,
                    }}
                  >
                    No active subscription
                    plans are available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {plans.map((plan) => {
                      const selected =
                        Number(
                          selectedPlanId
                        ) ===
                        Number(plan.id);

                      const planModules =
                        plan.modules || [];

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => {
                            const planId =
                              String(
                                plan.id
                              );

                            setValue(
                              "subscriptionPlanId",
                              planId,
                              {
                                shouldDirty:
                                  true,

                                shouldTouch:
                                  true,

                                shouldValidate:
                                  true,
                              }
                            );

                            /*
                             * Changing plan invalidates
                             * the previous resolved price.
                             */
                            setResolvedSubscription(
                              null
                            );

                            setReferralResult(
                              null
                            );

                            setReferralError(
                              ""
                            );
                          }}
                          className="rounded-xl border p-4 text-left transition-all"
                          style={{
                            backgroundColor:
                              selected
                                ? theme.surfaceAlt
                                : theme.surface,

                            borderColor:
                              selected
                                ? theme.text
                                : theme.border,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p
                                className="text-xs font-bold"
                                style={{
                                  color:
                                    theme.text,
                                }}
                              >
                                {plan.name}
                              </p>

                              <p
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{
                                  color:
                                    theme.textMuted,
                                }}
                              >
                                {plan.main_plan}
                              </p>
                            </div>

                            {selected && (
                              <div
                                className="flex h-5 w-5 items-center justify-center rounded-full"
                                style={{
                                  backgroundColor:
                                    theme.text,

                                  color:
                                    theme.surface,
                                }}
                              >
                                <Check
                                  size={12}
                                  strokeWidth={
                                    3
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {planModules
                              .slice(0, 6)
                              .map(
                                (
                                  module
                                ) => (
                                  <span
                                    key={getModuleKey(
                                      module
                                    )}
                                    className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-semibold"
                                    style={{
                                      backgroundColor:
                                        theme.surface,

                                      borderColor:
                                        theme.border,

                                      color:
                                        theme.textSoft,
                                    }}
                                  >
                                    <ModuleIcon
                                      moduleKey={getModuleKey(
                                        module
                                      )}
                                      size={
                                        10
                                      }
                                    />

                                    {getModuleName(
                                      module
                                    )}
                                  </span>
                                )
                              )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Section>

              {/* BILLING CONFIGURATION */}

              <Section
                title="Billing Configuration"
                description="Pricing is defined directly on the selected subscription plan."
                theme={theme}
              >
                <div className="max-w-md">
                  <SelectField
                    label="Commitment Cycle"
                    required
                    theme={theme}
                    value={selectedBillingCycle}
                    onChange={(e) => {
                      setValue("billingCycle", e.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                      setResolvedSubscription(null);
                      setReferralResult(null);
                      setReferralError("");
                    }}
                  >
                    <option value="monthly">Monthly Cycle</option>
                    <option value="annual">Annual Term</option>
                  </SelectField>
                </div>
              </Section>

              {/* INVOICE PREVIEW */}

              <Section
                title="Invoice Preview"
                description="Live financial calculation including applicable taxes and promotional relief."
                theme={theme}
              >
                {resolvingSubscription ? (
                  <LoadingBox
                    text="Calculating subscription price..."
                    theme={theme}
                  />
                ) : !selectedPlanId ? (
                  <div
                    className="rounded-lg border border-dashed p-4 text-center text-xs"
                    style={{
                      borderColor:
                        theme.border,

                      color:
                        theme.textMuted,
                    }}
                  >
                    Select a subscription plan
                    to preview cost.
                  </div>
                ) : !resolvedSubscription ? (
                  <div
                    className="rounded-lg border border-dashed p-4 text-center text-xs"
                    style={{
                      borderColor:
                        theme.border,

                      color:
                        theme.textMuted,
                    }}
                  >
                    No pricing configuration
                    was found for this
                    combination.
                  </div>
                ) : (
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor:
                        theme.surfaceAlt,

                      borderColor:
                        theme.border,
                    }}
                  >
                    <div className="space-y-2 text-xs">
                      <PriceRow
                        label="Subscription Price"
                        value={money(
                          pricing.basePrice
                        )}
                        theme={theme}
                      />

                      {pricing.discountAmount >
                        0 && (
                        <PriceRow
                          label="Promotional Credit"
                          value={`−${money(
                            pricing.discountAmount
                          )}`}
                          positive
                          theme={theme}
                        />
                      )}

                      <PriceRow
                        label="Net Taxable Value"
                        value={money(
                          pricing.taxableAmount
                        )}
                        theme={theme}
                      />

                      <PriceRow
                        label={`Statutory GST (${pricing.taxRate}%)`}
                        value={money(
                          pricing.taxAmount
                        )}
                        theme={theme}
                      />

                      <div
                        className="mt-2 border-t pt-2.5"
                        style={{
                          borderColor:
                            theme.border,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{
                              color:
                                theme.text,
                            }}
                          >
                            Total Due
                          </span>

                          <span
                            className="text-base font-black"
                            style={{
                              color:
                                theme.text,
                            }}
                          >
                            {money(
                              pricing.total
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Section>

              {/* PROMOTIONAL CODE */}

              <Section
                title="Promotional Redemption"
                description="Enter an authorized partner or referral code."
                theme={theme}
              >
                <div className="flex max-w-sm gap-2">
                  <input
                    value={referralCode}
                    onChange={(e) =>
                      setReferralCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="e.g. PARTNER2026"
                    className="h-10 flex-1 rounded-lg border px-3 text-xs font-mono font-bold uppercase outline-none"
                    style={{
                      backgroundColor:
                        theme.surfaceAlt,

                      borderColor:
                        theme.border,

                      color:
                        theme.text,
                    }}
                  />

                  <button
                    type="button"
                    onClick={
                      applyReferralCode
                    }
                    disabled={
                      referralLoading ||
                      !referralCode.trim()
                    }
                    className="h-10 rounded-lg px-4 text-xs font-bold transition disabled:opacity-50"
                    style={{
                      backgroundColor:
                        theme.primary,

                      color:
                        theme.primaryText,
                    }}
                  >
                    {referralLoading
                      ? "Checking..."
                      : "Redeem"}
                  </button>
                </div>

                {referralError && (
                  <p className="mt-1.5 text-[10px] font-semibold text-rose-500">
                    {referralError}
                  </p>
                )}
              </Section>
            </div>
          )}

          {/* ==================================================================
              STEP 4: WORKSPACE
              ================================================================== */}

          {currentStep === 4 && (
            <Section
              title="Database Partition & Infrastructure"
              description="Configure the dedicated project credentials for isolated tenant deployment."
              theme={theme}
            >
              <div className="max-w-md space-y-4">
                <InputField
                  label="Firebase Project ID"
                  placeholder="e.g. acme-jewellers-prod"
                  required
                  theme={theme}
                  {...register(
                    "firebaseProjectId",
                    {
                      required:
                        "Firebase Project ID is required.",

                      pattern: {
                        value:
                          /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,

                        message:
                          "Must be a lowercase cloud project identifier.",
                      },
                    }
                  )}
                  error={
                    errors.firebaseProjectId
                  }
                />

                <SelectField
                  label="Platform Domain"
                  required
                  theme={theme}
                  {...register("domain")}
                >
                  <option value="jewelry">
                    Jewelry ERP Architecture
                  </option>

                  <option value="general">
                    Standard Multi-Branch Commerce
                  </option>
                </SelectField>
              </div>
            </Section>
          )}

          {/* ==================================================================
              STEP 5: AUDIT & REVIEW
              ================================================================== */}

          {currentStep === 5 && (
            <div className="space-y-4">
              <ReviewSection
                title="Identity & Ownership"
                theme={theme}
              >
                <ReviewGrid
                  theme={theme}
                  items={[
                    [
                      "Business Name",
                      watchedData.businessName,
                    ],

                    [
                      "Legal Name",
                      watchedData.legalBusinessName,
                    ],

                    [
                      "Entity Type",
                      formatBusinessType(
                        watchedData.businessType
                      ),
                    ],

                    [
                      "Contact Email",
                      watchedData.businessEmail,
                    ],

                    [
                      "Direct Line",
                      watchedData.businessPhone,
                    ],

                    [
                      "Authorized Owner",
                      watchedData.ownerName,
                    ],
                  ]}
                />
              </ReviewSection>

              <ReviewSection
                title="Statutory Verification Status"
                theme={theme}
              >
                <div className="flex flex-wrap gap-2">
                  {submittedDocuments.map(
                    (doc) => (
                      <span
                        key={doc}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold"
                        style={{
                          backgroundColor:
                            theme.successSoft,

                          color:
                            theme.success,
                        }}
                      >
                        <Check size={12} />
                        {doc} Verified
                      </span>
                    )
                  )}

                  {pendingDocuments.map(
                    (doc) => (
                      <span
                        key={doc}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold"
                        style={{
                          backgroundColor:
                            theme.warningSoft,

                          color:
                            theme.warning,
                        }}
                      >
                        <AlertCircle
                          size={12}
                        />
                        {doc} Pending
                      </span>
                    )
                  )}
                </div>
              </ReviewSection>

              <ReviewSection
                title="Subscription Allocation"
                theme={theme}
              >
                <ReviewGrid
                  theme={theme}
                  items={[
                    [
                      "Allocated Plan",
                      resolvedSubscription?.subscription_plan?.name ||
                        selectedPlan?.name || "—",
                    ],
                    [
                      "Plan Type",
                      resolvedSubscription?.subscription_plan?.main_plan ||
                        selectedPlan?.main_plan || "—",
                    ],
                    [
                      "Billing Term",
                      formatBillingCycle(selectedBillingCycle),
                    ],
                    [
                      "Monthly Price",
                      selectedPlan ? money(selectedPlan.monthly_price) : "—",
                    ],
                    [
                      "Annual Price",
                      selectedPlan ? money(selectedPlan.annual_price) : "—",
                    ],
                    [
                      "Cloud Workspace",
                      watchedData.firebaseProjectId,
                    ],
                    [
                      "Total Payable",
                      money(pricing.total),
                    ],
                  ]}
                />
              </ReviewSection>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   MODULAR INPUT HELPERS
   ========================================================================== */

function Section({
  title,
  description,
  children,
  theme,
}) {
  return (
    <section className="mb-4">
      <div className="mb-3">
        <h2
          className="text-[13px] font-bold uppercase tracking-wider"
          style={{
            color: theme.text,
          }}
        >
          {title}
        </h2>

        {description && (
          <p
            className="text-[11px]"
            style={{
              color:
                theme.textMuted,
            }}
          >
            {description}
          </p>
        )}
      </div>

      <div>
        {children}
      </div>
    </section>
  );
}

function FieldLabel({
  children,
  required = false,
  theme,
}) {
  return (
    <label
      className="text-[10px] font-bold uppercase tracking-wider"
      style={{
        color: theme.textMuted,
      }}
    >
      {children}

      {required && (
        <span className="ml-1 text-rose-500">
          *
        </span>
      )}
    </label>
  );
}

function FieldError({
  message,
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1 text-[10px] font-semibold text-rose-500">
      {message}
    </p>
  );
}

const InputField =
  React.forwardRef(
    (
      {
        label,
        required = false,
        error,
        theme,
        className = "",
        ...props
      },
      ref
    ) => {
      return (
        <div>
          <FieldLabel
            required={required}
            theme={theme}
          >
            {label}
          </FieldLabel>

          <input
            ref={ref}
            {...props}
            className={`mt-1 h-10 w-full rounded-lg border px-3 text-xs font-medium outline-none transition focus:border-zinc-500 ${className}`}
            style={{
              backgroundColor:
                theme.surfaceAlt,

              borderColor:
                theme.border,

              color:
                theme.text,
            }}
          />

          {error && (
            <FieldError
              message={
                error.message
              }
            />
          )}
        </div>
      );
    }
  );

InputField.displayName =
  "InputField";

const SelectField =
  React.forwardRef(
    (
      {
        label,
        required = false,
        error,
        theme,
        children,
        ...props
      },
      ref
    ) => {
      return (
        <div>
          <FieldLabel
            required={required}
            theme={theme}
          >
            {label}
          </FieldLabel>

          <select
            ref={ref}
            {...props}
            className="mt-1 h-10 w-full rounded-lg border px-3 text-xs font-medium outline-none transition focus:border-zinc-500"
            style={{
              backgroundColor:
                theme.surfaceAlt,

              borderColor:
                theme.border,

              color:
                theme.text,
            }}
          >
            {children}
          </select>

          {error && (
            <FieldError
              message={
                error.message
              }
            />
          )}
        </div>
      );
    }
  );

SelectField.displayName =
  "SelectField";

function LoadingBox({
  text,
  theme,
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border px-3 py-3"
      style={{
        backgroundColor:
          theme.surfaceAlt,

        borderColor:
          theme.border,
      }}
    >
      <RefreshCw
        size={14}
        className="animate-spin"
        style={{
          color: theme.text,
        }}
      />

      <span
        className="text-xs font-medium"
        style={{
          color:
            theme.textMuted,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function ErrorBox({
  message,
  onRetry,
  theme,
}) {
  return (
    <div
      className="rounded-lg border p-3.5"
      style={{
        backgroundColor:
          theme.dangerSoft,

        borderColor:
          theme.danger,
      }}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle
          size={15}
          className="mt-0.5 shrink-0"
          style={{
            color: theme.danger,
          }}
        />

        <div className="flex-1">
          <p
            className="text-xs font-semibold"
            style={{
              color:
                theme.danger,
            }}
          >
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider underline"
            style={{
              color:
                theme.danger,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  positive = false,
  theme,
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className="text-[11px] font-medium"
        style={{
          color:
            theme.textMuted,
        }}
      >
        {label}
      </span>

      <span
        className="text-xs font-bold"
        style={{
          color: positive
            ? theme.success
            : theme.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ReviewSection({
  title,
  children,
  theme,
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor:
          theme.border,
      }}
    >
      <h3
        className="mb-2 text-[11px] font-bold uppercase tracking-wider"
        style={{
          color: theme.text,
        }}
      >
        {title}
      </h3>

      {children}
    </div>
  );
}

function ReviewGrid({
  items,
  theme,
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(
        ([label, value]) => (
          <div key={label}>
            <p
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              {label}
            </p>

            <p
              className="mt-0.5 break-words text-xs font-semibold"
              style={{
                color:
                  theme.text,
              }}
            >
              {value || "—"}
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default AddClientPage;