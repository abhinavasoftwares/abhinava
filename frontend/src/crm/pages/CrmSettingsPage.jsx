import {
  Settings2,
  Users,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

export default function CrmSettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full overflow-y-auto bg-white p-4 pb-12 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

      <div className="mx-auto flex max-w-6xl flex-col gap-8">

        {/* ==================================================
            HEADER
        ================================================== */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#345343]">
            <Settings2 size={18} />

            <h1 className="text-xl font-bold tracking-tight text-[#1B241E] sm:text-2xl">
              Settings
            </h1>
          </div>

          <p className="max-w-2xl text-xs font-medium leading-relaxed text-[#68786D]">
            Manage your CRM configuration, module settings,
            access controls, and business rules.
          </p>
        </div>


        {/* ==================================================
            SETTINGS GRID
        ================================================== */}
        <section>

          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#87968C]">
            CRM Configuration
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* ==================================================
                KAREEGAR
            ================================================== */}
            <button
              type="button"
              onClick={() => navigate("/crm/settings/kareegar")}
              className="group flex min-h-[150px] flex-col rounded-2xl border border-[#E2E8E4] bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#345343]/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                {/* Interactive Icon Box */}
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343] transition-colors duration-300 group-hover:bg-[#345343] group-hover:text-white">
                  <Users size={20} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-[#B1BCB5] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#345343]"
                />
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-bold text-[#1B241E]">
                  Kareegar
                </h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#68786D]">
                  Manage Kareegar directory, workflows, and calculation rules.
                </p>
              </div>
            </button>


            {/* ==================================================
                USERS & PERMISSIONS
            ================================================== */}
            <button
              type="button"
              className="group flex min-h-[150px] flex-col rounded-2xl border border-[#E2E8E4] bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#345343]/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                {/* Interactive Icon Box */}
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343] transition-colors duration-300 group-hover:bg-[#345343] group-hover:text-white">
                  <ShieldCheck size={20} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-[#B1BCB5] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#345343]"
                />
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-bold text-[#1B241E]">
                  Users & Permissions
                </h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#68786D]">
                  Manage CRM users, roles, and module-level access.
                </p>
              </div>
            </button>


            {/* ==================================================
                GENERAL
            ================================================== */}
            <button
              type="button"
              className="group flex min-h-[150px] flex-col rounded-2xl border border-[#E2E8E4] bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#345343]/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                {/* Interactive Icon Box */}
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F7F5] text-[#345343] transition-colors duration-300 group-hover:bg-[#345343] group-hover:text-white">
                  <Settings2 size={20} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-[#B1BCB5] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#345343]"
                />
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-bold text-[#1B241E]">
                  General
                </h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#68786D]">
                  Manage general CRM preferences and business configuration.
                </p>
              </div>
            </button>

          </div>
        </section>

      </div>
    </div>
  );
}