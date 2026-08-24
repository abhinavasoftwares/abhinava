import { useEffect, useState } from "react";
import { 
  Loader2, 
  Save, 
  X, 
  UserRound, 
  Hammer, 
  Activity 
} from "lucide-react";

const INITIAL_FORM = {
  name: "",
  workType: "B2J",
  status: "ACTIVE",
};

export default function KareegarEmployeeForm({
  employee = null,
  saving = false,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || "",
        workType: employee.workType || "B2J",
        status: employee.status || "ACTIVE",
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [employee]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    await onSubmit({
      ...form,
      name: form.name.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col rounded-[2rem] border border-[#E2E8E4] bg-white p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] transition-all animate-in fade-in zoom-in-95 duration-300"
    >
      {/* ==================================================
          HEADER
      ================================================== */}
      <div className="mb-8 flex items-start justify-between border-b border-[#E2E8E4]/60 pb-5">
        <div>
          <h2 className="text-lg font-bold text-[#1B241E]">
            {employee ? "Edit Goldsmith Profile" : "Add New Goldsmith"}
          </h2>
          <p className="mt-1 text-xs font-medium text-[#68786D]">
            Configure the directory details and authorized workflow type.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent text-[#87968C] transition-colors hover:border-[#E2E8E4] hover:bg-[#F5F7F5] hover:text-[#1B241E]"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ==================================================
          FORM GRID
      ================================================== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* 1. NAME */}
        <div className="space-y-1.5 md:col-span-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
            <UserRound size={12} /> Goldsmith Name
            <span className="text-rose-500">*</span>
          </label>
          <div className="flex overflow-hidden rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] transition-all focus-within:border-[#345343] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#345343]">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              disabled={saving}
              required
              className="w-full bg-transparent px-4 py-3 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA] disabled:opacity-60"
            />
          </div>
        </div>

        {/* 2. WORK TYPE */}
        <div className="space-y-1.5 md:col-span-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
            <Hammer size={12} /> Work Type
          </label>
          <div className="relative">
            <select
              name="workType"
              value={form.workType}
              onChange={handleChange}
              disabled={saving}
              className="w-full appearance-none rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] px-4 py-3 text-sm font-semibold text-[#1B241E] outline-none transition focus:border-[#345343] focus:bg-white disabled:opacity-60"
            >
              <option value="B2B">B2B Production</option>
              <option value="B2J">Retail / Job Work (B2J)</option>
              <option value="BOTH">Both (B2B & Retail)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#87968C]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. STATUS */}
        <div className="space-y-1.5 md:col-span-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
            <Activity size={12} /> Status
          </label>
          <div className="relative">
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={saving}
              className={`w-full appearance-none rounded-xl border border-[#E2E8E4] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#345343] disabled:opacity-60 ${
                form.status === "ACTIVE" 
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200/60" 
                  : "bg-rose-50 text-rose-900 border-rose-200/60"
              }`}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive / Suspended</option>
            </select>
            <div className={`pointer-events-none absolute inset-y-0 right-4 flex items-center ${form.status === "ACTIVE" ? "text-emerald-700" : "text-rose-700"}`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* ==================================================
          ACTIONS
      ================================================== */}
      <div className="mt-8 flex justify-end gap-3 border-t border-[#E2E8E4]/60 pt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-[#E2E8E4] bg-white px-6 py-2.5 text-xs font-bold text-[#68786D] transition-colors hover:bg-[#F5F7F5] hover:text-[#1B241E] disabled:opacity-60"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={saving}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 ${
            saving 
              ? "bg-[#87968C] cursor-not-allowed opacity-60" 
              : "bg-[#345343] hover:bg-[#1B241E] hover:shadow-md hover:-translate-y-0.5"
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              {employee ? "Update Profile" : "Save Goldsmith"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}