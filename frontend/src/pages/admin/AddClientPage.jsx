import { useEffect, useMemo, useState } from "react";
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
  Percent,
  IndianRupee,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const GOLD = "#c59b27";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";


// ============================================================
// STEPS
// ============================================================

const STEPS = [
  {
    id: 0,
    title: "Business",
    subtitle: "Legal details",
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
    title: "Owner",
    subtitle: "Contact info",
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
    title: "Documents",
    subtitle: "Verification",
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
    subtitle: "Plan & billing",
    icon: CreditCard,
    fields: [
      "subscriptionPlanId",
      "cityTierId",
      "billingCycle",
      "subscriptionStatus",
      "startDate",
    ],
  },
  {
    id: 4,
    title: "Workspace",
    subtitle: "Firebase setup",
    icon: Database,
    fields: [
      "firebaseProjectId",
      "domain",
    ],
  },
  {
    id: 5,
    title: "Review",
    subtitle: "Confirm & create",
    icon: ShieldCheck,
    fields: [],
  },
];


// ============================================================
// HELPERS
// ============================================================

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

  return (
    module?.module_key ||
    module?.key ||
    ""
  );
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
  if (value === "annual") return "Annual";
  if (value === "monthly") return "Monthly";

  return value || "—";
}

function formatDiscountType(value) {
  if (value === "PERCENTAGE") return "Percentage";
  if (value === "FIXED") return "Fixed";

  return value || "";
}


// ============================================================
// MODULE ICON
// ============================================================

function ModuleIcon({ moduleKey, size = 15 }) {
  const key = String(moduleKey || "").toLowerCase();

  if (key.includes("customer")) {
    return <Users size={size} />;
  }

  if (
    key.includes("stock") ||
    key.includes("inventory")
  ) {
    return <Package size={size} />;
  }

  if (
    key.includes("invoice") ||
    key.includes("sales")
  ) {
    return <Receipt size={size} />;
  }

  if (key.includes("investment")) {
    return <Wallet size={size} />;
  }

  if (key.includes("kareegar")) {
    return <Hammer size={size} />;
  }

  if (
    key.includes("whatsapp") ||
    key.includes("message")
  ) {
    return <MessageCircle size={size} />;
  }

  if (
    key.includes("report") ||
    key.includes("analytic")
  ) {
    return <BarChart3 size={size} />;
  }

  return <Sparkles size={size} />;
}


// ============================================================
// MAIN PAGE
// ============================================================

function AddClientPage() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitStatus, setSubmitStatus] =
    useState("idle");

  const [submitMessage, setSubmitMessage] =
    useState("");

  // ----------------------------------------------------------
  // SUBSCRIPTION DATA
  // ----------------------------------------------------------

  const [plans, setPlans] = useState([]);
  const [cityTiers, setCityTiers] = useState([]);

  const [subscriptionLoading, setSubscriptionLoading] =
    useState(true);

  const [subscriptionError, setSubscriptionError] =
    useState("");

  // ----------------------------------------------------------
  // RESOLVED SUBSCRIPTION
  // ----------------------------------------------------------

  const [resolvedSubscription, setResolvedSubscription] =
    useState(null);

  const [resolvingSubscription, setResolvingSubscription] =
    useState(false);

  // ----------------------------------------------------------
  // REFERRAL
  // ----------------------------------------------------------

  const [referralCode, setReferralCode] =
    useState("");

  const [referralLoading, setReferralLoading] =
    useState(false);

  const [referralResult, setReferralResult] =
    useState(null);

  const [referralError, setReferralError] =
    useState("");

  // ----------------------------------------------------------
  // DOCUMENT FILE
  // ----------------------------------------------------------

  const [agreementFile, setAgreementFile] =
    useState(null);

  // ----------------------------------------------------------
  // FORM
  // ----------------------------------------------------------

  const {
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
      subscriptionPlanId: "",
      cityTierId: "",
      billingCycle: "monthly",
      subscriptionStatus: "active",
      startDate:
        new Date().toISOString().slice(0, 10),
    },
  });

  const selectedPlanId =
    watch("subscriptionPlanId");

  const selectedCityTierId =
    watch("cityTierId");

  const selectedBillingCycle =
    watch("billingCycle");

  const selectedPlan = useMemo(
    () =>
      plans.find(
        (plan) =>
          Number(plan.id) ===
          Number(selectedPlanId)
      ),
    [plans, selectedPlanId]
  );

  const selectedCityTier = useMemo(
    () =>
      cityTiers.find(
        (tier) =>
          Number(tier.id) ===
          Number(selectedCityTierId)
      ),
    [cityTiers, selectedCityTierId]
  );


  // ==========================================================
  // LOAD SUBSCRIPTIONS
  // ==========================================================

  const loadSubscriptionConfiguration =
    async () => {
      try {
        setSubscriptionLoading(true);
        setSubscriptionError("");

        const [
          plansResponse,
          tiersResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/subscriptions/plans`,
            {
              credentials: "include",
            }
          ),
          fetch(
            `${API_URL}/subscriptions/city-tiers`,
            {
              credentials: "include",
            }
          ),
        ]);

        if (!plansResponse.ok) {
          throw new Error(
            "Unable to load subscription plans."
          );
        }

        if (!tiersResponse.ok) {
          throw new Error(
            "Unable to load city tiers."
          );
        }

        const plansData =
          await plansResponse.json();

        const tiersData =
          await tiersResponse.json();

        const activePlans = (
          plansData.plans || []
        ).filter(
          (plan) =>
            plan.is_active !== false
        );

        const activeTiers = (
          tiersData.city_tiers || []
        ).filter(
          (tier) =>
            tier.is_active !== false
        );

        setPlans(activePlans);
        setCityTiers(activeTiers);

        if (
          activePlans.length > 0 &&
          !getValues("subscriptionPlanId")
        ) {
          setValue(
            "subscriptionPlanId",
            String(activePlans[0].id),
            {
              shouldValidate: true,
            }
          );
        }

        if (
          activeTiers.length > 0 &&
          !getValues("cityTierId")
        ) {
          setValue(
            "cityTierId",
            String(activeTiers[0].id),
            {
              shouldValidate: true,
            }
          );
        }
      } catch (error) {
        console.error(
          "Subscription configuration error:",
          error
        );

        setSubscriptionError(
          error instanceof Error
            ? error.message
            : "Unable to load subscription configuration."
        );
      } finally {
        setSubscriptionLoading(false);
      }
    };

  useEffect(() => {
    loadSubscriptionConfiguration();
  }, []);


  // ==========================================================
  // RESOLVE PLAN PRICE + MODULES
  // ==========================================================

  useEffect(() => {
    const planId = Number(selectedPlanId);
    const tierId = Number(selectedCityTierId);

    if (
      !planId ||
      !tierId ||
      !selectedBillingCycle
    ) {
      setResolvedSubscription(null);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      try {
        setResolvingSubscription(true);

        const params =
          new URLSearchParams({
            subscription_plan_id:
              String(planId),
            city_tier_id:
              String(tierId),
            billing_cycle:
              selectedBillingCycle,
          });

        const response = await fetch(
          `${API_URL}/subscriptions/resolve?${params.toString()}`,
          {
            credentials: "include",
          }
        );

        const data =
          await response.json().catch(
            () => ({})
          );

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to resolve subscription."
          );
        }

        if (!cancelled) {
          setResolvedSubscription(data);

          /*
           * A subscription change invalidates
           * an earlier referral calculation.
           */
          setReferralResult(null);
          setReferralError("");
        }
      } catch (error) {
        console.error(
          "Subscription resolution error:",
          error
        );

        if (!cancelled) {
          setResolvedSubscription(null);
        }
      } finally {
        if (!cancelled) {
          setResolvingSubscription(false);
        }
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [
    selectedPlanId,
    selectedCityTierId,
    selectedBillingCycle,
  ]);


  // ==========================================================
  // REFERRAL VALIDATION
  // ==========================================================

  const applyReferralCode = async () => {
    const code = clean(referralCode);

    if (!code) {
      setReferralError(
        "Enter a referral code."
      );
      setReferralResult(null);
      return;
    }

    if (
      !selectedPlanId ||
      !selectedCityTierId ||
      !selectedBillingCycle
    ) {
      setReferralError(
        "Select a plan, city tier and billing cycle first."
      );
      return;
    }

    try {
      setReferralLoading(true);
      setReferralError("");
      setReferralResult(null);

      const params =
        new URLSearchParams({
          code,
          subscription_plan_id:
            String(selectedPlanId),
          city_tier_id:
            String(selectedCityTierId),
          billing_cycle:
            selectedBillingCycle,
        });

      const response = await fetch(
        `${API_URL}/referrals/validate?${params.toString()}`,
        {
          credentials: "include",
        }
      );

      const data =
        await response.json().catch(
          () => ({})
        );

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Invalid referral code."
        );
      }

      setReferralResult(data);
    } catch (error) {
      console.error(
        "Referral validation error:",
        error
      );

      setReferralError(
        error instanceof Error
          ? error.message
          : "Unable to validate referral code."
      );
    } finally {
      setReferralLoading(false);
    }
  };


  // ==========================================================
  // PRICING
  // ==========================================================

  const pricing = useMemo(() => {
    const basePrice = Number(
      resolvedSubscription?.price_before_tax ||
        0
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


  // ==========================================================
  // MODULES
  // ==========================================================

  const resolvedModules =
    resolvedSubscription?.modules ||
    selectedPlan?.modules ||
    [];


  // ==========================================================
  // PLAN CHANGE
  // ==========================================================

  const handlePlanChange = (
    event
  ) => {
    const value = event.target.value;

    setValue(
      "subscriptionPlanId",
      value,
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );

    setReferralCode("");
    setReferralResult(null);
    setReferralError("");
  };


  // ==========================================================
  // CITY TIER CHANGE
  // ==========================================================

  const handleTierChange = (
    event
  ) => {
    const value = event.target.value;

    setValue(
      "cityTierId",
      value,
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );

    setReferralResult(null);
    setReferralError("");
  };


  // ==========================================================
  // BILLING CHANGE
  // ==========================================================

  const handleBillingChange = (
    event
  ) => {
    const value = event.target.value;

    setValue(
      "billingCycle",
      value,
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );

    setReferralResult(null);
    setReferralError("");
  };


  // ==========================================================
  // AGREEMENT
  // ==========================================================

  const handleAgreementChange = (
    event
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    setAgreementFile(file);
  };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const onSubmit = async (data) => {
    if (
      !resolvedSubscription
    ) {
      alert(
        "Please wait for the subscription pricing to finish loading."
      );
      return;
    }

    if (
      data.referral_code &&
      !referralResult
    ) {
      alert(
        "Apply the referral code before creating the client."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      /*
       * Modules are authoritative from the
       * selected subscription plan.
       */

      const modules = {};

      resolvedModules.forEach(
        (module) => {
          const key =
            getModuleKey(module);

          if (key) {
            modules[key] = true;
          }
        }
      );

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

        city_tier_id:
          Number(data.cityTierId),

        referral_code:
          referralResult?.code ||
          null,

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
          body:
            JSON.stringify(clientData),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        let message =
          "Unable to create client.";

        if (
          Array.isArray(result?.detail)
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
        } else if (
          result?.message
        ) {
          message =
            result.message;
        }

        throw new Error(message);
      }

      setSubmitStatus("success");

      setSubmitMessage(
        `${
          data.businessName
        } has been created successfully.`
      );

      setTimeout(() => {
        navigate(
          "/admin/clients",
          {
            state: {
              successMessage:
                `${
                  data.businessName
                } created successfully.`,
            },
          }
        );
      }, 1000);
    } catch (error) {
      console.error(
        "Client creation failed:",
        error
      );

      setSubmitStatus("error");

      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the client."
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleNext = async () => {
    if (
      currentStep === 3 &&
      !resolvedSubscription
    ) {
      alert(
        "Please select a valid plan, city tier and billing cycle."
      );
      return;
    }

    if (
      currentStep === 5
    ) {
      return;
    }

    const fields =
      STEPS[currentStep].fields;

    const valid =
      fields.length === 0
        ? true
        : await trigger(fields);

    if (!valid) {
      return;
    }

    setCurrentStep(
      (previous) =>
        Math.min(
          previous + 1,
          STEPS.length - 1
        )
    );
  };

  const handlePrev = () => {
    setCurrentStep(
      (previous) =>
        Math.max(
          previous - 1,
          0
        )
    );
  };


  // ==========================================================
  // REVIEW DATA
  // ==========================================================

  const watchedData = watch();

  const submittedDocuments =
    [
      watchedData.pan
        ? "PAN"
        : null,

      watchedData.gstin
        ? "GSTIN"
        : null,

      watchedData.aadhaar
        ? "Aadhaar"
        : null,

      agreementFile
        ? "Client Agreement"
        : null,
    ].filter(Boolean);

  const pendingDocuments =
    [
      !watchedData.gstin
        ? "GSTIN"
        : null,

      !watchedData.aadhaar
        ? "Aadhaar"
        : null,

      !agreementFile
        ? "Client Agreement"
        : null,
    ].filter(Boolean);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className={`h-full w-full overflow-y-auto lg:overflow-hidden flex flex-col gap-4 bg-slate-50/60 p-4 sm:p-5 lg:p-6 ${noScroll}`}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex shrink-0 items-center justify-between">
        <div>
          <Link
            to="/admin/clients"
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            Back to Directory
          </Link>

          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Add New Client
          </h1>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Complete onboarding, subscription,
            billing and workspace setup.
          </p>
        </div>

        <div className="text-right">
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: GOLD }}
          >
            Step {currentStep + 1} of{" "}
            {STEPS.length}
          </p>

          <p className="text-xs font-semibold text-slate-600">
            {STEPS[currentStep].title}
          </p>
        </div>
      </div>


      {/* ======================================================
          DESKTOP STEPPER
      ====================================================== */}

      <div className="hidden shrink-0 sm:block">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {STEPS.map(
            (step, index) => {
              const Icon =
                step.icon;

              const isActive =
                currentStep ===
                index;

              const isCompleted =
                currentStep > index;

              return (
                <div
                  key={step.id}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-3 py-2.5 transition ${
                    isActive
                      ? "bg-[#faf8f3]"
                      : isCompleted
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-slate-900 text-[#e6cda3]"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isCompleted ? (
                      <Check
                        size={14}
                        strokeWidth={3}
                      />
                    ) : (
                      <Icon
                        size={14}
                      />
                    )}
                  </div>

                  <div className="hidden text-left lg:block">
                    <p
                      className={`text-xs font-bold ${
                        isActive
                          ? "text-slate-900"
                          : "text-slate-500"
                      }`}
                    >
                      {step.title}
                    </p>

                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      {step.subtitle}
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>


      {/* ======================================================
          MOBILE PROGRESS
      ====================================================== */}

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 sm:hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${
              ((currentStep + 1) /
                STEPS.length) *
              100
            }%`,
            backgroundColor:
              GOLD,
          }}
        />
      </div>


      {/* ======================================================
          MAIN FORM
      ====================================================== */}

      <div className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">

        <form
          onSubmit={handleSubmit(
            onSubmit
          )}
          onKeyDown={(event) => {
            if (
              event.key ===
                "Enter" &&
              currentStep !==
                STEPS.length - 1
            ) {
              event.preventDefault();
            }
          }}
          className={`flex h-full flex-col overflow-y-auto p-4 sm:p-6 ${noScroll}`}
        >

          {/* ==================================================
              TOP NAV
          ================================================== */}

          <div className="mb-5 flex shrink-0 items-center justify-between border-b border-slate-100 pb-4">

            <button
              type="button"
              onClick={
                handlePrev
              }
              disabled={
                currentStep ===
                  0 ||
                isSubmitting
              }
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                currentStep ===
                0
                  ? "invisible"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ChevronLeft
                size={14}
              />
              Back
            </button>

            {currentStep <
            STEPS.length - 1 ? (
              <button
                type="button"
                onClick={
                  handleNext
                }
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Next Step
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
                className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor:
                    GOLD,
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Client
                    <Check
                      size={14}
                      strokeWidth={3}
                    />
                  </>
                )}
              </button>
            )}
          </div>


          {/* ==================================================
              STATUS
          ================================================== */}

          {submitStatus !==
            "idle" && (
            <div
              className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${
                submitStatus ===
                "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {submitStatus ===
              "success" ? (
                <Check
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />
              ) : (
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-rose-600"
                />
              )}

              <span>
                {submitMessage}
              </span>
            </div>
          )}


          {/* ==================================================
              STEP 0 BUSINESS
          ================================================== */}

          {currentStep ===
            0 && (
            <Section
              title="Business Details"
              description="Record the legal and operational identity of the client."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <InputField
                  label="Business Name"
                  placeholder="ABC Jewellers"
                  required
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
                  label="Legal Business Name"
                  placeholder="ABC Jewellers Pvt Ltd"
                  required
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
                  label="Business Type"
                  required
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
                    Select type
                  </option>
                  <option value="proprietorship">
                    Proprietorship
                  </option>
                  <option value="partnership">
                    Partnership
                  </option>
                  <option value="llp">
                    LLP
                  </option>
                  <option value="private_limited">
                    Private Limited
                  </option>
                </SelectField>

                <SelectField
                  label="Country"
                  required
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
                    India
                  </option>
                  <option value="US">
                    United States
                  </option>
                </SelectField>

                <InputField
                  label="Business Email"
                  type="email"
                  placeholder="contact@abc.com"
                  required
                  {...register(
                    "businessEmail",
                    {
                      required:
                        "Business email is required.",
                      pattern: {
                        value:
                          /^\S+@\S+$/i,
                        message:
                          "Enter a valid email.",
                      },
                    }
                  )}
                  error={
                    errors.businessEmail
                  }
                />

                <InputField
                  label="Business Phone"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  required
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


          {/* ==================================================
              STEP 1 OWNER
          ================================================== */}

          {currentStep ===
            1 && (
            <Section
              title="Owner / Primary Contact"
              description="This person will be the primary business contact for the account."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <InputField
                  label="Owner Name"
                  placeholder="Full name"
                  required
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
                  label="Owner Email"
                  type="email"
                  placeholder="owner@example.com"
                  required
                  {...register(
                    "ownerEmail",
                    {
                      required:
                        "Owner email is required.",
                      pattern: {
                        value:
                          /^\S+@\S+$/i,
                        message:
                          "Enter a valid email.",
                      },
                    }
                  )}
                  error={
                    errors.ownerEmail
                  }
                />

                <InputField
                  label="Owner Phone"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  required
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
                  label="Account Role"
                  {...register(
                    "ownerRole"
                  )}
                >
                  <option value="owner">
                    Owner
                  </option>
                  <option value="admin">
                    Administrator
                  </option>
                </SelectField>

              </div>
            </Section>
          )}


          {/* ==================================================
              STEP 2 DOCUMENTS
          ================================================== */}

          {currentStep ===
            2 && (
            <Section
              title="Verification Documents"
              description="Track the documents received during onboarding."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <InputField
                  label="PAN"
                  placeholder="ABCDE1234F"
                  required
                  {...register(
                    "pan",
                    {
                      required:
                        "PAN is required.",
                      pattern: {
                        value:
                          /^[A-Z]{5}[0-9]{4}[A-Z]$/,
                        message:
                          "Invalid PAN format.",
                      },
                    }
                  )}
                  error={
                    errors.pan
                  }
                  className="uppercase"
                />

                <InputField
                  label="GSTIN"
                  placeholder="22AAAAA0000A1Z5"
                  {...register(
                    "gstin"
                  )}
                />

                <InputField
                  label="Aadhaar"
                  placeholder="XXXX XXXX XXXX"
                  {...register(
                    "aadhaar"
                  )}
                />

                <div>
                  <FieldLabel>
                    Client Agreement
                  </FieldLabel>

                  <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-[#faf8f3]/50 px-4 py-3 transition hover:border-[#c59b27]">

                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400">
                        <Upload
                          size={14}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-700">
                          {agreementFile
                            ? agreementFile.name
                            : "Upload agreement"}
                        </p>

                        <p className="text-[9px] text-slate-400">
                          PDF, DOC or DOCX
                        </p>
                      </div>
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

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <FileText
                    size={16}
                    className="mt-0.5 text-slate-500"
                  />

                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Document status
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      PAN is required to create the
                      client record. Optional documents
                      can remain pending and be completed
                      later.
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          )}


          {/* ==================================================
              STEP 3 SUBSCRIPTION
          ================================================== */}

          {currentStep ===
            3 && (
            <div className="space-y-5">

              <Section
                title="Subscription"
                description="Select one of the subscription plans configured in Abhinava."
              >

                {subscriptionLoading ? (
                  <LoadingBox text="Loading subscription plans..." />
                ) : subscriptionError ? (
                  <ErrorBox
                    message={
                      subscriptionError
                    }
                    onRetry={
                      loadSubscriptionConfiguration
                    }
                  />
                ) : plans.length ===
                  0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <CreditCard
                      size={22}
                      className="mx-auto text-slate-400"
                    />

                    <p className="mt-3 text-xs font-semibold text-slate-700">
                      No active subscription
                      plans available
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      Create a plan from the
                      Subscriptions page first.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                    {plans.map(
                      (plan) => {
                        const selected =
                          Number(
                            selectedPlanId
                          ) ===
                          Number(
                            plan.id
                          );

                        const modules =
                          plan.modules ||
                          [];

                        return (
                          <button
                            key={
                              plan.id
                            }
                            type="button"
                            onClick={() => {
                              setValue(
                                "subscriptionPlanId",
                                String(
                                  plan.id
                                ),
                                {
                                  shouldDirty:
                                    true,
                                  shouldValidate:
                                    true,
                                }
                              );

                              setReferralResult(
                                null
                              );
                              setReferralError(
                                ""
                              );
                            }}
                            className={`text-left rounded-2xl border p-4 transition ${
                              selected
                                ? "border-[#c59b27]/50 bg-[#faf8f3] shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                            }`}
                          >

                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">

                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                      selected
                                        ? "bg-slate-900 text-[#e6cda3]"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    <Package
                                      size={16}
                                    />
                                  </div>

                                  <div>
                                    <p className="text-sm font-bold text-slate-900">
                                      {
                                        plan.name
                                      }
                                    </p>

                                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                      {
                                        plan.main_plan
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {selected && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                                  <Check
                                    size={13}
                                    strokeWidth={
                                      3
                                    }
                                  />
                                </div>
                              )}

                            </div>

                            {plan.description && (
                              <p className="mt-3 text-[10px] leading-4 text-slate-500">
                                {
                                  plan.description
                                }
                              </p>
                            )}

                            <div className="mt-4 flex flex-wrap gap-1.5">

                              {modules
                                .slice(
                                  0,
                                  6
                                )
                                .map(
                                  (
                                    module
                                  ) => (
                                    <span
                                      key={
                                        getModuleKey(
                                          module
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[9px] font-semibold text-slate-500 ring-1 ring-slate-100"
                                    >
                                      <ModuleIcon
                                        moduleKey={getModuleKey(
                                          module
                                        )}
                                        size={
                                          10
                                        }
                                      />
                                      {
                                        getModuleName(
                                          module
                                        )
                                      }
                                    </span>
                                  )
                                )}

                            </div>
                          </button>
                        );
                      }
                    )}

                  </div>
                )}
              </Section>


              {/* CITY + BILLING */}

              <Section
                title="Billing Configuration"
                description="Pricing is resolved from the selected plan and city tier."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                  <SelectField
                    label="City Tier"
                    required
                    value={
                      selectedCityTierId
                    }
                    onChange={
                      handleTierChange
                    }
                  >
                    <option value="">
                      Select city tier
                    </option>

                    {cityTiers.map(
                      (tier) => (
                        <option
                          key={
                            tier.id
                          }
                          value={
                            tier.id
                          }
                        >
                          {
                            tier.name
                          }
                        </option>
                      )
                    )}
                  </SelectField>


                  <SelectField
                    label="Billing Cycle"
                    required
                    value={
                      selectedBillingCycle
                    }
                    onChange={
                      handleBillingChange
                    }
                  >
                    <option value="monthly">
                      Monthly
                    </option>

                    <option value="annual">
                      Annual
                    </option>
                  </SelectField>


                  <SelectField
                    label="Subscription Status"
                    {...register(
                      "subscriptionStatus"
                    )}
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="pending">
                      Pending
                    </option>
                  </SelectField>

                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <div>
                    <FieldLabel>
                      Start Date
                    </FieldLabel>

                    <input
                      type="date"
                      {...register(
                        "startDate",
                        {
                          required:
                            "Start date is required.",
                        }
                      )}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[#c59b27]"
                    />

                    {errors.startDate && (
                      <FieldError
                        message={
                          errors
                            .startDate
                            .message
                        }
                      />
                    )}
                  </div>

                  <div className="flex items-end">
                    <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPinned
                          size={14}
                          className="text-slate-400"
                        />

                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Pricing Market
                          </p>

                          <p className="mt-0.5 text-xs font-bold text-slate-700">
                            {
                              selectedCityTier?.name ||
                              "Select a city tier"
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </Section>


              {/* PRICE PREVIEW */}

              <Section
                title="Invoice Preview"
                description="The final amount is calculated from the selected plan, billing cycle and referral discount."
              >

                {resolvingSubscription ? (
                  <LoadingBox text="Resolving plan pricing..." />
                ) : !resolvedSubscription ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <CreditCard
                      size={20}
                      className="mx-auto text-slate-400"
                    />

                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Select a plan and city
                      tier to preview pricing.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.7fr]">

                    {/* PLAN SUMMARY */}

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Selected Plan
                          </p>

                          <h3 className="mt-1 text-base font-bold text-slate-900">
                            {
                              resolvedSubscription
                                ?.subscription_plan
                                ?.name
                            }
                          </h3>

                          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                            {
                              resolvedSubscription
                                ?.subscription_plan
                                ?.main_plan
                            }{" "}
                            ·{" "}
                            {
                              selectedCityTier?.name
                            }{" "}
                            ·{" "}
                            {
                              formatBillingCycle(
                                selectedBillingCycle
                              )
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-white">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                            Before Tax
                          </p>

                          <p className="mt-0.5 text-sm font-bold">
                            {money(
                              pricing.basePrice
                            )}
                          </p>
                        </div>

                      </div>


                      <div className="mt-5 border-t border-slate-100 pt-4">

                        <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Included Modules
                        </p>

                        <div className="flex flex-wrap gap-2">

                          {resolvedModules.map(
                            (module) => (
                              <span
                                key={getModuleKey(
                                  module
                                )}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600"
                              >
                                <ModuleIcon
                                  moduleKey={getModuleKey(
                                    module
                                  )}
                                  size={
                                    11
                                  }
                                />

                                {getModuleName(
                                  module
                                )}
                              </span>
                            )
                          )}

                        </div>
                      </div>

                    </div>


                    {/* PRICE BREAKDOWN */}

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">

                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Billing Summary
                      </p>

                      <div className="mt-4 space-y-3 text-xs">

                        <PriceRow
                          label="Plan Price"
                          value={money(
                            pricing.basePrice
                          )}
                        />

                        {pricing.discountAmount >
                          0 && (
                          <PriceRow
                            label="Referral Discount"
                            value={`−${money(
                              pricing.discountAmount
                            )}`}
                            positive
                          />
                        )}

                        <PriceRow
                          label="Taxable Amount"
                          value={money(
                            pricing.taxableAmount
                          )}
                        />

                        <PriceRow
                          label={`GST (${pricing.taxRate}%)`}
                          value={money(
                            pricing.taxAmount
                          )}
                        />

                        <div className="border-t border-slate-200 pt-3">

                          <div className="flex items-end justify-between gap-3">

                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Total
                            </span>

                            <span
                              className="text-xl font-black"
                              style={{
                                color: GOLD,
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

                  </div>
                )}
              </Section>


              {/* REFERRAL */}

              <Section
                title="Referral Code"
                description="Optional promotional discount applied to this subscription."
              >
                <div className="max-w-xl">

                  <div className="flex gap-2">

                    <div className="relative min-w-0 flex-1">

                      <Tag
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        value={
                          referralCode
                        }
                        onChange={(
                          event
                        ) => {
                          setReferralCode(
                            event.target.value.toUpperCase()
                          );

                          setReferralResult(
                            null
                          );

                          setReferralError(
                            ""
                          );
                        }}
                        placeholder="e.g. WELCOME10"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-bold uppercase tracking-wider text-slate-900 outline-none focus:border-[#c59b27]"
                      />

                    </div>

                    <button
                      type="button"
                      onClick={
                        applyReferralCode
                      }
                      disabled={
                        referralLoading ||
                        !referralCode.trim()
                      }
                      className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {referralLoading ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Check
                          size={14}
                        />
                      )}

                      Apply
                    </button>

                  </div>


                  {referralError && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">
                      <AlertCircle
                        size={13}
                      />
                      {
                        referralError
                      }
                    </div>
                  )}


                  {referralResult && (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                            <Tag
                              size={13}
                            />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-emerald-800">
                              {
                                referralResult.code
                              }
                            </p>

                            <p className="text-[9px] font-medium text-emerald-600">
                              {
                                formatDiscountType(
                                  referralResult.discount_type
                                )
                              }{" "}
                              discount
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-black text-emerald-700">
                          −
                          {money(
                            referralResult.discount_amount
                          )}
                        </p>

                      </div>

                    </div>
                  )}

                </div>
              </Section>

            </div>
          )}


          {/* ==================================================
              STEP 4 WORKSPACE
          ================================================== */}

          {currentStep ===
            4 && (
            <div className="space-y-5">

              <Section
                title="Firebase Workspace"
                description="Connect the client-owned Firebase project that will hold the tenant's business data."
              >

                <div className="rounded-2xl border border-[#c59b27]/20 bg-[#faf8f3]/70 p-5">

                  <div className="flex items-start gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[#e6cda3]">
                      <Database
                        size={16}
                      />
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Client-owned Firebase project
                      </h3>

                      <p className="mt-1 max-w-2xl text-[10px] font-medium leading-5 text-slate-500">
                        Enter the Firebase project ID
                        created and owned by the client.
                        Abhinava will verify and connect
                        the existing project.
                      </p>
                    </div>

                  </div>


                  <div className="mt-5 max-w-xl">

                    <InputField
                      label="Firebase Project ID"
                      placeholder="shridhara-jewellers"
                      required
                      {...register(
                        "firebaseProjectId",
                        {
                          required:
                            "Firebase Project ID is required.",
                          pattern: {
                            value:
                              /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
                            message:
                              "Enter a valid Google Cloud project ID.",
                          },
                        }
                      )}
                      error={
                        errors.firebaseProjectId
                      }
                    />

                    <p className="mt-1.5 text-[9px] font-medium text-slate-400">
                      Example: shridhara-jewellers
                    </p>

                  </div>

                </div>

              </Section>


              <Section
                title="Business Domain"
                description="Select the product domain for this tenant."
              >

                <div className="max-w-xl">

                  <SelectField
                    label="Domain"
                    required
                    {...register(
                      "domain",
                      {
                        required:
                          "Business domain is required.",
                      }
                    )}
                  >
                    <option value="jewelry">
                      Jewelry
                    </option>
                  </SelectField>

                </div>

              </Section>


              {/* COMPATIBLE DEVICES */}

              <Section
                title="Compatible Devices"
                description="The client can access the platform from supported modern browsers."
              >

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <DeviceCard
                    icon={
                      <Monitor
                        size={17}
                      />
                    }
                    title="Desktop"
                    description="Windows / macOS / Linux"
                  />

                  <DeviceCard
                    icon={
                      <Tablet
                        size={17}
                      />
                    }
                    title="Tablet"
                    description="Android / iPadOS"
                  />

                  <DeviceCard
                    icon={
                      <Smartphone
                        size={17}
                      />
                    }
                    title="Mobile"
                    description="Android / iPhone"
                  />

                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-[10px] font-medium text-slate-500">
                  <Globe
                    size={13}
                    className="text-slate-400"
                  />
                  Recommended: current Chrome,
                  Edge, Safari or Firefox.
                </div>

              </Section>


              {/* PLATFORM DEMO */}

              <Section
                title="Platform Demo"
                description="The welcome communication can include a platform demonstration for the new client."
              >

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">

                  <div className="aspect-video flex items-center justify-center">

                    <div className="text-center">

                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[#e6cda3]">
                        <Sparkles
                          size={22}
                        />
                      </div>

                      <p className="mt-3 text-xs font-bold text-white">
                        Abhinava Platform Demo
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Demo video will be included
                        in the client welcome experience.
                      </p>

                    </div>

                  </div>

                </div>

              </Section>

            </div>
          )}


          {/* ==================================================
              STEP 5 REVIEW
          ================================================== */}

          {currentStep ===
            5 && (
            <div className="space-y-5">

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <ShieldCheck
                      size={17}
                    />
                  </div>

                  <div>
                    <h2 className="text-xs font-bold text-emerald-900">
                      Ready to create client
                    </h2>

                    <p className="mt-1 text-[10px] leading-4 text-emerald-700">
                      Review the onboarding details below.
                      The subscription, modules and pricing
                      will be recorded with the client.
                    </p>
                  </div>

                </div>

              </div>


              {/* BUSINESS */}

              <ReviewSection
                title="Business"
                icon={
                  <Building2
                    size={15}
                  />
                }
              >
                <ReviewGrid
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
                      "Business Type",
                      formatBusinessType(
                        watchedData.businessType
                      ),
                    ],
                    [
                      "Country",
                      watchedData.country,
                    ],
                    [
                      "Business Email",
                      watchedData.businessEmail,
                    ],
                    [
                      "Business Phone",
                      watchedData.businessPhone,
                    ],
                  ]}
                />
              </ReviewSection>


              {/* OWNER */}

              <ReviewSection
                title="Owner / Contact"
                icon={
                  <UserRound
                    size={15}
                  />
                }
              >
                <ReviewGrid
                  items={[
                    [
                      "Name",
                      watchedData.ownerName,
                    ],
                    [
                      "Email",
                      watchedData.ownerEmail,
                    ],
                    [
                      "Phone",
                      watchedData.ownerPhone,
                    ],
                    [
                      "Role",
                      watchedData.ownerRole,
                    ],
                  ]}
                />
              </ReviewSection>


              {/* DOCUMENTS */}

              <ReviewSection
                title="Documents"
                icon={
                  <FileText
                    size={15}
                  />
                }
              >

                <div className="flex flex-wrap gap-2">

                  {submittedDocuments.map(
                    (document) => (
                      <span
                        key={
                          document
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700"
                      >
                        <Check
                          size={11}
                        />
                        {
                          document
                        }
                      </span>
                    )
                  )}

                  {pendingDocuments.map(
                    (document) => (
                      <span
                        key={
                          document
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[9px] font-bold text-amber-700"
                      >
                        <AlertCircle
                          size={11}
                        />
                        {
                          document
                        }{" "}
                        Pending
                      </span>
                    )
                  )}

                </div>

              </ReviewSection>


              {/* SUBSCRIPTION */}

              <ReviewSection
                title="Subscription"
                icon={
                  <CreditCard
                    size={15}
                  />
                }
              >

                <ReviewGrid
                  items={[
                    [
                      "Plan",
                      resolvedSubscription
                        ?.subscription_plan
                        ?.name ||
                        "—",
                    ],
                    [
                      "Plan Type",
                      resolvedSubscription
                        ?.subscription_plan
                        ?.main_plan ||
                        "—",
                    ],
                    [
                      "City Tier",
                      selectedCityTier
                        ?.name ||
                        "—",
                    ],
                    [
                      "Billing Cycle",
                      formatBillingCycle(
                        selectedBillingCycle
                      ),
                    ],
                    [
                      "Status",
                      watchedData.subscriptionStatus,
                    ],
                    [
                      "Start Date",
                      watchedData.startDate,
                    ],
                  ]}
                />

                <div className="mt-4 border-t border-slate-100 pt-4">

                  <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Included Modules
                  </p>

                  <div className="flex flex-wrap gap-2">

                    {resolvedModules.map(
                      (module) => (
                        <span
                          key={getModuleKey(
                            module
                          )}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600"
                        >
                          <ModuleIcon
                            moduleKey={getModuleKey(
                              module
                            )}
                            size={11}
                          />
                          {
                            getModuleName(
                              module
                            )
                          }
                        </span>
                      )
                    )}

                  </div>

                </div>

              </ReviewSection>


              {/* INVOICE */}

              <ReviewSection
                title="Invoice Summary"
                icon={
                  <Receipt
                    size={15}
                  />
                }
              >

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">

                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Pricing
                    </p>

                    <div className="mt-3 space-y-2.5">

                      <PriceRow
                        label="Plan Price"
                        value={money(
                          pricing.basePrice
                        )}
                      />

                      {pricing.discountAmount >
                        0 && (
                        <PriceRow
                          label={`Referral (${referralResult?.code || ""})`}
                          value={`−${money(
                            pricing.discountAmount
                          )}`}
                          positive
                        />
                      )}

                      <PriceRow
                        label="Taxable Amount"
                        value={money(
                          pricing.taxableAmount
                        )}
                      />

                      <PriceRow
                        label={`GST (${pricing.taxRate}%)`}
                        value={money(
                          pricing.taxAmount
                        )}
                      />

                      <div className="border-t border-slate-200 pt-3">

                        <div className="flex items-center justify-between">

                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Total Payable
                          </span>

                          <span
                            className="text-lg font-black"
                            style={{
                              color: GOLD,
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


                  <div className="rounded-xl border border-slate-200 bg-white p-4">

                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Billing
                    </p>

                    <div className="mt-3 space-y-3">

                      <ReviewMiniRow
                        label="Currency"
                        value="INR"
                      />

                      <ReviewMiniRow
                        label="Billing Cycle"
                        value={formatBillingCycle(
                          selectedBillingCycle
                        )}
                      />

                      <ReviewMiniRow
                        label="Referral"
                        value={
                          referralResult
                            ?.code ||
                          "None"
                        }
                      />

                      <ReviewMiniRow
                        label="Invoice"
                        value="Generated on creation"
                      />

                    </div>

                  </div>

                </div>

              </ReviewSection>


              {/* FIREBASE */}

              <ReviewSection
                title="Firebase Workspace"
                icon={
                  <Database
                    size={15}
                  />
                }
              >
                <ReviewGrid
                  items={[
                    [
                      "Project ID",
                      watchedData.firebaseProjectId,
                    ],
                    [
                      "Domain",
                      watchedData.domain,
                    ],
                    [
                      "Data Boundary",
                      "Client-owned Firebase",
                    ],
                  ]}
                />
              </ReviewSection>


              {/* WELCOME PACKAGE */}

              <ReviewSection
                title="Client Welcome Package"
                icon={
                  <Mail
                    size={15}
                  />
                }
              >

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">

                  <WelcomeItem
                    icon={
                      <Receipt
                        size={14}
                      />
                    }
                    text="Invoice"
                  />

                  <WelcomeItem
                    icon={
                      <Sparkles
                        size={14}
                      />
                    }
                    text="Warm welcome"
                  />

                  <WelcomeItem
                    icon={
                      <Package
                        size={14}
                      />
                    }
                    text="Included modules"
                  />

                  <WelcomeItem
                    icon={
                      <Globe
                        size={14}
                      />
                    }
                    text="Login access"
                  />

                </div>

                <p className="mt-3 text-[9px] font-medium text-slate-400">
                  The welcome-email/resend workflow will use
                  this same subscription, invoice, module and
                  workspace information.
                </p>

              </ReviewSection>


              {/* FINAL WARNING */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

                <div className="flex items-start gap-3">

                  <AlertCircle
                    size={15}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <p className="text-[10px] leading-4 text-slate-500">
                    Creating the client will send the
                    onboarding data to the Abhinava control
                    plane. The selected subscription plan
                    determines the client's authoritative
                    module set.
                  </p>

                </div>

              </div>

            </div>
          )}

        </form>
      </div>
    </div>
  );
}


// ============================================================
// SECTION
// ============================================================

function Section({
  title,
  description,
  children,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">

      <div className="border-b border-slate-100 px-5 py-4">

        <h2 className="text-sm font-bold text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            {description}
          </p>
        )}

      </div>

      <div className="p-5">
        {children}
      </div>

    </section>
  );
}


// ============================================================
// FIELD LABEL
// ============================================================

function FieldLabel({
  children,
  required = false,
}) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {children}

      {required && (
        <span className="ml-1 text-rose-500">
          *
        </span>
      )}
    </label>
  );
}


// ============================================================
// FIELD ERROR
// ============================================================

function FieldError({
  message,
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1 text-[10px] font-medium text-rose-500">
      {message}
    </p>
  );
}


// ============================================================
// INPUT
// ============================================================

const InputField = ({
  label,
  required = false,
  error,
  className = "",
  ...props
}) => {
  return (
    <div>

      <FieldLabel
        required={required}
      >
        {label}
      </FieldLabel>

      <input
        {...props}
        className={`mt-1 h-11 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c59b27] focus:bg-white ${className}`}
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
};


// ============================================================
// SELECT
// ============================================================

function SelectField({
  label,
  required = false,
  error,
  children,
  ...props
}) {
  return (
    <div>

      <FieldLabel
        required={required}
      >
        {label}
      </FieldLabel>

      <select
        {...props}
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[#c59b27] focus:bg-white"
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


// ============================================================
// LOADING
// ============================================================

function LoadingBox({
  text,
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">

      <RefreshCw
        size={15}
        className="animate-spin text-slate-400"
      />

      <span className="text-xs font-medium text-slate-500">
        {text}
      </span>

    </div>
  );
}


// ============================================================
// ERROR
// ============================================================

function ErrorBox({
  message,
  onRetry,
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">

      <div className="flex items-start gap-3">

        <AlertCircle
          size={16}
          className="mt-0.5 text-rose-600"
        />

        <div className="flex-1">

          <p className="text-xs font-semibold text-rose-800">
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-700 hover:text-rose-900"
          >
            <RefreshCw
              size={11}
            />
            Retry
          </button>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// PRICE ROW
// ============================================================

function PriceRow({
  label,
  value,
  positive = false,
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-[10px] font-medium text-slate-500">
        {label}
      </span>

      <span
        className={`text-xs font-bold ${
          positive
            ? "text-emerald-600"
            : "text-slate-800"
        }`}
      >
        {value}
      </span>

    </div>
  );
}


// ============================================================
// DEVICE CARD
// ============================================================

function DeviceCard({
  icon,
  title,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </div>

        <div>
          <p className="text-xs font-bold text-slate-800">
            {title}
          </p>

          <p className="mt-0.5 text-[9px] font-medium text-slate-400">
            {description}
          </p>
        </div>

      </div>

    </div>
  );
}


// ============================================================
// REVIEW SECTION
// ============================================================

function ReviewSection({
  title,
  icon,
  children,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">

      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">

        <div className="text-slate-500">
          {icon}
        </div>

        <h3 className="text-xs font-bold text-slate-800">
          {title}
        </h3>

      </div>

      <div className="p-5">
        {children}
      </div>

    </section>
  );
}


// ============================================================
// REVIEW GRID
// ============================================================

function ReviewGrid({
  items,
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">

      {items.map(
        ([label, value]) => (
          <div
            key={label}
            className="min-w-0"
          >

            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </p>

            <p className="mt-1 break-words text-xs font-semibold text-slate-800">
              {value || "—"}
            </p>

          </div>
        )
      )}

    </div>
  );
}


// ============================================================
// REVIEW MINI ROW
// ============================================================

function ReviewMiniRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-[10px] font-medium text-slate-400">
        {label}
      </span>

      <span className="text-[10px] font-bold text-slate-700">
        {value}
      </span>

    </div>
  );
}


// ============================================================
// WELCOME ITEM
// ============================================================

function WelcomeItem({
  icon,
  text,
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">

      <div className="text-slate-500">
        {icon}
      </div>

      <span className="text-[10px] font-semibold text-slate-600">
        {text}
      </span>

    </div>
  );
}


export default AddClientPage;