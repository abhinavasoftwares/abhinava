import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  SlidersHorizontal,
  Building2,
  Gem,
  Users,
  UserCog,
  ShieldCheck,
  Receipt,
  CreditCard,
  Database,
  ClipboardList,
  Lock,
  Search,
  ArrowRight,
  ArrowLeft,
  X,
  KeyRound,
  Calculator,
  Shapes,
  Check,
  Layers,
  Palette,
} from "lucide-react";

import { useTenant } from "../../context/TenantContext";

import CrmGeneralSettingsPage from "../CrmGeneralSettingsPage";
import CrmKareegarDirectoryPage from "../CrmKareegarDirectoryPage";
import KareegarCalculationSettingsPage from "../../modules/kareegar/pages/KareegarCalculationSettingsPage";
import KareegarOrnamentCategoriesPage from "../../modules/kareegar/pages/KareegarOrnamentCategoriesPage";

import ReceiptSeriesSettings from "../../components/settings/ReceiptSeriesSettings";
// import InvoiceDesignSettings from "../../components/settings/InvoiceDesignSettings";
import EmployeeAccessSettings from "../../components/settings/EmployeeAccessSettings";

const noScroll =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

/* =========================================================
   SETTINGS ARCHITECTURE
========================================================= */

const SETTINGS_SECTIONS = [
  {
    id: "business",
    title: "Business & Identity",
    badge: "CORE",
    description: "Business profile, regional localization, and master terminal passcode locks.",
    icon: Building2,
    settings: [
      {
        id: "general",
        title: "Master Terminal Security PIN",
        description: "Configure PBKDF2 master key for high-privilege bullion overrides and financial actions.",
        icon: KeyRound,
        type: "general",
        status: "available",
      },
    ],
  },
  {
    id: "jewelry",
    title: "Jewelry Master Data",
    badge: "TAXONOMY",
    description: "Standard ornament classifications, hallmark identifiers, and purity benchmarks.",
    icon: Gem,
    settings: [
      {
        id: "ornament-categories",
        title: "Ornament Categories",
        description: "Classify items (Chains, Bangles, Rings) for Kareegar return processing and cataloging.",
        icon: Shapes,
        type: "ornament-categories",
        status: "available",
      },
      {
        id: "metals-purity",
        title: "Metals & Purity",
        description: "Configure gold, silver, and other metal purity standards and Karat marks.",
        icon: Gem,
        type: "planned",
        status: "planned",
      },
      {
        id: "making-charges",
        title: "Making Charges",
        description: "Configure default making charge rules, per-gram labor, and calculation preferences.",
        icon: Calculator,
        type: "planned",
        status: "planned",
      },
    ],
  },
  {
    id: "kareegar",
    title: "Kareegar Management",
    badge: "WORKSHOP",
    description: "Goldsmith registry, job work tolerance baselines, and wastage math engines.",
    icon: Users,
    settings: [
      {
        id: "kareegar-directory",
        title: "Kareegar Directory",
        description: "Manage B2B workshops, B2J in-house goldsmiths, contact files, and portal access.",
        icon: Users,
        type: "kareegar-directory",
        status: "available",
      },
      {
        id: "kareegar-calculations",
        title: "Calculation & Wastage Rules",
        description: "Configure assignment, wastage, melting loss, and return calculations.",
        icon: Calculator,
        type: "kareegar-calculations",
        status: "available",
      },
    ],
  },
  {
    id: "documents",
    title: "Documents & Billing",
    badge: "FISCAL",
    description: "Receipt numbering, invoice visual design, and business document configuration.",
    icon: Receipt,
    settings: [
      {
        id: "receipt-series",
        title: "Receipt Series",
        description: "Configure receipt numbering series and modules where each series is used.",
        icon: Receipt,
        type: "receipt-series",
        status: "available",
      },
      {
        id: "invoice-design",
        title: "Invoice Design",
        description: "Configure invoice background, heading, GST details, and visual styling.",
        icon: Palette,
        type: "invoice-design",
        status: "available",
      },
    ],
  },
  {
    id: "employees",
    title: "Workforce & Permissions",
    badge: "ACCESS",
    icon: UserCog,
    settings: [
      {
        id: "employee-access",
        title: "Employee Access",
        description: "Create employees, assign roles, configure login methods, and module permissions.",
        icon: UserCog,
        type: "employee-access",
        status: "available",
      },
    ],
  },
  {
    id: "security",
    title: "Security & Sessions",
    badge: "SEAL",
    icon: ShieldCheck,
    settings: [
      {
        id: "authentication",
        title: "Authentication Methods",
        description: "Configure supported authentication methods and login policies.",
        icon: ShieldCheck,
        type: "planned",
        status: "planned",
      },
      {
        id: "mfa",
        title: "Multi-Factor Authentication",
        description: "Require additional authentication for sensitive operations.",
        icon: ShieldCheck,
        type: "planned",
        status: "planned",
      },
      {
        id: "passkeys",
        title: "Biometric Passkeys",
        description: "Configure passkeys and biometric authentication for trusted devices.",
        icon: ShieldCheck,
        type: "planned",
        status: "planned",
      },
    ],
  },
  {
    id: "payments",
    title: "Payment Processing",
    badge: "PAYMENTS",
    icon: CreditCard,
    settings: [
      {
        id: "payment-methods",
        title: "Tender Methods",
        description: "Configure cash, UPI, bank transfer, and card payment methods.",
        icon: CreditCard,
        type: "planned",
        status: "planned",
      },
      {
        id: "payment-gateways",
        title: "Online Gateway Integrations",
        description: "Connect supported payment gateway integrations.",
        icon: CreditCard,
        type: "planned",
        status: "planned",
      },
    ],
  },
  {
    id: "data",
    title: "Data & Storage",
    badge: "CLUSTER",
    icon: Database,
    settings: [
      {
        id: "export",
        title: "CSV & Ledger Export",
        description: "Export permitted business records for reconciliation and audit.",
        icon: Database,
        type: "planned",
        status: "planned",
      },
      {
        id: "archive",
        title: "Archival Rules",
        description: "Configure retention rules for completed and archived records.",
        icon: Database,
        type: "planned",
        status: "planned",
      },
    ],
  },
  {
    id: "audit",
    title: "System Audit Logs",
    badge: "AUDIT",
    icon: ClipboardList,
    settings: [
      {
        id: "activity",
        title: "Operational Log",
        description: "View administrative changes and operational activity.",
        icon: ClipboardList,
        type: "planned",
        status: "planned",
      },
      {
        id: "security-activity",
        title: "Security Telemetry",
        description: "Review authentication and security telemetry.",
        icon: ShieldCheck,
        type: "planned",
        status: "planned",
      },
    ],
  },
];

export default function CrmSettings() {
  const { tenant } = useTenant();

  // Active step flow: 0 = Domain Cards, 1 = Applicable Controls, 2 = Execution Canvas
  const [step, setStep] = useState(0);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [search, setSearch] = useState("");

  const searchInputRef = useRef(null);

  const businessName =
    tenant?.business_name || tenant?.businessName || "Workspace";

  // Flow Navigation
  const stepTo = (targetStep) => {
    if (targetStep === 0) {
      setStep(0);
      setSelectedSection(null);
      setSelectedSetting(null);
      setSearch("");
    } else if (targetStep === 1 && selectedSection) {
      setStep(1);
      setSelectedSetting(null);
    }
  };

  const handleSelectSection = (section) => {
    setSelectedSection(section);
    setSelectedSetting(null);
    setStep(1);
  };

  const handleSelectSetting = (setting) => {
    if (setting.status !== "available") return;
    setSelectedSetting(setting);
    setStep(2);
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "/" &&
        document.activeElement !== searchInputRef.current
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter sections
  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SETTINGS_SECTIONS;

    return SETTINGS_SECTIONS.filter((sec) => {
      const matchHeader =
        sec.title.toLowerCase().includes(q) ||
        sec.description.toLowerCase().includes(q) ||
        sec.badge.toLowerCase().includes(q);

      const matchSettings = sec.settings.some(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );

      return matchHeader || matchSettings;
    });
  }, [search]);

  // Stage 3 Workspace Renderer
  const renderWorkspace = (setting) => {
    if (!setting) return null;

    switch (setting.type) {
      case "general":
        return <CrmGeneralSettingsPage />;
      case "ornament-categories":
        return <KareegarOrnamentCategoriesPage />;
      case "kareegar-directory":
        return <CrmKareegarDirectoryPage />;
      case "kareegar-calculations":
        return <KareegarCalculationSettingsPage />;
      case "receipt-series":
        return <ReceiptSeriesSettings />;
      case "invoice-design":
        return <InvoiceDesignSettings />;
      case "employee-access":
        return <EmployeeAccessSettings />;
      case "planned":
      default:
        return (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center p-8 text-center bg-slate-50">
            <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs">
              <Lock size={18} />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 tracking-tight">
              Module Staged on Enterprise Roadmap
            </h3>
            <p className="mt-1 max-w-xs text-[11px] text-slate-500 leading-relaxed">
              This module is currently queued on the product roadmap for {businessName}.
            </p>
            <button
              type="button"
              onClick={() => stepTo(1)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-all shadow-2xs"
            >
              <ArrowLeft size={12} />
              <span>Back to Controls</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none relative">
      {/* =========================================================
          INTERACTIVE STEPPER PROGRESS TRACKER (HUD RAIL)
      ========================================================= */}
      <header className="shrink-0 h-14 w-full border-b border-slate-200/90 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 z-20">
        {/* Step Nodes Journey */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono">
          {/* Step 0: Domains */}
          <button
            type="button"
            onClick={() => stepTo(0)}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-all ${
              step === 0
                ? "bg-slate-900 text-white font-semibold shadow-2xs"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                step === 0
                  ? "bg-white/20 text-white"
                  : step > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {step > 0 ? <Check size={10} strokeWidth={3} /> : "1"}
            </div>
            <span className="uppercase tracking-wider text-[11px]">Domains</span>
          </button>

          <span className="text-slate-300 font-mono">/</span>

          {/* Step 1: Controls */}
          <button
            type="button"
            onClick={() => stepTo(1)}
            disabled={step < 1}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-all ${
              step === 1
                ? "bg-slate-900 text-white font-semibold shadow-2xs"
                : step > 1
                ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                : "text-slate-300 cursor-not-allowed"
            }`}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                step === 1
                  ? "bg-white/20 text-white"
                  : step > 1
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > 1 ? <Check size={10} strokeWidth={3} /> : "2"}
            </div>
            <span className="uppercase tracking-wider text-[11px] truncate max-w-[120px] sm:max-w-[170px]">
              {selectedSection ? selectedSection.title : "Controls"}
            </span>
          </button>

          <span className="text-slate-300 font-mono">/</span>

          {/* Step 2: Workspace */}
          <div
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-all ${
              step === 2
                ? "bg-slate-900 text-white font-semibold shadow-2xs"
                : "text-slate-300"
            }`}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                step === 2
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              3
            </div>
            <span className="uppercase tracking-wider text-[11px] truncate max-w-[130px] sm:max-w-[190px]">
              {selectedSetting ? selectedSetting.title : "Configuration"}
            </span>
          </div>
        </div>

        {/* Global Action / Search / Return */}
        <div className="flex items-center gap-2 justify-end">
          {step === 0 ? (
            <div className="relative w-36 sm:w-56">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search... (/)"
                className="h-7 w-full rounded-md border border-slate-200 bg-slate-50 pl-7 pr-6 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => stepTo(step - 1)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <ArrowLeft size={11} />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================
          CONTINUOUS SPATIAL HORIZONTAL FILMSTRIP (3-PHASE CANVAS)
      ========================================================= */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          className="flex h-full w-[300%] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${(step * 100) / 3}%)` }}
        >
          {/* -----------------------------------------------------
              STAGE 1: DOMAIN SECTION SELECTION MATRIX
          ----------------------------------------------------- */}
          <div className={`w-1/3 h-full overflow-y-auto ${noScroll} p-4 sm:p-6 lg:p-8`}>
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                    Configuration Domains
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select a section to inspect and edit operational rules
                  </p>
                </div>

                <span className="text-[10.5px] font-mono text-slate-400">
                  {filteredSections.length} REGISTERED
                </span>
              </div>

              {/* Cards Grid: Ultra Compact, Interactive SaaS Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredSections.map((section) => {
                  const SecIcon = section.icon;
                  const total = section.settings.length;
                  const activeLive = section.settings.filter(
                    (s) => s.status === "available"
                  ).length;
                  const isAllLive = activeLive === total;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleSelectSection(section)}
                      className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 text-left shadow-2xs hover:border-slate-400 hover:shadow-xs hover:-translate-y-0.5 transition-all active:scale-[0.99]"
                    >
                      <div>
                        {/* Top: Icon + Badge + Live Pill */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors shadow-2xs">
                            <SecIcon size={14} strokeWidth={2.2} />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono font-bold text-slate-500">
                              {section.badge}
                            </span>

                            {activeLive > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[9px] font-mono font-semibold text-slate-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {isAllLive ? "Live" : `${activeLive}/${total}`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-50 border border-slate-200 px-1.5 py-0.2 text-[9px] font-mono text-slate-400">
                                <Lock size={8} />
                                Soon
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="mt-2.5">
                          <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-950 transition-colors truncate">
                            {section.title}
                          </h3>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                            {section.description}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Footer Details */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[10px] text-slate-400">
                          {total} {total === 1 ? "option" : "options"}
                        </span>

                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                          <ArrowRight
                            size={11}
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------
              STAGE 2: APPLICABLE CONTROLS DECK
          ----------------------------------------------------- */}
          <div className={`w-1/3 h-full overflow-y-auto ${noScroll} p-4 sm:p-6 lg:p-8`}>
            {selectedSection && (
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Domain Header Card */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-2xs">
                      <selectedSection.icon size={16} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs font-bold text-slate-900 uppercase font-mono truncate">
                          {selectedSection.title}
                        </h2>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono text-slate-500">
                          {selectedSection.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {selectedSection.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono text-xs">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Configurable
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {
                        selectedSection.settings.filter(
                          (s) => s.status === "available"
                        ).length
                      }{" "}
                      / {selectedSection.settings.length}
                    </span>
                  </div>
                </div>

                {/* Applicable Control Options List: Compact Interactive Tiles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-[10.5px] font-mono text-slate-400">
                    <span>APPLICABLE CONTROLS</span>
                    <span>CLICK TO OPEN WORKSPACE</span>
                  </div>

                  <div className="space-y-2">
                    {selectedSection.settings.map((setting) => {
                      const SettingIcon = setting.icon;
                      const isAvailable = setting.status === "available";

                      return (
                        <div
                          key={setting.id}
                          onClick={() => handleSelectSetting(setting)}
                          className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition-all ${
                            isAvailable
                              ? "border-slate-200/90 bg-white shadow-2xs hover:border-slate-400 hover:shadow-xs hover:-translate-y-0.5 cursor-pointer group active:scale-[0.99]"
                              : "border-slate-200/60 bg-slate-50/70 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                                isAvailable
                                  ? "bg-slate-50 border-slate-200 text-slate-700 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900"
                                  : "bg-slate-100 border-slate-200 text-slate-400"
                              }`}
                            >
                              <SettingIcon size={14} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-slate-900 truncate">
                                  {setting.title}
                                </h3>
                                {isAvailable ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono font-medium text-slate-600">
                                    <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono text-slate-400">
                                    <Lock size={8} />
                                    Roadmap
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5 truncate">
                                {setting.description}
                              </p>
                            </div>
                          </div>

                          {isAvailable && (
                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-900 transition-colors shrink-0">
                              <ArrowRight
                                size={13}
                                className="group-hover:translate-x-0.5 transition-transform"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* -----------------------------------------------------
              STAGE 3: FULL WORKSPACE EMBED
          ----------------------------------------------------- */}
          <div className="w-1/3 h-full min-h-0 bg-[#F8FAFC]">
            {selectedSetting ? (
              <div className="w-full h-full min-h-0">
                {renderWorkspace(selectedSetting)}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-mono text-slate-400">
                Select a control from Step 2 to configure.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          FOOTER STATUS STRIP (SHRINK-0)
      ========================================================= */}
      <footer className="shrink-0 h-8 w-full border-t border-slate-200/90 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between text-[10px] font-mono text-slate-400 z-20">
        <div className="flex items-center gap-1.5 truncate">
          <Layers size={11} className="text-slate-400 shrink-0" />
          <span className="truncate">
            FLOW STAGE {step + 1} OF 3:{" "}
            {step === 0
              ? "DOMAINS"
              : step === 1
              ? selectedSection?.title.toUpperCase()
              : selectedSetting?.title.toUpperCase()}
          </span>
        </div>
        <div className="hidden sm:block">
          <span>ABHINAVA JEWELRY OS v2.4</span>
        </div>
      </footer>
    </div>
  );
}