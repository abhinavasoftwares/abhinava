import { useState } from "react";
import { 
  Building2, 
  Hammer, 
  ArrowRightLeft, 
  CornerDownLeft,
} from "lucide-react";

import B2JAssignmentForm from "../components/B2JAssignmentForm";
import B2JReturnForm from "../components/B2JReturnForm";

export default function KareegarManagementPage() {
  const [type, setType] = useState("B2J");
  const [operation, setOperation] = useState("assignment");

  return (
    // We removed all strict height locks. The page will flow naturally, 
    // but the high-density design ensures it fits on one screen anyway.
    <div className="min-h-full bg-white p-4 sm:p-6 lg:p-8">
      
      <div className="mx-auto w-full max-w-[1400px] flex flex-col gap-2">
        
        {/* ==================================================
            COMPACT HEADER & SELECTORS
        ================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8E4] pb-4">
          
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1B241E]">
              Kareegar Hub
            </h1>
            <p className="mt-1 text-xs font-medium text-[#68786D]">
              Manage assignments, track materials, and process returns.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            
            {/* WORKFLOW SELECTOR */}
            <div className="flex rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] p-1">
              <button
                type="button"
                onClick={() => { setType("B2B"); setOperation("assignment"); }}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                  type === "B2B" ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60" : "text-[#87968C] hover:text-[#1B241E]"
                }`}
              >
                <Building2 size={14} /> B2B
              </button>
              <button
                type="button"
                onClick={() => { setType("B2J"); setOperation("assignment"); }}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                  type === "B2J" ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60" : "text-[#87968C] hover:text-[#1B241E]"
                }`}
              >
                <Hammer size={14} /> Retail (B2J)
              </button>
            </div>

            {/* OPERATION SELECTOR */}
            <div className="flex rounded-lg border border-[#E2E8E4] bg-[#F5F7F5] p-1">
              <button
                type="button"
                onClick={() => setOperation("assignment")}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                  operation === "assignment" ? "bg-[#345343] text-white shadow-sm" : "text-[#87968C] hover:text-[#1B241E]"
                }`}
              >
                <ArrowRightLeft size={14} /> Assign
              </button>
              <button
                type="button"
                onClick={() => setOperation("return")}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                  operation === "return" ? "bg-[#345343] text-white shadow-sm" : "text-[#87968C] hover:text-[#1B241E]"
                }`}
              >
                <CornerDownLeft size={14} /> Return
              </button>
            </div>

          </div>
        </div>

        {/* ==================================================
            FORM CONTENT
        ================================================== */}
        <div className="animate-in fade-in duration-300">
          
          {type === "B2J" && (
            <>
              {operation === "assignment" && <B2JAssignmentForm />}
              {operation === "return" && <B2JReturnForm />}
            </>
          )}

          {type === "B2B" && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8E4] bg-[#F5F7F5]/30 p-12 text-center mt-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#345343]/10 text-[#345343]">
                <Building2 size={20} />
              </div>
              <h2 className="text-sm font-bold text-[#1B241E]">
                B2B {operation === "assignment" ? "Assignment" : "Return"}
              </h2>
              <p className="mt-1 max-w-sm text-xs font-medium text-[#68786D]">
                B2B workflow integration is pending retail verification.
              </p>
            </div>
          )}
          
        </div>

      </div>
    </div>
  );
}