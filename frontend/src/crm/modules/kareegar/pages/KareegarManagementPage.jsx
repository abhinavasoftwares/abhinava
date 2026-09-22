import { useState } from "react";
import { 
  Building2, 
  Hammer, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft,
  Check,
  ChevronRight
} from "lucide-react";

import B2JAssignmentForm from "../components/B2JAssignmentForm";
import B2JReturnForm from "../components/B2JReturnForm";

export default function KareegarManagementPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [workflow, setWorkflow] = useState("");     // "B2J" | "B2B"
  const [operation, setOperation] = useState("");   // "ASSIGNMENT" | "RETURN"

  const handleSelectWorkflow = (selectedWorkflow) => {
    setWorkflow(selectedWorkflow);
    setCurrentStep(2);
  };

  const handleSelectOperation = (selectedOperation) => {
    setOperation(selectedOperation);
    setCurrentStep(3);
  };

  const handleResetTo = (stepNumber) => {
    if (stepNumber === 1) {
      setWorkflow("");
      setOperation("");
      setCurrentStep(1);
    } else if (stepNumber === 2) {
      setOperation("");
      setCurrentStep(2);
    }
  };

  return (
    <div className="min-h-full bg-white p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-8">

        {/* ============================================================
            STEPPER PROGRESS BAR
        ============================================================ */}
        <div className="border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between max-w-md mx-auto">
            
            {/* Step 1 Indicator */}
            <button
              type="button"
              onClick={() => handleResetTo(1)}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                currentStep === 1
                  ? "text-slate-900"
                  : currentStep > 1
                  ? "text-slate-600 hover:text-slate-900 cursor-pointer"
                  : "text-slate-400"
              }`}
            >
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                currentStep > 1
                  ? "bg-slate-900 text-white"
                  : currentStep === 1
                  ? "border-2 border-slate-900 text-slate-900"
                  : "border border-slate-300 text-slate-400"
              }`}>
                {currentStep > 1 ? <Check size={12} strokeWidth={3} /> : "1"}
              </span>
              <span>Workflow</span>
            </button>

            <ChevronRight size={14} className="text-slate-300" />

            {/* Step 2 Indicator */}
            <button
              type="button"
              onClick={() => handleResetTo(2)}
              disabled={currentStep <= 2}
              className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                currentStep === 2
                  ? "text-slate-900"
                  : currentStep > 2
                  ? "text-slate-600 hover:text-slate-900 cursor-pointer"
                  : "text-slate-400 cursor-default"
              }`}
            >
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                currentStep > 2
                  ? "bg-slate-900 text-white"
                  : currentStep === 2
                  ? "border-2 border-slate-900 text-slate-900"
                  : "border border-slate-300 text-slate-400"
              }`}>
                {currentStep > 2 ? <Check size={12} strokeWidth={3} /> : "2"}
              </span>
              <span>Action</span>
            </button>

            <ChevronRight size={14} className="text-slate-300" />

            {/* Step 3 Indicator */}
            <div className={`flex items-center gap-2 text-xs font-semibold ${
              currentStep === 3 ? "text-slate-900" : "text-slate-400"
            }`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                currentStep === 3
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-400"
              }`}>
                3
              </span>
              <span>Register</span>
            </div>

          </div>
        </div>

        {/* ============================================================
            PHASE 1: WORKFLOW CHANNEL SELECTION
        ============================================================ */}
        {currentStep === 1 && (
          <div className="animate-in fade-in duration-200">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Select Production Channel
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Choose the workflow model for this bullion transaction.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Retail Bespoke (B2J) */}
              <button
                type="button"
                onClick={() => handleSelectWorkflow("B2J")}
                className="group flex flex-col items-center justify-center p-8 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:shadow-sm transition-all text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors mb-4">
                  <Hammer size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Retail Bespoke (B2J)</h3>
                <p className="text-xs text-slate-500 mt-1">Individual custom patron jewellery orders</p>
                <span className="mt-4 text-[11px] font-semibold text-slate-400 group-hover:text-slate-900 flex items-center gap-1">
                  Select Channel <ChevronRight size={12} />
                </span>
              </button>

              {/* B2B Wholesale */}
              <button
                type="button"
                onClick={() => handleSelectWorkflow("B2B")}
                className="group flex flex-col items-center justify-center p-8 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:shadow-sm transition-all text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors mb-4">
                  <Building2 size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900">B2B Wholesale</h3>
                <p className="text-xs text-slate-500 mt-1">Batch casting & commercial bulk lots</p>
                <span className="mt-4 text-[11px] font-semibold text-slate-400 group-hover:text-slate-900 flex items-center gap-1">
                  Select Channel <ChevronRight size={12} />
                </span>
              </button>

            </div>
          </div>
        )}

        {/* ============================================================
            PHASE 2: OPERATION SELECTION
        ============================================================ */}
        {currentStep === 2 && (
          <div className="animate-in fade-in duration-200">
            
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6"
            >
              <ArrowLeft size={13} />
              <span>Back to channel selection</span>
            </button>

            <div className="text-center mb-8">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Channel: {workflow === "B2J" ? "Retail Bespoke (B2J)" : "B2B Wholesale"}
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Select Operation Type
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Are you dispatching material to the artisan or receiving finished work?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Assignment / Issue */}
              <button
                type="button"
                onClick={() => handleSelectOperation("ASSIGNMENT")}
                className="group flex flex-col items-center justify-center p-8 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:shadow-sm transition-all text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-colors mb-4">
                  <TrendingUp size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Issue Gold (Assignment)</h3>
                <p className="text-xs text-slate-500 mt-1">Outward bullion, stone & job slip issue</p>
                <span className="mt-4 text-[11px] font-semibold text-slate-400 group-hover:text-slate-900 flex items-center gap-1">
                  Open Issue Register <ChevronRight size={12} />
                </span>
              </button>

              {/* Return / Settlement */}
              <button
                type="button"
                onClick={() => handleSelectOperation("RETURN")}
                className="group flex flex-col items-center justify-center p-8 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:shadow-sm transition-all text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors mb-4">
                  <TrendingDown size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Process Return</h3>
                <p className="text-xs text-slate-500 mt-1">Finished ornaments, scrap gold & metal loss</p>
                <span className="mt-4 text-[11px] font-semibold text-slate-400 group-hover:text-slate-900 flex items-center gap-1">
                  Open Return Register <ChevronRight size={12} />
                </span>
              </button>

            </div>
          </div>
        )}

        {/* ============================================================
            PHASE 3: OPEN FORM VIEW
        ============================================================ */}
        {currentStep === 3 && (
          <div className="animate-in fade-in duration-200">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
              <div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
                >
                  <ArrowLeft size={13} />
                  <span>Change Action</span>
                </button>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {workflow === "B2J" ? "Retail Bespoke" : "B2B Wholesale"} — {operation === "ASSIGNMENT" ? "Material Issue Slip" : "Return & Settlement Slip"}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-medium text-slate-600">
                  {workflow} • {operation}
                </span>
                <button
                  type="button"
                  onClick={() => handleResetTo(1)}
                  className="text-xs text-slate-500 hover:text-slate-900 underline"
                >
                  Restart
                </button>
              </div>
            </div>

            {/* Form Embed */}
            <div className="w-full">
              {workflow === "B2J" ? (
                operation === "ASSIGNMENT" ? <B2JAssignmentForm /> : <B2JReturnForm />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-[#FAFAFA] p-12 text-center">
                  <Building2 size={24} className="mx-auto text-slate-400 mb-2" />
                  <h3 className="text-sm font-bold text-slate-900">Wholesale Lot Module</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    The wholesale batch workflow is scheduled for integration.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setWorkflow("B2J"); setCurrentStep(3); }}
                    className="mt-3 text-xs font-semibold text-slate-900 underline hover:text-indigo-600"
                  >
                    Switch to Retail Bespoke (B2J)
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}