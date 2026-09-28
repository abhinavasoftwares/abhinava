import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Receipt,
  Trash2,
  Pencil,
  Lock,
  X,
  CheckCircle2,
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { getCrmFirestore } from "../../firebase";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

// ============================================================
// COLLECTIONS
// ============================================================

const RECEIPT_SERIES_COLLECTION = "receiptSeries";
const INVESTMENT_SCHEMES_COLLECTION = "investmentSchemes";

// ============================================================
// MODULES
// ============================================================

const MODULES = [
  {
    id: "SALES",
    label: "Sales",
  },
  {
    id: "INVESTMENTS",
    label: "Investments",
  },
];

// ============================================================
// EMPTY FORM
// ============================================================

const EMPTY_FORM = {
  name: "",
  prefix: "",
  startingNumber: "1",
  modules: [],
  applicableSchemes: [],
};

// ============================================================
// HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
}

function getSchemeName(scheme) {
  return (
    scheme?.schemeName ||
    scheme?.name ||
    scheme?.title ||
    "Unnamed Scheme"
  );
}

function getSchemeCode(scheme) {
  return scheme?.schemeCode || scheme?.code || "";
}

function getSchemeStatus(scheme) {
  return String(scheme?.status || "ACTIVE").toUpperCase();
}

function formatReceiptNumber(prefix, number) {
  return `${prefix}${String(number).padStart(5, "0")}`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ReceiptSeriesSettings() {
  const db = getCrmFirestore();

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [series, setSeries] = useState([]);
  const [investmentSchemes, setInvestmentSchemes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [schemesLoading, setSchemesLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState(null);

  const [toast, setToast] = useState(null);

  const [saving, setSaving] = useState(false);

  // ----------------------------------------------------------
  // LOAD RECEIPT SERIES
  // ----------------------------------------------------------

  useEffect(() => {
    loadReceiptSeries();
    loadInvestmentSchemes();
  }, []);

  async function loadReceiptSeries() {
    try {
      setLoading(true);

      const ref = collection(db, RECEIPT_SERIES_COLLECTION);
      const q = query(ref, orderBy("createdAt", "asc"));

      const snapshot = await getDocs(q);

      const rows = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setSeries(rows);
    } catch (error) {
      console.error("Failed to load receipt series:", error);

      setToast({
        type: "error",
        message: error?.message || "Failed to load receipt series.",
      });
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------------
  // LOAD INVESTMENT SCHEMES
  // ----------------------------------------------------------

  async function loadInvestmentSchemes() {
    try {
      setSchemesLoading(true);

      const ref = collection(db, INVESTMENT_SCHEMES_COLLECTION);
      const snapshot = await getDocs(ref);

      const rows = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((scheme) => getSchemeStatus(scheme) === "ACTIVE")
        .sort((a, b) =>
          getSchemeName(a).localeCompare(getSchemeName(b))
        );

      setInvestmentSchemes(rows);
    } catch (error) {
      console.error("Failed to load investment schemes:", error);

      setToast({
        type: "error",
        message: error?.message || "Failed to load investment schemes.",
      });
    } finally {
      setSchemesLoading(false);
    }
  }

  // ----------------------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------------------

  const hasAll = form.modules.includes("ALL");

  const hasInvestments = form.modules.includes("INVESTMENTS");

  const selectedSchemeCount = form.applicableSchemes.length;

  const activeInvestmentSchemes = investmentSchemes;

  const total = series.length;

  const activeCount = useMemo(
    () => series.filter((item) => item.status === "ACTIVE").length,
    [series]
  );

  // ----------------------------------------------------------
  // MODULE TOGGLE
  // ----------------------------------------------------------

  const toggleModule = (moduleId) => {
    setForm((current) => {
      // ALL MODULES
      if (moduleId === "ALL") {
        const selectingAll = !current.modules.includes("ALL");

        return {
          ...current,
          modules: selectingAll ? ["ALL"] : [],
          applicableSchemes: [],
        };
      }

      // NORMAL MODULE
      const withoutAll = current.modules.filter((item) => item !== "ALL");

      if (withoutAll.includes(moduleId)) {
        const nextModules = withoutAll.filter((item) => item !== moduleId);

        return {
          ...current,
          modules: nextModules,
          applicableSchemes:
            moduleId === "INVESTMENTS" ? [] : current.applicableSchemes,
        };
      }

      return {
        ...current,
        modules: [...withoutAll, moduleId],
      };
    });
  };

  // ----------------------------------------------------------
  // SCHEME TOGGLE
  // ----------------------------------------------------------

  const toggleScheme = (schemeId) => {
    setForm((current) => {
      const alreadySelected = current.applicableSchemes.includes(schemeId);

      return {
        ...current,
        applicableSchemes: alreadySelected
          ? current.applicableSchemes.filter((id) => id !== schemeId)
          : [...current.applicableSchemes, schemeId],
      };
    });
  };

  // ----------------------------------------------------------
  // SELECT ALL SCHEMES
  // ----------------------------------------------------------

  const selectAllSchemes = () => {
    setForm((current) => ({
      ...current,
      applicableSchemes: activeInvestmentSchemes.map((scheme) => scheme.id),
    }));
  };

  // ----------------------------------------------------------
  // CLEAR ALL SCHEMES
  // ----------------------------------------------------------

  const clearAllSchemes = () => {
    setForm((current) => ({
      ...current,
      applicableSchemes: [],
    }));
  };

  // ----------------------------------------------------------
  // OPEN CREATE
  // ----------------------------------------------------------

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  // ----------------------------------------------------------
  // OPEN EDIT
  // ----------------------------------------------------------

  const openEdit = (item) => {
    if (Number(item.usageCount || 0) > 0) {
      return;
    }

    setEditingId(item.id);

    setForm({
      name: item.name || "",
      prefix: item.prefix || "",
      startingNumber: String(item.nextNumber || 1),
      modules: Array.isArray(item.modules) ? item.modules : [],
      applicableSchemes: Array.isArray(item.applicableSchemes)
        ? item.applicableSchemes
        : [],
    });

    setShowForm(true);
  };

  // ----------------------------------------------------------
  // CLOSE FORM
  // ----------------------------------------------------------

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  // ----------------------------------------------------------
  // VALIDATE
  // ----------------------------------------------------------

  const validateForm = () => {
    const name = clean(form.name);
    const prefix = clean(form.prefix);
    const startingNumber = Number(form.startingNumber);

    if (!name) {
      throw new Error("Enter a receipt series name.");
    }

    if (!prefix) {
      throw new Error("Enter a receipt prefix.");
    }

    if (!Number.isInteger(startingNumber) || startingNumber < 1) {
      throw new Error("Starting number must be a valid positive number.");
    }

    if (form.modules.length === 0) {
      throw new Error("Select at least one module.");
    }

    if (
      form.modules.includes("INVESTMENTS") &&
      !form.modules.includes("ALL") &&
      form.applicableSchemes.length === 0
    ) {
      throw new Error(
        "Select at least one investment scheme for this receipt series."
      );
    }

    return {
      name,
      prefix,
      startingNumber,
    };
  };

  // ----------------------------------------------------------
  // CHECK SCHEME CONFLICT
  // ----------------------------------------------------------

  const findSchemeConflict = () => {
    if (
      !form.modules.includes("INVESTMENTS") ||
      form.modules.includes("ALL")
    ) {
      return null;
    }

    const selectedSchemes = new Set(form.applicableSchemes);

    for (const item of series) {
      if (item.id === editingId) {
        continue;
      }

      if (item.status !== "ACTIVE") {
        continue;
      }

      if (
        !Array.isArray(item.modules) ||
        !item.modules.includes("INVESTMENTS")
      ) {
        continue;
      }

      const existingSchemes = Array.isArray(item.applicableSchemes)
        ? item.applicableSchemes
        : [];

      const conflict = existingSchemes.some((schemeId) =>
        selectedSchemes.has(schemeId)
      );

      if (conflict) {
        const conflictSchemeId = existingSchemes.find((schemeId) =>
          selectedSchemes.has(schemeId)
        );

        const scheme = investmentSchemes.find(
          (item) => item.id === conflictSchemeId
        );

        return {
          series: item,
          scheme,
        };
      }
    }

    return null;
  };

  // ----------------------------------------------------------
  // CREATE / UPDATE
  // ----------------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    try {
      setSaving(true);

      const { name, prefix, startingNumber } = validateForm();

      const conflict = findSchemeConflict();

      if (conflict) {
        throw new Error(
          `Scheme "${getSchemeName(
            conflict.scheme
          )}" is already assigned to receipt series "${conflict.series.name}".`
        );
      }

      // EDIT
      if (editingId) {
        const ref = doc(db, RECEIPT_SERIES_COLLECTION, editingId);

        await updateDoc(ref, {
          name,
          prefix,
          modules: form.modules,
          applicableSchemes:
            form.modules.includes("INVESTMENTS") &&
            !form.modules.includes("ALL")
              ? form.applicableSchemes
              : [],
          updatedAt: serverTimestamp(),
        });

        setToast({
          type: "success",
          message: "Receipt series updated successfully.",
        });
      }
      // CREATE
      else {
        const ref = collection(db, RECEIPT_SERIES_COLLECTION);

        await addDoc(ref, {
          name,
          prefix,
          nextNumber: startingNumber,
          usageCount: 0,
          modules: form.modules,
          applicableSchemes:
            form.modules.includes("INVESTMENTS") &&
            !form.modules.includes("ALL")
              ? form.applicableSchemes
              : [],
          status: "ACTIVE",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setToast({
          type: "success",
          message: "Receipt series created successfully.",
        });
      }

      await loadReceiptSeries();
      closeForm();
    } catch (error) {
      console.error("Receipt series save error:", error);

      setToast({
        type: "error",
        message: error?.message || "Failed to save receipt series.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DISABLE
  // ----------------------------------------------------------

  const disableSeries = async (item) => {
    if (!item?.id) return;

    try {
      const ref = doc(db, RECEIPT_SERIES_COLLECTION, item.id);

      await updateDoc(ref, {
        status: "DISABLED",
        updatedAt: serverTimestamp(),
      });

      setToast({
        type: "success",
        message: "Receipt series disabled.",
      });

      await loadReceiptSeries();
    } catch (error) {
      console.error("Failed to disable receipt series:", error);

      setToast({
        type: "error",
        message: error?.message || "Failed to disable receipt series.",
      });
    }
  };

  // ----------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------

  const deleteSeries = async (item) => {
    if (!item?.id) return;

    if (Number(item.usageCount || 0) > 0) {
      setToast({
        type: "error",
        message: "Used receipt series cannot be deleted.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Delete receipt series "${item.name}"?`
    );

    if (!confirmed) return;

    try {
      const ref = doc(db, RECEIPT_SERIES_COLLECTION, item.id);

      await deleteDoc(ref);

      setToast({
        type: "success",
        message: "Receipt series deleted.",
      });

      await loadReceiptSeries();
    } catch (error) {
      console.error("Failed to delete receipt series:", error);

      setToast({
        type: "error",
        message: error?.message || "Failed to delete receipt series.",
      });
    }
  };

  // ----------------------------------------------------------
  // SCHEME LABEL
  // ----------------------------------------------------------

  const getSelectedSchemeNames = (item) => {
    const ids = Array.isArray(item?.applicableSchemes)
      ? item.applicableSchemes
      : [];

    return ids
      .map((id) => investmentSchemes.find((scheme) => scheme.id === id))
      .filter(Boolean);
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#F8FAFC] font-sans antialiased text-slate-900 select-none">
      
      {/* Scrollable Container */}
      <div className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 ${noScroll}`}>
        <div className="mx-auto max-w-6xl space-y-5">

          {/* ====================================================
              TOAST NOTIFICATION
          ==================================================== */}
          {toast && (
            <div
              className={`fixed bottom-6 right-6 z-[9999] flex max-w-md items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-150 ${
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="ml-2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* ====================================================
              HEADER
          ==================================================== */}
          <div className="flex flex-col gap-3 border-b border-slate-200/90 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-800 mt-0.5">
                <Receipt size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 uppercase font-mono truncate">
                    Receipt Series
                  </h1>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed max-w-2xl truncate sm:whitespace-normal">
                  Configure receipt numbering sequences and select which CRM modules and investment schemes can use each series.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-medium text-white hover:bg-slate-800 active:scale-[0.98] transition-all shadow-2xs shrink-0 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Receipt Series</span>
            </button>
          </div>

          {/* ====================================================
              SUMMARY METRIC CARDS (ALL 3 PRESERVED)
          ==================================================== */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                Total Series
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900 font-mono">
                {total}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                Active Series
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-700 font-mono">
                {activeCount}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-col justify-between min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                Governance Policy
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-700 leading-snug">
                Used series cannot be modified or deleted.
              </p>
            </div>
          </div>

          {/* ====================================================
              INLINE EXPANDABLE FORM (PRESERVED)
          ==================================================== */}
          {showForm && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="min-w-0 pr-2">
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 truncate">
                    {editingId ? "Edit Receipt Series" : "Create Receipt Series"}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                    Once a receipt from a series is generated, its numbering configuration becomes immutable.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-50 p-1 shrink-0"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* BASIC DETAILS */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field
                    label="Series Name"
                    value={form.name}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, name: value }))
                    }
                    placeholder="Investment Receipt"
                  />

                  <Field
                    label="Prefix"
                    value={form.prefix}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, prefix: value }))
                    }
                    placeholder="INV-"
                  />

                  <Field
                    label={editingId ? "Next Number" : "Starting Number"}
                    type="number"
                    value={form.startingNumber}
                    disabled={Boolean(editingId)}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        startingNumber: value,
                      }))
                    }
                    placeholder="1"
                  />
                </div>

                {/* LIVE RECEIPT PREVIEW */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                        Receipt Preview
                      </p>
                      <p className="mt-0.5 font-mono text-base font-bold text-slate-900 truncate">
                        {formatReceiptNumber(
                          clean(form.prefix) || "INV-",
                          Number(form.startingNumber) || 1
                        )}
                      </p>
                    </div>
                    <Receipt size={20} className="text-slate-300 shrink-0" />
                  </div>
                </div>

                {/* MODULE CHECKBOXES */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Modules Using This Series
                  </label>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <ModuleCheckbox
                      label="Sales"
                      checked={form.modules.includes("SALES")}
                      disabled={hasAll}
                      onChange={() => toggleModule("SALES")}
                    />

                    <ModuleCheckbox
                      label="Investments"
                      checked={form.modules.includes("INVESTMENTS")}
                      disabled={hasAll}
                      onChange={() => toggleModule("INVESTMENTS")}
                    />
                  </div>
                </div>

                {/* INVESTMENT SCHEME MAPPING CONTAINER */}
                {hasInvestments && !hasAll && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Receipt size={14} className="text-slate-700 shrink-0" />
                          <h3 className="text-xs font-bold text-slate-900">
                            Investment Schemes
                          </h3>
                          <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[9px] font-mono font-bold text-slate-800 shrink-0">
                            {selectedSchemeCount} / {activeInvestmentSchemes.length}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                          Select the investment schemes whose transactions should use this receipt series.
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllSchemes}
                          disabled={
                            schemesLoading ||
                            activeInvestmentSchemes.length === 0
                          }
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-mono font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
                        >
                          Select All
                        </button>

                        <button
                          type="button"
                          onClick={clearAllSchemes}
                          disabled={selectedSchemeCount === 0}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-mono font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* SCHEME TILES */}
                    <div>
                      {schemesLoading ? (
                        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-6">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 size={14} className="animate-spin text-slate-700" />
                            <span>Loading investment schemes...</span>
                          </div>
                        </div>
                      ) : activeInvestmentSchemes.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-center">
                          <p className="text-xs font-medium text-slate-600">
                            No active investment schemes found.
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Create an active investment scheme first.
                          </p>
                        </div>
                      ) : (
                        <div className={`grid grid-cols-1 gap-2 md:grid-cols-2 max-h-48 overflow-y-auto p-0.5 ${noScroll}`}>
                          {activeInvestmentSchemes.map((scheme) => {
                            const selected = form.applicableSchemes.includes(
                              scheme.id
                            );

                            return (
                              <label
                                key={scheme.id}
                                className={`group flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-all min-w-0 ${
                                  selected
                                    ? "border-slate-900 bg-white shadow-2xs font-semibold"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleScheme(scheme.id)}
                                  className="sr-only"
                                />

                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                    selected
                                      ? "border-slate-900 bg-slate-900 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {selected && <Check size={11} strokeWidth={3} />}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="truncate text-xs font-medium text-slate-900">
                                      {getSchemeName(scheme)}
                                    </p>
                                    {getSchemeCode(scheme) && (
                                      <span className="shrink-0 rounded bg-slate-100 px-1 py-0.2 font-mono text-[8px] font-bold text-slate-500">
                                        {getSchemeCode(scheme)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400">
                                    {scheme.id}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {selectedSchemeCount === 0 &&
                        !schemesLoading &&
                        activeInvestmentSchemes.length > 0 && (
                          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                            <p className="text-[10px] font-medium text-amber-800">
                              Select at least one scheme. Transactions for unselected schemes will not use this series.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* ALL MODULES BANNER */}
                {hasAll && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                    <p className="text-xs font-bold text-slate-900">
                      All Modules Selected
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">
                      This series is available to all supported modules. Investment scheme-specific mapping is not required for an All Modules series.
                    </p>
                  </div>
                )}

                {/* FORM ACTIONS */}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 shadow-2xs cursor-pointer"
                  >
                    {saving && <Loader2 size={12} className="animate-spin" />}
                    <span>{editingId ? "Save Changes" : "Create Series"}</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ====================================================
              CONFIGURED SERIES LIST (PRESERVED)
          ==================================================== */}
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                Configured Receipt Series
              </h2>
              <p className="mt-0.5 text-[10.5px] text-slate-500">
                Used series cannot be edited or deleted to preserve financial document integrity.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-14">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={15} className="animate-spin text-slate-700" />
                  <span>Loading receipt series...</span>
                </div>
              </div>
            ) : series.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt size={24} className="mx-auto text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  No receipt series configured
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Create your first receipt series to start numbering business documents.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {series.map((item) => {
                  const used = Number(item.usageCount || 0) > 0;
                  const selectedSchemes = getSelectedSchemeNames(item);

                  return (
                    <div key={item.id} className="flex flex-col gap-3 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        
                        {/* SERIES INFO */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-900 truncate">
                              {item.name}
                            </h3>

                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                item.status === "ACTIVE"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-slate-600">
                            <span className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5">
                              PREFIX: <span className="font-bold text-slate-900">{item.prefix}</span>
                            </span>
                            <span className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5">
                              NEXT: <span className="font-bold text-slate-900">{item.nextNumber}</span>
                            </span>
                            <span className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5">
                              USED: <span className="font-bold text-slate-900">{item.usageCount || 0}</span>
                            </span>
                          </div>

                          {/* MODULES TAGS */}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {(item.modules || []).map((module) => (
                              <span
                                key={module}
                                className="rounded bg-slate-100 border border-slate-200/80 px-2 py-0.5 text-[9px] font-mono font-bold text-slate-700"
                              >
                                {module === "ALL" ? "ALL MODULES" : module}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex shrink-0 items-center gap-1.5">
                          {used ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-mono text-slate-500">
                              <Lock size={11} /> Edit & Delete Disabled
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                              >
                                <Pencil size={11} />
                                <span>Edit</span>
                              </button>

                              {item.status === "ACTIVE" && (
                                <button
                                  type="button"
                                  onClick={() => disableSeries(item)}
                                  className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                                >
                                  Disable
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => deleteSeries(item)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-2xs"
                                title="Delete series"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>

                      </div>

                      {/* INVESTMENT SCHEME MAPPING TAGS */}
                      {Array.isArray(item.applicableSchemes) &&
                        item.applicableSchemes.length > 0 && (
                          <div className="rounded-lg border border-slate-200/70 bg-slate-50/50 p-2.5 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                  Bound Investment Schemes
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  This receipt series will automatically be used for transactions belonging to these schemes.
                                </p>
                              </div>

                              <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[9px] font-mono font-bold text-slate-700">
                                {selectedSchemes.length} schemes
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {selectedSchemes.map((scheme) => (
                                <span
                                  key={scheme.id}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-2xs"
                                >
                                  <Check size={10} className="text-emerald-600" />
                                  <span>{getSchemeName(scheme)}</span>
                                  {getSchemeCode(scheme) && (
                                    <span className="font-mono text-[8.5px] text-slate-400">
                                      ({getSchemeCode(scheme)})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

// ============================================================
// FIELD HELPER COMPONENT (PRESERVED)
// ============================================================

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-8 w-full rounded-md border border-slate-200 px-2.5 text-xs font-semibold outline-none transition-colors focus:border-slate-400 ${
          disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "bg-slate-50 focus:bg-white text-slate-900"
        }`}
      />
    </div>
  );
}

// ============================================================
// MODULE CHECKBOX HELPER COMPONENT (PRESERVED)
// ============================================================

function ModuleCheckbox({ label, checked, disabled, onChange }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all ${
        checked
          ? "border-slate-900 bg-white text-slate-900 font-semibold shadow-2xs"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="text-xs">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer"
      />
    </label>
  );
}