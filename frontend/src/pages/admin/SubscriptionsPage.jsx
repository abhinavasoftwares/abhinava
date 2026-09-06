
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Layers,
  MapPinned,
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
    description: "Customer management and relationship records.",
  },
  {
    key: "stock",
    name: "Stock / Inventory",
    description: "Inventory and stock management.",
  },
  {
    key: "invoicing",
    name: "Sales & Invoicing",
    description: "Sales transactions and invoice management.",
  },
  {
    key: "investments",
    name: "Investments",
    description: "Investment and investor management.",
  },
  {
    key: "kareegar",
    name: "Kareegar Management",
    description: "Kareegar and production workforce management.",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description: "WhatsApp communication and notifications.",
  },
  {
    key: "ml_analytics",
    name: "Reports & ML Analytics",
    description: "Reports, analytics and machine-learning insights.",
    proOnly: true,
  },
];

// ============================================================
// MODULE DEPENDENCIES
// ============================================================

const MODULE_DEPENDENCIES = {
  stock: ["customers", "invoicing"],
  invoicing: ["customers", "stock"],
  investments: ["customers"],
};

// ============================================================
// NORMALIZE MODULE SELECTION
// ============================================================

function normalizeModules(modules, mainPlan) {
  const selected = new Set(modules);

  // ----------------------------------------------------------
  // ML ANALYTICS
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
  // STOCK AUTOMATICALLY ENABLES
  // CUSTOMERS + INVOICING
  // ----------------------------------------------------------

  if (selected.has("stock")) {
    selected.add("customers");
    selected.add("invoicing");
  }

  // ----------------------------------------------------------
  // INVESTMENTS AUTOMATICALLY ENABLES CUSTOMERS
  // ----------------------------------------------------------

  if (selected.has("investments")) {
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

  if (selected.has("whatsapp") && !hasWhatsAppParent) {
    selected.delete("whatsapp");
  }

  return Array.from(selected);
}

// ============================================================
// MODULE UI STATE
// ============================================================

function getModuleState(moduleKey, selectedModules, mainPlan) {
  const selected = new Set(selectedModules);

  // ----------------------------------------------------------
  // PRO ONLY
  // ----------------------------------------------------------

  if (moduleKey === "ml_analytics" && mainPlan !== "PRO") {
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

    if (!hasParent && !selected.has("whatsapp")) {
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
  modules: [],
  prices: {
    1: "",
    2: "",
    3: "",
  },
};

// ============================================================
// PAGE
// ============================================================

export default function SubscriptionsPage() {
  const [activeSection, setActiveSection] = useState("plans");
  const [activePlanType, setActivePlanType] = useState("BASIC");

  const [cityTiers, setCityTiers] = useState([]);
  const [plans, setPlans] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);

  const [editingPlan, setEditingPlan] = useState(null);
  const [editingTier, setEditingTier] = useState(null);

  const [planForm, setPlanForm] = useState(EMPTY_PLAN);

  const [tierForm, setTierForm] = useState({
    name: "",
    description: "",
  });

  // =========================================================
  // LOAD DATA
  // =========================================================

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError("");

      const [tiersResponse, plansResponse] = await Promise.all([
        fetch(`${API_URL}/subscriptions/city-tiers`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/subscriptions/plans`, {
          credentials: "include",
        }),
      ]);

      if (!tiersResponse.ok || !plansResponse.ok) {
        throw new Error("Unable to load subscription configuration.");
      }

      const tiersData = await tiersResponse.json();
      const plansData = await plansResponse.json();

      setCityTiers(tiersData.city_tiers || []);
      setPlans(plansData.plans || []);
    } catch (err) {
      console.error("Subscription loading error:", err);

      setError("");

      setCityTiers([
        {
          id: 1,
          name: "Tier 1",
          description: "Metro / premium markets",
          is_active: true,
        },
        {
          id: 2,
          name: "Tier 2",
          description: "Major cities",
          is_active: true,
        },
        {
          id: 3,
          name: "Tier 3",
          description: "Other cities",
          is_active: true,
        },
      ]);

      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  // =========================================================
  // PLAN FILTERING
  // =========================================================

  const filteredPlans = useMemo(() => {
    return plans
      .filter((plan) => plan.main_plan === activePlanType)
      .filter((plan) =>
        plan.name?.toLowerCase().includes(search.toLowerCase())
      );
  }, [plans, activePlanType, search]);

  // =========================================================
  // PLAN MODAL
  // =========================================================

  const openCreatePlan = () => {
    setEditingPlan(null);

    setPlanForm({
      ...EMPTY_PLAN,
      main_plan: activePlanType,
      modules: [],
      prices: {
        1: "",
        2: "",
        3: "",
      },
    });

    setShowPlanModal(true);
  };

  const openEditPlan = (plan) => {
    const moduleKeys =
      plan.modules?.map((module) =>
        typeof module === "string" ? module : module.module_key
      ) || [];

    const normalizedModules = normalizeModules(
      moduleKeys,
      plan.main_plan
    );

    const prices = {};

    (plan.prices || []).forEach((price) => {
      prices[price.city_tier_id] =
        price.monthly_price ?? price.price ?? "";
    });

    setEditingPlan(plan);

    setPlanForm({
      name: plan.name || "",
      description: plan.description || "",
      main_plan: plan.main_plan,
      modules: normalizedModules,
      prices: {
        1: prices[1] ?? "",
        2: prices[2] ?? "",
        3: prices[3] ?? "",
      },
    });

    setShowPlanModal(true);
  };

  const closePlanModal = () => {
    setShowPlanModal(false);
    setEditingPlan(null);
  };

  // =========================================================
  // MODULE TOGGLE
  // =========================================================

  const toggleModule = (moduleKey) => {
    setPlanForm((current) => {
      const moduleState = getModuleState(
        moduleKey,
        current.modules,
        current.main_plan
      );

      // Never allow an unavailable module to be toggled.
      if (moduleState.disabled) {
        return current;
      }

      const selected = new Set(current.modules);

      if (selected.has(moduleKey)) {
        selected.delete(moduleKey);
      } else {
        selected.add(moduleKey);
      }

      const normalized = normalizeModules(
        Array.from(selected),
        current.main_plan
      );

      return {
        ...current,
        modules: normalized,
      };
    });
  };

  // =========================================================
  // CHANGE MAIN PLAN
  // =========================================================

  const changeMainPlan = (mainPlan) => {
    setPlanForm((current) => {
      let modules = current.modules;

      if (mainPlan === "BASIC") {
        modules = modules.filter(
          (moduleKey) => moduleKey !== "ml_analytics"
        );
      }

      modules = normalizeModules(modules, mainPlan);

      return {
        ...current,
        main_plan: mainPlan,
        modules,
      };
    });
  };

  // =========================================================
  // PRICING
  // =========================================================

  const updateTierPrice = (tierId, value) => {
    setPlanForm((current) => ({
      ...current,
      prices: {
        ...current.prices,
        [tierId]: value,
      },
    }));
  };

  // =========================================================
  // SAVE PLAN
  // =========================================================

  const savePlan = async () => {
    if (!planForm.name.trim()) {
      alert("Subscription plan name is required.");
      return;
    }

    if (planForm.modules.length === 0) {
      alert("Select at least one module.");
      return;
    }

    for (const tier of cityTiers) {
      if (
        planForm.prices[tier.id] === "" ||
        planForm.prices[tier.id] === null ||
        planForm.prices[tier.id] === undefined
      ) {
        alert(`Enter pricing for ${tier.name}.`);
        return;
      }

      if (Number(planForm.prices[tier.id]) < 0) {
        alert(`Pricing for ${tier.name} cannot be negative.`);
        return;
      }
    }

    try {
      const payload = {
        name: planForm.name.trim(),
        description: planForm.description.trim() || null,
        main_plan: planForm.main_plan,

        modules: planForm.modules.map((moduleKey) => {
          const module = MODULES.find(
            (item) => item.key === moduleKey
          );

          return {
            module_key: moduleKey,
            module_name: module?.name || moduleKey,
          };
        }),

        prices: cityTiers.map((tier) => ({
          city_tier_id: tier.id,
          monthly_price: Number(planForm.prices[tier.id]),
          annual_price:
            Number(planForm.prices[tier.id]) * 12,
          currency: "INR",
        })),
      };

      const url = editingPlan
        ? `${API_URL}/subscriptions/plans/${editingPlan.id}`
        : `${API_URL}/subscriptions/plans`;

      const response = await fetch(url, {
        method: editingPlan ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        let message = "Unable to save subscription plan.";

        if (Array.isArray(data.detail)) {
          message = data.detail
            .map((error) => {
              const location = Array.isArray(error.loc)
                ? error.loc.join(" → ")
                : "";

              return `${
                location ? `${location}: ` : ""
              }${error.msg || "Invalid value"}`;
            })
            .join("\n");
        } else if (typeof data.detail === "string") {
          message = data.detail;
        } else if (data.detail) {
          message = JSON.stringify(
            data.detail,
            null,
            2
          );
        }

        throw new Error(message);
      }

      closePlanModal();
      await fetchSubscriptionData();
    } catch (err) {
      console.error("Save plan error:", err);
      alert(
        err.message ||
          "Unable to save subscription plan."
      );
    }
  };

  // =========================================================
  // DELETE PLAN
  // =========================================================

  const deletePlan = async (plan) => {
    const confirmed = window.confirm(
      `Delete subscription plan "${plan.name}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/subscriptions/plans/${plan.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        let message =
          "Unable to delete subscription plan.";

        if (Array.isArray(data.detail)) {
          message = data.detail
            .map((error) => {
              const location = Array.isArray(error.loc)
                ? error.loc.join(" → ")
                : "";

              return `${
                location ? `${location}: ` : ""
              }${error.msg || "Invalid value"}`;
            })
            .join("\n");
        } else if (typeof data.detail === "string") {
          message = data.detail;
        } else if (data.detail) {
          message = JSON.stringify(
            data.detail,
            null,
            2
          );
        }

        throw new Error(message);
      }

      await fetchSubscriptionData();
    } catch (err) {
      console.error("Delete plan error:", err);
      alert(
        err.message ||
          "Unable to delete subscription plan."
      );
    }
  };

  // =========================================================
  // CITY TIER MODAL
  // =========================================================

  const openCreateTier = () => {
    setEditingTier(null);

    setTierForm({
      name: "",
      description: "",
    });

    setShowTierModal(true);
  };

  const openEditTier = (tier) => {
    setEditingTier(tier);

    setTierForm({
      name: tier.name || "",
      description: tier.description || "",
    });

    setShowTierModal(true);
  };

  const closeTierModal = () => {
    setShowTierModal(false);
    setEditingTier(null);
  };

  // =========================================================
  // SAVE TIER
  // =========================================================

  const saveTier = async () => {
    if (!tierForm.name.trim()) {
      alert("City tier name is required.");
      return;
    }

    try {
      const url = editingTier
        ? `${API_URL}/subscriptions/city-tiers/${editingTier.id}`
        : `${API_URL}/subscriptions/city-tiers`;

      const response = await fetch(url, {
        method: editingTier ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: tierForm.name.trim(),
          description:
            tierForm.description.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        let message = "Unable to save city tier.";

        if (Array.isArray(data.detail)) {
          message = data.detail
            .map((error) => {
              const location = Array.isArray(error.loc)
                ? error.loc.join(" → ")
                : "";

              return `${
                location ? `${location}: ` : ""
              }${error.msg || "Invalid value"}`;
            })
            .join("\n");
        } else if (typeof data.detail === "string") {
          message = data.detail;
        } else if (data.detail) {
          message = JSON.stringify(
            data.detail,
            null,
            2
          );
        }

        throw new Error(message);
      }

      closeTierModal();
      await fetchSubscriptionData();
    } catch (err) {
      console.error("Save tier error:", err);
      alert(
        err.message || "Unable to save city tier."
      );
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50/60">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="shrink-0 border-b border-slate-200/70 bg-white">
        <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Layers
                size={18}
                strokeWidth={2.3}
                style={{ color: GOLD }}
              />

              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                Subscriptions
              </h1>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Manage subscription plans, modules and
              city-tier pricing.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={fetchSubscriptionData}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>

            {activeSection === "plans" && (
              <button
                type="button"
                onClick={openCreatePlan}
                className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: GOLD }}
              >
                <Plus
                  size={15}
                  strokeWidth={2.5}
                />
                New Plan
              </button>
            )}

            {activeSection === "tiers" && (
              <button
                type="button"
                onClick={openCreateTier}
                className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: GOLD }}
              >
                <Plus
                  size={15}
                  strokeWidth={2.5}
                />
                New City Tier
              </button>
            )}
          </div>
        </div>

        {/* ===================================================
            SECTION TABS
        =================================================== */}

        <div className="flex gap-1 overflow-x-auto px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveSection("plans")}
            className={`relative flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${
              activeSection === "plans"
                ? "text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
            style={
              activeSection === "plans"
                ? { borderColor: GOLD }
                : undefined
            }
          >
            <Package size={14} />
            Subscription Plans
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("tiers")}
            className={`relative flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition ${
              activeSection === "tiers"
                ? "text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
            style={
              activeSection === "tiers"
                ? { borderColor: GOLD }
                : undefined
            }
          >
            <MapPinned size={14} />
            City Tiers
          </button>
        </div>
      </header>

      {/* =====================================================
          BODY
      ===================================================== */}

      <main
        className={`min-h-0 flex-1 overflow-y-auto ${noScroll}`}
      >
        <div className="mx-auto max-w-[1500px] p-4 sm:p-5 lg:p-6">
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#c59b27]" />

                <p className="mt-3 text-xs font-medium text-slate-500">
                  Loading subscriptions...
                </p>
              </div>
            </div>
          ) : activeSection === "plans" ? (
            <>
              {/* =============================================
                  PLAN TYPE SWITCH
              ============================================== */}

              <div className={`${card} mb-5 p-1.5`}>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlanType("BASIC");
                      setSearch("");
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      activePlanType === "BASIC"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    BASIC

                    <span
                      className={`ml-2 text-[10px] ${
                        activePlanType === "BASIC"
                          ? "text-slate-300"
                          : "text-slate-400"
                      }`}
                    >
                      Standard
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePlanType("PRO");
                      setSearch("");
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      activePlanType === "PRO"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    PRO

                    <span
                      className={`ml-2 text-[10px] ${
                        activePlanType === "PRO"
                          ? "text-slate-300"
                          : "text-slate-400"
                      }`}
                    >
                      Advanced
                    </span>
                  </button>
                </div>
              </div>

              {/* =============================================
                  SEARCH
              ============================================== */}

              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder={`Search ${activePlanType} plans...`}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <span className="text-xs font-medium text-slate-400">
                  {filteredPlans.length}{" "}
                  {filteredPlans.length === 1
                    ? "plan"
                    : "plans"}
                </span>
              </div>

              {/* =============================================
                  PLAN LIST
              ============================================== */}

              {filteredPlans.length === 0 ? (
                <div
                  className={`${card} flex min-h-[360px] items-center justify-center`}
                >
                  <div className="max-w-sm text-center">
                    <div
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: `${GOLD}12`,
                        color: GOLD,
                      }}
                    >
                      <Package size={22} />
                    </div>

                    <h2 className="mt-4 text-sm font-semibold text-slate-900">
                      No {activePlanType} plans yet
                    </h2>

                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      Create a subscription plan, choose
                      its modules and set pricing
                      independently for each city tier.
                    </p>

                    <button
                      type="button"
                      onClick={openCreatePlan}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: GOLD,
                      }}
                    >
                      <Plus size={14} />
                      Create {activePlanType} Plan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {filteredPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      cityTiers={cityTiers}
                      onEdit={() =>
                        openEditPlan(plan)
                      }
                      onDelete={() =>
                        deletePlan(plan)
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ===============================================
               CITY TIERS
            ================================================ */

            <div className="space-y-4">
              <div
                className={`${card} overflow-hidden`}
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    City Tiers
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Pricing is determined by the
                    client's city tier.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {cityTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: `${GOLD}12`,
                            color: GOLD,
                          }}
                        >
                          <MapPinned size={16} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {tier.name}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {tier.description ||
                              "No description"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            tier.is_active
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {tier.is_active
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            openEditTier(tier)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-900"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${card} p-5`}>
                <div className="flex gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${GOLD}12`,
                      color: GOLD,
                    }}
                  >
                    <AlertCircle size={16} />
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">
                      How tier pricing works
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      The same subscription plan can have
                      completely different pricing for
                      Tier 1, Tier 2 and Tier 3. This allows
                      Abhinava to price the same software
                      according to the client's market.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =====================================================
          PLAN MODAL
      ===================================================== */}

      {showPlanModal && (
        <Modal
          title={
            editingPlan
              ? "Edit Subscription Plan"
              : "Create Subscription Plan"
          }
          subtitle={`Configure a ${planForm.main_plan} subscription`}
          onClose={closePlanModal}
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
                  value={planForm.name}
                  onChange={(value) =>
                    setPlanForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                  placeholder="e.g. Abhinava_Inventory"
                />

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                    Main Plan
                  </label>

                  <select
                    value={planForm.main_plan}
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
                    value={planForm.description}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        description:
                          event.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Describe what this subscription is intended for..."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  />
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
                    ({planForm.modules.length} selected)
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
                      style={{ color: GOLD }}
                    />
                    Automatic
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MODULES.filter(
                  (module) =>
                    planForm.main_plan === "PRO" ||
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
                        toggleModule(module.key)
                      }
                      className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-slate-300 bg-slate-50"
                          : disabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-50/40 opacity-70"
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
                      }`}
                    >
                      {/* CHECK / LOCK ICON */}

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

                      {/* MODULE CONTENT */}

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
                                backgroundColor: `${GOLD}14`,
                                color: GOLD,
                              }}
                            >
                              <Sparkles size={8} />
                              PRO
                            </span>
                          )}
                        </span>

                        <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">
                          {module.description}
                        </span>

                        {/* RESTRICTION / AUTOMATIC MESSAGE */}

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

                            {moduleState.reason}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* MODULE RULE INFORMATION */}

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
                      Customer Directory and WhatsApp
                      cannot be offered independently.
                      Stock automatically includes
                      Customer Directory and Sales &
                      Invoicing. Investments automatically
                      includes Customer Directory.
                    </p>

                    {planForm.main_plan === "BASIC" && (
                      <p className="mt-1 font-medium text-slate-500">
                        Reports & ML Analytics is available
                        only with Pro.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* =================================================
                CITY TIER PRICING
            ================================================= */}

            <section>
              <SectionLabel>
                City Tier Pricing
                <span className="ml-2 font-normal text-slate-400">
                  Monthly / Annual
                </span>
              </SectionLabel>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_160px_160px] border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <span>City Tier</span>
                  <span>Monthly</span>
                  <span>Annual</span>
                </div>

                {cityTiers.map((tier) => {
                  const monthly = Number(
                    planForm.prices[tier.id] || 0
                  );

                  const annual = monthly * 12;

                  return (
                    <div
                      key={tier.id}
                      className="grid grid-cols-[1fr_160px_160px] items-center border-b border-slate-100 px-4 py-3 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {tier.name}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Price for this market
                        </p>
                      </div>

                      <div className="relative pr-3">
                        <IndianRupee
                          size={12}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          type="number"
                          min="0"
                          value={
                            planForm.prices[
                              tier.id
                            ]
                          }
                          onChange={(event) =>
                            updateTierPrice(
                              tier.id,
                              event.target.value
                            )
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 pl-7 pr-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                          placeholder="0"
                        />
                      </div>

                      <div className="pl-1">
                        <div className="flex h-9 items-center rounded-lg bg-slate-50 px-3 text-xs font-semibold text-slate-700">
                          ₹
                          {annual.toLocaleString(
                            "en-IN"
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-2 text-[10px] text-slate-400">
                Annual pricing is currently calculated
                as 12 × monthly pricing. We can later
                support independent annual pricing and
                annual discounts.
              </p>
            </section>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closePlanModal}
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

      {/* =====================================================
          CITY TIER MODAL
      ===================================================== */}

      {showTierModal && (
        <Modal
          title={
            editingTier
              ? "Edit City Tier"
              : "Create City Tier"
          }
          subtitle="Define a market pricing tier"
          onClose={closeTierModal}
        >
          <div className="space-y-5">
            <Field
              label="Tier Name"
              required
              value={tierForm.name}
              onChange={(value) =>
                setTierForm((current) => ({
                  ...current,
                  name: value,
                }))
              }
              placeholder="e.g. Tier 1"
            />

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                Description
              </label>

              <textarea
                value={tierForm.description}
                onChange={(event) =>
                  setTierForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
                rows={3}
                placeholder="Describe the cities / markets included..."
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeTierModal}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveTier}
                className="rounded-lg px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                style={{
                  backgroundColor: GOLD,
                }}
              >
                {editingTier
                  ? "Save Changes"
                  : "Create Tier"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =============================================================
// PLAN CARD
// =============================================================

// =============================================================
// PLAN CARD
// =============================================================

function PlanCard({ plan, cityTiers, onEdit, onDelete }) {
  // FIX: Properly extract the key whether it's a string or an object from the backend
  const modules = plan.modules?.map((m) => {
    const key = typeof m === "string" ? m : (m.module_key || m.key);
    const found = MODULES.find((item) => item.key === key);
    return found || { 
      key, 
      name: typeof m === "string" ? m : (m.module_name || m.name || key) 
    };
  }) || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col hover:border-slate-300 transition-colors h-full">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 bg-slate-50/50 rounded-t-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <h2 className="truncate text-sm font-black text-slate-900">{plan.name}</h2>
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest border ${plan.main_plan === 'PRO' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 shadow-sm'}`}>
              {plan.main_plan}
            </span>
          </div>
          <p className="text-[11px] font-medium leading-relaxed text-slate-500 line-clamp-2">{plan.description || "No description provided."}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded bg-white border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900 shadow-sm" title="Edit"><Pencil size={12} /></button>
          <button type="button" onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded bg-white border border-rose-100 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 shadow-sm" title="Delete"><Trash2 size={12} /></button>
        </div>
      </div>

      <div className="border-b border-slate-100 p-5">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">Included Modules</p>
        <div className="flex flex-wrap gap-2">
          {modules.map((module) => (
            <span key={module.key} className="inline-flex items-center gap-1.5 rounded bg-slate-100 border border-slate-200 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-700">
              <Check size={10} strokeWidth={3} className="text-slate-900" /> {module.name}
            </span>
          ))}
          {modules.length === 0 && <span className="text-[10px] text-slate-400 italic">No modules configured</span>}
        </div>
      </div>

      <div className="p-5 flex-1 bg-white rounded-b-xl">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">Tier Pricing</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cityTiers.map((tier) => {
            const price = plan.prices?.find((item) => item.city_tier_id === tier.id);
            const monthly = price?.monthly_price ?? price?.price ?? 0;
            return (
              <div key={tier.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center sm:text-left flex flex-row sm:flex-col justify-between items-center sm:items-start">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:mb-1">{tier.name}</p>
                <p className="text-[13px] font-mono font-black text-slate-900">₹{Number(monthly).toLocaleString("en-IN")}<span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-widest ml-0.5">/mo</span></p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// MODAL
// =============================================================

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
          wide ? "max-w-4xl" : "max-w-md"
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

// =============================================================
// SECTION LABEL
// =============================================================

function SectionLabel({ children }) {
  return (
    <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
      {children}
    </h3>
  );
}

// =============================================================
// FIELD
// =============================================================

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
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}

