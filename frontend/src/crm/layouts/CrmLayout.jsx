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
  ShieldCheck,
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
      { label: "Forms", path: "/crm/kareegar/forms" },
      { label: "Ledger", path: "/crm/kareegar/ledger" },
      { label: "Reports", path: "/crm/kareegar/reports" },
    ],
  },
  {
    label: "Investment Management",
    icon: Wallet,
    children: [
      { label: "Investors", path: "/crm/investment/investors" },
      { label: "Scheme Manager", path: "/crm/investment/schemes" },
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
   CRM LAYOUT (Harmonized with Dashboard Palette)
============================================================ */
export default function CrmLayout({ children }) {
  const { tenant } = useTenant();
  const { user, logout } = useCrmAuth();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [openMenus, setOpenMenus] = useState(() => {
    const initialState = {};
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) =>
            location.pathname === child.path ||
            location.pathname.startsWith(`${child.path}/`)
        );
        if (hasActiveChild) initialState[item.label] = true;
      }
    });
    return initialState;
  });

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
    setOpenMenus((current) => ({ ...current, [label]: !current[label] }));
  };

  const businessName = tenant?.business_name || "Your Boutique";
  const logoUrl = tenant?.logo_url || null;
  const userName = user?.displayName || user?.email || "Operator";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans text-slate-900 antialiased selection:bg-slate-200">
      
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ====================================================
          SIDEBAR: Slate-200 & White Layout
      ==================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0 w-64 shadow-xl" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed && !isMobileOpen ? "lg:w-[70px]" : "lg:w-64"}`}
      >
        {/* Collapse Control Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-5 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-2xs transition-colors hover:border-slate-300 hover:text-slate-800 lg:flex"
        >
          {isCollapsed ? <ChevronRight size={12} strokeWidth={2.5} /> : <ChevronLeft size={12} strokeWidth={2.5} />}
        </button>

        {/* Brand Area */}
        <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 ${isCollapsed && !isMobileOpen ? "justify-center px-2" : "px-4"}`}>
          <div className="flex items-center gap-2.5 w-full min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 object-contain p-0.5" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-2xs">
                <Gem size={15} strokeWidth={2.2} />
              </div>
            )}

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold tracking-tight text-slate-900">{businessName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-mono text-slate-400 font-semibold tracking-wide uppercase">ERP Core</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navigation.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const isOpen = Boolean(openMenus[item.label]);
              const isChildActive = item.children.some(
                (child) => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
              );

              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.label)}
                    className={`group flex items-center w-full rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      isCollapsed && !isMobileOpen ? "justify-center px-0" : "justify-between"
                    } ${
                      isChildActive
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-600 hover:bg-[#FAFAFA] hover:text-slate-900 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className={`shrink-0 ${isChildActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700"}`} />
                      {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
                    </div>

                    {(!isCollapsed || isMobileOpen) && (
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-150 text-slate-400 ${isOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {isOpen && (!isCollapsed || isMobileOpen) && (
                    <div className="ml-4 pl-2.5 my-1 space-y-0.5 border-l border-slate-200">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            `block rounded px-2 py-1.5 text-xs transition-colors ${
                              isActive
                                ? "bg-slate-100 text-slate-900 font-bold"
                                : "text-slate-500 hover:text-slate-900 hover:bg-[#FAFAFA]"
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

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    isCollapsed && !isMobileOpen ? "justify-center px-0" : "gap-2.5"
                  } ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:bg-[#FAFAFA] hover:text-slate-900 font-medium"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} className={`shrink-0 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700"}`} />
                    {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer & Abhinava Credits */}
        <div className="shrink-0 p-3 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={logout}
            className={`flex w-full items-center rounded-lg text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 ${
              isCollapsed && !isMobileOpen ? "justify-center py-2" : "gap-2 px-2.5 py-2"
            }`}
          >
            <LogOut size={14} className="shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
          </button>

          {/* Abhinava Softwares Footnote matching Dashboard Style */}
          {(!isCollapsed || isMobileOpen) && (
            <a
              href="http://abhinava.site/"
              target="_blank"
              rel="noreferrer"
              className="group block rounded-lg border border-slate-200 bg-[#FAFAFA] p-2.5 transition-all hover:bg-white hover:border-slate-300 hover:shadow-2xs"
            >
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                <span>Developed by</span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck size={10} /> Verified
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white border border-slate-200 p-0.5">
                  <img
                    src="/src/assets/favicon.png"
                    alt="Abhinava Softwares"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-tight text-slate-800 group-hover:text-slate-900 leading-none">
                    ABHINAVA SOFTWARES
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Technology with Purpose</p>
                </div>
              </div>
            </a>
          )}
        </div>
      </aside>

      {/* ====================================================
          MAIN APP CANVAS
      ==================================================== */}
      <div className="flex flex-1 flex-col h-screen min-w-0 overflow-hidden bg-white">
        
        {/* Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono font-medium text-slate-500">
                ORG: #{tenant?.id || "HQ-701"}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/crm/estimations" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
              <Receipt size={14} className="text-slate-400" /> Estimations
            </Link>
            <Link to="/crm/investment/investors" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
              <Wallet size={14} className="text-slate-400" /> Investments
            </Link>
            <Link to="/crm/ledger" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
              <BookOpen size={14} className="text-slate-400" /> General Ledger
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger, SKU..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white placeholder:text-slate-400 font-sans transition-all"
              />
            </div>

            <button className="relative rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition-colors">
              <Bell size={14} />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-bold font-mono shadow-2xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold leading-none text-slate-900">{userName}</span>
                <span className="text-[9.5px] text-slate-400 font-mono mt-0.5">Admin Operator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Viewport Content */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}