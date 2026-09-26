import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Tags,
  ArrowLeft,
  X,
  Search,
  Gem,
  Scale,
  Hammer,
  Shapes,
  Calculator,
  Layers,
} from "lucide-react";

import { crmPath } from "../../../utils/crmRoutes";
import { useKareegarOrnamentCategories } from "../hooks/useKareegarOrnamentCategories";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function KareegarOrnamentCategoriesPage() {
  const navigate = useNavigate();
  const {
    categories,
    loading,
    saving,
    error,
    addCategory,
    setCategoryStatus,
  } = useKareegarOrnamentCategories();

  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleAdd = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setToast({ type: "error", message: "Enter an ornament category name." });
      return;
    }

    try {
      await addCategory(trimmedName);
      setName("");
      setToast({ type: "success", message: `Category "${trimmedName}" added.` });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to add category." });
    }
  };

  const handleStatusChange = async (category) => {
    const nextStatus = category.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await setCategoryStatus(category.id, nextStatus);
      setToast({
        type: "success",
        message: nextStatus === "ACTIVE" ? "Category activated." : "Category disabled.",
      });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to update status." });
    }
  };

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((c) =>
      c.name?.toLowerCase().includes(query)
    );
  }, [categories, search]);

  const activeCount = categories.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      {/* Background Craftsmanship Doodles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        <div className="absolute -top-10 -left-8 text-slate-900/[0.035] rotate-[-12deg]">
          <Scale size={160} strokeWidth={1.1} />
        </div>
        <div className="absolute -top-12 -right-10 text-slate-900/[0.035] rotate-[22deg]">
          <Hammer size={170} strokeWidth={1.1} />
        </div>
        <div className="absolute top-1/3 -left-8 text-slate-900/[0.025] rotate-[15deg]">
          <Gem size={130} strokeWidth={1.2} />
        </div>
        <div className="absolute bottom-24 -right-6 text-slate-900/[0.03] rotate-[-22deg]">
          <Shapes size={140} strokeWidth={1.2} />
        </div>
        <div className="absolute -bottom-10 left-24 text-slate-900/[0.03] rotate-[10deg]">
          <Calculator size={140} strokeWidth={1.1} />
        </div>
      </div>

      {/* Floating Feedback Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border px-3 py-2 shadow-sm text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={14} className="text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-1 text-slate-400 hover:text-slate-600">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className="shrink-0 h-13 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-slate-900 uppercase font-mono truncate">
                Ornament Categories
              </h1>
              <span className="hidden sm:inline-flex rounded-md bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-600">
                {activeCount} Active / {categories.length} Total
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
              Standardized ornament classifications available for Kareegar B2J returns & jobs
            </p>
          </div>
        </div>
      </header>

      {/* Search & Add Strip */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 z-10">
        {/* Inline Create Input */}
        <form onSubmit={handleAdd} className="flex items-center gap-2 w-full md:max-w-md">
          <div className="relative flex-1">
            <Tags size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add category (e.g. Bangles, Chains, Rings)..."
              disabled={saving}
              className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-7.5 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-8 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 transition-all disabled:opacity-50 shadow-2xs shrink-0"
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} strokeWidth={2.5} />
            )}
            <span>Add</span>
          </button>
        </form>

        {/* Live Filter Search */}
        <div className="relative w-full md:w-56 shrink-0">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter categories..."
            className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-7 pr-6 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white font-sans"
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
      </div>

      {/* Global Error Strip */}
      {error && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-200 px-4 py-1.5 text-xs font-mono font-medium text-rose-700 flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* Main Ledger Workspace */}
      <main className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${noScroll} z-10`}>
        <div className="max-w-4xl mx-auto h-full flex flex-col space-y-2.5">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20 text-slate-500 space-y-1.5">
              <Loader2 size={18} className="animate-spin text-slate-700" />
              <span className="text-xs font-mono uppercase tracking-wider">
                Loading ornament taxonomy...
              </span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/80 p-10 text-center shadow-2xs backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                <Tags size={18} />
              </div>
              <h3 className="mt-2.5 text-xs font-semibold text-slate-900">
                No Ornament Categories Found
              </h3>
              <p className="mt-1 max-w-xs text-[11px] text-slate-500 leading-relaxed">
                {search
                  ? "No categories match your search filter."
                  : "Add your first classification above to start recording Kareegar returns."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
              {/* Table Subheader */}
              <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                <span>Category Name</span>
                <span>Enforcement & Status</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {filteredCategories.map((category) => {
                  const isActive = category.status === "ACTIVE";

                  return (
                    <div
                      key={category.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Identifier */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md bg-slate-50 border border-slate-200 text-slate-600">
                          <Shapes size={12} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${isActive ? "text-slate-900" : "text-slate-400 line-through"}`}>
                            {category.name}
                          </p>
                        </div>
                      </div>

                      {/* Status & Toggle Action */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider border ${
                            isActive
                              ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {category.status}
                        </span>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleStatusChange(category)}
                          className={`inline-flex h-6.5 items-center gap-1 rounded-md border px-2 text-[10px] font-mono font-medium transition-all disabled:opacity-50 ${
                            isActive
                              ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              : "border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <PowerOff size={10} />
                              <span>Disable</span>
                            </>
                          ) : (
                            <>
                              <Power size={10} />
                              <span>Enable</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Policy Footnote */}
          <div className="p-2 text-[10.5px] font-mono text-slate-400 text-center">
            Disabled categories are excluded from new return job-sheets while preserving historical ledger integrity.
          </div>
        </div>
      </main>
    </div>
  );
}