import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Database,
  FileText,
  HardDrive,
  Mail,
  MessageCircle,
  PackagePlus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";

import { useTenant } from "../context/TenantContext";
import { useCrmAuth } from "../context/CrmAuthContext";

export default function CrmDashboardPage() {
  const { tenant } = useTenant();
  const { authorization } = useCrmAuth();

  const businessName =
    tenant?.business_name ||
    tenant?.businessName ||
    "Your Business";

  const currentUserName =
    authorization?.name ||
    authorization?.user?.name ||
    "Administrator";

  /*
   * -------------------------------------------------------------
   * PHASE 1
   * -------------------------------------------------------------
   * These are intentionally not fake business numbers.
   * Real values will be connected module-by-module.
   */
  const metrics = [
    {
      label: "Sales Today",
      value: "—",
      note: "Awaiting live data",
      icon: ShoppingBag,
    },
    {
      label: "Estimates",
      value: "—",
      note: "Pending attention",
      icon: FileText,
    },
    {
      label: "Receivables",
      value: "—",
      note: "Outstanding",
      icon: CircleDollarSign,
    },
    {
      label: "Stock Value",
      value: "—",
      note: "Current valuation",
      icon: Boxes,
    },
  ];

  /*
   * Real activity engine will populate this later.
   */
  const activities = [
    {
      icon: Activity,
      title: "Activity centre is ready",
      description:
        "CRM actions from every authorized employee will appear here.",
      meta: "System",
      time: "Waiting for activity data",
    },
  ];

  /*
   * Live employee presence will be connected later.
   */
  const activeEmployees = [];

  const quickActions = [
    {
      label: "Sale",
      icon: ShoppingBag,
      module: "sales",
    },
    {
      label: "Estimation",
      icon: FileText,
      module: "estimations",
    },
    {
      label: "Customer",
      icon: UserPlus,
      module: "customers",
    },
    {
      label: "Stock In",
      icon: PackagePlus,
      module: "inventory",
    },
    {
      label: "Purchase",
      icon: WalletCards,
      module: "purchases",
    },
    {
      label: "Investment",
      icon: CircleDollarSign,
      module: "investments",
    },
  ];

  return (
    <div className="min-h-full bg-[#f5f4f0] text-[#171717]">
      <div className="mx-auto w-full max-w-[1700px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">

        {/* =========================================================
            TOP COMMAND BAR
        ========================================================== */}

        <header className="border-b border-[#dcdad2] pb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a68a52]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a877d]">
                  Business Command Centre
                </span>
              </div>

              <h1 className="font-serif text-[30px] leading-none tracking-[-0.03em] text-[#171717] sm:text-[38px]">
                {businessName}
              </h1>

              <p className="mt-2 text-xs text-[#77746c]">
                Good to see you,{" "}
                <span className="font-medium text-[#44423d]">
                  {currentUserName}
                </span>
                . Here's your business at a glance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <StatusItem
                icon={ShieldCheck}
                label="Security"
                value="Protected"
              />

              <StatusItem
                icon={Database}
                label="CRM"
                value="Operational"
              />

              <div className="h-8 w-px bg-[#d8d5cc] hidden sm:block" />

              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#1d1d1b] px-4 text-[11px] font-semibold text-white transition hover:bg-[#30302d]"
              >
                <Plus size={14} />
                New
              </button>
            </div>
          </div>
        </header>

        {/* =========================================================
            KPI STRIP
        ========================================================== */}

        <section className="grid grid-cols-2 border-b border-[#dcdad2] lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <Metric
              key={metric.label}
              {...metric}
              first={index === 0}
            />
          ))}
        </section>

        {/* =========================================================
            MAIN WORKSPACE
        ========================================================== */}

        <section className="grid border-b border-[#dcdad2] lg:grid-cols-[minmax(0,1fr)_350px]">

          {/* -------------------------------------------------------
              ACTIVITY
          -------------------------------------------------------- */}

          <div className="border-b border-[#dcdad2] lg:border-b-0 lg:border-r lg:border-[#dcdad2]">

            <div className="flex items-end justify-between px-1 py-5 sm:px-0">

              <div>
                <div className="flex items-center gap-2">
                  <Activity
                    size={15}
                    strokeWidth={1.8}
                    className="text-[#8c7546]"
                  />

                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#34332f]">
                    Business Activity
                  </h2>
                </div>

                <p className="mt-1 text-[11px] text-[#8b887f]">
                  Everything important happening across your CRM
                </p>
              </div>

              <button
                type="button"
                className="hidden items-center gap-1 text-[10px] font-semibold text-[#6e6a61] hover:text-[#171717] sm:flex"
              >
                Activity centre
                <ArrowUpRight size={12} />
              </button>
            </div>

            <div className="overflow-hidden border-t border-[#e1dfd8]">

              {activities.map((activity, index) => {
                const Icon = activity.icon;

                return (
                  <div
                    key={`${activity.title}-${index}`}
                    className="group grid grid-cols-[34px_minmax(0,1fr)_auto] gap-3 border-b border-[#e8e6df] px-1 py-4 last:border-b-0 sm:px-0"
                  >
                    <div className="flex h-7 w-7 items-center justify-center border border-[#dedbd2] bg-[#faf9f6] text-[#81704e]">
                      <Icon size={13} strokeWidth={1.7} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-xs font-semibold text-[#272622]">
                          {activity.title}
                        </p>

                        <span className="text-[9px] uppercase tracking-wider text-[#9a978e]">
                          {activity.meta}
                        </span>
                      </div>

                      <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[#77746c]">
                        {activity.description}
                      </p>
                    </div>

                    <span className="whitespace-nowrap pt-0.5 text-[9px] text-[#a09d94]">
                      {activity.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------
              TEAM
          -------------------------------------------------------- */}

          <div className="px-1 sm:px-0 lg:px-6">

            <div className="flex items-end justify-between py-5">
              <div>
                <div className="flex items-center gap-2">
                  <Users
                    size={15}
                    strokeWidth={1.8}
                    className="text-[#8c7546]"
                  />

                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#34332f]">
                    Team
                  </h2>
                </div>

                <p className="mt-1 text-[11px] text-[#8b887f]">
                  Employees active right now
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5f8a61]" />

                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6d756d]">
                  Live
                </span>
              </div>
            </div>

            <div className="border-t border-[#e1dfd8]">

              {activeEmployees.length === 0 ? (
                <div className="flex min-h-[215px] flex-col items-center justify-center text-center">

                  <div className="flex h-10 w-10 items-center justify-center border border-[#dedbd2] bg-[#faf9f6] text-[#aaa69d]">
                    <Users size={17} strokeWidth={1.5} />
                  </div>

                  <p className="mt-4 text-xs font-semibold text-[#59564f]">
                    Live presence coming next
                  </p>

                  <p className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-[#99968d]">
                    Online employees, current activity and last active time
                    will appear here.
                  </p>

                </div>
              ) : (
                <div>
                  {activeEmployees.map((employee) => (
                    <EmployeeRow
                      key={employee.id}
                      employee={employee}
                    />
                  ))}
                </div>
              )}

            </div>

            <button
              type="button"
              className="mt-4 flex w-full items-center justify-between border-t border-[#e1dfd8] py-3 text-[10px] font-semibold uppercase tracking-wider text-[#77736a] transition hover:text-[#1d1d1b]"
            >
              Employee access
              <ChevronRight size={13} />
            </button>
          </div>

        </section>

        {/* =========================================================
            QUICK ACTIONS
        ========================================================== */}

        <section className="border-b border-[#dcdad2]">

          <div className="flex items-center justify-between py-4">

            <div className="flex items-center gap-2">
              <BriefcaseBusiness
                size={15}
                strokeWidth={1.8}
                className="text-[#8c7546]"
              />

              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#34332f]">
                  Quick Actions
                </h2>

                <p className="mt-0.5 text-[10px] text-[#8b887f]">
                  Frequently used operations
                </p>
              </div>
            </div>

            <button
              type="button"
              className="text-[10px] font-semibold text-[#77736a] hover:text-[#171717]"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-2 border-t border-[#e1dfd8] sm:grid-cols-3 lg:grid-cols-6">

            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.label}
                  type="button"
                  className="group flex items-center gap-3 border-b border-[#e1dfd8] px-3 py-4 text-left transition hover:bg-[#efede7] sm:border-r last:sm:border-r-0 lg:border-b-0"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#d9d5ca] bg-[#faf9f6] text-[#716044] transition group-hover:border-[#b8aa8b] group-hover:bg-white">
                    <Icon size={14} strokeWidth={1.7} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[#3c3a35]">
                      {action.label}
                    </p>

                    <p className="mt-0.5 text-[9px] text-[#9a968c]">
                      Open
                    </p>
                  </div>

                  <ChevronRight
                    size={12}
                    className="ml-auto shrink-0 text-[#bbb7ae] transition group-hover:translate-x-0.5 group-hover:text-[#716044]"
                  />
                </button>
              );
            })}

          </div>
        </section>

        {/* =========================================================
            BOTTOM UTILITIES
        ========================================================== */}

        <section className="grid border-b border-[#dcdad2] lg:grid-cols-[1fr_1fr]">

          {/* SYSTEM */}

          <div className="border-b border-[#dcdad2] py-5 lg:border-b-0 lg:border-r lg:pr-6">

            <div className="flex items-center gap-2">
              <ShieldCheck
                size={15}
                strokeWidth={1.8}
                className="text-[#8c7546]"
              />

              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#34332f]">
                System
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-3 border-t border-[#e1dfd8]">

              <SystemItem
                label="CRM"
                value="Operational"
                healthy
              />

              <SystemItem
                label="Security"
                value="Protected"
                healthy
              />

              <SystemItem
                label="Backup"
                value="Not configured"
              />

            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#e1dfd8] pt-3">

              <div className="flex items-center gap-2">
                <HardDrive
                  size={13}
                  className="text-[#8b887f]"
                />

                <span className="text-[10px] text-[#77746c]">
                  Backup monitoring
                </span>
              </div>

              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#9b978d]">
                Coming soon
              </span>

            </div>
          </div>

          {/* TOOLS */}

          <div className="py-5 lg:pl-6">

            <div className="flex items-center gap-2">
              <BarChart3
                size={15}
                strokeWidth={1.8}
                className="text-[#8c7546]"
              />

              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#34332f]">
                Tools & Communication
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-2 border-t border-[#e1dfd8] sm:grid-cols-4">

              <ToolItem
                icon={Users}
                label="HRMS Portal"
              />

              <ToolItem
                icon={MessageCircle}
                label="WhatsApp"
              />

              <ToolItem
                icon={Mail}
                label="Email"
              />

              <ToolItem
                icon={Bell}
                label="Notifications"
              />

            </div>

          </div>

        </section>

        {/* =========================================================
            FOOTER STATUS
        ========================================================== */}

        <footer className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5f8a61]" />

            <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#8b887f]">
              Abhinava CRM
            </span>
          </div>

          <div className="flex items-center gap-4 text-[9px] uppercase tracking-wider text-[#aaa69d]">
            <span>Secure tenant</span>
            <span>•</span>
            <span>{tenant?.crmSlug || "Tenant"}</span>
          </div>

        </footer>

      </div>
    </div>
  );
}

/* ================================================================
   COMPONENTS
================================================================ */

function StatusItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#dedbd2] bg-[#faf9f6] px-3 py-2">
      <Icon
        size={13}
        strokeWidth={1.7}
        className="text-[#7b6a4b]"
      />

      <div>
        <p className="text-[8px] font-semibold uppercase tracking-wider text-[#aaa69d]">
          {label}
        </p>

        <p className="mt-0.5 text-[10px] font-semibold text-[#4b4943]">
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
}) {
  return (
    <div className="border-r border-[#dcdad2] px-3 py-5 first:pl-0 last:border-r-0 sm:px-5 lg:px-6">

      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#908d84]">
          {label}
        </p>

        <Icon
          size={14}
          strokeWidth={1.6}
          className="text-[#a08a5d]"
        />
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="font-serif text-[27px] leading-none tracking-[-0.02em] text-[#252421]">
          {value}
        </span>

        <span className="hidden text-[9px] text-[#a09c93] sm:block">
          {note}
        </span>
      </div>
    </div>
  );
}

function EmployeeRow({ employee }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#e5e2da] py-3 last:border-b-0">

      <div className="relative">
        <div className="flex h-8 w-8 items-center justify-center bg-[#eeece6] text-[10px] font-bold text-[#625a4c]">
          {employee.name?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#f5f4f0] bg-[#5f8a61]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-[#383631]">
          {employee.name}
        </p>

        <p className="truncate text-[9px] text-[#97938a]">
          {employee.currentAction || employee.role || "Active"}
        </p>
      </div>

      <span className="text-[9px] text-[#66806a]">
        Active
      </span>
    </div>
  );
}

function SystemItem({
  label,
  value,
  healthy = false,
}) {
  return (
    <div className="border-r border-[#e1dfd8] px-3 py-3 first:pl-0 last:border-r-0 sm:px-4">

      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#aaa69d]">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            healthy
              ? "bg-[#5f8a61]"
              : "bg-[#b8b3a8]"
          }`}
        />

        <span className="text-[10px] font-semibold text-[#55524b]">
          {value}
        </span>
      </div>
    </div>
  );
}

function ToolItem({
  icon: Icon,
  label,
}) {
  return (
    <button
      type="button"
      className="group flex items-center gap-2.5 border-r border-b border-[#e1dfd8] px-3 py-3 text-left transition hover:bg-[#efede7] sm:px-4 sm:border-b-0 last:border-r-0"
    >
      <Icon
        size={14}
        strokeWidth={1.6}
        className="text-[#806d4a]"
      />

      <span className="truncate text-[10px] font-semibold text-[#5a5750]">
        {label}
      </span>

      <ArrowUpRight
        size={11}
        className="ml-auto shrink-0 text-[#b0aca2] transition group-hover:text-[#706043]"
      />
    </button>
  );
}