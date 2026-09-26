import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  Globe2,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Upload,
  User,
  Users,
  X,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

const STAGES = [
  { id: 1, title: "Identity & Operations", subtitle: "Entity structure, owner & tax identifiers", icon: Building2 },
  { id: 2, title: "Licensing & Billing", subtitle: "Subscription tier, term & cycle", icon: CreditCard },
  { id: 3, title: "Database Tenant", subtitle: "Isolated Firestore container allocation", icon: Database },
  { id: 4, title: "Dossier Verification", subtitle: "Audit configuration parameters", icon: FileCheck2 },
  { id: 5, title: "Service Agreement", subtitle: "Stage executed contracts & records", icon: FileText },
];

const DEFAULT_FORM = {
  businessName: "",
  legalBusinessName: "",
  businessType: "Jewellery",
  country: "India",
  businessEmail: "",
  businessPhone: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerRole: "Owner",
  pan: "",
  gstin: "",
  logoUrl: "",
  welcomeMessage: "",

  subscriptionPlanId: "",
  billingCycle: "MONTHLY",
  subscriptionStatus: "ACTIVE",
  startDate: new Date().toISOString().split("T")[0],

  referralCode: "",
  domain: "",

  firebaseProjectId: "",
};

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatCurrency(value, currency = "INR") {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPlanId(plan) {
  return plan?.id ?? plan?.plan_id ?? plan?.subscription_plan_id ?? plan?.value ?? "";
}

function getPlanName(plan) {
  return plan?.name || plan?.plan_name || plan?.title || "Standard Tier";
}

function getPlanDescription(plan) {
  return plan?.description || plan?.short_description || "Enterprise tenant licensing package.";
}

function getPlanModules(plan) {
  if (Array.isArray(plan?.modules)) return plan.modules;
  if (Array.isArray(plan?.module_keys)) return plan.module_keys;
  if (Array.isArray(plan?.included_modules)) return plan.included_modules;
  return [];
}

function getPlanPrice(plan, billingCycle) {
  const cycle = String(billingCycle || "MONTHLY").toUpperCase();
  if (cycle === "ANNUAL" || cycle === "YEARLY") {
    return Number(plan?.annual_price ?? plan?.yearly_price ?? plan?.price_annual ?? 0);
  }
  return Number(plan?.monthly_price ?? plan?.price_monthly ?? plan?.price ?? 0);
}

function normalizeModule(module) {
  if (typeof module === "string") return module;
  return module?.key || module?.module_key || module?.name || module?.slug || "";
}

function getModuleLabel(module) {
  const key = normalizeModule(module);
  if (!key) return "Module";
  return key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getApiError(error, fallback = "Unable to process request.") {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((i) => i?.msg || i?.message || String(i)).join(", ");
  }
  if (typeof detail === "string") return detail;
  if (error?.response?.data?.message) return error.response.data.message;
  return error?.message || fallback;
}

export default function AddClientPage() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(DEFAULT_FORM);

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolvedSubscription, setResolvedSubscription] = useState(null);

  const [referralLoading, setReferralLoading] = useState(false);
  const [referralResult, setReferralResult] = useState(null);

  const [agreementFile, setAgreementFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = useMemo(() => {
    return plans.find((p) => String(getPlanId(p)) === String(form.subscriptionPlanId));
  }, [plans, form.subscriptionPlanId]);

  const selectedModules = useMemo(() => getPlanModules(selectedPlan), [selectedPlan]);
  const displayedPrice = useMemo(() => getPlanPrice(selectedPlan, form.billingCycle), [selectedPlan, form.billingCycle]);

  const resolvedPrice = useMemo(() => {
    if (!resolvedSubscription) return null;
    return Number(resolvedSubscription?.total ?? resolvedSubscription?.amount ?? 0);
  }, [resolvedSubscription]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setSubmitError("");
  };

  useEffect(() => {
    let active = true;
    async function fetchPlans() {
      setPlansLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/subscriptions/plans`, { withCredentials: true });
        if (!active) return;
        const payload = response?.data;
        const loadedPlans = Array.isArray(payload) ? payload : payload?.plans || payload?.items || [];
        setPlans(loadedPlans);
        if (loadedPlans.length > 0) {
          setForm((prev) => ({
            ...prev,
            subscriptionPlanId: prev.subscriptionPlanId || String(getPlanId(loadedPlans[0])),
          }));
        }
      } catch (err) {
        if (active) setPlansError(getApiError(err, "Unable to load subscription catalogue."));
      } finally {
        if (active) setPlansLoading(false);
      }
    }
    fetchPlans();
    return () => { active = false; };
  }, []);

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!clean(form.businessName)) errs.businessName = "Business name is required.";
      if (!clean(form.businessEmail) || !/^\S+@\S+\.\S+$/.test(form.businessEmail)) {
        errs.businessEmail = "Valid commercial email required.";
      }
      if (!clean(form.ownerName)) errs.ownerName = "Owner authority name required.";
      if (!clean(form.ownerEmail) || !/^\S+@\S+\.\S+$/.test(form.ownerEmail)) {
        errs.ownerEmail = "Valid owner email required.";
      }
      if (!clean(form.pan)) errs.pan = "PAN identifier is mandatory.";
    }
    if (step === 2) {
      if (!form.subscriptionPlanId) errs.subscriptionPlanId = "Select a plan tier.";
      if (!form.billingCycle) errs.billingCycle = "Billing frequency required.";
    }
    if (step === 3) {
      if (!clean(form.firebaseProjectId)) errs.firebaseProjectId = "Firebase container ID required.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const isStepCompleted = (stepId) => {
    if (stepId === 1) return Boolean(clean(form.businessName) && clean(form.businessEmail) && clean(form.pan));
    if (stepId === 2) return Boolean(form.subscriptionPlanId && form.billingCycle);
    if (stepId === 3) return Boolean(clean(form.firebaseProjectId));
    return false;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 5) setCurrentStep((prev) => prev + 1);
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
    else navigate("/admin/clients");
  };

  const handleCreateClient = async () => {
    for (let step = 1; step <= 3; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        business_name: clean(form.businessName),
        legal_business_name: clean(form.legalBusinessName),
        business_type: clean(form.businessType),
        country: clean(form.country),
        business_email: clean(form.businessEmail),
        business_phone: clean(form.businessPhone),
        owner_name: clean(form.ownerName),
        owner_email: clean(form.ownerEmail),
        owner_phone: clean(form.ownerPhone),
        owner_role: clean(form.ownerRole),
        pan: clean(form.pan).toUpperCase(),
        gstin: clean(form.gstin).toUpperCase() || null,
        logo_url: clean(form.logoUrl) || null,
        welcome_message: clean(form.welcomeMessage) || null,

        plan: selectedPlan ? getPlanName(selectedPlan) : "",
        billing_cycle: form.billingCycle,
        subscription_status: form.subscriptionStatus,
        start_date: form.startDate,

        subscription_plan_id: Number(form.subscriptionPlanId),

        firebase_project_id: clean(form.firebaseProjectId),
      };

      const response = await axios.post(`${API_BASE_URL}/clients`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });

      const resId = response?.data?.client?.id ?? response?.data?.id;
      navigate(resId ? `/admin/clients/${resId}` : "/admin/clients", {
        state: { successMessage: `${form.businessName} initialized successfully.` },
      });
    } catch (err) {
      setSubmitError(getApiError(err, "Provisioning pipeline rejected payload."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none">
      {/* -------------------------------------------------------------
          MAIN SPLIT CONSOLE: Strictly locks remaining height
      ------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT 30%: MASTER STAGE DECK */}
        <aside className="shrink-0 w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-white p-4 sm:p-6 flex flex-col justify-between overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                Step Sequence
              </p>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Onboarding Steps
              </h2>
            </div>

            {/* Vertical Phase List */}
            <div className="space-y-1.5">
              {STAGES.map((stage) => {
                const Icon = stage.icon;
                const active = currentStep === stage.id;
                const completed = isStepCompleted(stage.id);

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => {
                      if (stage.id <= currentStep || isStepCompleted(stage.id - 1)) {
                        setCurrentStep(stage.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                        : "border-slate-200/70 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-slate-800 text-white"
                            : completed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {completed && !active ? (
                          <Check size={13} strokeWidth={2.5} />
                        ) : (
                          <Icon size={14} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${active ? "text-white" : "text-slate-900"}`}>
                          {stage.title}
                        </p>
                        <p className={`text-[10.5px] truncate font-mono ${active ? "text-slate-300" : "text-slate-400"}`}>
                          {stage.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT 70%: DEDICATED STAGE VIEWPORT (INTERNAL SCROLL ONLY) */}
        <main className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden bg-[#F8FAFC]">
          
          {/* Scrollable Stage Content with Invisible Scrollbars */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 lg:p-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* Context Banner */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div>
                  <span className="text-[10.5px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                    Phase {currentStep} of {STAGES.length}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {STAGES[currentStep - 1].title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                  <span>STAGE STATUS:</span>
                  <span className={isStepCompleted(currentStep) ? "text-emerald-700" : "text-amber-700"}>
                    {isStepCompleted(currentStep) ? "COMPLETE" : "INPUT REQUIRED"}
                  </span>
                </div>
              </div>

              {/* Submission Error Prompt */}
              {submitError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 flex items-start gap-2.5 text-xs text-rose-800 font-mono">
                  <CircleAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p>{submitError}</p>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 1: IDENTITY & OPERATIONS
              ------------------------------------------------------------- */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        value={form.businessName}
                        onChange={(e) => updateField("businessName", e.target.value)}
                        placeholder="e.g. Shridhara Jewellers"
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-400"
                      />
                      {errors.businessName && <p className="text-[10.5px] text-rose-600 mt-1">{errors.businessName}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                        Commercial Email *
                      </label>
                      <input
                        type="email"
                        value={form.businessEmail}
                        onChange={(e) => updateField("businessEmail", e.target.value)}
                        placeholder="contact@enterprise.com"
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-400"
                      />
                      {errors.businessEmail && <p className="text-[10.5px] text-rose-600 mt-1">{errors.businessEmail}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                        Managing Authority / Owner *
                      </label>
                      <input
                        type="text"
                        value={form.ownerName}
                        onChange={(e) => updateField("ownerName", e.target.value)}
                        placeholder="Proprietor Full Name"
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-400"
                      />
                      {errors.ownerName && <p className="text-[10.5px] text-rose-600 mt-1">{errors.ownerName}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                        Owner Personal Email *
                      </label>
                      <input
                        type="email"
                        value={form.ownerEmail}
                        onChange={(e) => updateField("ownerEmail", e.target.value)}
                        placeholder="owner@domain.com"
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-400"
                      />
                      {errors.ownerEmail && <p className="text-[10.5px] text-rose-600 mt-1">{errors.ownerEmail}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                        PAN Tax Registration *
                      </label>
                      <input
                        type="text"
                        value={form.pan}
                        onChange={(e) => updateField("pan", e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 font-mono outline-none focus:border-slate-400"
                      />
                      {errors.pan && <p className="text-[10.5px] text-rose-600 mt-1">{errors.pan}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                        GSTIN Identification
                      </label>
                      <input
                        type="text"
                        value={form.gstin}
                        onChange={(e) => updateField("gstin", e.target.value.toUpperCase())}
                        placeholder="29AAAAA0000A1Z5"
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 font-mono outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 2: LICENSING & BILLING
              ------------------------------------------------------------- */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {plans.map((p) => {
                      const id = getPlanId(p);
                      const isSel = String(id) === String(form.subscriptionPlanId);
                      return (
                        <div
                          key={id}
                          onClick={() => updateField("subscriptionPlanId", String(id))}
                          className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                            isSel ? "border-slate-900 bg-white shadow-xs" : "border-slate-200 bg-[#FAFAFA] hover:border-slate-300"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-900">{getPlanName(p)}</span>
                            {isSel && <Check size={14} className="text-slate-900" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{getPlanDescription(p)}</p>
                          <p className="text-sm font-bold font-mono text-slate-900 mt-3">
                            {formatCurrency(getPlanPrice(p, form.billingCycle))}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                        Billing Term
                      </label>
                      <select
                        value={form.billingCycle}
                        onChange={(e) => updateField("billingCycle", e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
                      >
                        <option value="MONTHLY">Monthly Billing Cycle</option>
                        <option value="ANNUAL">Annual Enterprise License</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                        Effective Commencing Date
                      </label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => updateField("startDate", e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 3: DATABASE TENANT
              ------------------------------------------------------------- */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                      Firebase Project Container ID *
                    </label>
                    <input
                      type="text"
                      value={form.firebaseProjectId}
                      onChange={(e) => updateField("firebaseProjectId", e.target.value)}
                      placeholder="e.g. shridhara-vault-prod"
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono text-slate-900 outline-none focus:border-slate-400"
                    />
                    {errors.firebaseProjectId && (
                      <p className="text-[10.5px] text-rose-600 mt-1">{errors.firebaseProjectId}</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs font-mono space-y-2">
                    <span className="font-bold text-slate-900 uppercase">Architecture Guarantee:</span>
                    <p className="text-slate-500 leading-relaxed">
                      Bullion entries, stock sheets, and client balances reside exclusively inside this isolated container. Abhinava PostgreSQL serves control plane orchestration only.
                    </p>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 4: DOSSIER VERIFICATION
              ------------------------------------------------------------- */}
              {currentStep === 4 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">ORGANIZATION:</span>
                    <span className="font-bold text-slate-900">{form.businessName || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">AUTHORITY:</span>
                    <span className="text-slate-800">{form.ownerName} ({form.ownerEmail})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">TAX IDENTIFIER:</span>
                    <span className="text-slate-800">{form.pan}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">PLAN TIER:</span>
                    <span className="font-bold text-slate-900">{getPlanName(selectedPlan)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">DATA CONTAINER:</span>
                    <span className="text-slate-800">{form.firebaseProjectId}</span>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  STEP 5: SERVICE AGREEMENT
              ------------------------------------------------------------- */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <label
                    htmlFor="agreement-upload"
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Upload size={18} className="text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-800">
                      {agreementFile ? agreementFile.name : "Select Executed PDF / Agreement"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">Maximum size: 25MB</span>
                    <input
                      id="agreement-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setAgreementFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              )}

            </div>
          </div>

          {/* Sticky Console Bottom Action Bar */}
          <div className="shrink-0 h-16 w-full border-t border-slate-200 bg-white px-6 sm:px-10 flex items-center justify-end">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black active:scale-[0.98] transition-all shadow-xs"
              >
                <span>Proceed</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateClient}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-black active:scale-[0.98] transition-all shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-slate-400" />
                    <span>Compiling Node...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.5} />
                    <span>Initialize Tenant Ledger</span>
                  </>
                )}
              </button>
            )}
          </div>

        </main>

      </div>
    </div>
  );
}