import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Layers,
  Package,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  Lock,
  Sparkles,
  Users,
  ArrowRight,
  UserRound,
  ChevronDown,
  ArrowRightLeft,
  ShieldCheck,
  Coins,
  Receipt,
  Boxes,
  Users2,
  Cpu,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const MODULES = [
  {
    key: "customers",
    name: "Customer Directory",
    description: "Customer management and relationship records.",
    icon: Users2,
  },
  {
    key: "stock",
    name: "Stock / Inventory",
    description: "Inventory and stock management.",
    icon: Boxes,
  },
  {
    key: "invoicing",
    name: "Sales & Invoicing",
    description: "Sales transactions and invoice management.",
    icon: Receipt,
  },
  {
    key: "investments",
    name: "Investments",
    description: "Investment and investor management.",
    icon: Coins,
  },
  {
    key: "kareegar",
    name: "Kareegar Management",
    description: "Kareegar and production workforce management.",
    icon: UserRound,
  },
  {
    key: "whatsapp",
    name: "WhatsApp Communication",
    description: "WhatsApp notifications and alerts.",
    icon: RefreshCw,
  },
  {
    key: "ml_analytics",
    name: "Reports & ML Analytics",
    description: "Machine-learning models and forecast analytics.",
    icon: Sparkles,
    proOnly: true,
  },
];

const EMPTY_PLAN = {
  name: "",
  description: "",
  main_plan: "BASIC",
  monthly_price: "",
  annual_price: "",
  currency: "INR",
  modules: [],
};

function normalizeModules(modules, mainPlan) {
  const selected = new Set(modules);

  if (mainPlan === "BASIC") {
    selected.delete("ml_analytics");
  }

  if (!selected.has("stock")) {
    selected.delete("invoicing");
  }

  if (selected.has("stock")) {
    selected.add("customers");
    selected.add("invoicing");
  }

  if (selected.has("investments")) {
    selected.add("customers");
  }

  if (selected.has("kareegar")) {
    selected.add("customers");
  }

  const hasParentModule =
    selected.has("stock") ||
    selected.has("investments") ||
    selected.has("kareegar");

  if (!hasParentModule) {
    selected.delete("customers");
  }

  if (selected.has("whatsapp") && !hasParentModule) {
    selected.delete("whatsapp");
  }

  return Array.from(selected);
}

function getModuleState(moduleKey, selectedModules, mainPlan) {
  const selected = new Set(selectedModules);

  if (moduleKey === "ml_analytics" && mainPlan !== "PRO") {
    return {
      disabled: true,
      reason: "Pro tier required",
      automatic: false,
    };
  }

  if (moduleKey === "customers") {
    if (selected.has("stock") || selected.has("investments") || selected.has("kareegar")) {
      return {
        disabled: true,
        reason: "Auto-included with core modules",
        automatic: true,
      };
    }

    if (!selected.has("stock") && !selected.has("investments") && !selected.has("kareegar")) {
      return {
        disabled: true,
        reason: "Requires parent module",
        automatic: false,
      };
    }
  }

  if (moduleKey === "invoicing") {
    if (selected.has("stock")) {
      return {
        disabled: true,
        reason: "Auto-included with Stock",
        automatic: true,
      };
    }

    if (!selected.has("stock")) {
      return {
        disabled: true,
        reason: "Requires Stock module",
        automatic: false,
      };
    }
  }

  if (moduleKey === "whatsapp") {
    const hasParent =
      selected.has("stock") ||
      selected.has("investments") ||
      selected.has("kareegar");

    if (!hasParent && !selected.has("whatsapp")) {
      return {
        disabled: true,
        reason: "Requires base parent module",
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

export default function SubscriptionsPage() {
  const [activePlanType, setActivePlanType] = useState("BASIC");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferPlan, setTransferPlan] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [destinationPlanId, setDestinationPlanId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const [expandedPlanId, setExpandedPlanId] = useState(null);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/subscriptions/plans`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Unable to load plans (HTTP ${response.status}).`
        );
      }

      const data = await response.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Subscription load error:", err);
      setError(err?.message || "Unable to load subscription plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const visiblePlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesType = plan.main_plan === activePlanType;
      const matchesSearch =
        !query ||
        plan.name?.toLowerCase().includes(query) ||
        plan.description?.toLowerCase().includes(query);

      return matchesType && matchesSearch;
    });
  }, [plans, activePlanType, search]);

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({ ...EMPTY_PLAN, main_plan: activePlanType });
    setShowPlanModal(true);
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name || "",
      description: plan.description || "",
      main_plan: plan.main_plan || "BASIC",
      monthly_price: plan.monthly_price ?? "",
      annual_price: plan.annual_price ?? "",
      currency: plan.currency || "INR",
      modules:
        plan.modules?.map((m) =>
          typeof m === "string" ? m : m.module_key || m.key
        ) || [],
    });
    setShowPlanModal(true);
  };

  const closePlanModal = () => {
    setShowPlanModal(false);
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN);
  };

  const changeMainPlan = (value) => {
    setPlanForm((prev) => ({
      ...prev,
      main_plan: value,
      modules: normalizeModules(prev.modules, value),
    }));
  };

  const toggleModule = (moduleKey) => {
    const state = getModuleState(
      moduleKey,
      planForm.modules,
      planForm.main_plan
    );

    if (state.disabled) return;

    const current = new Set(planForm.modules);
    if (current.has(moduleKey)) {
      current.delete(moduleKey);
    } else {
      current.add(moduleKey);
    }

    setPlanForm((prev) => ({
      ...prev,
      modules: normalizeModules(Array.from(current), prev.main_plan),
    }));
  };

  const savePlan = async () => {
    if (!planForm.name.trim()) {
      alert("Please provide a plan name.");
      return;
    }

    const monthlyPrice = Number(planForm.monthly_price);
    const annualPrice = Number(planForm.annual_price);

    if (
      planForm.monthly_price === "" ||
      !Number.isFinite(monthlyPrice) ||
      monthlyPrice < 0
    ) {
      alert("Please enter a valid monthly price.");
      return;
    }

    if (
      planForm.annual_price === "" ||
      !Number.isFinite(annualPrice) ||
      annualPrice < 0
    ) {
      alert("Please enter a valid annual price.");
      return;
    }

    const payload = {
      name: planForm.name.trim(),
      description: planForm.description.trim() || null,
      main_plan: planForm.main_plan.trim().toUpperCase(),
      monthly_price: monthlyPrice,
      annual_price: annualPrice,
      currency: planForm.currency.trim().toUpperCase(),
      modules: planForm.modules.map((key) => {
        const m = MODULES.find((item) => item.key === key);
        return {
          module_key: key,
          module_name: m?.name || key,
        };
      }),
    };

    try {
      const url = editingPlan
        ? `${API_URL}/subscriptions/plans/${editingPlan.id}`
        : `${API_URL}/subscriptions/plans`;

      const response = await fetch(url, {
        method: editingPlan ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Unable to save subscription plan.");
      }

      closePlanModal();
      await fetchSubscriptionData();
    } catch (err) {
      alert(err?.message || "Unable to save plan.");
    }
  };

  const deletePlan = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;

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
        throw new Error(data.detail || "Unable to delete plan.");
      }

      await fetchSubscriptionData();
    } catch (err) {
      alert(err?.message || "Unable to delete plan.");
    }
  };

  const openTransferModal = (plan, client) => {
    setTransferPlan(plan);
    setSelectedClient(client);
    setDestinationPlanId("");
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    if (transferLoading) return;
    setShowTransferModal(false);
    setTransferPlan(null);
    setSelectedClient(null);
    setDestinationPlanId("");
  };

  const assignClientToPlan = async () => {
    if (!selectedClient || !transferPlan || !destinationPlanId) return;

    const destinationPlan = plans.find(
      (p) => Number(p.id) === Number(destinationPlanId)
    );

    if (!destinationPlan) {
      alert("Select a target plan.");
      return;
    }

    if (Number(destinationPlan.id) === Number(transferPlan.id)) {
      alert("Client is already assigned to this plan.");
      return;
    }

    if (
      !window.confirm(
        `Transfer "${selectedClient.business_name}" to "${destinationPlan.name}"?`
      )
    ) {
      return;
    }

    setTransferLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/subscriptions/client-subscriptions/${selectedClient.client_id}/change-plan`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription_plan_id: destinationPlan.id,
            billing_cycle: selectedClient.billing_cycle || "monthly",
            effective_date: new Date().toISOString().slice(0, 10),
            reason: `Migrated from ${transferPlan.name} to ${destinationPlan.name}`,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Transfer rejected by server.");
      }

      closeTransferModal();
      await fetchSubscriptionData();
      setExpandedPlanId(destinationPlan.id);
    } catch (err) {
      alert(err?.message || "Plan transfer failed.");
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#F8FAFC] font-sans text-slate-900 antialiased select-none">
      
      {/* ============================================================
          1. HEADER COMMAND BAR
      ============================================================ */}
      <header className="shrink-0 border-b border-slate-200/80 bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-800 shadow-2xs">
              <Layers size={16} strokeWidth={2.2} />
            </div>

            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-tight text-slate-950">
                Subscription Architect
              </h1>
              <p className="text-[10.5px] font-mono text-slate-400">
                Manage commercial tiers, licensing matrix, and client allocations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSubscriptionData}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
              title="Sync catalog"
            >
              <RefreshCw
                size={13}
                className={loading ? "animate-spin text-slate-900" : "text-slate-400"}
              />
            </button>

            <button
              type="button"
              onClick={openCreatePlan}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-black active:scale-[0.98]"
            >
              <Plus size={14} strokeWidth={2.4} />
              <span>Create Plan</span>
            </button>
          </div>
        </div>

        {/* Tier Switcher Strip */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-[#FAFAFA] px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 py-2">
            <button
              type="button"
              onClick={() => {
                setActivePlanType("BASIC");
                setSearch("");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                activePlanType === "BASIC"
                  ? "border border-slate-300 bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Package size={13} />
              <span>BASIC TIERS</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                {plans.filter((p) => p.main_plan === "BASIC").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePlanType("PRO");
                setSearch("");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                activePlanType === "PRO"
                  ? "border border-slate-300 bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>PRO & ADVANCED</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                {plans.filter((p) => p.main_plan === "PRO").length}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>CURRENCY: INR (₹)</span>
            <span>•</span>
            <span>AUTHORITATIVE CATALOG</span>
          </div>
        </div>
      </header>

      {/* ============================================================
          2. WORKSPACE CANVAS
      ============================================================ */}
      <main className={`min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${noScroll}`}>
        <div className="mx-auto max-w-7xl space-y-4">

          {/* Quick Filter Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plans by name or description..."
                className="h-8 w-full rounded-lg border border-slate-200/90 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
              />
            </div>

            <span className="text-[11px] font-mono text-slate-400 self-end sm:self-center">
              DISPLAYING {visiblePlans.length} {activePlanType} SCHEMAS
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-mono text-rose-800">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Catalog Load Failure</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Catalog Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : visiblePlans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Package size={26} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                No {activePlanType} Plans Defined
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                No tier matches this criteria. Create a schema to initialize client provisioning.
              </p>
              <button
                type="button"
                onClick={openCreatePlan}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-black transition-all"
              >
                <Plus size={13} />
                <span>Configure New Plan</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visiblePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  expanded={expandedPlanId === plan.id}
                  onToggleClients={() =>
                    setExpandedPlanId((curr) => (curr === plan.id ? null : plan.id))
                  }
                  onEdit={() => openEditPlan(plan)}
                  onDelete={() => deletePlan(plan)}
                  onTransferClient={openTransferModal}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ============================================================
          3. PLAN DEFINITION MODAL
      ============================================================ */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-xs p-4">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <div>
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900">
                  {editingPlan ? "Edit Subscription Tier" : "Define Subscription Tier"}
                </h2>
                <p className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                  Configure recurring rates and module authorization boundaries
                </p>
              </div>

              <button
                type="button"
                onClick={closePlanModal}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-800 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${noScroll}`}>
              
              {/* Core Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-600 mb-1">
                    Plan Display Name *
                  </label>
                  <input
                    value={planForm.name}
                    onChange={(e) =>
                      setPlanForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Abhinava Gold Enterprise"
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-600 mb-1">
                    Base Tier Classification
                  </label>
                  <select
                    value={planForm.main_plan}
                    onChange={(e) => changeMainPlan(e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 font-mono"
                  >
                    <option value="BASIC">Basic Standard Tier</option>
                    <option value="PRO">Pro & Advanced Tier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-600 mb-1">
                    Currency Token
                  </label>
                  <input
                    value={planForm.currency}
                    maxLength={3}
                    onChange={(e) =>
                      setPlanForm((prev) => ({
                        ...prev,
                        currency: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono uppercase text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-600 mb-1">
                    Description & Target User
                  </label>
                  <input
                    value={planForm.description}
                    onChange={(e) =>
                      setPlanForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Short summary of this commercial tier..."
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Recurring Rate Configuration (₹)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 mb-1">
                      Monthly Cycle
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={planForm.monthly_price}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          monthly_price: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 mb-1">
                      Annual Lump Sum
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={planForm.annual_price}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          annual_price: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Module Entitlement Toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Compiled Capabilities ({planForm.modules.length} Selected)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODULES.map((m) => {
                    const state = getModuleState(
                      m.key,
                      planForm.modules,
                      planForm.main_plan
                    );
                    const isChecked = planForm.modules.includes(m.key);
                    const MIcon = m.icon;

                    return (
                      <div
                        key={m.key}
                        onClick={() => toggleModule(m.key)}
                        className={`group flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                          state.disabled
                            ? "border-slate-200/60 bg-slate-50/60 cursor-not-allowed opacity-65"
                            : isChecked
                            ? "border-slate-300 bg-white shadow-2xs cursor-pointer hover:border-slate-400"
                            : "border-slate-200/80 bg-white cursor-pointer hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isChecked
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check size={10} strokeWidth={3} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <MIcon size={12} className="text-slate-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {m.name}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                            {m.description}
                          </p>

                          {state.reason && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono text-slate-400 font-semibold">
                              <Lock size={9} />
                              <span>{state.reason}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
              <button
                type="button"
                onClick={closePlanModal}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePlan}
                className="h-8 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-black shadow-xs active:scale-[0.98] transition-all"
              >
                {editingPlan ? "Update Plan" : "Publish Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          4. CLIENT TRANSFER MODAL
      ============================================================ */}
      {showTransferModal && selectedClient && transferPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={14} className="text-slate-600" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900">
                  Migrate Client Allocation
                </h3>
              </div>
              <button
                type="button"
                onClick={closeTransferModal}
                disabled={transferLoading}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200/90 bg-[#FAFAFA] p-3 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Target Tenant
                </span>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {selectedClient.business_name}
                </p>
                <p className="text-[10.5px] font-mono text-slate-500">
                  ID: #{selectedClient.client_id} • Cadence: {selectedClient.billing_cycle || "Monthly"}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-bold uppercase text-slate-600">
                  Destination Plan Schema
                </label>
                <select
                  value={destinationPlanId}
                  onChange={(e) => setDestinationPlanId(e.target.value)}
                  disabled={transferLoading}
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 font-mono outline-none focus:border-slate-400"
                >
                  <option value="">Select an active plan...</option>
                  {plans
                    .filter((p) => p.is_active && Number(p.id) !== Number(transferPlan.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.main_plan}) — ₹{Number(p.monthly_price).toLocaleString("en-IN")}/mo
                      </option>
                    ))}
                </select>
              </div>

              <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 p-2.5 text-[10.5px] text-amber-800 leading-relaxed font-mono">
                Existing billing frequencies will be preserved. The new plan's module entitlement matrix will apply on submit.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
              <button
                type="button"
                onClick={closeTransferModal}
                disabled={transferLoading}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={assignClientToPlan}
                disabled={transferLoading || !destinationPlanId}
                className="h-8 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-black shadow-xs transition-all disabled:opacity-50"
              >
                {transferLoading ? "Migrating..." : "Execute Migration"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ============================================================
   PLAN CARD COMPONENT (COMPACT ARCHITECTURAL DOSSIER)
============================================================ */

function PlanCard({
  plan,
  expanded,
  onToggleClients,
  onEdit,
  onDelete,
  onTransferClient,
}) {
  const modules =
    plan.modules?.map((m) => {
      const key = typeof m === "string" ? m : m.module_key || m.key;
      const found = MODULES.find((item) => item.key === key);
      return (
        found || {
          key,
          name: typeof m === "string" ? m : m.module_name || m.name || key,
        }
      );
    }) || [];

  const assignedClients = Array.isArray(plan.assigned_clients)
    ? plan.assigned_clients
    : [];

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all overflow-hidden">
      
      {/* Top Header Strip */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-950 truncate tracking-tight">
              {plan.name}
            </h2>
            <span
              className={`rounded border px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider ${
                plan.main_plan === "PRO"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {plan.main_plan}
            </span>
          </div>

          <p className="mt-1 text-[11px] text-slate-500 leading-snug line-clamp-1">
            {plan.description || "Production tier without description"}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 shadow-2xs transition-colors"
            title="Edit configuration"
          >
            <Pencil size={11} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-2xs transition-colors"
            title="Delete plan"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Pricing Ticker */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-white p-3 font-mono text-xs">
        <div className="pr-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Monthly Rate
          </span>
          <span className="text-sm font-bold text-slate-900 mt-0.5 block">
            ₹{Number(plan.monthly_price || 0).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="pl-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Annual Commitment
          </span>
          <span className="text-sm font-bold text-slate-900 mt-0.5 block">
            ₹{Number(plan.annual_price || 0).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Module Pill Cluster */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Included Capabilities
          </span>
          <span className="text-[10px] font-mono text-slate-500 font-semibold">
            {modules.length} MODULES
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {modules.map((m) => (
            <span
              key={m.key}
              className="inline-flex items-center gap-1 rounded border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] font-mono text-slate-700 shadow-2xs"
            >
              <Check size={9} className="text-emerald-600" />
              <span>{m.name}</span>
            </span>
          ))}
          {modules.length === 0 && (
            <span className="text-[10.5px] font-mono text-slate-400 italic">
              Baseline core system only
            </span>
          )}
        </div>
      </div>

      {/* Assigned Clients Drawer */}
      <div className="p-3 bg-white">
        <button
          type="button"
          onClick={onToggleClients}
          className="flex w-full items-center justify-between text-xs font-mono text-slate-600 hover:text-slate-900"
        >
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-slate-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold">
              Active Tenants:
            </span>
            <span className="font-bold text-slate-900">
              {assignedClients.length}
            </span>
          </div>

          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {expanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
            {assignedClients.length === 0 ? (
              <p className="text-[10.5px] font-mono text-slate-400 text-center py-2">
                No client ledgers bound to this plan.
              </p>
            ) : (
              <div className={`max-h-40 overflow-y-auto space-y-1.5 ${noScroll}`}>
                {assignedClients.map((c) => (
                  <div
                    key={c.subscription_id || c.client_id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-[#FAFAFA] px-2.5 py-1.5 text-xs font-mono"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-bold text-slate-900 truncate">
                        {c.business_name}
                      </p>
                      <p className="text-[9.5px] text-slate-400">
                        #{c.client_id} • {c.billing_cycle || "monthly"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onTransferClient(plan, c)}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[9.5px] font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 shrink-0"
                    >
                      <ArrowRightLeft size={9} />
                      <span>Migrate</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}