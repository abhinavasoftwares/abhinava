import { useState } from "react";
import { Calculator, Users, Settings2 } from "lucide-react";

import KareegarCalculationSettingsPage from "./KareegarCalculationSettingsPage";

export default function KareegarSettingsPage() {
  const [section, setSection] = useState("directory");

  return (
    // Natural page flow. Fills the screen width and naturally scrolls vertically.
    <div className="mx-auto w-full max-w-[1400px] flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      {/* ==================================================
          PAGE HEADER & NAVIGATION (Horizontal layout)
      ================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-[#E2E8E4] pb-5 shrink-0">
        
        {/* Header */}
        <div>
          <div className="mb-1.5 hidden lg:flex items-center gap-2 text-[#345343]">
            <Settings2 size={16} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1B241E] sm:text-2xl">
            Kareegar Settings
          </h1>
          <p className="mt-1 text-xs font-medium text-[#68786D]">
            Configure Kareegar directory and global calculation rules.
          </p>
        </div>

        {/* Top-Level Navigation Tabs */}
        <div className="flex overflow-x-auto rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] p-1 shadow-sm [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSection("directory")}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all duration-300 whitespace-nowrap ${
              section === "directory"
                ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60"
                : "text-[#87968C] hover:text-[#1B241E] border border-transparent"
            }`}
          >
            <Users size={14} />
            Kareegar Directory
          </button>

          <button
            type="button"
            onClick={() => setSection("calculations")}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all duration-300 whitespace-nowrap ${
              section === "calculations"
                ? "bg-white text-[#345343] shadow-sm border border-[#E2E8E4]/60"
                : "text-[#87968C] hover:text-[#1B241E] border border-transparent"
            }`}
          >
            <Calculator size={14} />
            Calculations
          </button>
        </div>
      </div>

      {/* ==================================================
          SETTINGS CONTENT
      ================================================== */}
      <main className="flex-1 animate-in fade-in duration-500">
        {section === "directory" && <KareegarDirectory />}
        {section === "calculations" && <KareegarCalculationSettingsPage />}
      </main>

    </div>
  );
}

/* ============================================================
   KAREEGAR DIRECTORY PLACEHOLDER
============================================================ */
function KareegarDirectory() {
  return (
    <div className="flex flex-col rounded-[2rem] border border-[#E2E8E4] bg-white p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)]">
      
      <div className="mb-8 border-b border-[#E2E8E4]/60 pb-5">
        <h2 className="text-lg font-bold text-[#1B241E]">
          Kareegar Directory
        </h2>
        <p className="mt-1 text-sm font-medium text-[#68786D]">
          Manage Goldsmith profiles and assign their authorized workflow types.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8E4] bg-[#F5F7F5]/30 p-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#345343]/10 text-[#345343]">
          <Users size={20} />
        </div>

        <h3 className="text-sm font-bold text-[#1B241E]">
          Directory locked
        </h3>

        <p className="mt-2 max-w-sm text-xs font-medium text-[#68786D] leading-relaxed">
          The directory form will be activated soon. It will allow you to add new Goldsmiths and classify them as B2B or Retail (B2J).
        </p>
      </div>

    </div>
  );
}