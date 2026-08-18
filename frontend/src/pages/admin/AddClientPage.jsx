import { useState } from "react";
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
  ShoppingCart,
  Receipt,
  Wallet,
  BookOpen,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

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
    fields: ["ownerName", "ownerEmail", "ownerPhone", "ownerRole"],
  },
  {
    id: 2,
    title: "Documents",
    subtitle: "Verification",
    icon: FileText,
    fields: ["pan", "gstin", "aadhaar", "agreement"],
  },
  {
    id: 3,
    title: "Subscription",
    subtitle: "Plan setup",
    icon: CreditCard,
    fields: ["plan", "billingCycle", "subscriptionStatus", "startDate"],
  },
  {
    id: 4,
    title: "Domain & Modules",
    subtitle: "Product setup",
    icon: Package,
    fields: ["domain"],
  },
];

const JEWELRY_MODULES = [
  {
    key: "customers",
    label: "Customers",
    description: "Customer records and profiles",
    icon: Users,
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Stock and product management",
    icon: Package,
  },
  {
    key: "purchases",
    label: "Purchases",
    description: "Purchase transactions",
    icon: ShoppingCart,
  },
  {
    key: "sales",
    label: "Sales",
    description: "Sales and billing",
    icon: Receipt,
  },
  {
    key: "payments",
    label: "Payments",
    description: "Payment tracking",
    icon: Wallet,
  },
  {
    key: "ledger",
    label: "Ledger",
    description: "Accounts and ledger",
    icon: BookOpen,
  },
  {
    key: "reports",
    label: "Reports",
    description: "Business reports and analytics",
    icon: BarChart3,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "WhatsApp business integration",
    icon: MessageCircle,
  },
];

function AddClientPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      domain: "jewelry",
      modules: {
        customers: true,
        inventory: true,
        purchases: true,
        sales: true,
        payments: true,
        ledger: true,
        reports: true,
        whatsapp: true,
      },
    },
  });

  const selectedPlan = watch("plan");
  const selectedModules = watch("modules") || {};

  const handlePlanChange = (event) => {
    const plan = event.target.value;

    setValue("plan", plan);

    if (plan === "overall") {
      JEWELRY_MODULES.forEach((module) => {
        setValue(`modules.${module.key}`, true);
      });
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      const clientData = {
        business_name: data.businessName,
        legal_business_name: data.legalBusinessName,
        business_type: data.businessType,
        country: data.country,

        business_email: data.businessEmail,
        business_phone: data.businessPhone,

        owner_name: data.ownerName,
        owner_email: data.ownerEmail,
        owner_phone: data.ownerPhone,
        owner_role: data.ownerRole,

        pan: data.pan,
        gstin: data.gstin || null,

        plan: data.plan,
        billing_cycle: data.billingCycle,
        subscription_status: data.subscriptionStatus,
        start_date: data.startDate,

        domain: data.domain || null,
        modules: data.modules || {},
      };

      const response = await fetch(
        "https://sturdy-train-77rj957xr4pp2x675-8000.app.github.dev/clients",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(clientData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            result?.message ||
            "Unable to create client."
        );
      }

      setSubmitStatus("success");
      setSubmitMessage(
        `${data.businessName} has been created and its Firebase workspace is ready.`
      );

      setTimeout(() => {
        navigate("/admin/clients", {
          state: {
            successMessage: `${data.businessName} created successfully.`,
          },
        });
      }, 800);
    } catch (error) {
      console.error("Client creation failed:", error);

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

  const handleNext = async () => {
    const fieldsToValidate = STEPS[currentStep].fields;
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setCurrentStep((prev) =>
        Math.min(prev + 1, STEPS.length - 1)
      );
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFormSubmit = (event) => {
  if (currentStep !== STEPS.length - 1) {
    event.preventDefault();
    return;
  }

  handleSubmit(onSubmit)(event);
};

  return (
    <div className="flex h-full flex-col">
      {/* ---------------- HEADER ---------------- */}
      <div className="flex shrink-0 items-center justify-between pb-4">
        <div>
          <Link
            to="/admin/clients"
            className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft size={14} /> Back
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Add Client
          </h1>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Step {currentStep + 1} of {STEPS.length}
          </p>

          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {STEPS[currentStep].title}
          </p>
        </div>
      </div>

      {/* ---------------- STEPPER UI ---------------- */}
      <div className="mb-6 hidden shrink-0 sm:block">
        <div className="flex items-center justify-between rounded-[20px] border border-gray-200 bg-white p-2 dark:border-neutral-800 dark:bg-[#171717]">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;

            return (
              <div
                key={step.id}
                className={`flex flex-1 items-center justify-center gap-3 rounded-[16px] px-4 py-3 transition-colors ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10"
                    : isCompleted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-600"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : isCompleted
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-neutral-800"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>

                <div className="hidden text-left lg:block">
                  <p
                    className={`text-sm font-bold ${
                      isActive
                        ? "text-indigo-900 dark:text-indigo-100"
                        : ""
                    }`}
                  >
                    {step.title}
                  </p>

                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {step.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- MOBILE PROGRESS ---------------- */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 sm:hidden dark:bg-neutral-800">
        <div
          className="h-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
          style={{
            width: `${((currentStep + 1) / STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* ---------------- FORM CONTAINER ---------------- */}
      <div className="flex min-h-[400px] flex-1 flex-col rounded-[24px] border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#121212]">
        <form
          onSubmit={handleFormSubmit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && currentStep !== STEPS.length - 1) {
              event.preventDefault();
            }
          }}
          className="flex h-full flex-col p-5 sm:p-8"
        >
          {/* ---------------- NAVIGATION ---------------- */}
          <div className="mb-6 flex shrink-0 items-center justify-between border-b border-gray-100 pb-5 dark:border-neutral-800/50">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0 || isSubmitting}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                currentStep === 0
                  ? "invisible"
                  : "border border-gray-200 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
              }`}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Next Step
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition ${
                  isSubmitting
                    ? "cursor-not-allowed bg-indigo-400"
                    : "bg-indigo-600 shadow-indigo-500/20 hover:bg-indigo-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    Create Client
                    <Check size={16} strokeWidth={3} />
                  </>
                )}
              </button>
            )}
          </div>

          {/* ---------------- SUBMITTING ---------------- */}
          {isSubmitting && (
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>

              <div>
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                  Provisioning client...
                </p>

                <p className="mt-0.5 text-xs text-indigo-700 dark:text-indigo-300">
                  Creating the client workspace and Firebase environment.
                  Please wait.
                </p>
              </div>
            </div>
          )}

          {/* ---------------- SUCCESS ---------------- */}
          {submitStatus === "success" && !isSubmitting && (
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check size={20} strokeWidth={3} />
              </div>

              <div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                  Client created successfully
                </p>

                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  {submitMessage}
                </p>
              </div>
            </div>
          )}

          {/* ---------------- ERROR ---------------- */}
          {submitStatus === "error" && !isSubmitting && (
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                !
              </div>

              <div>
                <p className="text-sm font-bold text-red-900 dark:text-red-100">
                  Client creation failed
                </p>

                <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">
                  {submitMessage}
                </p>
              </div>
            </div>
          )}

          {/* ---------------- FORM FIELDS ---------------- */}
          <div className="flex-1">
            {/* STEP 0: BUSINESS DETAILS */}
            {currentStep === 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Business Name
                  </label>

                  <input
                    type="text"
                    placeholder="ABC Jewellers"
                    {...register("businessName", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717] dark:focus:border-indigo-500"
                  />

                  {errors.businessName && (
                    <p className="mt-1 text-xs font-medium text-red-500">
                      {errors.businessName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Legal Business Name
                  </label>

                  <input
                    type="text"
                    placeholder="ABC Jewellers Pvt Ltd"
                    {...register("legalBusinessName", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />

                  {errors.legalBusinessName && (
                    <p className="mt-1 text-xs font-medium text-red-500">
                      {errors.legalBusinessName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Business Type
                  </label>

                  <select
                    {...register("businessType", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none dark:border-neutral-800 dark:bg-[#171717]"
                  >
                    <option value="">Select type</option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="llp">LLP</option>
                    <option value="private_limited">
                      Private Limited
                    </option>
                  </select>

                  {errors.businessType && (
                    <p className="mt-1 text-xs font-medium text-red-500">
                      {errors.businessType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Country
                  </label>

                  <select
                    {...register("country", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none dark:border-neutral-800 dark:bg-[#171717]"
                  >
                    <option value="India">India</option>
                    <option value="US">United States</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Business Email
                  </label>

                  <input
                    type="email"
                    placeholder="contact@abc.com"
                    {...register("businessEmail", {
                      required: "Required",
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: "Invalid email",
                      },
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />

                  {errors.businessEmail && (
                    <p className="mt-1 text-xs font-medium text-red-500">
                      {errors.businessEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Business Phone
                  </label>

                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    {...register("businessPhone", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />

                  {errors.businessPhone && (
                    <p className="mt-1 text-xs font-medium text-red-500">
                      {errors.businessPhone.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: OWNER DETAILS */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Owner Name
                  </label>

                  <input
                    type="text"
                    placeholder="Full name"
                    {...register("ownerName", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />

                  {errors.ownerName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.ownerName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Owner Email
                  </label>

                  <input
                    type="email"
                    placeholder="owner@example.com"
                    {...register("ownerEmail", {
                      required: "Required",
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: "Invalid email",
                      },
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />

                  {errors.ownerEmail && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.ownerEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Owner Phone
                  </label>

                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    {...register("ownerPhone", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />

                  {errors.ownerPhone && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.ownerPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Account Role
                  </label>

                  <select
                    {...register("ownerRole")}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none dark:border-neutral-800 dark:bg-[#171717]"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: DOCUMENTS */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    PAN
                  </label>

                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    {...register("pan", {
                      required: "Required",
                      pattern: {
                        value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                        message: "Invalid PAN format",
                      },
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />

                  {errors.pan && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.pan.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    GSTIN (Optional)
                  </label>

                  <input
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    {...register("gstin")}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Aadhaar (Optional)
                  </label>

                  <input
                    type="text"
                    placeholder="XXXX XXXX XXXX"
                    {...register("aadhaar")}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Client Agreement
                  </label>

                  <label className="mt-1.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:bg-[#171717] dark:hover:border-indigo-500">
                    <Upload size={16} />
                    <span>Upload PDF/Word</span>

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      {...register("agreement")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 3: SUBSCRIPTION */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Plan Type
                  </label>

                  <select
                    {...register("plan", {
                      required: "Required",
                      onChange: handlePlanChange,
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none dark:border-neutral-800 dark:bg-[#171717]"
                  >
                    <option value="">Select plan</option>
                    <option value="overall">
                      Overall Software
                    </option>
                    <option value="module">
                      Module Based
                    </option>
                  </select>

                  {errors.plan && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.plan.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Billing Cycle
                  </label>

                  <select
                    {...register("billingCycle", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none dark:border-neutral-800 dark:bg-[#171717]"
                  >
                    <option value="">Select cycle</option>
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                  </select>

                  {errors.billingCycle && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.billingCycle.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Status
                  </label>

                  <select
                    {...register("subscriptionStatus")}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none dark:border-neutral-800 dark:bg-[#171717]"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Start Date
                  </label>

                  <input
                    type="date"
                    {...register("startDate", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none dark:border-neutral-800 dark:bg-[#171717]"
                  />

                  {errors.startDate && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: DOMAIN & MODULES */}
            {currentStep === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Business Domain
                  </label>

                  <select
                    {...register("domain", {
                      required: "Required",
                    })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-neutral-800 dark:bg-[#171717] sm:max-w-md"
                  >
                    <option value="jewelry">
                      Jewelry
                    </option>
                  </select>

                  {errors.domain && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.domain.message}
                    </p>
                  )}
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Enabled Modules
                    </h2>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Select the modules this client will have access to.
                    </p>
                  </div>

                  {selectedPlan === "overall" && (
                    <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      Full Software
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {JEWELRY_MODULES.map((module) => {
                    const Icon = module.icon;
                    const isChecked =
                      selectedModules[module.key] === true;

                    return (
                      <label
                        key={module.key}
                        className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                          isChecked
                            ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                            : "border-gray-200 bg-gray-50/50 hover:border-gray-300 dark:border-neutral-800 dark:bg-[#171717] dark:hover:border-neutral-700"
                        } ${
                          selectedPlan === "overall"
                            ? "cursor-not-allowed opacity-80"
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          {...register(`modules.${module.key}`)}
                          disabled={selectedPlan === "overall"}
                          className="sr-only"
                        />

                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isChecked
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-200 text-gray-500 dark:bg-neutral-800 dark:text-gray-400"
                          }`}
                        >
                          <Icon size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {module.label}
                          </p>

                          <p className="mt-0.5 text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                            {module.description}
                          </p>
                        </div>

                        <div
                          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isChecked
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-gray-300 dark:border-neutral-700"
                          }`}
                        >
                          {isChecked && (
                            <Check size={11} strokeWidth={3} />
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {selectedPlan === "module" && (
                  <p className="mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Module Based plan selected — choose the modules required
                    by this client.
                  </p>
                )}

                {selectedPlan === "overall" && (
                  <p className="mt-4 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    Overall Software includes all available Jewelry modules.
                  </p>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddClientPage;
