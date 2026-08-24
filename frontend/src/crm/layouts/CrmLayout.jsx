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
} from "lucide-react";

import {
  NavLink,
  useLocation,
  Link,
} from "react-router-dom";

import { useTenant } from "../context/TenantContext";
import { useCrmAuth } from "../context/CrmAuthContext";

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

  // ==========================================================
  // KAREEGAR MANAGEMENT
  // ==========================================================

  

  // ==========================================================
  // SETTINGS
  // ==========================================================

  {
    label: "Settings",
    path: "/crm/settings",
    icon: BookOpen,
  },
];

export default function CrmLayout({
  children,
}) {
  const { tenant } = useTenant();
  const { user, logout } = useCrmAuth();
  const location = useLocation();

  const [
    isCollapsed,
    setIsCollapsed,
  ] = useState(
    window.innerWidth < 1024
  );

  const [
    isMobileOpen,
    setIsMobileOpen,
  ] = useState(false);

  const [
    openMenus,
    setOpenMenus,
  ] = useState(() => {
    const initialState = {};

    navigation.forEach((item) => {
      if (
        item.children &&
        location.pathname.startsWith(
          "/crm/kareegar"
        )
      ) {
        initialState[item.label] = true;
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

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    navigation.forEach((item) => {
      if (
        item.children &&
        item.children.some(
          (child) =>
            location.pathname ===
              child.path ||
            location.pathname.startsWith(
              `${child.path}/`
            )
        )
      ) {
        setOpenMenus((current) => ({
          ...current,
          [item.label]: true,
        }));
      }
    });
  }, [location.pathname]);

  const toggleMenu = (label) => {
    setOpenMenus((current) => ({
      ...current,
      [label]: !current[label],
    }));
  };

  const businessName =
    tenant?.business_name ||
    "Boutique";

  const logoUrl =
    tenant?.logo_url || null;

  const userName =
    user?.displayName ||
    user?.email ||
    "Concierge";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans text-[#1B241E] selection:bg-[#345343]/20">

      {/* ====================================================
          MOBILE OVERLAY
      ==================================================== */}

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm lg:hidden"
          onClick={() =>
            setIsMobileOpen(false)
          }
        />
      )}

      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[#E2E8E4] bg-[#F5F7F5] transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen
            ? "translate-x-0 w-[260px]"
            : "-translate-x-full lg:translate-x-0"
        } ${
          isCollapsed &&
          !isMobileOpen
            ? "lg:w-[80px]"
            : "lg:w-[260px]"
        }`}
      >

        {/* ==================================================
            COLLAPSE TOGGLE
        ================================================== */}

        <button
          type="button"
          onClick={() =>
            setIsCollapsed(
              !isCollapsed
            )
          }
          className="absolute -right-3 top-8 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-[#E2E8E4] bg-white text-[#345343] shadow-sm transition-transform hover:scale-110 lg:flex"
        >
          {isCollapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>

        {/* ==================================================
            BRAND
        ================================================== */}

        <div
          className={`flex h-[70px] shrink-0 items-center justify-center border-b border-[#E2E8E4]/50 ${
            isCollapsed &&
            !isMobileOpen
              ? "px-2"
              : "px-5"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">

            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8E4] bg-white shadow-sm">
                <span className="font-serif text-base text-[#345343]">
                  {businessName
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
            )}

            {(!isCollapsed ||
              isMobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#1B241E]">
                  {businessName}
                </p>

                <p className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-[#87968C]">
                  Portal
                </p>
              </div>
            )}

          </div>
        </div>

        {/* ==================================================
            NAVIGATION
        ================================================== */}

        <nav className="flex-1 overflow-y-auto px-3 py-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          <div className="space-y-1">

            {navigation.map(
              (item) => {

                const Icon = item.icon;

                // ==================================================
                // ITEM WITH CHILDREN
                // ==================================================

                if (item.children) {
                  const isOpen =
                    Boolean(
                      openMenus[
                        item.label
                      ]
                    );

                  const isChildActive =
                    item.children.some(
                      (child) =>
                        location.pathname ===
                          child.path ||
                        location.pathname.startsWith(
                          `${child.path}/`
                        )
                    );

                  return (
                    <div
                      key={item.label}
                      className="pt-2"
                    >

                      {/* PARENT */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleMenu(
                            item.label
                          )
                        }
                        className={`group relative flex w-full items-center rounded-lg transition-all duration-300 ${
                          isCollapsed &&
                          !isMobileOpen
                            ? "justify-center px-0 py-2.5"
                            : "gap-3 px-3 py-2.5"
                        } ${
                          isChildActive
                            ? "text-[#345343]"
                            : "text-[#68786D] hover:bg-white/60 hover:text-[#1B241E]"
                        }`}
                      >

                        <Icon
                          size={18}
                          strokeWidth={
                            isChildActive
                              ? 2.5
                              : 2
                          }
                        />

                        {(!isCollapsed ||
                          isMobileOpen) && (
                          <>
                            <span className="flex-1 text-left text-xs font-semibold tracking-wide">
                              {item.label}
                            </span>

                            <ChevronDown
                              size={15}
                              className={`transition-transform duration-200 ${
                                isOpen
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </>
                        )}

                        {isCollapsed &&
                          !isMobileOpen && (
                            <div className="absolute left-full z-50 ml-4 hidden whitespace-nowrap rounded-md bg-[#1B241E] px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-white group-hover:block">
                              {item.label}
                            </div>
                          )}

                      </button>

                      {/* CHILDREN */}

                      {isOpen &&
                        (!isCollapsed ||
                          isMobileOpen) && (
                          <div className="ml-4 mt-1 space-y-1 border-l border-[#E2E8E4] pl-3">

                            {item.children.map(
                              (child) => (
                                <NavLink
                                  key={
                                    child.path
                                  }
                                  to={
                                    child.path
                                  }
                                  className={({
                                    isActive,
                                  }) =>
                                    `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                      isActive
                                        ? "bg-white text-[#345343] shadow-sm"
                                        : "text-[#87968C] hover:bg-white/60 hover:text-[#1B241E]"
                                    }`
                                  }
                                >
                                  {child.label}
                                </NavLink>
                              )
                            )}

                          </div>
                        )}

                    </div>
                  );
                }

                // ==================================================
                // NORMAL NAVIGATION ITEM
                // ==================================================

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `group relative flex items-center rounded-lg transition-all duration-300 ${
                        isCollapsed &&
                        !isMobileOpen
                          ? "justify-center px-0 py-2.5"
                          : "gap-3 px-3 py-2.5"
                      } ${
                        isActive
                          ? "border border-[#E2E8E4] bg-white text-[#345343] shadow-sm"
                          : "border border-transparent text-[#68786D] hover:bg-white/60 hover:text-[#1B241E]"
                      }`
                    }
                  >
                    {({
                      isActive,
                    }) => (
                      <>
                        <Icon
                          size={18}
                          strokeWidth={
                            isActive
                              ? 2.5
                              : 2
                          }
                        />

                        {(!isCollapsed ||
                          isMobileOpen) && (
                          <span className="text-xs font-semibold tracking-wide">
                            {item.label}
                          </span>
                        )}

                        {isCollapsed &&
                          !isMobileOpen && (
                            <div className="absolute left-full z-50 ml-4 hidden rounded-md bg-[#1B241E] px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
                              {item.label}
                            </div>
                          )}
                      </>
                    )}
                  </NavLink>
                );
              }
            )}

          </div>

        </nav>

        {/* ==================================================
            BOTTOM AREA
        ================================================== */}

        <div className="flex shrink-0 flex-col gap-3 border-t border-[#E2E8E4]/50 p-3">

          <button
            type="button"
            onClick={logout}
            className={`group flex w-full items-center rounded-lg text-[#68786D] transition-all hover:bg-rose-50 hover:text-rose-500 ${
              isCollapsed &&
              !isMobileOpen
                ? "justify-center py-2.5"
                : "gap-3 px-3 py-2.5"
            }`}
          >
            <LogOut size={18} />

            {(!isCollapsed ||
              isMobileOpen) && (
              <span className="text-xs font-semibold tracking-wide">
                Sign out
              </span>
            )}
          </button>

          <div
            className={`transition-all duration-300 ${
              isCollapsed &&
              !isMobileOpen
                ? "hidden opacity-0"
                : "opacity-100"
            }`}
          >
            <div
  className={`transition-all duration-300 ${
    isCollapsed && !isMobileOpen ? "hidden opacity-0" : "opacity-100"
  }`}
>
  <div className="group flex flex-col items-center justify-center rounded-xl border border-[#E2E8E4]/80 bg-[#F5F7F5]/50 px-2 py-3.5 text-center transition-all hover:border-[#345343]/20 hover:bg-[#F5F7F5]">
    
    {/* ELV8 Branding */}
    <span className="text-[7.5px] font-bold uppercase tracking-[0.2em] text-[#87968C]">
      A Product Of
    </span>
    
    <a 
      href="https://elv8.works" 
      target="_blank" 
      rel="noreferrer"
      className="mt-0.5 text-[11px] font-black tracking-widest text-[#1B241E] transition-colors hover:text-[#345343]"
    >
      ELV8 WORKS
    </a>

    {/* Luxury Hallmark Divider */}
    <div className="my-2.5 flex w-full items-center justify-center gap-2 opacity-70">
      <div className="h-px w-6 bg-gradient-to-r from-transparent to-[#87968C]" />
      <Gem size={9} className="text-[#345343]" />
      <div className="h-px w-6 bg-gradient-to-l from-transparent to-[#87968C]" />
    </div>

    {/* Abhinava Softwares Branding */}
    <span className="text-[7.5px] font-bold uppercase tracking-[0.15em] text-[#87968C]">
      Engineered By
    </span>
    
    <span className="mt-0.5 text-[9px] font-bold tracking-[0.1em] text-[#345343]">
      ABHINAVA SOFTWARES
    </span>
    
  </div>
</div>
          </div>

        </div>

      </aside>

      {/* ====================================================
          MOBILE SIDEBAR BUTTON
      ==================================================== */}

      {!isMobileOpen && (
        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(true)
          }
          className="absolute left-0 top-13 z-30 flex h-10 w-6 items-center justify-center rounded-r-xl border border-1/50 bg-white/50 text-[#345343] lg:hidden"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* ====================================================
          MAIN CONTENT
      ==================================================== */}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-white">

        {/* ==================================================
            TOP NAVBAR
        ================================================== */}

        <header className="relative z-20 flex h-[70px] shrink-0 items-center justify-between border-b border-[#E2E8E4] bg-white px-4 sm:px-6">

          <div className="flex items-center gap-4 lg:hidden">
            <div className="flex items-center gap-2">
              <Gem
                size={16}
                className="text-[#345343]"
              />

              <span className="text-sm font-bold text-[#1B241E]">
                {businessName}
              </span>
            </div>
          </div>

          <div className="hidden flex-1 items-center gap-6 lg:flex">
            <div className="flex w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-1.5 rounded-full border border-[#E2E8E4]/80 bg-[#F5F7F5] p-1 shadow-sm">

                <QuickNavButton
                  icon={Receipt}
                  label="Estimations"
                  path="/crm/estimations"
                />

                <QuickNavButton
                  icon={Wallet}
                  label="Investments"
                  path="/crm/investments"
                />

                <QuickNavButton
                  icon={BookOpen}
                  label="Ledger"
                  path="/crm/ledger"
                />

                <QuickNavButton
                  icon={Users}
                  label="Customers"
                  path="/crm/customers"
                />

              </div>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">

            <div className="relative hidden w-48 sm:block">

              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87968C]"
              />

              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-full border border-[#E2E8E4] bg-[#F5F7F5] py-1.5 pl-8 pr-3 text-xs font-medium text-[#1B241E] outline-none transition focus:border-[#345343] focus:bg-white"
              />

            </div>

            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8E4] bg-[#F5F7F5] text-[#68786D] hover:bg-white hover:text-[#345343] hover:shadow-sm"
            >
              <Bell size={14} />

              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-400" />
            </button>

            <div className="hidden h-5 w-px bg-[#E2E8E4] sm:block" />

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#345343]/20 bg-white text-xs font-bold text-[#345343] shadow-sm"
            >
              {userName
                .charAt(0)
                .toUpperCase()}
            </button>

          </div>

        </header>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-white">
          {children}
        </main>

      </div>

    </div>
  );
}

function QuickNavButton({
  icon: Icon,
  label,
  path,
}) {
  return (
    <Link
      to={path}
      className="group flex items-center gap-1.5 rounded-full px-3 py-1 transition-all hover:bg-white hover:shadow-sm"
    >
      <Icon
        size={12}
        className="text-[#345343]"
      />

      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B241E]">
        {label}
      </span>
    </Link>
  );
}