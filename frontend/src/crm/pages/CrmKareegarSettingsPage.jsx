import {
  Calculator,
  Users,
  Shapes,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CrmKareegarSettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F5F7F5] lg:bg-white p-4 pb-12 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        
        {/* ==================================================
            PAGE HEADER & BACK NAVIGATION
        ================================================== */}
        <div className="border-b border-[#E2E8E4]/60 pb-5">
          <button
            type="button"
            onClick={() => navigate("/crm/settings")}
            className="group mb-5 flex w-max items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#87968C] transition-colors hover:text-[#345343]"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            Back to Settings
          </button>

          <h1 className="text-2xl font-bold tracking-tight text-[#1B241E] sm:text-3xl">
            Kareegar Settings
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-[#68786D]">
            Manage the goldsmith directory and configure global calculation rules for your production and retail workflows.
          </p>
        </div>

        {/* ==================================================
            PREMIUM LIST VIEW (Replaces Cards)
        ================================================== */}
        <div className="flex flex-col overflow-hidden rounded-[2rem] border border-[#E2E8E4] bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] divide-y divide-[#E2E8E4]/60">

          {/* 1. KAREEGAR DIRECTORY */}
          <button
            type="button"
            onClick={() => navigate("/crm/settings/kareegar/directory")}
            className="group flex items-center justify-between p-6 sm:p-8 text-left transition-colors hover:bg-[#F5F7F5]/40"
          >
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5F7F5] text-[#345343] transition-colors duration-300 group-hover:bg-[#345343] group-hover:text-white shadow-sm border border-[#E2E8E4]/60">
                <Users size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1B241E]">Kareegar Directory</h2>
                <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-[#68786D]">
                  Add, edit, and manage goldsmith profiles. Assign authorizations for B2B or Retail (B2J) workflows.
                </p>
              </div>
            </div>
            <div className="ml-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-[#E2E8E4] shadow-sm text-[#87968C] transition-all group-hover:border-[#345343] group-hover:text-[#345343]">
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>

          {/* 2. CALCULATIONS */}
          <button
            type="button"
            onClick={() => navigate("/crm/kareegar/settings/calculations")}
            className="group flex items-center justify-between p-6 sm:p-8 text-left transition-colors hover:bg-[#F5F7F5]/40"
          >
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5F7F5] text-[#345343] transition-colors duration-300 group-hover:bg-[#345343] group-hover:text-white shadow-sm border border-[#E2E8E4]/60">
                <Calculator size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1B241E]">Calculations</h2>
                <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-[#68786D]">
                  Configure algorithmic strategies and closing tolerance rules for B2B and B2J material tracking.
                </p>
              </div>
            </div>
            <div className="ml-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-[#E2E8E4] shadow-sm text-[#87968C] transition-all group-hover:border-[#345343] group-hover:text-[#345343]">
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>

          {/* 3. ORNAMENT CATEGORIES */}
          <button
            type="button"
            onClick={() => navigate("/crm/kareegar/settings/ornament-categories")}
            className="group flex items-center justify-between p-6 sm:p-8 text-left transition-colors hover:bg-[#F5F7F5]/40"
          >
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5F7F5] text-[#345343] transition-colors duration-300 group-hover:bg-[#345343] group-hover:text-white shadow-sm border border-[#E2E8E4]/60">
                <Shapes size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1B241E]">Ornament Categories</h2>
                <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-[#68786D]">
                  Add and manage ornament categories available when recording Kareegar B2J returns.
                </p>
              </div>
            </div>
            <div className="ml-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-[#E2E8E4] shadow-sm text-[#87968C] transition-all group-hover:border-[#345343] group-hover:text-[#345343]">
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}