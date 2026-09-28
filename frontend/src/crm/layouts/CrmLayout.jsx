import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Users,
  Search,
  Bell,
  Gem,
  Receipt,
  Wallet,
  BookOpen,
  Menu,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useTenant } from "../context/TenantContext";
import { useCrmAuth } from "../context/CrmAuthContext";
import { crmPath } from "../utils/crmRoutes";

const CRM_MODULES = {
  KAREEGAR: "kareegar",
  INVESTMENTS: "investments",
  CUSTOMERS: "customers",
  INVENTORY: "inventory",
  SALES: "sales",
  PURCHASES: "purchases",
  ESTIMATIONS: "estimations",
  LEDGER: "ledger",
  REPORTS: "reports",
};

const navigation = [
  {
    label: "Dashboard",
    path: "dashboard",
    icon: LayoutDashboard,
    iconColor: "text-sky-600",
    badgeColor: "bg-sky-50 border-sky-100",
  },
  {
    label: "Kareegar Management",
    module: CRM_MODULES.KAREEGAR,
    icon: Users,
    iconColor: "text-amber-600",
    badgeColor: "bg-amber-50 border-amber-100",
    children: [
      { label: "Forms Registry", path: "kareegar/forms" },
      { label: "Kareegar Ledger", path: "kareegar/ledger" },
      { label: "Production Reports", path: "kareegar/reports" },
    ],
  },
  {
    label: "Investments",
    module: CRM_MODULES.INVESTMENTS,
    icon: Wallet,
    iconColor: "text-indigo-600",
    badgeColor: "bg-indigo-50 border-indigo-100",
    children: [
      { label: "Investor Directory", path: "investment/investors" },
      { label: "Scheme Programs", path: "investment/schemes" },
    ],
  },
  {
    label: "Customers",
    module: CRM_MODULES.CUSTOMERS,
    path: "customers",
    icon: Users,
    iconColor: "text-violet-600",
    badgeColor: "bg-violet-50 border-violet-100",
  },
  {
    label: "Inventory",
    module: CRM_MODULES.INVENTORY,
    path: "inventory",
    icon: Boxes,
    iconColor: "text-cyan-600",
    badgeColor: "bg-cyan-50 border-cyan-100",
  },
  {
    label: "Sales Terminal",
    module: CRM_MODULES.SALES,
    path: "sales",
    icon: ShoppingCart,
    iconColor: "text-emerald-600",
    badgeColor: "bg-emerald-50 border-emerald-100",
  },
  {
    label: "Purchases",
    module: CRM_MODULES.PURCHASES,
    path: "purchases",
    icon: Package,
    iconColor: "text-teal-600",
    badgeColor: "bg-teal-50 border-teal-100",
  },
  {
    label: "Analytics & Reports",
    module: CRM_MODULES.REPORTS,
    path: "reports",
    icon: BarChart3,
    iconColor: "text-rose-600",
    badgeColor: "bg-rose-50 border-rose-100",
  },
  {
    label: "System Settings",
    path: "settings",
    icon: Settings2,
    iconColor: "text-slate-600",
    badgeColor: "bg-slate-100 border-slate-200",
    adminOnly: true,
  },
];

export default function CrmLayout({ children }) {
  const { tenant, hasModule } = useTenant();
  const { user, logout, role, isAdmin, hasModuleAccess } = useCrmAuth();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  const visibleNavigation = useMemo(() => {
    return navigation
      .map((item) => {
        if (item.adminOnly && !isAdmin) return null;
        if (!item.module) return item;
        if (!hasModule(item.module) || !hasModuleAccess(item.module, "read")) return null;

        if (item.children) {
          const visibleChildren = item.children.filter((child) => {
            if (child.adminOnly && !isAdmin) return false;
            if (!child.module) return true;
            return hasModule(child.module) && hasModuleAccess(child.module, "read");
          });

          if (visibleChildren.length === 0) return null;
          return { ...item, children: visibleChildren };
        }

        return item;
      })
      .filter(Boolean);
  }, [hasModule, hasModuleAccess, isAdmin]);

  useEffect(() => {
    const nextState = {};
    visibleNavigation.forEach((item) => {
      if (!item.children) return;
      const hasActiveChild = item.children.some((child) => {
        const childPath = crmPath(child.path);
        return location.pathname === childPath || location.pathname.startsWith(`${childPath}/`);
      });
      if (hasActiveChild) {
        nextState[item.label] = true;
      }
    });
    setOpenMenus((current) => ({ ...current, ...nextState }));
  }, [location.pathname, visibleNavigation]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      } else {
        setIsCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const businessName = tenant?.business_name || tenant?.businessName || "Your Enterprise";
  const logoUrl = tenant?.logo_url || null;
  const userName = user?.displayName || user?.email?.split("@")[0] || "Operator";

  const showEstimations = hasModule(CRM_MODULES.ESTIMATIONS) && hasModuleAccess(CRM_MODULES.ESTIMATIONS, "read");
  const showInvestments = hasModule(CRM_MODULES.INVESTMENTS) && hasModuleAccess(CRM_MODULES.INVESTMENTS, "read");
  const showLedger = hasModule(CRM_MODULES.LEDGER) && hasModuleAccess(CRM_MODULES.LEDGER, "read");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8F9FA] font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ====================================================
          LIGHT ENTERPRISE SIDEBAR
      ==================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-slate-200/90 bg-[#FAFAFA] transition-all duration-300 ease-out lg:static lg:translate-x-0 ${
          isMobileOpen
            ? "translate-x-0 w-64 shadow-xl"
            : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed && !isMobileOpen ? "lg:w-[76px]" : "lg:w-64"}`}
      >
        {/* Subtle Light Blueprint Background Doodles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25 select-none">
          <svg className="absolute -bottom-8 -right-8 h-60 w-60 text-slate-400" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 4" />
            <path d="M100 0 V200 M0 100 H200" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" />
          </svg>
        </div>

        {/* Sidebar Collapse Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-5 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition-all hover:border-slate-300 hover:text-slate-900 hover:scale-105 lg:flex"
        >
          {isCollapsed ? <ChevronRight size={12} strokeWidth={2.5} /> : <ChevronLeft size={12} strokeWidth={2.5} />}
        </button>

        {/* --------------------------------------------------
            BRAND IDENTIFIER
        --------------------------------------------------- */}
        <div
          className={`relative z-10 flex h-16 shrink-0 items-center border-b border-slate-200/80 bg-white/60 ${
            isCollapsed && !isMobileOpen ? "justify-center px-2" : "px-4"
          }`}
        >
          <div className="flex items-center gap-3 w-full min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 object-contain p-0.5 bg-white shadow-xs"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                <Gem size={16} strokeWidth={2.2} />
              </div>
            )}

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold tracking-tight text-slate-900">
                  {businessName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[9px] font-semibold text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ONLINE INSTANCE</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --------------------------------------------------
            NAVIGATION STREAM (Hidden Scrollbar)
        --------------------------------------------------- */}
        <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto p-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const isOpen = Boolean(openMenus[item.label]);
              const isChildActive = item.children.some((child) => {
                const childPath = crmPath(child.path);
                return location.pathname === childPath || location.pathname.startsWith(`${childPath}/`);
              });

              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.label)}
                    className={`group relative flex items-center w-full rounded-xl px-2.5 py-2 text-xs transition-all duration-200 ${
                      isCollapsed && !isMobileOpen ? "justify-center px-0" : "justify-between"
                    } ${
                      isChildActive
                        ? "bg-white font-bold text-slate-900 shadow-2xs border border-slate-200/80"
                        : "font-medium text-slate-600 hover:bg-slate-200/40 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${item.badgeColor} ${item.iconColor}`}>
                        <Icon size={14} strokeWidth={2} />
                      </div>

                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {(!isCollapsed || isMobileOpen) && (
                      <ChevronDown
                        size={13}
                        className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-slate-800" : ""}`}
                      />
                    )}
                  </button>

                  {/* Submenu Children */}
                  {isOpen && (!isCollapsed || isMobileOpen) && (
                    <div className="my-1 ml-5 space-y-0.5 border-l border-slate-200 pl-3">
                      {item.children.map((child) => {
                        const childPath = crmPath(child.path);
                        return (
                          <NavLink
                            key={child.path}
                            to={childPath}
                            className={({ isActive }) =>
                              `block rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                                isActive
                                  ? "bg-white font-bold text-slate-900 border border-slate-200 shadow-2xs"
                                  : "font-medium text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const itemPath = crmPath(item.path);

            return (
              <NavLink
                key={item.path}
                to={itemPath}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-xl px-2.5 py-2 text-xs transition-all duration-200 ${
                    isCollapsed && !isMobileOpen ? "justify-center px-0" : "gap-2.5"
                  } ${
                    isActive
                      ? "bg-white font-bold text-slate-900 shadow-2xs border border-slate-200/80"
                      : "font-medium text-slate-600 hover:bg-slate-200/40 hover:text-slate-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${item.badgeColor} ${item.iconColor}`}>
                      <Icon size={14} strokeWidth={2} />
                    </div>

                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* --------------------------------------------------
            FOOTER STATUS & SIGNOUT
        --------------------------------------------------- */}
        <div className="relative z-10 shrink-0 space-y-2 border-t border-slate-200/80 p-3 bg-white/50">
          <button
            type="button"
            onClick={logout}
            className={`flex w-full items-center rounded-xl text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 ${
              isCollapsed && !isMobileOpen ? "justify-center py-2" : "gap-2 px-3 py-2"
            }`}
          >
            <LogOut size={14} className="shrink-0 text-slate-400 group-hover:text-rose-600" />
            {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
          </button>

          {(!isCollapsed || isMobileOpen) && (
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-[10px] font-mono text-slate-400 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase tracking-wider">Tenant Cloud</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <ShieldCheck size={11} /> Verified
                </span>
              </div>
              <p className="mt-1 truncate font-sans text-xs font-semibold text-slate-700">
                ABHINAVA PLATFORM
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ====================================================
          MAIN APP CANVAS
      ==================================================== */}
      <div className="flex flex-1 flex-col h-screen min-w-0 overflow-hidden bg-white">
        
        {/* Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <span className="hidden font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:inline-block">
              WORKSPACE CONSOLE
            </span>
          </div>

          {/* Center Navigation Shortcuts */}
          <div className="hidden items-center gap-3 md:flex">
            {showEstimations && (
              <Link
                to={crmPath("estimations")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
              >
                <Receipt size={13} className="text-amber-600" />
                Estimations
              </Link>
            )}

            {showInvestments && (
              <Link
                to={crmPath("investment/investors")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
              >
                <Wallet size={13} className="text-indigo-600" />
                Investments
              </Link>
            )}

            {showLedger && (
              <Link
                to={crmPath("ledger")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
              >
                <BookOpen size={13} className="text-emerald-600" />
                General Ledger
              </Link>
            )}
          </div>

          {/* Search, Notifications & User Area */}
          <div className="flex items-center gap-3">
            <div className="relative hidden w-52 sm:block">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger, SKU..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 font-sans text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>

            <button
              type="button"
              className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-2 text-slate-500 transition hover:bg-white hover:text-slate-800"
            >
              <Bell size={14} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
            </button>

            {/* Profile Avatar Pill */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-1 pr-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-bold text-white shadow-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden flex-col text-left lg:flex">
                <span className="text-xs font-bold leading-none text-slate-900">
                  {userName}
                </span>
                <span className="mt-0.5 font-mono text-[9px] font-semibold text-slate-400">
                  {role === "ADMIN_OWNER" ? "Admin Owner" : role || "Operator"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* --------------------------------------------------
            INTERNAL INVISIBLE-SCROLL CONTAINER
        --------------------------------------------------- */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </main>
      </div>

    </div>
  );
}