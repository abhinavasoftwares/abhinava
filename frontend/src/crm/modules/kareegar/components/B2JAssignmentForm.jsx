import { useState, useEffect } from "react";
import { Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { useKareegarEmployees } from "../hooks/useKareegarEmployees";
import { useKareegarAssignments } from "../hooks/useKareegarAssignments";
import { useKareegarCalculationConfig } from "../hooks/useKareegarCalculationConfig";
import { calculateB2CAssignment } from "../calculations/engine";

const PRESET_PURITY_VALUES = [91.7, 100, 83.5, 75];

// Highly compact input field
function InputField({ label, name, value, onChange, type = "text", unit = "", required = false, disabled = false, placeholder = "" }) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex overflow-hidden rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] transition-all focus-within:border-[#345343] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#345343]">
        <input type={type} name={name} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA] disabled:opacity-60" />
        {unit && <span className="flex items-center border-l border-[#E2E8E4] bg-white/50 px-3 text-xs font-bold text-[#68786D]">{unit}</span>}
      </div>
    </div>
  );
}

export default function B2JAssignmentForm({ onSuccess }) {
  const { employees, loading: employeesLoading } = useKareegarEmployees();
  const { addAssignment, saving, error } = useKareegarAssignments({ type: "B2J" });
  const { config, loading: configLoading } = useKareegarCalculationConfig();

  const [formData, setFormData] = useState({ employeeId: "", rawMaterialWeight: "", rawMaterialPurity: "", advanceCashPaid: "", remarks: "" });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) { const timer = setTimeout(() => setToast(null), 4000); return () => clearTimeout(timer); }
  }, [toast]);
  useEffect(() => { if (error) setToast({ type: "error", message: error }); }, [error]);

  const handleChange = (e) => setFormData((c) => ({ ...c, [e.target.name]: e.target.value }));
  const handlePuritySelect = (purity) => setFormData((c) => ({ ...c, rawMaterialPurity: purity }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId) return setToast({ type: "error", message: "Select Goldsmith." });
    const weight = Number(formData.rawMaterialWeight);
    const purity = Number(formData.rawMaterialPurity);
    
    if (!Number.isFinite(weight) || weight <= 0) return setToast({ type: "error", message: "Invalid weight." });
    if (!Number.isFinite(purity) || purity <= 0 || purity > 100) return setToast({ type: "error", message: "Invalid purity." });

    const calculation = calculateB2CAssignment({ rawMaterialWeight: weight, purity });
    const employee = employees.find((item) => item.id === formData.employeeId);

    try {
      await addAssignment({
        type: "B2J", employeeId: formData.employeeId, employeeName: employee?.name || "",
        rawMaterialWeight: weight, rawMaterialPurity: purity, effectiveGoldAssigned: calculation.effectiveGoldAssigned,
        advanceCashPaid: Number(formData.advanceCashPaid || 0), remarks: formData.remarks.trim(),
        calculationStrategyId: config?.b2c?.assignment?.strategyId || "KESHAVA_B2C_ASSIGNMENT_V1",
      });
      setFormData({ employeeId: "", rawMaterialWeight: "", rawMaterialPurity: "", advanceCashPaid: "", remarks: "" });
      setToast({ type: "success", message: "Assignment processed." });
      onSuccess?.();
    } catch { /* Handled by hook */ }
  };

  const disabled = saving || employeesLoading || configLoading;

  return (
    <div className="relative h-full flex flex-col">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 shadow-lg ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} className="text-emerald-600"/> : <AlertCircle size={16} className="text-rose-600"/>}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* No outer border/card to save space. Fills parent. */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        
        {/* COMPACT HIGH-DENSITY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Goldsmith <span className="text-rose-500">*</span></label>
            <select name="employeeId" value={formData.employeeId} onChange={handleChange} disabled={disabled} className="w-full rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] px-3 py-2 text-sm font-semibold text-[#1B241E] outline-none focus:border-[#345343] focus:bg-white disabled:opacity-60">
              <option value="">{employeesLoading ? "Loading..." : "-- Choose --"}</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <InputField label="Material Weight" name="rawMaterialWeight" value={formData.rawMaterialWeight} onChange={handleChange} type="number" unit="gms" required disabled={disabled} />
          
          <div className="space-y-1 lg:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">Material Purity <span className="text-rose-500">*</span></label>
            <div className="flex gap-2 h-[38px]">
              <div className="flex bg-[#F5F7F5] border border-[#E2E8E4] rounded-lg p-0.5">
                {PRESET_PURITY_VALUES.map((purity) => (
                  <button key={purity} type="button" disabled={disabled} onClick={() => handlePuritySelect(purity)} className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${Number(formData.rawMaterialPurity) === purity ? "bg-[#345343] text-white" : "text-[#68786D] hover:text-[#1B241E]"}`}>
                    {purity}%
                  </button>
                ))}
              </div>
              <div className="flex overflow-hidden rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] w-24 focus-within:border-[#345343] focus-within:bg-white">
                <input type="number" name="rawMaterialPurity" value={formData.rawMaterialPurity} onChange={handleChange} disabled={disabled} placeholder="Custom" className="w-full bg-transparent px-2 text-xs font-semibold outline-none text-center" />
              </div>
            </div>
          </div>

          <InputField label="Advance Cash" name="advanceCashPaid" value={formData.advanceCashPaid} onChange={handleChange} type="number" unit="₹" disabled={disabled} />
          
          <div className="lg:col-span-3">
            <InputField label="Remarks / Notes" name="remarks" value={formData.remarks} onChange={handleChange} disabled={disabled} placeholder="Optional instructions..." />
          </div>

        </div>

        {/* BOTTOM ACTION BAR - Pushed immediately below grid */}
        <div className="mt-8 flex justify-end">
          <button type="submit" disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-lg px-8 py-2.5 text-xs font-bold text-white transition-all ${disabled ? "bg-[#87968C] opacity-60" : "bg-[#345343] hover:bg-[#1B241E]"}`}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><Save className="h-3.5 w-3.5" /> Submit Assignment</>}
          </button>
        </div>

      </form>
    </div>
  );
}