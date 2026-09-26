import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Check,
  X,
  Users,
  Calculator,
  Shapes,
  Scale,
  Hammer,
  Gem,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Sliders,
  Filter,
} from "lucide-react";

import { crmPath } from "../utils/crmRoutes";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const KAREEGAR_PAGES = [
  {
    id: "directory",
    title: "Kareegar Directory",
    subtitle: "Active Goldsmiths & B2B Workshops",
    icon: Users,
    route: "settings/kareegar/directory",
  },
  {
    id: "calculations",
    title: "Calculation Rules",
    subtitle: "Wastage, Purity & Tare Math",
    icon: Calculator,
    route: "kareegar/settings/calculations",
  },
  {
    id: "ornaments",
    title: "Ornament Categories",
    subtitle: "Taxonomy & Standard Karats",
    icon: Shapes,
    route: "kareegar/settings/ornament-categories",
  },
];

export default function CrmKareegarSettingsPage() {
  const navigate = useNavigate();

  // Active setting state (Default: first setting)
  const [activePageId, setActivePageId] = useState("directory");
  const [selectorOpen, setSelectorOpen] = useState(false);

  const activePage =
    KAREEGAR_PAGES.find((p) => p.id === activePageId) || KAREEGAR_PAGES[0];
  const ActiveIcon = activePage.icon;

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-[#F5F7F5] font-sans text-[#1B241E] antialiased overflow-hidden select-none relative">
      
      {/* -------------------------------------------------------------
          BACKGROUND JEWELRY & CRAFTSMANSHIP DOODLES
      ------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        <div className="absolute -top-8 -left-6 text-[#345343]/[0.05] rotate-[-12deg]">
          <Scale size={160} strokeWidth={1.1} />
        </div>
        <div className="absolute -top-12 -right-10 text-[#345343]/[0.05] rotate-[22deg]">
          <Hammer size={170} strokeWidth={1.1} />
        </div>
        <div className="absolute top-1/3 -left-8 text-[#345343]/[0.04] rotate-[15deg]">
          <Gem size={130} strokeWidth={1.2} />
        </div>
        <div className="absolute bottom-20 -right-6 text-[#345343]/[0.05] rotate-[-22deg]">
          <Shapes size={140} strokeWidth={1.2} />
        </div>
        <div className="absolute -bottom-10 left-20 text-[#345343]/[0.05] rotate-[10deg]">
          <Calculator size={140} strokeWidth={1.1} />
        </div>
      </div>

      {/* -------------------------------------------------------------
          1. HEADER WITH SINGLE ACTIVE SETTING SELECTOR
      ------------------------------------------------------------- */}
      <header className="shrink-0 h-16 w-full border-b border-[#E2E8E4] bg-white/95 backdrop-blur-xs px-4 sm:px-6 lg:px-8 flex items-center justify-between z-20">
        
        {/* Left: Back & Active Setting Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(crmPath("settings"))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E2E8E4] bg-white text-[#68786D] hover:bg-[#F5F7F5] hover:text-[#1B241E] transition-colors shadow-2xs"
            title="Return to Master Settings"
          >
            <ArrowLeft size={14} />
          </button>

          {/* SINGLE ACTIVE SELECTOR TRIGGER */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSelectorOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-xl border border-[#E2E8E4] bg-[#F5F7F5] hover:bg-white hover:border-[#345343]/50 px-3 py-1.5 transition-all text-left shadow-2xs"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#345343] text-white">
                <ActiveIcon size={14} strokeWidth={2.3} />
              </div>

              <div className="min-w-0 leading-tight pr-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#87968C] block">
                  Kareegar Setting
                </span>
                <span className="text-xs font-bold text-[#1B241E] truncate block">
                  {activePage.title}
                </span>
              </div>

              <ChevronDown
                size={14}
                className={`text-[#87968C] transition-transform duration-200 ${
                  selectorOpen ? "rotate-180 text-[#1B241E]" : ""
                }`}
              />
            </button>

            {/* Desktop Popover Menu (hidden on mobile, uses bottom sheet instead) */}
            {selectorOpen && (
              <div className="hidden lg:block absolute left-0 top-full mt-2 w-72 rounded-2xl border border-[#E2E8E4] bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#87968C] border-b border-[#E2E8E4]/60 mb-1">
                  Switch Active View
                </div>

                <div className="space-y-1">
                  {KAREEGAR_PAGES.map((page) => {
                    const isSelected = page.id === activePageId;
                    const PageIcon = page.icon;

                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => {
                          setActivePageId(page.id);
                          setSelectorOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          isSelected
                            ? "bg-[#345343] text-white"
                            : "hover:bg-[#F5F7F5] text-[#1B241E]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : "bg-[#F5F7F5] text-[#345343]"
                            }`}
                          >
                            <PageIcon size={14} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0 leading-tight">
                            <p className="text-xs font-bold truncate">
                              {page.title}
                            </p>
                            <span
                              className={`text-[9.5px] font-mono truncate block ${
                                isSelected ? "text-emerald-200" : "text-[#87968C]"
                              }`}
                            >
                              {page.subtitle}
                            </span>
                          </div>
                        </div>

                        {isSelected && <Check size={14} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Tools / Telemetry */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(crmPath(activePage.route))}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8E4] bg-white px-3 text-xs font-mono font-semibold text-[#345343] hover:bg-[#F5F7F5] hover:border-slate-300 transition-colors shadow-2xs"
            title="Open Dedicated Fullscreen Route"
          >
            <span>Launch Form</span>
            <ExternalLink size={12} className="text-[#87968C]" />
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          2. MAIN ACTIVE VIEWPORT: DISPLAYS ONLY THE ACTIVE PAGE
      ------------------------------------------------------------- */}
      <main className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 ${noScroll} z-10`}>
        <div className="max-w-5xl mx-auto h-full flex flex-col">
          
          {/* =========================================================
              VIEW 1: DIRECTORY (ONLY VISIBLE WHEN DIRECTORY IS ACTIVE)
          ========================================================== */}
          {activePageId === "directory" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Directory Command Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8E4] shadow-2xs">
                <div>
                  <h2 className="text-base font-bold text-[#1B241E]">
                    Artisan & Kareegar Directory
                  </h2>
                  <p className="text-xs text-[#68786D] mt-0.5 font-mono">
                    Registered goldsmiths, B2B casting benches, and in-house retail artisans.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(crmPath("settings/kareegar/directory"))}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#345343] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1B241E] active:scale-[0.98] transition-all shadow-xs shrink-0"
                >
                  <Plus size={14} />
                  <span>Register Artisan</span>
                </button>
              </div>

              {/* Directory Content Table / State */}
              <div className="rounded-2xl border border-[#E2E8E4] bg-white overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#E2E8E4] flex items-center justify-between bg-[#F5F7F5]/40 text-xs font-mono">
                  <span className="text-[#87968C] font-bold uppercase">
                    Master Bench Registry
                  </span>
                  <span className="text-[#345343] font-semibold">
                    REALTIME SYNC
                  </span>
                </div>

                <div className="p-8 sm:p-12 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7F5] border border-[#E2E8E4] text-[#345343]">
                    <Users size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1B241E]">
                      Manage Active Artisan Records
                    </h3>
                    <p className="text-xs text-[#68786D] max-w-md mx-auto mt-1 leading-relaxed">
                      Configure individual goldsmith loss allowances, B2B casting terms, and retail repair bench authorizations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(crmPath("settings/kareegar/directory"))}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8E4] bg-white px-4 py-2 text-xs font-semibold text-[#1B241E] hover:bg-[#F5F7F5] transition-colors"
                  >
                    <span>Open Master Registry</span>
                    <ExternalLink size={12} className="text-[#87968C]" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================
              VIEW 2: CALCULATIONS (ONLY VISIBLE WHEN CALCULATIONS ACTIVE)
          ========================================================== */}
          {activePageId === "calculations" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Calculations Command Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8E4] shadow-2xs">
                <div>
                  <h2 className="text-base font-bold text-[#1B241E]">
                    Wastage & Melting Loss Math
                  </h2>
                  <p className="text-xs text-[#68786D] mt-0.5 font-mono">
                    Algorithmic strategies for pure gold deductions and tare limits.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(crmPath("kareegar/settings/calculations"))}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#345343] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1B241E] active:scale-[0.98] transition-all shadow-xs shrink-0"
                >
                  <Sliders size={14} />
                  <span>Configure Formulas</span>
                </button>
              </div>

              {/* Calculations Content State */}
              <div className="rounded-2xl border border-[#E2E8E4] bg-white overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#E2E8E4] flex items-center justify-between bg-[#F5F7F5]/40 text-xs font-mono">
                  <span className="text-[#87968C] font-bold uppercase">
                    Tolerance & Math Engine
                  </span>
                  <span className="text-[#345343] font-semibold">
                    ROUNDING: 0.001g
                  </span>
                </div>

                <div className="p-8 sm:p-12 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7F5] border border-[#E2E8E4] text-[#345343]">
                    <Calculator size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1B241E]">
                      Define Loss Margins & Conversion Factors
                    </h3>
                    <p className="text-xs text-[#68786D] max-w-md mx-auto mt-1 leading-relaxed">
                      Set automated stone weight tare deduct formulas, karat-wise alloy touches, and closing thresholds.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(crmPath("kareegar/settings/calculations"))}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8E4] bg-white px-4 py-2 text-xs font-semibold text-[#1B241E] hover:bg-[#F5F7F5] transition-colors"
                  >
                    <span>Edit Mathematical Engine</span>
                    <ExternalLink size={12} className="text-[#87968C]" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================
              VIEW 3: ORNAMENTS (ONLY VISIBLE WHEN ORNAMENTS ACTIVE)
          ========================================================== */}
          {activePageId === "ornaments" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Ornaments Command Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8E4] shadow-2xs">
                <div>
                  <h2 className="text-base font-bold text-[#1B241E]">
                    Ornament Categories & Taxonomy
                  </h2>
                  <p className="text-xs text-[#68786D] mt-0.5 font-mono">
                    Article classification codes, labor charge presets, and hallmark standards.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(crmPath("kareegar/settings/ornament-categories"))}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#345343] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1B241E] active:scale-[0.98] transition-all shadow-xs shrink-0"
                >
                  <Plus size={14} />
                  <span>Add Ornament Category</span>
                </button>
              </div>

              {/* Ornaments Content State */}
              <div className="rounded-2xl border border-[#E2E8E4] bg-white overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#E2E8E4] flex items-center justify-between bg-[#F5F7F5]/40 text-xs font-mono">
                  <span className="text-[#87968C] font-bold uppercase">
                    Article Classification
                  </span>
                  <span className="text-[#345343] font-semibold">
                    HSN: 7113
                  </span>
                </div>

                <div className="p-8 sm:p-12 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7F5] border border-[#E2E8E4] text-[#345343]">
                    <Shapes size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1B241E]">
                      Organize Jewelry Article Taxonomy
                    </h3>
                    <p className="text-xs text-[#68786D] max-w-md mx-auto mt-1 leading-relaxed">
                      Manage classifications available when recording Kareegar returns (Bangles, Rings, Chains, Mangalsutras).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(crmPath("kareegar/settings/ornament-categories"))}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8E4] bg-white px-4 py-2 text-xs font-semibold text-[#1B241E] hover:bg-[#F5F7F5] transition-colors"
                  >
                    <span>Open Category Taxonomy</span>
                    <ExternalLink size={12} className="text-[#87968C]" />
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* -------------------------------------------------------------
          3. BOTTOM SHEET MODAL (MOBILE/TABLET ONLY: < lg)
      ------------------------------------------------------------- */}
      {selectorOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="flex-1 w-full"
            onClick={() => setSelectorOpen(false)}
          />

          <div className="w-full bg-white rounded-t-3xl border-t border-[#E2E8E4] p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-[#E2E8E4] rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-[#E2E8E4]/60 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1B241E]">
                Select Active Kareegar View
              </span>
              <button
                type="button"
                onClick={() => setSelectorOpen(false)}
                className="p-1 rounded-md text-[#87968C] hover:text-[#1B241E] hover:bg-[#F5F7F5]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              {KAREEGAR_PAGES.map((page) => {
                const isSelected = page.id === activePageId;
                const PageIcon = page.icon;

                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => {
                      setActivePageId(page.id);
                      setSelectorOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-[#345343] bg-[#345343] text-white shadow-xs"
                        : "border-[#E2E8E4] bg-white text-[#1B241E] hover:bg-[#F5F7F5]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                          isSelected
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-[#E2E8E4] bg-[#F5F7F5] text-[#345343]"
                        }`}
                      >
                        <PageIcon size={16} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">
                          {page.title}
                        </p>
                        <p
                          className={`text-[10px] font-mono truncate ${
                            isSelected ? "text-emerald-200" : "text-[#87968C]"
                          }`}
                        >
                          {page.subtitle}
                        </p>
                      </div>
                    </div>

                    {isSelected && <Check size={16} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. FOOTER STATUS BAR (SHRINK-0)
      ------------------------------------------------------------- */}
      <footer className="shrink-0 h-9 w-full border-t border-[#E2E8E4] bg-white/95 px-4 sm:px-6 lg:px-8 flex items-center justify-between text-[10px] font-mono text-[#87968C] z-10">
        <div className="flex items-center gap-2 truncate">
          <ShieldCheck size={12} className="text-[#345343] shrink-0" />
          <span className="truncate">KAREEGAR_GOVERNANCE // ACTIVE: {activePage.title.toUpperCase()}</span>
        </div>
        <div className="hidden sm:block">
          <span>ABHINAVA JEWELRY OS v2.4</span>
        </div>
      </footer>

    </div>
  );
}