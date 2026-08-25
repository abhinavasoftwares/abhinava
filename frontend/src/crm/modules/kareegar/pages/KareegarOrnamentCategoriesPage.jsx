import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Tags,
  Sparkles
} from "lucide-react";

import { useKareegarOrnamentCategories } from "../hooks/useKareegarOrnamentCategories";

export default function KareegarOrnamentCategoriesPage() {
  const {
    categories,
    loading,
    saving,
    error,
    addCategory,
    setCategoryStatus,
  } = useKareegarOrnamentCategories();

  const [name, setName] = useState("");
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
      setToast({ type: "error", message: "Enter an ornament category." });
      return;
    }

    try {
      await addCategory(trimmedName);
      setName("");
      setToast({ type: "success", message: "Ornament category added." });
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
        message: nextStatus === "ACTIVE" ? "Category enabled." : "Category disabled.",
      });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to update category." });
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-white p-4 pb-12 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      {/* ==================================================
          TOAST NOTIFICATION
      ================================================== */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-6 duration-300 ${
          toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
          <span className="text-sm font-bold tracking-wide">{toast.message}</span>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 animate-in fade-in duration-500">

        {/* ==================================================
            HEADER
        ================================================== */}
        <div className="border-b border-[#E2E8E4]/60 pb-5">
          <div className="mb-2 flex items-center gap-2 text-[#345343]">
            <Sparkles size={18} />
            <h1 className="text-xl font-bold tracking-tight text-[#1B241E] sm:text-2xl">
              Ornament Categories
            </h1>
          </div>
          <p className="max-w-2xl text-xs font-medium leading-relaxed text-[#68786D]">
            Manage the standardized list of ornament categories available for goldsmith returns and job-work processing.
          </p>
        </div>

        {/* ==================================================
            ADD CATEGORY FORM
        ================================================== */}
        <div className="flex flex-col rounded-[2rem] border border-[#E2E8E4] bg-white p-6 sm:p-8 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-[#1B241E]">Add New Category</h2>
          <p className="mt-1 text-xs font-medium text-[#68786D]">Create a new classification for returned ornaments.</p>

          <form onSubmit={handleAdd} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 flex overflow-hidden rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] transition-all focus-within:border-[#345343] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#345343]/20">
              <div className="flex w-12 items-center justify-center text-[#87968C]">
                <Tags size={16} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ring, Chain, Bangle..."
                disabled={saving}
                className="w-full bg-transparent py-3.5 pr-4 text-sm font-bold text-[#1B241E] outline-none placeholder:text-[#A3B0AA] placeholder:font-semibold disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#345343] px-8 py-3.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1B241E] hover:shadow-md hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#87968C] disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2.5} />}
              Add Category
            </button>
          </form>

          {error && <p className="mt-4 text-xs font-bold text-rose-600">{error}</p>}
        </div>

        {/* ==================================================
            CATEGORY LIST
        ================================================== */}
        <div className="flex flex-col overflow-hidden rounded-[2rem] border border-[#E2E8E4] bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)]">
          
          <div className="flex items-center justify-between border-b border-[#E2E8E4]/60 bg-[#F5F7F5]/30 px-6 py-5 sm:px-8">
            <div>
              <h2 className="text-sm font-bold text-[#1B241E]">Configured Categories</h2>
              <p className="mt-1 text-[11px] font-medium text-[#87968C]">
                Disabled categories are hidden from new returns but retained for historical data integrity.
              </p>
            </div>
            <span className="flex items-center justify-center rounded-full bg-white border border-[#E2E8E4] px-3 py-1 text-[10px] font-bold text-[#68786D] shadow-sm">
              {categories.length} Total
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16">
              <Loader2 size={32} className="animate-spin text-[#345343]" />
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#87968C]">Loading Categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F7F5] text-[#87968C]">
                <Tags size={28} />
              </div>
              <h3 className="text-base font-bold text-[#1B241E]">No Categories Found</h3>
              <p className="mt-1.5 max-w-sm text-xs font-medium text-[#68786D] leading-relaxed">
                Your ornament category list is empty. Add your first category above to enable return processing.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#E2E8E4]/60">
              {categories.map((category) => {
                const isActive = category.status === "ACTIVE";

                return (
                  <div key={category.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[#F5F7F5]/40 sm:px-8">
                    
                    <div>
                      <p className={`text-sm font-bold transition-colors ${isActive ? "text-[#1B241E]" : "text-[#87968C]"}`}>
                        {category.name}
                      </p>
                      <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isActive ? "border-emerald-200/60 bg-emerald-50 text-emerald-700" : "border-[#E2E8E4] bg-white text-[#87968C]"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-[#A3B0AA]"}`} />
                        {category.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleStatusChange(category)}
                      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-bold transition-all disabled:opacity-50 ${
                        isActive
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <PowerOff size={14} /> Disable
                        </>
                      ) : (
                        <>
                          <Power size={14} /> Enable
                        </>
                      )}
                    </button>
                    
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}