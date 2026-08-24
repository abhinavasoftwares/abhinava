import { useState, useEffect } from "react";
import {
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { useKareegarEmployees } from "../hooks/useKareegarEmployees";
import { useKareegarReturns } from "../hooks/useKareegarReturns";
import { useKareegarCalculationConfig } from "../hooks/useKareegarCalculationConfig";
import { calculateB2CReturn } from "../calculations/engine";

const PRESET_PURITY_VALUES = [
  91.7,
  100,
  83.5,
  75,
];

// ============================================================
// INPUT FIELD
// ============================================================

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  unit = "",
  required = false,
  disabled = false,
  placeholder = "",
}) {
  return (
    <div className="w-full space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
        {label}{" "}
        {required && (
          <span className="text-rose-500">*</span>
        )}
      </label>

      <div className="flex overflow-hidden rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] transition-all focus-within:border-[#345343] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#345343]">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA] disabled:opacity-60"
        />

        {unit && (
          <span className="flex items-center border-l border-[#E2E8E4] bg-white/50 px-3 text-xs font-bold text-[#68786D]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// B2J RETURN FORM
// ============================================================

export default function B2JReturnForm({ onSuccess }) {
  const {
    employees,
    loading: employeesLoading,
  } = useKareegarEmployees();

  const {
    addReturn,
    saving,
    error,
  } = useKareegarReturns({
    type: "B2J",
  });

  const {
    config,
    loading: configLoading,
  } = useKareegarCalculationConfig();

  const [formData, setFormData] = useState({
    employeeId: "",
    returnedWeight: "",
    wastage: "",
    rawMaterialPurity: "",
    stoneCharges: "",
    ornamentCategory: "",
    remarks: "",
  });

  const [toast, setToast] = useState(null);

  // ==========================================================
  // TOAST
  // ==========================================================

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(
        () => setToast(null),
        4000
      );

      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (error) {
      setToast({
        type: "error",
        message: error,
      });
    }
  }, [error]);

  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]:
        event.target.value,
    }));
  };

  const handlePuritySelect = (purity) => {
    setFormData((current) => ({
      ...current,
      rawMaterialPurity: purity,
    }));
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.employeeId) {
      setToast({
        type: "error",
        message: "Select Goldsmith.",
      });

      return;
    }

    const returnedWeight = Number(
      formData.returnedWeight
    );

    const wastage = Number(
      formData.wastage || 0
    );

    const purity = Number(
      formData.rawMaterialPurity
    );

    const stoneCharges = Number(
      formData.stoneCharges || 0
    );

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !Number.isFinite(returnedWeight) ||
      returnedWeight <= 0
    ) {
      setToast({
        type: "error",
        message: "Invalid returned weight.",
      });

      return;
    }

    if (
      !Number.isFinite(purity) ||
      purity <= 0 ||
      purity > 100
    ) {
      setToast({
        type: "error",
        message: "Invalid purity.",
      });

      return;
    }

    if (
      !formData.ornamentCategory.trim()
    ) {
      setToast({
        type: "error",
        message:
          "Ornament category is required.",
      });

      return;
    }

    const calculation =
      calculateB2CReturn({
        returnedWeight,
        wastage,
        purity,
      });

    const employee =
      employees.find(
        (item) =>
          item.id ===
          formData.employeeId
      );

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    try {
      await addReturn({
        type: "B2J",

        employeeId:
          formData.employeeId,

        employeeName:
          employee?.name || "",

        returnedWeight,

        wastage,

        rawMaterialPurity:
          purity,

        effectiveGoldReturned:
          calculation.effectiveGoldReturned,

        stoneCharges,

        ornamentCategory:
          formData.ornamentCategory.trim(),

        remarks:
          formData.remarks.trim(),

        calculationStrategyId:
          config?.b2c?.return?.strategyId ||
          "KESHAVA_B2C_RETURN_V1",
      });

      // ------------------------------------------------------
      // RESET
      // ------------------------------------------------------

      setFormData({
        employeeId: "",
        returnedWeight: "",
        wastage: "",
        rawMaterialPurity: "",
        stoneCharges: "",
        ornamentCategory: "",
        remarks: "",
      });

      setToast({
        type: "success",
        message: "Return processed.",
      });

      onSuccess?.();
    } catch {
      // Error handled by hook.
    }
  };

  const disabled =
    saving ||
    employeesLoading ||
    configLoading;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative flex h-full flex-col">

      {/* ======================================================
          TOAST
      ====================================================== */}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2
              size={16}
              className="text-emerald-600"
            />
          ) : (
            <AlertCircle
              size={16}
              className="text-rose-600"
            />
          )}

          <span className="text-xs font-bold">
            {toast.message}
          </span>
        </div>
      )}

      {/* ======================================================
          FORM
      ====================================================== */}

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col"
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-4">

          {/* ==================================================
              GOLDSMITH
          ================================================== */}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
              Goldsmith{" "}
              <span className="text-rose-500">
                *
              </span>
            </label>

            <select
              name="employeeId"
              value={
                formData.employeeId
              }
              onChange={handleChange}
              disabled={disabled}
              className="w-full rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] px-3 py-2 text-sm font-semibold text-[#1B241E] outline-none focus:border-[#345343] focus:bg-white disabled:opacity-60"
            >
              <option value="">
                {employeesLoading
                  ? "Loading..."
                  : "-- Choose --"}
              </option>

              {employees
                .filter(
                  (employee) =>
                    employee.type ===
                    "B2J"
                )
                .map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.name}
                  </option>
                ))}
            </select>
          </div>

          {/* ==================================================
              RETURNED WEIGHT
          ================================================== */}

          <InputField
            label="Returned Weight"
            name="returnedWeight"
            value={
              formData.returnedWeight
            }
            onChange={handleChange}
            type="number"
            unit="gms"
            required
            disabled={disabled}
          />

          {/* ==================================================
              WASTAGE
          ================================================== */}

          <InputField
            label="Wastage"
            name="wastage"
            value={formData.wastage}
            onChange={handleChange}
            type="number"
            unit="gms"
            disabled={disabled}
          />

          {/* ==================================================
              MATERIAL PURITY
          ================================================== */}

          <div className="space-y-1 lg:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
              Material Purity{" "}
              <span className="text-rose-500">
                *
              </span>
            </label>

            <div className="flex h-[38px] gap-2">

              <div className="flex rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] p-0.5">
                {PRESET_PURITY_VALUES.map(
                  (purity) => (
                    <button
                      key={purity}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        handlePuritySelect(
                          purity
                        )
                      }
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                        Number(
                          formData.rawMaterialPurity
                        ) === purity
                          ? "bg-[#345343] text-white"
                          : "text-[#68786D] hover:text-[#1B241E]"
                      }`}
                    >
                      {purity}%
                    </button>
                  )
                )}
              </div>

              <div className="flex w-24 overflow-hidden rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] focus-within:border-[#345343] focus-within:bg-white">
                <input
                  type="number"
                  name="rawMaterialPurity"
                  value={
                    formData.rawMaterialPurity
                  }
                  onChange={handleChange}
                  disabled={disabled}
                  placeholder="Custom"
                  className="w-full bg-transparent px-2 text-center text-xs font-semibold outline-none"
                />
              </div>

            </div>
          </div>

          {/* ==================================================
              STONE CHARGES
          ================================================== */}

          <InputField
            label="Stone Charges"
            name="stoneCharges"
            value={
              formData.stoneCharges
            }
            onChange={handleChange}
            type="number"
            unit="₹"
            disabled={disabled}
          />

          {/* ==================================================
              ORNAMENT CATEGORY
          ================================================== */}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
              Ornament Category{" "}
              <span className="text-rose-500">
                *
              </span>
            </label>

            <input
              type="text"
              name="ornamentCategory"
              value={
                formData.ornamentCategory
              }
              onChange={handleChange}
              disabled={disabled}
              placeholder="e.g. Ring, Chain..."
              className="w-full rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] px-3 py-2 text-sm font-semibold text-[#1B241E] outline-none placeholder:text-[#A3B0AA] focus:border-[#345343] focus:bg-white disabled:opacity-60"
            />
          </div>

          {/* ==================================================
              REMARKS
          ================================================== */}

          <div className="lg:col-span-3">
            <InputField
              label="Remarks / Notes"
              name="remarks"
              value={
                formData.remarks
              }
              onChange={handleChange}
              disabled={disabled}
              placeholder="Optional instructions..."
            />
          </div>

        </div>

        {/* ====================================================
            ACTION BAR
        ==================================================== */}

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-8 py-2.5 text-xs font-bold text-white transition-all ${
              disabled
                ? "bg-[#87968C] opacity-60"
                : "bg-[#345343] hover:bg-[#1B241E]"
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
                Submit Return
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}