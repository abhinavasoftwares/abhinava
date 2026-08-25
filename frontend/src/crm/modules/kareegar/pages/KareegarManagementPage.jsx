import { useState } from "react";
import { 
  Building2, 
  Hammer, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Settings2
} from "lucide-react";

import B2JAssignmentForm from "../components/B2JAssignmentForm";
import B2JReturnForm from "../components/B2JReturnForm";

export default function KareegarManagementPage() {
  const [step, setStep] = useState(1);
  const [workflow, setWorkflow] = useState("B2J");
  const [operation, setOperation] = useState("ASSIGNMENT");

  return (
    <div className="min-h-full bg-[#F5F7F5] lg:bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1200px] flex flex-col gap-6 lg:gap-8">
        
        {/* ==================================================
            STEP 1: WORKSPACE CONFIGURATION (SELECTION)
        ================================================== */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="mb-6 border-b border-[#E2E8E4]/60 pb-5">
              <div className="mb-2 flex items-center gap-2 text-[#345343]">
                <Settings2 size={18} strokeWidth={2.5} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Kareegar Hub</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1B241E] sm:text-3xl">
                Select Workspace
              </h1>
              <p className="mt-1.5 text-sm font-medium text-[#68786D]">
                Configure your transaction type to open the correct assignment or return workspace.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[#E2E8E4] bg-white p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
                
                {/* 1. WORKFLOW SELECTION */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#87968C]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F5F7F5] text-[#345343]">1</span>
                    Target Workflow
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setWorkflow("B2B")}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all duration-200 ${
                        workflow === "B2B"
                          ? "border-[#345343] bg-[#F5F7F5] shadow-sm ring-1 ring-[#345343]/20 -translate-y-0.5"
                          : "border-[#E2E8E4] bg-white hover:border-[#345343]/40 hover:bg-[#F5F7F5]/50 text-[#87968C]"
                      }`}
                    >
                      <Building2 size={26} className={`mb-3 ${workflow === "B2B" ? "text-[#345343]" : ""}`} strokeWidth={2} />
                      <p className={`text-sm font-bold ${workflow === "B2B" ? "text-[#1B241E]" : ""}`}>B2B Production</p>
                      {workflow === "B2B" && <CheckCircle2 size={16} className="absolute right-3 top-3 text-[#345343] animate-in zoom-in" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkflow("B2J")}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all duration-200 ${
                        workflow === "B2J"
                          ? "border-[#345343] bg-[#F5F7F5] shadow-sm ring-1 ring-[#345343]/20 -translate-y-0.5"
                          : "border-[#E2E8E4] bg-white hover:border-[#345343]/40 hover:bg-[#F5F7F5]/50 text-[#87968C]"
                      }`}
                    >
                      <Hammer size={26} className={`mb-3 ${workflow === "B2J" ? "text-[#345343]" : ""}`} strokeWidth={2} />
                      <p className={`text-sm font-bold ${workflow === "B2J" ? "text-[#1B241E]" : ""}`}>Retail (B2J)</p>
                      {workflow === "B2J" && <CheckCircle2 size={16} className="absolute right-3 top-3 text-[#345343] animate-in zoom-in" />}
                    </button>
                  </div>
                </div>

                {/* 2. ACTION SELECTION */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#87968C]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F5F7F5] text-[#345343]">2</span>
                    Transaction Action
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setOperation("ASSIGNMENT")}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all duration-200 ${
                        operation === "ASSIGNMENT"
                          ? "border-amber-600 bg-amber-50 shadow-sm ring-1 ring-amber-600/20 -translate-y-0.5"
                          : "border-[#E2E8E4] bg-white hover:border-amber-600/40 hover:bg-amber-50/50 text-[#87968C]"
                      }`}
                    >
                      <TrendingUp size={26} className={`mb-3 ${operation === "ASSIGNMENT" ? "text-amber-700" : ""}`} strokeWidth={2} />
                      <p className={`text-sm font-bold ${operation === "ASSIGNMENT" ? "text-amber-900" : ""}`}>Assign Material</p>
                      {operation === "ASSIGNMENT" && <CheckCircle2 size={16} className="absolute right-3 top-3 text-amber-600 animate-in zoom-in" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOperation("RETURN")}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all duration-200 ${
                        operation === "RETURN"
                          ? "border-emerald-600 bg-emerald-50 shadow-sm ring-1 ring-emerald-600/20 -translate-y-0.5"
                          : "border-[#E2E8E4] bg-white hover:border-emerald-600/40 hover:bg-emerald-50/50 text-[#87968C]"
                      }`}
                    >
                      <TrendingDown size={26} className={`mb-3 ${operation === "RETURN" ? "text-emerald-700" : ""}`} strokeWidth={2} />
                      <p className={`text-sm font-bold ${operation === "RETURN" ? "text-emerald-900" : ""}`}>Process Return</p>
                      {operation === "RETURN" && <CheckCircle2 size={16} className="absolute right-3 top-3 text-emerald-600 animate-in zoom-in" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* CONTINUE BUTTON */}
              <div className="mt-10 flex justify-end border-t border-[#E2E8E4]/60 pt-6">
                <button
                  onClick={() => setStep(2)}
                  className="group flex items-center justify-center gap-2 rounded-xl bg-[#345343] px-8 py-3.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1B241E] hover:shadow-md hover:-translate-y-0.5"
                >
                  Open {workflow === "B2B" ? "B2B" : "Retail"} {operation === "ASSIGNMENT" ? "Assignment" : "Return"} Workspace
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ==================================================
            STEP 2: ACTIVE FORM WORKSPACE
        ================================================== */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-8 fade-in duration-300">
            
            {/* WORKSPACE HEADER (REPLACES HUGE SELECTION CARDS) */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8E4]/60 pb-5">
              <div>
                <button 
                  onClick={() => setStep(1)}
                  className="group mb-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C] transition-colors hover:text-[#345343]"
                >
                  <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" /> 
                  Switch Workspace
                </button>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${operation === "ASSIGNMENT" ? "bg-amber-600" : "bg-emerald-600"}`}>
                    {operation === "ASSIGNMENT" ? <TrendingUp size={20} strokeWidth={2.5} /> : <TrendingDown size={20} strokeWidth={2.5} />}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#1B241E] sm:text-2xl">
                      {workflow === "B2J" ? "Retail" : "B2B"} {operation === "ASSIGNMENT" ? "Assignment" : "Return"}
                    </h1>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active Session
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RENDER ACTIVE FORM */}
            <div className="w-full">
              {workflow === "B2J" && (
                <>
                  {operation === "ASSIGNMENT" && <B2JAssignmentForm />}
                  {operation === "RETURN" && <B2JReturnForm />}
                </>
              )}

              {/* Placeholder for B2B Forms */}
              {workflow === "B2B" && (
                <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#E2E8E4] bg-white p-16 text-center shadow-sm">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F7F5] text-[#87968C]">
                    <Building2 size={28} />
                  </div>
                  <h2 className="text-lg font-bold text-[#1B241E]">
                    B2B {operation === "ASSIGNMENT" ? "Assignment Workspace" : "Return Workspace"}
                  </h2>
                  <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-[#68786D]">
                    The B2B production workflow modules are pending integration. Switch to the Retail (B2J) workflow to manage individual jobs.
                  </p>
                  <button 
                    onClick={() => setStep(1)}
                    className="mt-6 rounded-xl border border-[#E2E8E4] bg-white px-6 py-2.5 text-xs font-bold text-[#1B241E] shadow-sm transition hover:bg-[#F5F7F5]"
                  >
                    Go Back
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