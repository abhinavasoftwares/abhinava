import { useState, useEffect } from "react";
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
} from "lucide-react";

import { NavLink, Link, useLocation } from "react-router-dom";

import { useTenant } from "../context/TenantContext";
import { useCrmAuth } from "../context/CrmAuthContext";

/* ============================================================
   CRM NAVIGATION
============================================================ */
const navigation = [
  {
    label: "Dashboard",
    path: "/crm/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Kareegar Management",
    icon: Users,
    children: [
      {
        label: "Forms",
        path: "/crm/kareegar/forms",
      },
      {
        label: "Ledger",
        path: "/crm/kareegar/ledger",
      },
      {
        label: "Reports",
        path: "/crm/kareegar/reports",
      },
    ],
  },
  {
    label: "Investment Management",
    icon: Wallet,
    children: [
      {
        label: "Investors",
        path: "/crm/investment/investors",
      },
      {
        label: "Scheme Manager",
        path: "/crm/investment/schemes",
      },
    ],
  },
  {
    label: "Customers",
    path: "/crm/customers",
    icon: Users,
  },
  {
    label: "Inventory",
    path: "/crm/inventory",
    icon: Boxes,
  },
  {
    label: "Sales",
    path: "/crm/sales",
    icon: ShoppingCart,
  },
  {
    label: "Purchases",
    path: "/crm/purchases",
    icon: Package,
  },
  {
    label: "Reports",
    path: "/crm/reports",
    icon: BarChart3,
  },
  {
    label: "Settings",
    path: "/crm/settings",
    icon: BookOpen,
  },
];

/* ============================================================
   CRM LAYOUT
============================================================ */
export default function CrmLayout({ children }) {
  const { tenant } = useTenant();
  const { user, logout } = useCrmAuth();
  const location = useLocation();

  // Layout States
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Accordion State
  const [openMenus, setOpenMenus] = useState(() => {
    const initialState = {};
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) =>
            location.pathname === child.path ||
            location.pathname.startsWith(`${child.path}/`)
        );
        if (hasActiveChild) {
          initialState[item.label] = true;
        }
      }
    });
    return initialState;
  });

  // Handle Resize
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

  // Close mobile sidebar after navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Auto open active menu
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) =>
            location.pathname === child.path ||
            location.pathname.startsWith(`${child.path}/`)
        );
        if (hasActiveChild) {
          setOpenMenus((current) => ({ ...current, [item.label]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleMenu = (label) => {
    setOpenMenus((current) => ({ ...current, [label]: !current[label] }));
  };

  const businessName = tenant?.business_name || "Boutique";
  const logoUrl = tenant?.logo_url || null;
  const userName = user?.displayName || user?.email || "Concierge";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAFA] font-sans text-[#1B241E] selection:bg-[#345343]/20">
      
      {/* ====================================================
          MOBILE OVERLAY
      ==================================================== */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1B241E]/20 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ====================================================
          SIDEBAR (Light & Compact)
      ==================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[#E2E8E4]/60 bg-white transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0 w-[240px] shadow-2xl" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed && !isMobileOpen ? "lg:w-[72px]" : "lg:w-[240px]"}`}
      >
        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-[#E2E8E4] bg-white text-[#87968C] shadow-sm transition-all hover:text-[#1B241E] hover:scale-110 lg:flex"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Brand Area */}
        <div className={`flex h-[70px] shrink-0 items-center justify-center border-b border-[#E2E8E4]/40 ${isCollapsed && !isMobileOpen ? "px-2" : "px-5"}`}>
          <div className="flex min-w-0 items-center gap-2.5 w-full">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} className="h-8 w-8 shrink-0 rounded-lg border border-[#E2E8E4] object-contain p-0.5 shadow-sm" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F7F5] text-[#345343] border border-[#E2E8E4]/60">
                <Gem size={16} strokeWidth={2.5} />
              </div>
            )}

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1 animate-in fade-in duration-300">
                <p className="truncate text-xs font-bold tracking-tight text-[#1B241E]">{businessName}</p>
                <p className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-[#87968C]">Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              /* --- ACCORDION MENU --- */
              if (item.children) {
                const isOpen = Boolean(openMenus[item.label]);
                const isChildActive = item.children.some((child) =>
                  location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
                );

                return (
                  <div key={item.label} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.label)}
                      className={`group relative flex items-center rounded-lg transition-colors ${
                        isCollapsed && !isMobileOpen ? "justify-center px-0 py-2.5" : "px-3 py-2 gap-2.5"
                      } ${isChildActive ? "bg-[#F5F7F5] text-[#1B241E]" : "text-[#68786D] hover:bg-slate-50 hover:text-[#1B241E]"}`}
                    >
                      {/* Active Indicator Line */}
                      {isChildActive && (!isCollapsed || isMobileOpen) && (
                        <div className="absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-[#345343]" />
                      )}

                      <Icon size={16} className={isChildActive ? "text-[#345343]" : ""} />
                      
                      {(!isCollapsed || isMobileOpen) && (
                        <>
                          <span className={`flex-1 text-left text-xs tracking-wide ${isChildActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
                          <ChevronDown size={14} className={`transition-transform duration-200 text-[#87968C] ${isOpen ? "rotate-180" : ""}`} />
                        </>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && !isMobileOpen && (
                        <div className="absolute left-[calc(100%+12px)] z-50 hidden whitespace-nowrap rounded-lg border border-[#E2E8E4] bg-white px-3 py-2 text-[10px] font-bold tracking-wider text-[#1B241E] shadow-xl group-hover:block">
                          {item.label}
                        </div>
                      )}
                    </button>

                    {/* Children List */}
                    {isOpen && (!isCollapsed || isMobileOpen) && (
                      <div className="ml-[18px] mt-1 flex flex-col gap-0.5 border-l border-[#E2E8E4]/60 pl-2.5 animate-in slide-in-from-top-2 duration-300">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `relative flex items-center rounded-md px-3 py-2 text-[11px] transition-colors ${
                                isActive ? "font-bold text-[#345343] bg-[#F5F7F5]" : "font-medium text-[#87968C] hover:text-[#1B241E] hover:bg-slate-50"
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              /* --- STANDARD LINK --- */
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative flex items-center rounded-lg transition-colors ${
                      isCollapsed && !isMobileOpen ? "justify-center px-0 py-2.5" : "px-3 py-2 gap-2.5"
                    } ${isActive ? "bg-[#F5F7F5] text-[#1B241E]" : "text-[#68786D] hover:bg-slate-50 hover:text-[#1B241E]"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (!isCollapsed || isMobileOpen) && (
                        <div className="absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-[#345343]" />
                      )}
                      <Icon size={16} className={isActive ? "text-[#345343]" : ""} />
                      {(!isCollapsed || isMobileOpen) && (
                        <span className={`text-xs tracking-wide ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
                      )}
                      {isCollapsed && !isMobileOpen && (
                        <div className="absolute left-[calc(100%+12px)] z-50 hidden whitespace-nowrap rounded-lg border border-[#E2E8E4] bg-white px-3 py-2 text-[10px] font-bold tracking-wider text-[#1B241E] shadow-xl group-hover:block">
                          {item.label}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* ==================================================
            BOTTOM ACTIONS & BRANDING (Light Theme Accented)
        ================================================== */}
        <div className="flex shrink-0 flex-col gap-2 p-3 border-t border-[#E2E8E4]/40">
          <button
            type="button"
            onClick={logout}
            className={`group flex items-center rounded-lg text-[#87968C] transition-colors hover:bg-rose-50 hover:text-rose-600 ${
              isCollapsed && !isMobileOpen ? "justify-center py-2.5" : "gap-2.5 px-3 py-2"
            }`}
          >
            <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
            {(!isCollapsed || isMobileOpen) && <span className="text-xs font-bold tracking-wide">Sign Out</span>}
          </button>

          {/* Light High-Visibility Branding */}
          <div className={`transition-all duration-300 ${isCollapsed && !isMobileOpen ? "hidden opacity-0" : "opacity-100 block"}`}>
            <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E8E4]/80 bg-gradient-to-br from-white to-[#F5F7F5] p-3 text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md hover:border-[#E2E8E4]">
              <span className="text-[7.5px] font-bold uppercase tracking-[0.2em] text-[#87968C]">A Product Of</span>
              <a href="https://elv8.works" target="_blank" rel="noreferrer" className="mt-0.5 text-[11px] font-black tracking-widest text-[#1B241E] transition-colors hover:text-[#345343]">ELV8 WORKS</a>
              <div className="my-2 flex w-full items-center justify-center gap-1.5 opacity-60">
                <div className="h-px w-5 bg-gradient-to-r from-transparent to-[#87968C]" />
                <Gem size={8} className="text-[#345343]" />
                <div className="h-px w-5 bg-gradient-to-l from-transparent to-[#87968C]" />
              </div>
              <span className="text-[7.5px] font-bold uppercase tracking-[0.15em] text-[#87968C]">Engineered By</span>
              <span className="mt-0.5 text-[9px] font-bold tracking-wider text-[#345343]">ABHINAVA SOFTWARES</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ====================================================
          MAIN CONTENT AREA
      ==================================================== */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-white rounded-tl-[1.5rem] lg:border-l border-[#E2E8E4]/60 lg:shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.05)]">

        {/* TOP NAVBAR (Borderless & Light) */}
        <header className="relative z-20 flex h-[70px] shrink-0 items-center justify-between border-b border-[#E2E8E4]/60 bg-white px-4 sm:px-8">
          
          {/* Mobile Hamburger & Title */}
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="flex items-center justify-center rounded-md p-2 text-[#68786D] hover:bg-[#F5F7F5] hover:text-[#1B241E] transition-colors"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-bold text-[#1B241E]">{businessName}</span>
          </div>

          {/* Desktop Quick Actions */}
          <div className="hidden flex-1 items-center gap-6 lg:flex">
            <div className="flex items-center gap-4">
              <QuickNavButton icon={Receipt} label="Estimations" path="/crm/estimations" />
              <QuickNavButton icon={Wallet} label="Investments" path="/crm/investment/investors" />
              <QuickNavButton icon={BookOpen} label="Ledger" path="/crm/ledger" />
            </div>
          </div>

          {/* Global Tools (Search, Notifications, User) */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            
            <div className="relative hidden w-52 sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3B0AA]" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-full border border-[#E2E8E4]/60 bg-[#F5F7F5] py-1.5 pl-8 pr-3 text-xs font-medium text-[#1B241E] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#345343] placeholder:text-[#A3B0AA]"
              />
            </div>

            <button type="button" className="relative p-2 text-[#87968C] hover:text-[#1B241E] hover:bg-[#F5F7F5] rounded-full transition-colors">
              <Bell size={16} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </button>

            <div className="hidden h-4 w-px bg-[#E2E8E4] sm:block mx-1" />

            {/* Profile Avatar */}
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8EDE9] text-xs font-bold text-[#345343] transition-colors hover:bg-[#D7DED9]">
              {userName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-white lg:bg-[#FAFAFA]">
          {children}
        </main>

      </div>
    </div>
  );
}

/* ============================================================
   LIGHTWEIGHT QUICK ACTION LINK
============================================================ */
function QuickNavButton({ icon: Icon, label, path }) {
  return (
    <Link
      to={path}
      className="group flex items-center gap-1.5 text-[#68786D] transition-colors hover:text-[#1B241E]"
    >
      <Icon size={14} className="transition-colors group-hover:text-[#345343]" />
      <span className="text-[11px] font-bold tracking-wide">
        {label}
      </span>
    </Link>
  );
}