import {
  Calculator,
  Users,
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CrmKareegarSettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full overflow-y-auto bg-white p-4 pb-12 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        
        {/* ==================================================
            PAGE HEADER & BACK NAVIGATION
        ================================================== */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/crm/settings")}
            className="group mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#87968C] transition-colors hover:text-[#345343]"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            Back to Settings
          </button>

          <h1 className="text-2xl font-bold tracking-tight text-[#1B241E] sm:text-3xl">
            Kareegar Settings
          </h1>

          <p className="mt-1.5 max-w-2xl text-xs font-medium leading-relaxed text-[#68786D]">
            Manage the goldsmith directory and configure global calculation rules for your production and retail workflows.
          </p>
        </div>

        {/* ==================================================
            SETTINGS MODULE GRID
        ================================================== */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* 1. KAREEGAR DIRECTORY */}
          <button
            type="button"
            onClick={() => navigate("/crm/settings/kareegar/directory")}
            className="group flex min-h-[150px] flex-col rounded-2xl border border-[#E2E8E4] bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#345343]/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343] transition-colors duration-300 group-hover:bg-[#345343] group-hover:text-white">
                <Users size={20} />
              </div>

              <ChevronRight
                size={18}
                className="text-[#B1BCB5] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#345343]"
              />
            </div>

            <div className="mt-5">
              <h2 className="text-sm font-bold text-[#1B241E]">
                Kareegar Directory
              </h2>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#68786D]">
                Add, edit, and manage goldsmith profiles. Assign authorizations for B2B or Retail (B2J) workflows.
              </p>
            </div>
          </button>

          {/* 2. CALCULATIONS */}
          <button
            type="button"
            onClick={() => navigate("/crm/kareegar/settings/calculations")}
            className="group flex min-h-[150px] flex-col rounded-2xl border border-[#E2E8E4] bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#345343]/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343] transition-colors duration-300 group-hover:bg-[#345343] group-hover:text-white">
                <Calculator size={20} />
              </div>

              <ChevronRight
                size={18}
                className="text-[#B1BCB5] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#345343]"
              />
            </div>

            <div className="mt-5">
              <h2 className="text-sm font-bold text-[#1B241E]">
                Calculations
              </h2>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#68786D]">
                Configure algorithmic strategies and closing tolerance rules for B2B and B2J material tracking.
              </p>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}