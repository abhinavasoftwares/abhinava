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

const GOLD = "#c59b27";

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
          result?.detail || result?.message || "Unable to create client."
        );
      }

      setSubmitStatus("success");
      setSubmitMessage(
        `${data.businessName} has been created and its workspace is ready.`
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
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
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
    <div className="h-full w-full overflow-y-auto lg:overflow-hidden flex flex-col gap-4 bg-slate-50/60 p-4 sm:p-5 lg:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      {/* ---------------- HEADER ---------------- */}
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <Link
            to="/admin/clients"
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={14} /> Back to Directory
          </Link>

          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Add New Client
          </h1>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#c59b27]">
            Step {currentStep + 1} of {STEPS.length}
          </p>
          <p className="text-xs font-semibold text-slate-600">
            {STEPS[currentStep].title}
          </p>
        </div>
      </div>

      {/* ---------------- STEPPER UI (Desktop) ---------------- */}
      <div className="hidden shrink-0 sm:block">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;

            return (
              <div
                key={step.id}
                className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
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
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                </div>

                <div className="hidden text-left lg:block">
                  <p className={`text-xs font-bold ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                    {step.title}
                  </p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    {step.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- MOBILE PROGRESS ---------------- */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 sm:hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${((currentStep + 1) / STEPS.length) * 100}%`,
            backgroundColor: GOLD,
          }}
        />
      </div>

      {/* ---------------- FORM CONTAINER ---------------- */}
      <div className="min-h-0 flex-1 flex flex-col rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <form
          onSubmit={handleFormSubmit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && currentStep !== STEPS.length - 1) {
              event.preventDefault();
            }
          }}
          className="flex h-full flex-col p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {/* ---------------- NAVIGATION BUTTONS ---------------- */}
          <div className="mb-4 flex shrink-0 items-center justify-between border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0 || isSubmitting}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                currentStep === 0
                  ? "invisible"
                  : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <ChevronLeft size={14} /> Back
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Next Step <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: GOLD }}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    Create Client <Check size={14} strokeWidth={3} />
                  </>
                )}
              </button>
            )}
          </div>

          {/* STATUS MESSAGES */}
          {submitStatus === "success" && !isSubmitting && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              <Check size={16} className="text-emerald-600" />
              <span>{submitMessage}</span>
            </div>
          )}

          {submitStatus === "error" && !isSubmitting && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <span>{submitMessage}</span>
            </div>
          )}

          {/* ---------------- FORM FIELDS ---------------- */}
          <div className="flex-1">
            {/* STEP 0: BUSINESS DETAILS */}
            {currentStep === 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Name</label>
                  <input
                    type="text"
                    placeholder="ABC Jewellers"
                    {...register("businessName", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.businessName && <p className="mt-1 text-[11px] text-rose-500">{errors.businessName.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legal Business Name</label>
                  <input
                    type="text"
                    placeholder="ABC Jewellers Pvt Ltd"
                    {...register("legalBusinessName", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.legalBusinessName && <p className="mt-1 text-[11px] text-rose-500">{errors.legalBusinessName.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Type</label>
                  <select
                    {...register("businessType", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  >
                    <option value="">Select type</option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="llp">LLP</option>
                    <option value="private_limited">Private Limited</option>
                  </select>
                  {errors.businessType && <p className="mt-1 text-[11px] text-rose-500">{errors.businessType.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Country</label>
                  <select
                    {...register("country", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  >
                    <option value="India">India</option>
                    <option value="US">United States</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Email</label>
                  <input
                    type="email"
                    placeholder="contact@abc.com"
                    {...register("businessEmail", { required: "Required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email" } })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.businessEmail && <p className="mt-1 text-[11px] text-rose-500">{errors.businessEmail.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    {...register("businessPhone", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.businessPhone && <p className="mt-1 text-[11px] text-rose-500">{errors.businessPhone.message}</p>}
                </div>
              </div>
            )}

            {/* STEP 1: OWNER DETAILS */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner Name</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    {...register("ownerName", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.ownerName && <p className="mt-1 text-[11px] text-rose-500">{errors.ownerName.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner Email</label>
                  <input
                    type="email"
                    placeholder="owner@example.com"
                    {...register("ownerEmail", { required: "Required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email" } })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.ownerEmail && <p className="mt-1 text-[11px] text-rose-500">{errors.ownerEmail.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    {...register("ownerPhone", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.ownerPhone && <p className="mt-1 text-[11px] text-rose-500">{errors.ownerPhone.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Role</label>
                  <select
                    {...register("ownerRole")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: DOCUMENTS */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PAN</label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    {...register("pan", { required: "Required", pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: "Invalid PAN format" } })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs uppercase outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.pan && <p className="mt-1 text-[11px] text-rose-500">{errors.pan.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    {...register("gstin")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs uppercase outline-none transition focus:border-[#c59b27]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aadhaar (Optional)</label>
                  <input
                    type="text"
                    placeholder="XXXX XXXX XXXX"
                    {...register("aadhaar")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client Agreement</label>
                  <label className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs text-slate-500 transition hover:border-[#c59b27]">
                    <Upload size={14} />
                    <span>Upload Document</span>
                    <input type="file" accept=".pdf,.doc,.docx" {...register("agreement")} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 3: SUBSCRIPTION */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan Type</label>
                  <select
                    {...register("plan", { required: "Required", onChange: handlePlanChange })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  >
                    <option value="">Select plan</option>
                    <option value="overall">Overall Software</option>
                    <option value="module">Module Based</option>
                  </select>
                  {errors.plan && <p className="mt-1 text-[11px] text-rose-500">{errors.plan.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing Cycle</label>
                  <select
                    {...register("billingCycle", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  >
                    <option value="">Select cycle</option>
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {errors.billingCycle && <p className="mt-1 text-[11px] text-rose-500">{errors.billingCycle.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                  <select
                    {...register("subscriptionStatus")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</label>
                  <input
                    type="date"
                    {...register("startDate", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27]"
                  />
                  {errors.startDate && <p className="mt-1 text-[11px] text-rose-500">{errors.startDate.message}</p>}
                </div>
              </div>
            )}

            {/* STEP 4: DOMAIN & MODULES */}
            {currentStep === 4 && (
              <div>
                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Domain</label>
                  <select
                    {...register("domain", { required: "Required" })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#faf8f3]/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-[#c59b27] sm:max-w-md"
                  >
                    <option value="jewelry">Jewelry</option>
                  </select>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-900">Enabled Modules</h2>
                  {selectedPlan === "overall" && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                      Full Software
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {JEWELRY_MODULES.map((module) => {
                    const Icon = module.icon;
                    const isChecked = selectedModules[module.key] === true;

                    return (
                      <label
                        key={module.key}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                          isChecked
                            ? "border-[#c59b27]/40 bg-[#faf8f3]"
                            : "border-slate-200/70 bg-white"
                        } ${selectedPlan === "overall" ? "cursor-not-allowed opacity-80" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isChecked ? "bg-[#c59b27] text-white" : "bg-slate-100 text-slate-400"}`}>
                            <Icon size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-900 truncate">{module.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          {...register(`modules.${module.key}`)}
                          disabled={selectedPlan === "overall"}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#c59b27] focus:ring-[#c59b27]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddClientPage;