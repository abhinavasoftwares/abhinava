import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Layers,
  Package,
  Pencil,
  Trash2,
  Check,
  X,
  IndianRupee,
  Search,
  RefreshCw,
  AlertCircle,
  Lock,
  Sparkles,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const GOLD = "#c59b27";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const card =
  "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";


// ============================================================
// MODULE DEFINITIONS
// ============================================================

const MODULES = [
  {
    key: "customers",
    name: "Customer Directory",
    description:
      "Customer management and relationship records.",
  },
  {
    key: "stock",
    name: "Stock / Inventory",
    description:
      "Inventory and stock management.",
  },
  {
    key: "invoicing",
    name: "Sales & Invoicing",
    description:
      "Sales transactions and invoice management.",
  },
  {
    key: "investments",
    name: "Investments",
    description:
      "Investment and investor management.",
  },
  {
    key: "kareegar",
    name: "Kareegar Management",
    description:
      "Kareegar and production workforce management.",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description:
      "WhatsApp communication and notifications.",
  },
  {
    key: "ml_analytics",
    name: "Reports & ML Analytics",
    description:
      "Reports, analytics and machine-learning insights.",
    proOnly: true,
  },
];


// ============================================================
// MODULE NORMALIZATION
// ============================================================

function normalizeModules(modules, mainPlan) {
  const selected = new Set(modules);

  // ----------------------------------------------------------
  // BASIC cannot use ML Analytics
  // ----------------------------------------------------------

  if (mainPlan === "BASIC") {
    selected.delete("ml_analytics");
  }

  // ----------------------------------------------------------
  // INVOICING REQUIRES STOCK
  // ----------------------------------------------------------

  if (!selected.has("stock")) {
    selected.delete("invoicing");
  }

  // ----------------------------------------------------------
  // STOCK
  // Automatically includes Customers + Invoicing
  // ----------------------------------------------------------

  if (selected.has("stock")) {
    selected.add("customers");
    selected.add("invoicing");
  }

  // ----------------------------------------------------------
  // INVESTMENTS
  // Automatically includes Customers
  // ----------------------------------------------------------

  if (selected.has("investments")) {
    selected.add("customers");
  }

  // ----------------------------------------------------------
  // KAREEGAR
  // Automatically includes Customers
  // ----------------------------------------------------------

  if (selected.has("kareegar")) {
    selected.add("customers");
  }

  // ----------------------------------------------------------
  // CUSTOMER DIRECTORY CANNOT EXIST ALONE
  // ----------------------------------------------------------

  const hasParentModule =
    selected.has("stock") ||
    selected.has("investments") ||
    selected.has("kareegar");

  if (!hasParentModule) {
    selected.delete("customers");
  }

  // ----------------------------------------------------------
  // WHATSAPP CANNOT BE STANDALONE
  // ----------------------------------------------------------

  const hasWhatsAppParent =
    selected.has("stock") ||
    selected.has("investments") ||
    selected.has("kareegar");

  if (
    selected.has("whatsapp") &&
    !hasWhatsAppParent
  ) {
    selected.delete("whatsapp");
  }

  return Array.from(selected);
}


// ============================================================
// MODULE STATE
// ============================================================

function getModuleState(
  moduleKey,
  selectedModules,
  mainPlan
) {
  const selected = new Set(selectedModules);

  // ----------------------------------------------------------
  // PRO ONLY
  // ----------------------------------------------------------

  if (
    moduleKey === "ml_analytics" &&
    mainPlan !== "PRO"
  ) {
    return {
      disabled: true,
      reason: "Pro plan only",
      automatic: false,
    };
  }

  // ----------------------------------------------------------
  // CUSTOMER DIRECTORY
  // ----------------------------------------------------------

  if (moduleKey === "customers") {
    const hasParent =
      selected.has("stock") ||
      selected.has("investments") ||
      selected.has("kareegar");

    if (selected.has("customers")) {
      if (selected.has("stock")) {
        return {
          disabled: true,
          reason: "Included with Stock",
          automatic: true,
        };
      }

      if (selected.has("investments")) {
        return {
          disabled: true,
          reason: "Included with Investments",
          automatic: true,
        };
      }

      if (selected.has("kareegar")) {
        return {
          disabled: true,
          reason: "Included with Kareegar",
          automatic: true,
        };
      }

      return {
        disabled: true,
        reason: "Included automatically",
        automatic: true,
      };
    }

    if (!hasParent) {
      return {
        disabled: true,
        reason: "Cannot be selected alone",
        automatic: false,
      };
    }
  }

  // ----------------------------------------------------------
  // INVOICING
  // ----------------------------------------------------------

  if (moduleKey === "invoicing") {
    if (selected.has("invoicing")) {
      return {
        disabled: true,
        reason: "Included with Stock",
        automatic: true,
      };
    }

    if (!selected.has("stock")) {
      return {
        disabled: true,
        reason: "Requires Stock",
        automatic: false,
      };
    }
  }

  // ----------------------------------------------------------
  // WHATSAPP
  // ----------------------------------------------------------

  if (moduleKey === "whatsapp") {
    const hasParent =
      selected.has("stock") ||
      selected.has("investments") ||
      selected.has("kareegar");

    if (
      !hasParent &&
      !selected.has("whatsapp")
    ) {
      return {
        disabled: true,
        reason: "Cannot be selected alone",
        automatic: false,
      };
    }
  }

  return {
    disabled: false,
    reason: "",
    automatic: false,
  };
}


// ============================================================
// EMPTY FORM
// ============================================================

const EMPTY_PLAN = {
  name: "",
  description: "",
  main_plan: "BASIC",
  monthly_price: "",
  annual_price: "",
  currency: "INR",
  modules: [],
};


// ============================================================
// PAGE
// ============================================================

export default function SubscriptionsPage() {
  const [activePlanType, setActivePlanType] =
    useState("BASIC");

  const [plans, setPlans] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showPlanModal, setShowPlanModal] =
    useState(false);

  const [editingPlan, setEditingPlan] =
    useState(null);

  const [planForm, setPlanForm] =
    useState(EMPTY_PLAN);


  // ==========================================================
  // LOAD PLANS
  // ==========================================================

  const fetchSubscriptionData =
    async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/subscriptions/plans`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(() => ({}));

          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : `Unable to load subscription plans (HTTP ${response.status}).`
          );
        }

        const data =
          await response.json();

        setPlans(
          Array.isArray(data)
            ? data
            : data?.plans || []
        );
      } catch (err) {
        console.error(
          "Subscription configuration error:",
          err
        );

        setPlans([]);

        setError(
          err?.message ||
            "Unable to load subscription plans."
        );
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    fetchSubscriptionData();
  }, []);


  // ==========================================================
  // FILTER PLANS
  // ==========================================================

  const filteredPlans =
    useMemo(() => {
      return plans
        .filter(
          (plan) =>
            plan.main_plan ===
            activePlanType
        )
        .filter((plan) =>
          plan.name
            ?.toLowerCase()
            .includes(
              search.toLowerCase()
            )
        );
    }, [
      plans,
      activePlanType,
      search,
    ]);


  // ==========================================================
  // CREATE PLAN
  // ==========================================================

  const openCreatePlan = () => {
    setEditingPlan(null);

    setPlanForm({
      ...EMPTY_PLAN,
      main_plan:
        activePlanType,
    });

    setShowPlanModal(true);
  };


  // ==========================================================
  // EDIT PLAN
  // ==========================================================

  const openEditPlan = (plan) => {
    const moduleKeys =
      plan.modules?.map(
        (module) =>
          typeof module === "string"
            ? module
            : module.module_key
      ) || [];

    setEditingPlan(plan);

    setPlanForm({
      name: plan.name || "",
      description:
        plan.description || "",
      main_plan:
        plan.main_plan || "BASIC",
      monthly_price:
        plan.monthly_price ?? "",
      annual_price:
        plan.annual_price ?? "",
      currency:
        plan.currency || "INR",
      modules: normalizeModules(
        moduleKeys,
        plan.main_plan
      ),
    });

    setShowPlanModal(true);
  };


  // ==========================================================
  // CLOSE PLAN MODAL
  // ==========================================================

  const closePlanModal = () => {
    setShowPlanModal(false);
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN);
  };


  // ==========================================================
  // MODULE TOGGLE
  // ==========================================================

  const toggleModule = (moduleKey) => {
    setPlanForm((current) => {
      const moduleState =
        getModuleState(
          moduleKey,
          current.modules,
          current.main_plan
        );

      if (moduleState.disabled) {
        return current;
      }

      const selected =
        new Set(current.modules);

      if (selected.has(moduleKey)) {
        selected.delete(moduleKey);
      } else {
        selected.add(moduleKey);
      }

      return {
        ...current,
        modules: normalizeModules(
          Array.from(selected),
          current.main_plan
        ),
      };
    });
  };


  // ==========================================================
  // CHANGE MAIN PLAN
  // ==========================================================

  const changeMainPlan = (mainPlan) => {
    setPlanForm((current) => {
      let modules =
        current.modules;

      if (mainPlan === "BASIC") {
        modules =
          modules.filter(
            (moduleKey) =>
              moduleKey !==
              "ml_analytics"
          );
      }

      modules = normalizeModules(
        modules,
        mainPlan
      );

      return {
        ...current,
        main_plan: mainPlan,
        modules,
      };
    });
  };


  // ==========================================================
  // SAVE PLAN
  // ==========================================================

  const savePlan = async () => {
    if (!planForm.name.trim()) {
      alert(
        "Subscription plan name is required."
      );
      return;
    }

    if (
      planForm.modules.length === 0
    ) {
      alert(
        "Select at least one module."
      );
      return;
    }

    const monthlyPrice =
      Number(
        planForm.monthly_price
      );

    const annualPrice =
      Number(
        planForm.annual_price
      );

    if (
      planForm.monthly_price === "" ||
      !Number.isFinite(monthlyPrice) ||
      monthlyPrice < 0
    ) {
      alert(
        "Enter a valid monthly price."
      );
      return;
    }

    if (
      planForm.annual_price === "" ||
      !Number.isFinite(annualPrice) ||
      annualPrice < 0
    ) {
      alert(
        "Enter a valid annual price."
      );
      return;
    }

    try {
      const payload = {
        name:
          planForm.name.trim(),

        description:
          planForm.description.trim() ||
          null,

        main_plan:
          planForm.main_plan
            .trim()
            .toUpperCase(),

        monthly_price:
          monthlyPrice,

        annual_price:
          annualPrice,

        currency:
          planForm.currency
            .trim()
            .toUpperCase(),

        modules:
          planForm.modules.map(
            (moduleKey) => {
              const module =
                MODULES.find(
                  (item) =>
                    item.key ===
                    moduleKey
                );

              return {
                module_key:
                  moduleKey,

                module_name:
                  module?.name ||
                  moduleKey,
              };
            }
          ),
      };

      const url = editingPlan
        ? `${API_URL}/subscriptions/plans/${editingPlan.id}`
        : `${API_URL}/subscriptions/plans`;

      const response =
        await fetch(url, {
          method: editingPlan
            ? "PATCH"
            : "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload
            ),
        });

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        let message =
          "Unable to save subscription plan.";

        if (
          Array.isArray(
            data.detail
          )
        ) {
          message =
            data.detail
              .map(
                (item) => {
                  const location =
                    Array.isArray(
                      item.loc
                    )
                      ? item.loc.join(
                          " → "
                        )
                      : "";

                  return `${
                    location
                      ? `${location}: `
                      : ""
                  }${
                    item.msg ||
                    "Invalid value"
                  }`;
                }
              )
              .join("\n");
        } else if (
          typeof data.detail ===
          "string"
        ) {
          message =
            data.detail;
        }

        throw new Error(message);
      }

      closePlanModal();

      await fetchSubscriptionData();
    } catch (err) {
      console.error(
        "Save plan error:",
        err
      );

      alert(
        err.message ||
          "Unable to save subscription plan."
      );
    }
  };


  // ==========================================================
  // DELETE PLAN
  // ==========================================================

  const deletePlan = async (plan) => {
    const confirmed =
      window.confirm(
        `Delete subscription plan "${plan.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL}/subscriptions/plans/${plan.id}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          typeof data.detail ===
            "string"
            ? data.detail
            : "Unable to delete subscription plan."
        );
      }

      await fetchSubscriptionData();
    } catch (err) {
      console.error(
        "Delete plan error:",
        err
      );

      alert(
        err.message ||
          "Unable to delete subscription plan."
      );
    }
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50/60">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="shrink-0 border-b border-slate-200/70 bg-white">

        <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6">

          <div className="min-w-0">

            <div className="flex items-center gap-2">

              <Layers
                size={18}
                strokeWidth={2.3}
                style={{
                  color: GOLD,
                }}
              />

              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                Subscriptions
              </h1>

            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Manage subscription plans,
              modules and pricing.
            </p>

          </div>


          <div className="flex shrink-0 items-center gap-2">

            <button
              type="button"
              onClick={
                fetchSubscriptionData
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>

            <button
              type="button"
              onClick={
                openCreatePlan
              }
              className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{
                backgroundColor: GOLD,
              }}
            >
              <Plus
                size={15}
                strokeWidth={2.5}
              />

              New Plan
            </button>

          </div>

        </div>


        {/* PLAN TYPE TABS */}

        <div className="flex gap-1 overflow-x-auto px-4 sm:px-6">

          <button
            type="button"
            onClick={() => {
              setActivePlanType(
                "BASIC"
              );
              setSearch("");
            }}
            className={`relative flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${
              activePlanType ===
              "BASIC"
                ? "text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
            style={
              activePlanType ===
              "BASIC"
                ? {
                    borderColor:
                      GOLD,
                  }
                : undefined
            }
          >
            <Package size={14} />

            BASIC

            <span
              className={`text-[10px] ${
                activePlanType ===
                "BASIC"
                  ? "text-slate-400"
                  : "text-slate-300"
              }`}
            >
              Standard
            </span>

          </button>


          <button
            type="button"
            onClick={() => {
              setActivePlanType(
                "PRO"
              );
              setSearch("");
            }}
            className={`relative flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${
              activePlanType ===
              "PRO"
                ? "text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
            style={
              activePlanType ===
              "PRO"
                ? {
                    borderColor:
                      GOLD,
                  }
                : undefined
            }
          >
            <Sparkles size={14} />

            PRO

            <span
              className={`text-[10px] ${
                activePlanType ===
                "PRO"
                  ? "text-slate-400"
                  : "text-slate-300"
              }`}
            >
              Advanced
            </span>

          </button>

        </div>

      </header>


      {/* ======================================================
          BODY
      ====================================================== */}

      <main
        className={`min-h-0 flex-1 overflow-y-auto ${noScroll}`}
      >

        <div className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-6">

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0 text-red-500"
              />

              <div>

                <p className="text-xs font-semibold text-red-700">
                  Subscription configuration
                  failed
                </p>

                <p className="mt-1 text-[11px] leading-5 text-red-600">
                  {error}
                </p>

              </div>

            </div>
          )}


          {loading ? (

            <div className="flex min-h-[400px] items-center justify-center">

              <div className="flex flex-col items-center">

                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#c59b27]" />

                <p className="mt-3 text-xs font-medium text-slate-500">
                  Loading subscriptions...
                </p>

              </div>

            </div>

          ) : (

            <>

              {/* =================================================
                  SEARCH
              ================================================= */}

              <div className="mb-5 flex items-center justify-between gap-3">

                <div className="relative max-w-sm flex-1">

                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder={`Search ${activePlanType} plans...`}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  />

                </div>

                <span className="text-xs font-medium text-slate-400">
                  {filteredPlans.length}{" "}
                  {filteredPlans.length ===
                  1
                    ? "plan"
                    : "plans"}
                </span>

              </div>


              {/* =================================================
                  PLAN LIST
              ================================================= */}

              {filteredPlans.length ===
              0 ? (

                <div
                  className={`${card} flex min-h-[360px] items-center justify-center`}
                >

                  <div className="max-w-sm text-center">

                    <div
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor:
                          `${GOLD}12`,
                        color: GOLD,
                      }}
                    >
                      <Package size={22} />
                    </div>

                    <h2 className="mt-4 text-sm font-semibold text-slate-900">
                      No {activePlanType}{" "}
                      plans yet
                    </h2>

                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      Create a subscription
                      plan, choose its
                      modules and set
                      monthly and annual
                      pricing.
                    </p>

                    <button
                      type="button"
                      onClick={
                        openCreatePlan
                      }
                      className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white"
                      style={{
                        backgroundColor:
                          GOLD,
                      }}
                    >
                      <Plus size={14} />

                      Create{" "}
                      {activePlanType}{" "}
                      Plan
                    </button>

                  </div>

                </div>

              ) : (

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

                  {filteredPlans.map(
                    (plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onEdit={() =>
                          openEditPlan(
                            plan
                          )
                        }
                        onDelete={() =>
                          deletePlan(
                            plan
                          )
                        }
                      />
                    )
                  )}

                </div>

              )}

            </>

          )}

        </div>

      </main>


      {/* ======================================================
          PLAN MODAL
      ====================================================== */}

      {showPlanModal && (

        <Modal
          title={
            editingPlan
              ? "Edit Subscription Plan"
              : "Create Subscription Plan"
          }
          subtitle={`Configure a ${planForm.main_plan} subscription`}
          onClose={
            closePlanModal
          }
          wide
        >

          <div className="space-y-6">

            {/* =================================================
                PLAN DETAILS
            ================================================= */}

            <section>

              <SectionLabel>
                Plan Details
              </SectionLabel>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <Field
                  label="Subscription Name"
                  required
                  value={
                    planForm.name
                  }
                  onChange={(value) =>
                    setPlanForm(
                      (current) => ({
                        ...current,
                        name: value,
                      })
                    )
                  }
                  placeholder="e.g. Abhinava Basic"
                />


                <div>

                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                    Main Plan
                  </label>

                  <select
                    value={
                      planForm.main_plan
                    }
                    onChange={(event) =>
                      changeMainPlan(
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  >

                    <option value="BASIC">
                      Basic
                    </option>

                    <option value="PRO">
                      Pro
                    </option>

                  </select>

                </div>


                <div className="sm:col-span-2">

                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                    Description
                  </label>

                  <textarea
                    value={
                      planForm.description
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          description:
                            event.target.value,
                        })
                      )
                    }
                    rows={2}
                    placeholder="Describe what this subscription is intended for..."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  />

                </div>

              </div>

            </section>


            {/* =================================================
                PRICING
            ================================================= */}

            <section>

              <SectionLabel>
                Subscription Pricing
              </SectionLabel>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <PriceField
                  label="Monthly Price"
                  value={
                    planForm.monthly_price
                  }
                  onChange={(value) =>
                    setPlanForm(
                      (current) => ({
                        ...current,
                        monthly_price:
                          value,
                      })
                    )
                  }
                />

                <PriceField
                  label="Annual Price"
                  value={
                    planForm.annual_price
                  }
                  onChange={(value) =>
                    setPlanForm(
                      (current) => ({
                        ...current,
                        annual_price:
                          value,
                      })
                    )
                  }
                />


                <div>

                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                    Currency
                  </label>

                  <select
                    value={
                      planForm.currency
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          currency:
                            event.target.value,
                        })
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="INR">
                      INR — Indian Rupee
                    </option>
                  </select>

                </div>

              </div>


              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">

                <div className="flex gap-2.5">

                  <AlertCircle
                    size={14}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="text-[10px] leading-4 text-slate-500">

                    <p className="font-semibold text-slate-600">
                      Simple pricing
                    </p>

                    <p className="mt-0.5">
                      The subscription has one
                      standard monthly price
                      and one standard annual
                      price. Client-specific
                      discounts and invoice
                      adjustments will be
                      handled separately during
                      billing.
                    </p>

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                MODULES
            ================================================= */}

            <section>

              <div className="mb-3 flex items-center justify-between gap-3">

                <SectionLabel>

                  Included Modules

                  <span className="ml-2 font-normal text-slate-400">
                    (
                    {
                      planForm.modules
                        .length
                    }{" "}
                    selected)
                  </span>

                </SectionLabel>

                <div className="flex items-center gap-3 text-[10px] text-slate-400">

                  <span className="inline-flex items-center gap-1">
                    <Lock size={10} />
                    Restricted
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <Sparkles
                      size={10}
                      style={{
                        color: GOLD,
                      }}
                    />
                    Automatic
                  </span>

                </div>

              </div>


              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

                {MODULES.filter(
                  (module) =>
                    planForm.main_plan ===
                      "PRO" ||
                    !module.proOnly
                ).map((module) => {

                  const selected =
                    planForm.modules.includes(
                      module.key
                    );

                  const moduleState =
                    getModuleState(
                      module.key,
                      planForm.modules,
                      planForm.main_plan
                    );

                  const disabled =
                    moduleState.disabled;

                  return (
                    <button
                      key={module.key}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        toggleModule(
                          module.key
                        )
                      }
                      className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-slate-300 bg-slate-50"
                          : disabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-50/40 opacity-70"
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
                      }`}
                    >

                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          selected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : disabled
                            ? "border-slate-200 bg-slate-100 text-slate-400"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >

                        {selected ? (
                          <Check
                            size={12}
                            strokeWidth={3}
                          />
                        ) : disabled ? (
                          <Lock size={10} />
                        ) : (
                          <Check
                            size={12}
                            strokeWidth={3}
                          />
                        )}

                      </span>


                      <span className="min-w-0 flex-1">

                        <span className="flex flex-wrap items-center gap-1.5">

                          <span
                            className={`block text-xs font-semibold ${
                              disabled
                                ? "text-slate-400"
                                : "text-slate-900"
                            }`}
                          >
                            {module.name}
                          </span>

                          {module.proOnly && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                              style={{
                                backgroundColor:
                                  `${GOLD}14`,
                                color: GOLD,
                              }}
                            >
                              <Sparkles
                                size={8}
                              />
                              PRO
                            </span>
                          )}

                        </span>

                        <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">
                          {
                            module.description
                          }
                        </span>

                        {moduleState.reason && (
                          <span
                            className={`mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold ${
                              moduleState.automatic
                                ? "text-slate-500"
                                : "text-slate-400"
                            }`}
                          >

                            {moduleState.automatic ? (
                              <Sparkles
                                size={9}
                                style={{
                                  color: GOLD,
                                }}
                              />
                            ) : (
                              <Lock size={9} />
                            )}

                            {
                              moduleState.reason
                            }

                          </span>
                        )}

                      </span>

                    </button>
                  );
                })}

              </div>


              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">

                <div className="flex gap-2.5">

                  <AlertCircle
                    size={14}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="text-[10px] leading-4 text-slate-500">

                    <p className="font-semibold text-slate-600">
                      Module dependencies
                    </p>

                    <p className="mt-0.5">
                      Customer Directory and
                      WhatsApp cannot be
                      offered independently.
                      Stock automatically
                      includes Customer
                      Directory and Sales &
                      Invoicing. Investments
                      and Kareegar automatically
                      include Customer Directory.
                    </p>

                    {planForm.main_plan ===
                      "BASIC" && (
                      <p className="mt-1 font-medium text-slate-500">
                        Reports & ML Analytics
                        is available only with
                        Pro.
                      </p>
                    )}

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">

              <button
                type="button"
                onClick={
                  closePlanModal
                }
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePlan}
                className="rounded-lg px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                style={{
                  backgroundColor: GOLD,
                }}
              >
                {editingPlan
                  ? "Save Changes"
                  : "Create Plan"}
              </button>

            </div>

          </div>

        </Modal>

      )}

    </div>
  );
}


// ============================================================
// PLAN CARD
// ============================================================

function PlanCard({
  plan,
  onEdit,
  onDelete,
}) {

  const modules =
    plan.modules?.map(
      (module) => {
        const key =
          typeof module ===
          "string"
            ? module
            : module.module_key ||
              module.key;

        const found =
          MODULES.find(
            (item) =>
              item.key === key
          );

        return (
          found || {
            key,
            name:
              typeof module ===
              "string"
                ? module
                : module.module_name ||
                  module.name ||
                  key,
          }
        );
      }
    ) || [];


  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5">

        <div className="min-w-0">

          <div className="mb-1.5 flex items-center gap-2.5">

            <h2 className="truncate text-sm font-black text-slate-900">
              {plan.name}
            </h2>

            <span
              className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${
                plan.main_plan ===
                "PRO"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 shadow-sm"
              }`}
            >
              {plan.main_plan}
            </span>

          </div>

          <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
            {plan.description ||
              "No description provided."}
          </p>

        </div>


        <div className="flex shrink-0 items-center gap-1.5">

          <button
            type="button"
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            title="Edit"
          >
            <Pencil size={12} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded border border-rose-100 bg-white text-rose-400 shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>

        </div>

      </div>


      {/* ======================================================
          PRICING
      ====================================================== */}

      <div className="border-b border-slate-100 p-5">

        <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Subscription Pricing
        </p>

        <div className="grid grid-cols-2 gap-3">

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">

            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              Monthly
            </p>

            <p className="mt-1 text-lg font-black text-slate-900">

              <span className="mr-0.5 text-sm">
                ₹
              </span>

              {Number(
                plan.monthly_price ||
                  0
              ).toLocaleString(
                "en-IN"
              )}

            </p>

            <p className="text-[9px] text-slate-400">
              per month
            </p>

          </div>


          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">

            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              Annual
            </p>

            <p className="mt-1 text-lg font-black text-slate-900">

              <span className="mr-0.5 text-sm">
                ₹
              </span>

              {Number(
                plan.annual_price ||
                  0
              ).toLocaleString(
                "en-IN"
              )}

            </p>

            <p className="text-[9px] text-slate-400">
              per year
            </p>

          </div>

        </div>

      </div>


      {/* ======================================================
          MODULES
      ====================================================== */}

      <div className="flex-1 bg-white p-5">

        <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Included Modules
        </p>

        <div className="flex flex-wrap gap-2">

          {modules.map(
            (module) => (
              <span
                key={
                  module.key
                }
                className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-700"
              >

                <Check
                  size={10}
                  strokeWidth={3}
                  className="text-slate-900"
                />

                {module.name}

              </span>
            )
          )}

          {modules.length ===
            0 && (
            <span className="text-[10px] italic text-slate-400">
              No modules configured
            </span>
          )}

        </div>

      </div>


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3">

        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
          {plan.currency ||
            "INR"}
        </span>

        <span
          className={`rounded-full px-2 py-1 text-[9px] font-bold ${
            plan.is_active
              ? "bg-emerald-50 text-emerald-600"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {plan.is_active
            ? "ACTIVE"
            : "INACTIVE"}
        </span>

      </div>

    </div>
  );
}


// ============================================================
// MODAL
// ============================================================

function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">

      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          wide
            ? "max-w-4xl"
            : "max-w-md"
        }`}
      >

        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">

          <div>

            <h2 className="text-sm font-semibold text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {subtitle}
              </p>
            )}

          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={16} />
          </button>

        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto ${noScroll} p-5`}
        >
          {children}
        </div>

      </div>

    </div>
  );
}


// ============================================================
// SECTION LABEL
// ============================================================

function SectionLabel({
  children,
}) {
  return (
    <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
      {children}
    </h3>
  );
}


// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  required = false,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>

      <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
      />

    </div>
  );
}


// ============================================================
// PRICE FIELD
// ============================================================

function PriceField({
  label,
  value,
  onChange,
}) {
  return (
    <div>

      <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">
        {label}
        <span className="ml-1 text-red-500">
          *
        </span>
      </label>

      <div className="relative">

        <IndianRupee
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder="0.00"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
        />

      </div>

    </div>
  );
}