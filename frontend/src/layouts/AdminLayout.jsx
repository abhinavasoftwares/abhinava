import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  Cpu,
  CreditCard,
  Database,
  FileChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";

import logo from "../assets/logo2.png";

/* ============================================================================
   ABHINAVA THEME
   ========================================================================== */

const THEMES = {
  light: {
    mode: "light",

    background: "#F5F7EF",
    surface: "#FBFCF7",
    surfaceAlt: "#F0F3E9",
    surfaceHover: "#EAEFE4",

    border: "#DCE4D7",
    borderStrong: "#D0DACB",

    text: "#29382D",
    textSoft: "#526055",
    textMuted: "#778277",
    textLight: "#9AA39A",

    primary: "#3C6245",
    primarySoft: "#E4ECE0",

    gold: "#A78240",
    goldSoft: "#F1E8D3",

    success: "#4F7957",
    warning: "#A78240",
    danger: "#A45E58",

    sidebar: "#F1F4EB",
    header: "#F3F6EE",

    chartGrid: "#E0E7DB",
  },

  dark: {
    mode: "dark",

    background: "#111A13",
    surface: "#19251B",
    surfaceAlt: "#1E2C20",
    surfaceHover: "#263728",

    border: "#2D3B30",
    borderStrong: "#394A3C",

    text: "#E8EEE4",
    textSoft: "#C2CCC0",
    textMuted: "#91A092",
    textLight: "#687669",

    primary: "#83B64C",
    primarySoft: "#293923",

    gold: "#B99A55",
    goldSoft: "#3A3323",

    success: "#86B88B",
    warning: "#B99A55",
    danger: "#C57972",

    sidebar: "#182319",
    header: "#182319",

    chartGrid: "#304033",
  },
};

/* ============================================================================
   THEME CONTEXT
   ========================================================================== */

const AbhinavaThemeContext =
  createContext(null);

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(
      "abhinava-admin-theme"
    );

    if (
      stored === "dark" ||
      stored === "light"
    ) {
      return stored;
    }
  } catch {
    // Ignore localStorage errors.
  }

  return "light";
}

function useAbhinavaTheme() {
  const context = useContext(
    AbhinavaThemeContext
  );

  if (!context) {
    throw new Error(
      "useAbhinavaTheme must be used inside AbhinavaThemeProvider."
    );
  }

  return context;
}

/* ============================================================================
   THEME PROVIDER
   ========================================================================== */

function AbhinavaThemeProvider({
  children,
}) {
  const [themeMode, setThemeMode] =
    useState(getStoredTheme);

  const theme =
    THEMES[themeMode];

  const toggleTheme = useCallback(() => {
    setThemeMode((current) =>
      current === "light"
        ? "dark"
        : "light"
    );
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "abhinava-admin-theme",
        themeMode
      );
    } catch {
      // Ignore localStorage errors.
    }

    document.documentElement.setAttribute(
      "data-abhinava-theme",
      themeMode
    );

    document.body.setAttribute(
      "data-abhinava-theme",
      themeMode
    );

    document.documentElement.style.backgroundColor =
      theme.background;

    document.body.style.backgroundColor =
      theme.background;

    document.body.style.color =
      theme.text;

    document.documentElement.style.colorScheme =
      themeMode;
  }, [themeMode, theme]);

  return (
    <AbhinavaThemeContext.Provider
      value={{
        themeMode,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AbhinavaThemeContext.Provider>
  );
}

/* ============================================================================
   GLOBAL STYLES
   ========================================================================== */

function AbhinavaGlobalStyles() {
  const { theme } =
    useAbhinavaTheme();

  return (
    <style>
      {`
        html,
        body,
        #root {
          min-height: 100%;
          margin: 0;
          padding: 0;
        }

        html {
          background: ${theme.background};
          scrollbar-width: thin;
          scrollbar-color: ${theme.primary} transparent;
        }

        body {
          background: ${theme.background};
          color: ${theme.text};
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        /* ================================================================
           GLOBAL SCROLLBAR
           ================================================================ */

        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }

        html::-webkit-scrollbar-track,
        body::-webkit-scrollbar-track {
          background: transparent;
        }

        html::-webkit-scrollbar-thumb,
        body::-webkit-scrollbar-thumb {
          background: ${theme.primary};
          border-radius: 999px;
        }

        html::-webkit-scrollbar-button,
        body::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }

        html::-webkit-scrollbar-corner,
        body::-webkit-scrollbar-corner {
          background: transparent;
        }

        /* ================================================================
           CONTENT SCROLLBAR
           ================================================================ */

        .abhinava-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${theme.primary} transparent;
        }

        .abhinava-scroll::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }

        .abhinava-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .abhinava-scroll::-webkit-scrollbar-thumb {
          background: ${theme.primary};
          border-radius: 999px;
        }

        .abhinava-scroll::-webkit-scrollbar-thumb:hover {
          background: ${theme.primary};
        }

        .abhinava-scroll::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }

        .abhinava-scroll::-webkit-scrollbar-corner {
          background: transparent;
        }

        /* ================================================================
           HIDDEN SCROLLBAR
           ================================================================ */

        .abhinava-no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .abhinava-no-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        /* ================================================================
           SEARCH PLACEHOLDER
           ================================================================ */

        .abhinava-search::placeholder {
          color: ${theme.textMuted};
          opacity: 0.85;
        }

        /* ================================================================
           SELECTION
           ================================================================ */

        ::selection {
          background: ${theme.primary};
          color: ${
            theme.mode === "dark"
              ? "#111A13"
              : "#FFFFFF"
          };
        }
      `}
    </style>
  );
}

/* ============================================================================
   ADMIN LAYOUT
   ========================================================================== */

export function AdminLayout({
  children,
}) {
  return (
    <AbhinavaThemeProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AbhinavaThemeProvider>
  );
}

/* ============================================================================
   ADMIN LAYOUT CONTENT
   ========================================================================== */

function AdminLayoutContent({
  children,
}) {
  const {
    themeMode,
    theme,
    toggleTheme,
  } = useAbhinavaTheme();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const API_URL =
    import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch(
        `${API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  };

  const mainNavigation = [
    {
      name: "Overview",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "Clients",
      path: "/admin/clients",
      icon: Users,
    },
    {
      name: "Subscriptions",
      path: "/admin/subscriptions",
      icon: CreditCard,
    },
    {
      name: "Ledger",
      path: "/admin/reports",
      icon: FileChartColumn,
    },
  ];

  const platformNavigation = [
    {
      name: "Provisioning",
      path: "/admin/clients",
      icon: Cpu,
    },
    {
      name: "Platform Reports",
      path: "/admin/reports",
      icon: Activity,
    },
  ];

  const settingsNavigation = [
    {
      name: "Preferences",
      path: "/admin/settings",
      icon: Settings,
    },
  ];

  return (
    <>
      <AbhinavaGlobalStyles />

      <div
        className="min-h-screen"
        style={{
          backgroundColor:
            theme.background,
          color: theme.text,
        }}
      >
        {/* ================================================================
            MOBILE OVERLAY
            ================================================================ */}

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{
              backgroundColor:
                themeMode === "dark"
                  ? "rgba(0,0,0,0.58)"
                  : "rgba(40,50,42,0.22)",
            }}
            onClick={() =>
              setSidebarOpen(false)
            }
          />
        )}

        {/* ================================================================
            FIXED SIDEBAR
            ================================================================ */}

        <aside
          className={`
            fixed left-0 top-0 z-50
            flex h-screen w-[255px]
            flex-col border-r
            transition-transform duration-300
            ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full"
            }
            lg:translate-x-0
          `}
          style={{
            backgroundColor:
              theme.sidebar,
            borderColor:
              theme.border,
          }}
        >
          {/* BRAND */}

          <div
            className="flex h-[70px] shrink-0 items-center border-b px-6"
            style={{
              borderColor:
                theme.border,
            }}
          >
            <img
              src={logo}
              alt="Abhinava"
              className="h-[38px] w-auto object-contain"
            />

            <button
              type="button"
              onClick={() =>
                setSidebarOpen(false)
              }
              className="ml-auto rounded-lg p-1.5 lg:hidden"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              <X size={18} />
            </button>
          </div>
          {/* SIDEBAR NAVIGATION */}

          <div className="abhinava-no-scrollbar flex-1 overflow-y-auto px-4 py-6">
            <SidebarSection
              label="MAIN"
              items={mainNavigation}
              theme={theme}
            />

            <div className="mt-7">
              <SidebarSection
                label="PLATFORM"
                items={
                  platformNavigation
                }
                theme={theme}
              />
            </div>

            <div className="mt-7">
              <SidebarSection
                label="SETTINGS"
                items={
                  settingsNavigation
                }
                theme={theme}
              />
            </div>
          </div>

          {/* SIDEBAR FOOTER */}

          <div
            className="shrink-0 border-t p-4"
            style={{
              borderColor:
                theme.border,
            }}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] transition-colors"
              style={{
                color:
                  theme.textMuted,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor =
                  theme.surfaceHover;

                event.currentTarget.style.color =
                  theme.danger;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor =
                  "transparent";

                event.currentTarget.style.color =
                  theme.textMuted;
              }}
            >
              <LogOut
                size={15}
                strokeWidth={1.7}
              />

              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* ================================================================
            MAIN AREA
            ================================================================ */}

        <div className="min-h-screen lg:ml-[255px]">
          {/* ==============================================================
              TOPBAR
              ============================================================== */}

          <header
            className="sticky top-0 z-30 border-b"
            style={{
              backgroundColor:
                theme.header,
              borderColor:
                theme.border,
            }}
          >
            <div className="flex h-[70px] items-center gap-4 px-4 sm:px-6 lg:px-8">
              {/* MOBILE MENU */}

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="rounded-lg p-2 lg:hidden"
                style={{
                  color:
                    theme.textSoft,
                }}
              >
                <Menu size={20} />
              </button>

              {/* CONTROL PLANE */}

              <div className="hidden items-center gap-3 md:flex">
                <span
                  className="text-[13px] font-semibold"
                  style={{
                    color:
                      theme.text,
                  }}
                >
                  Control Plane
                </span>
              </div>
              {/* SEARCH */}

              <div className="relative ml-auto w-full max-w-[285px]">
                <Search
                  size={17}
                  strokeWidth={1.7}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{
                    color:
                      theme.textMuted,
                  }}
                />

                <input
                  type="text"
                  placeholder="Search for something..."
                  className="abhinava-search h-[42px] w-full rounded-lg border bg-transparent pl-10 pr-4 text-[12px] outline-none transition"
                  style={{
                    color:
                      theme.text,
                    borderColor:
                      theme.border,
                    backgroundColor:
                      theme.surface,
                  }}
                  onFocus={(event) => {
                    event.currentTarget.style.borderColor =
                      theme.primary;
                  }}
                  onBlur={(event) => {
                    event.currentTarget.style.borderColor =
                      theme.border;
                  }}
                />
              </div>

              {/* TOP ACTIONS */}

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="relative rounded-lg p-2.5"
                  style={{
                    color:
                      theme.textSoft,
                  }}
                  title="Notifications"
                >
                  <Bell
                    size={18}
                    strokeWidth={1.7}
                  />

                  <span
                    className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        theme.danger,
                    }}
                  />
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-lg p-2.5"
                  style={{
                    color:
                      theme.textSoft,
                  }}
                  title={
                    themeMode === "light"
                      ? "Switch to dark mode"
                      : "Switch to light mode"
                  }
                >
                  {themeMode ===
                  "light" ? (
                    <Moon
                      size={18}
                      strokeWidth={1.7}
                    />
                  ) : (
                    <Sun
                      size={18}
                      strokeWidth={1.7}
                    />
                  )}
                </button>

                <div
                  className="mx-2 hidden h-7 w-px sm:block"
                  style={{
                    backgroundColor:
                      theme.border,
                  }}
                />

                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor:
                        theme.primarySoft,
                      color:
                        theme.primary,
                    }}
                  >
                    <UserRound
                      size={15}
                      strokeWidth={1.7}
                    />
                  </div>

                  <div className="hidden xl:block">
                    <p
                      className="text-[10px] font-semibold"
                      style={{
                        color:
                          theme.text,
                      }}
                    >
                      Admin
                    </p>

                    <p
                      className="text-[9px]"
                      style={{
                        color:
                          theme.textMuted,
                      }}
                    >
                      Administrator
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ==============================================================
              SCROLLABLE APPLICATION CONTENT
              ============================================================== */}

          <main
            className="abhinava-scroll min-h-[calc(100vh-70px)] overflow-y-auto"
            style={{
              backgroundColor:
                theme.background,
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

/* ============================================================================
   SIDEBAR SECTION
   ========================================================================== */

function SidebarSection({
  label,
  items,
  theme,
}) {
  return (
    <div>
      <div
        className="mb-2 px-3 text-[9px] font-semibold tracking-[0.08em]"
        style={{
          color:
            theme.textLight,
        }}
      >
        {label}
      </div>

      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/admin"}
              className="group flex items-center gap-3 rounded-full px-3 py-2.5 text-[12px] transition-all"
              style={({ isActive }) => ({
                color: isActive
                  ? theme.text
                  : theme.textSoft,

                backgroundColor:
                  isActive
                    ? theme.primarySoft
                    : "transparent",

                fontWeight: isActive
                  ? 600
                  : 400,
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={
                      isActive
                        ? 1.9
                        : 1.6
                    }
                  />

                  <span className="flex-1">
                    {item.name}
                  </span>

                  {isActive && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          theme.primary,
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

/* ============================================================================
   TOP NAV LINK
   ========================================================================== */

function TopNavLink({
  to,
  label,
  theme,
}) {
  return (
    <NavLink
      to={to}
      end={to === "/admin"}
      className="text-[11px] transition-colors"
      style={({ isActive }) => ({
        color: isActive
          ? theme.primary
          : theme.textMuted,

        fontWeight: isActive
          ? 600
          : 400,
      })}
    >
      {label}
    </NavLink>
  );
}

/* ============================================================================
   DASHBOARD
   ========================================================================== */

export function Dashboard() {
  const { theme } =
    useAbhinavaTheme();

  const API_URL =
    import.meta.env.VITE_API_BASE_URL;

  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const refreshLock =
    useRef(false);

  /* ========================================================================
     LOAD DASHBOARD
     ====================================================================== */

  const loadDashboard =
    useCallback(
      async (manual = false) => {
        if (refreshLock.current) {
          return;
        }

        refreshLock.current = true;

        if (manual) {
          setRefreshing(true);
        }

        try {
          setError("");

          const response =
            await fetch(
              `${API_URL}/admin/dashboard`,
              {
                method: "GET",
                credentials: "include",
                cache: "no-store",
              }
            );

          if (!response.ok) {
            if (
              response.status ===
              401
            ) {
              throw new Error(
                "Your platform session has expired."
              );
            }

            if (
              response.status ===
              403
            ) {
              throw new Error(
                "You do not have permission to access the dashboard."
              );
            }

            throw new Error(
              `Unable to load dashboard (${response.status}).`
            );
          }

          const data =
            await response.json();

          setDashboard(data);
        } catch (err) {
          console.error(
            "Dashboard loading failed:",
            err
          );

          setError(
            err?.message ||
              "Unable to load the dashboard."
          );
        } finally {
          refreshLock.current =
            false;

          if (manual) {
            setRefreshing(false);
          }

          setLoading(false);
        }
      },
      [API_URL]
    );

  /* ========================================================================
     INITIAL LOAD + AUTO REFRESH
     ====================================================================== */

  useEffect(() => {
    loadDashboard(false);

    const interval =
      setInterval(() => {
        loadDashboard(true);
      }, 60000);

    return () =>
      clearInterval(interval);
  }, [loadDashboard]);

  /* ========================================================================
     LOADING
     ====================================================================== */

  if (loading) {
    return (
      <DashboardShell theme={theme}>
        <div className="flex min-h-[75vh] items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  theme.primarySoft,
                color:
                  theme.primary,
              }}
            >
              <RefreshCw
                size={18}
                className="animate-spin"
              />
            </div>

            <p
              className="mt-4 text-[12px]"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              Loading platform overview...
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  /* ========================================================================
     ERROR
     ====================================================================== */

  if (error) {
    return (
      <DashboardShell theme={theme}>
        <div className="flex min-h-[75vh] items-center justify-center px-5">
          <div
            className="w-full max-w-[430px] rounded-[10px] border p-8 text-center"
            style={{
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            }}
          >
            <div
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  theme.goldSoft,
                color:
                  theme.warning,
              }}
            >
              <AlertCircle size={19} />
            </div>

            <h2
              className="mt-5 text-[17px] font-semibold"
              style={{
                color:
                  theme.text,
              }}
            >
              Dashboard unavailable
            </h2>

            <p
              className="mx-auto mt-2 max-w-[330px] text-[12px] leading-5"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
              className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[11px] font-semibold text-white"
              style={{
                backgroundColor:
                  theme.primary,
                opacity: refreshing
                  ? 0.6
                  : 1,
              }}
            >
              <RefreshCw
                size={14}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Try again"}
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  /* ========================================================================
     DATA
     ====================================================================== */

  const stats =
    dashboard?.stats || {};

  const health =
    dashboard?.health || {};

  const clients =
    dashboard?.clients || [];

  const totalClients = Number(
    stats.total_clients || 0
  );

  const activeTenants = Number(
    stats.active_tenants || 0
  );

  const provisioningReady =
    Number(
      stats.provisioning_ready || 0
    );

  const provisioningPending =
    Number(
      stats.provisioning_pending || 0
    );

  const provisioningFailed =
    Number(
      stats.provisioning_failed || 0
    );

  const activeSubscriptions =
    Number(
      stats.active_subscriptions ||
        0
    );

  const provisioningPercentage =
    totalClients > 0
      ? Math.round(
          (provisioningReady /
            totalClients) *
            100
        )
      : 0;

  const lastUpdated =
    dashboard?.updated_at ||
    dashboard?.generated_at ||
    new Date().toISOString();

  /* ========================================================================
     DASHBOARD CONTENT
     ====================================================================== */

  return (
    <DashboardShell theme={theme}>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        {/* ================================================================
            WELCOME
            ================================================================ */}

        <section className="mb-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1
                className=" text-[30px] font-semibold tracking-[-0.035em] sm:text-[36px] lg:text-[40px]"
                style={{
                  color:
                    theme.text,
                }}
              >
                Welcome back, Admin
              </h1>

              <p
                className="mt-2 max-w-[650px] text-[13px] leading-6"
                style={{
                  color:
                    theme.textMuted,
                }}
              >
                Here's what's happening
                across your Abhinava
                platform today.
              </p>
            </div>

            {/* ACTIONS */}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  loadDashboard(true)
                }
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[11px] font-medium transition-all"
                style={{
                  color:
                    theme.textSoft,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.surface,
                  opacity: refreshing
                    ? 0.6
                    : 1,
                  cursor: refreshing
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                <RefreshCw
                  size={14}
                  strokeWidth={1.8}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

              <button
                type="button"
                onClick={() =>
                  window.location.assign(
                    "/admin/clients/new"
                  )
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[11px] font-semibold text-white"
                style={{
                  backgroundColor:
                    theme.primary,
                }}
              >
                <Plus
                  size={15}
                  strokeWidth={2}
                />

                Add Client
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            METRICS
            ================================================================ */}

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <CompactMetric
              label="Total Clients"
              value={totalClients}
              description="Registered organisations"
              icon={Building2}
              theme={theme}
            />

            <CompactMetric
              label="Active Tenants"
              value={activeTenants}
              description="Operational environments"
              icon={ShieldCheck}
              theme={theme}
            />

            <CompactMetric
              label="Provisioning"
              value={`${provisioningReady}/${totalClients}`}
              description="Firebase environments ready"
              icon={Cpu}
              theme={theme}
              detail={
                <div className="mt-2 flex items-center gap-3 text-[10px]">
                  <span
                    className="flex items-center gap-1"
                    style={{ color: theme.success }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: theme.success,
                      }}
                    />
                    {provisioningReady} ready
                  </span>

                  {provisioningPending > 0 && (
                    <span
                      className="flex items-center gap-1"
                      style={{ color: theme.warning }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: theme.warning,
                        }}
                      />
                      {provisioningPending} pending
                    </span>
                  )}

                  {provisioningFailed > 0 && (
                    <span
                      className="flex items-center gap-1"
                      style={{ color: theme.danger }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: theme.danger,
                        }}
                      />
                      {provisioningFailed} failed
                    </span>
                  )}
                </div>
              }
            />

            <CompactMetric
              label="Subscriptions"
              value={activeSubscriptions}
              description="Active subscription plans"
              icon={CreditCard}
              theme={theme}
            />
          </section>

        {/* ================================================================
            MAIN GRID
            ================================================================ */}

        <section className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">

          {/* ================================================================
              RECENT CLIENT ACTIVITY
              ================================================================ */}

          <div
            className="min-w-0 overflow-hidden rounded-[10px] border"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
          >
            {/* HEADER */}

            <div
              className="flex items-center justify-between border-b px-5 py-5 sm:px-6"
              style={{
                borderColor: theme.border,
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className="text-[15px] font-semibold"
                    style={{
                      color: theme.text,
                    }}
                  >
                    Recent Client Activity
                  </h2>

                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                    style={{
                      color: theme.success,
                      backgroundColor: theme.primarySoft,
                    }}
                  >
                    Live
                  </span>
                </div>

                <p
                  className="mt-1 text-[11px]"
                  style={{
                    color: theme.textMuted,
                  }}
                >
                  Current client and tenant status.
                </p>
              </div>

              <NavLink
                to="/admin/clients"
                className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold"
                style={{
                  color: theme.primary,
                }}
              >
                View all

                <ChevronDown
                  size={13}
                  className="-rotate-90"
                />
              </NavLink>
            </div>

            {/* TABLE */}

            <div className="w-full overflow-hidden">
              {clients.length === 0 ? (
                <EmptyClients theme={theme} />
              ) : (
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: theme.surfaceAlt,
                      }}
                    >
                      <TableHeader
                        label="CLIENT"
                        theme={theme}
                        className="w-[32%]"
                      />

                      <TableHeader
                        label="PLAN"
                        theme={theme}
                        className="w-[16%]"
                      />

                      <TableHeader
                        label="SUBSCRIPTION"
                        theme={theme}
                        className="w-[18%]"
                      />

                      <TableHeader
                        label="TENANT"
                        theme={theme}
                        className="w-[18%]"
                      />

                      <TableHeader
                        label="UPDATED"
                        theme={theme}
                        className="w-[16%]"
                      />
                    </tr>
                  </thead>

                  <tbody>
                    {clients.map(
                      (client, index) => (
                        <DashboardClientRow
                          key={
                            client.id ??
                            client.tenant_id ??
                            index
                          }
                          client={client}
                          theme={theme}
                        />
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* FOOTER */}

            <div
              className="flex items-center justify-between border-t px-5 py-3.5 sm:px-6"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.surfaceAlt,
              }}
            >
              <span
                className="text-[10px]"
                style={{
                  color: theme.textMuted,
                }}
              >
                Showing{" "}
                <strong
                  style={{
                    color: theme.textSoft,
                  }}
                >
                  {clients.length}
                </strong>{" "}
                client
                {clients.length === 1 ? "" : "s"}
              </span>

              <span
                className="text-[9px]"
                style={{
                  color: theme.textLight,
                }}
              >
                Updated {formatTime(lastUpdated)}
              </span>
            </div>
          </div>

          {/* ================================================================
              RIGHT COLUMN
              ================================================================ */}

          <div className="min-w-0 space-y-6">
            <PlatformHealth
              health={health}
              theme={theme}
            />

            <TenantProvisioning
              ready={provisioningReady}
              pending={provisioningPending}
              failed={provisioningFailed}
              total={totalClients}
              percentage={provisioningPercentage}
              theme={theme}
            />

            <PlatformState
              health={health}
              lastUpdated={lastUpdated}
              theme={theme}
            />
          </div>
        </section>

        {/* ================================================================
            PLATFORM OVERVIEW
            ================================================================ */}

        <section
          className="mt-6 overflow-hidden rounded-[10px] border"
          style={{
            backgroundColor:
              theme.surface,
            borderColor:
              theme.border,
          }}
        >
          <div
            className="flex flex-col gap-3 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            style={{
              borderColor:
                theme.border,
            }}
          >
            <div>
              <h2
                className="text-[15px] font-semibold"
                style={{
                  color:
                    theme.text,
                }}
              >
                Platform Overview
              </h2>

              <p
                className="mt-1 text-[11px]"
                style={{
                  color:
                    theme.textMuted,
                }}
              >
                Infrastructure and subscription
                overview across Abhinava.
              </p>
            </div>

            <div
              className="flex items-center gap-2 text-[10px]"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    theme.success,
                }}
              />

              Live platform data
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <OverviewStat
              label="Registered Clients"
              value={totalClients}
              description="Organisations on the platform"
              icon={Building2}
              theme={theme}
            />

            <OverviewStat
              label="Operational Tenants"
              value={activeTenants}
              description="Active tenant environments"
              icon={Activity}
              theme={theme}
            />

            <OverviewStat
              label="Active Subscriptions"
              value={
                activeSubscriptions
              }
              description="Current subscription plans"
              icon={CreditCard}
              theme={theme}
            />
          </div>
        </section>

        {/* ================================================================
            FOOTER
            ================================================================ */}

        <footer className="flex flex-col gap-2 px-1 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Abhinava"
              className="h-5 w-auto object-contain opacity-75"
            />

            <span
              className="text-[10px]"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              Control Plane
            </span>
          </div>

          <span
            className="text-[10px]"
            style={{
              color:
                theme.textLight,
            }}
          >
            Abhinava · Platform
            Administration
          </span>
        </footer>
      </div>
    </DashboardShell>
  );
}

/* ============================================================================
   DASHBOARD SHELL
   ========================================================================== */

function DashboardShell({
  children,
  theme,
}) {
  return (
    <div
      className="min-h-full"
      style={{
        backgroundColor:
          theme.background,
        color: theme.text,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================================
   METRIC CARD
   ========================================================================== */

function CompactMetric({
  label,
  value,
  description,
  icon: Icon,
  theme,
  detail,
}) {
  return (
    <div
      className="rounded-[10px] border px-5 py-4"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.06em]"
            style={{
              color: theme.textMuted,
            }}
          >
            {label}
          </p>

          <div
            className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.035em]"
            style={{
              color: theme.text,
            }}
          >
            {value}
          </div>

          <p
            className="mt-2 text-[10px]"
            style={{
              color: theme.textMuted,
            }}
          >
            {description}
          </p>

          {detail}
        </div>

        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: theme.primarySoft,
            color: theme.primary,
          }}
        >
          <Icon
            size={16}
            strokeWidth={1.7}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   MINI BARS
   ========================================================================== */

function MiniBars({ theme }) {
  const bars = [
    38,
    51,
    45,
    67,
    58,
    76,
    63,
    83,
    71,
    92,
    78,
  ];

  return (
    <div className="flex h-[58px] items-end gap-1.5">
      {bars.map(
        (height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-[3px]"
            style={{
              height: `${height}%`,
              backgroundColor:
                index ===
                bars.length - 1
                  ? theme.primary
                  : theme.primarySoft,
            }}
          />
        )
      )}
    </div>
  );
}

/* ============================================================================
   PROGRESS
   ========================================================================== */

function ProgressChart({
  current,
  total,
  theme,
}) {
  const percentage =
    total > 0
      ? Math.min(
          (current / total) * 100,
          100
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[10px]"
          style={{
            color:
              theme.textMuted,
          }}
        >
          Tenant availability
        </span>

        <span
          className="text-[10px] font-semibold"
          style={{
            color:
              theme.primary,
          }}
        >
          {Math.round(percentage)}%
        </span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full"
        style={{
          backgroundColor:
            theme.border,
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor:
              theme.primary,
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================================
   PROVISIONING RING
   ========================================================================== */

function ProvisioningRing({
  percentage,
  theme,
}) {
  const radius = 40;

  const circumference =
    2 * Math.PI * radius;

  const safePercentage =
    Math.min(
      Math.max(percentage, 0),
      100
    );

  const dash =
    circumference *
    (safePercentage / 100);

  return (
    <div className="relative mx-auto h-[86px] w-[86px]">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={theme.border}
          strokeWidth="8"
        />

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={theme.primary}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[19px] font-semibold"
          style={{
            color:
              theme.text,
          }}
        >
          {safePercentage}%
        </span>

        <span
          className="text-[8px]"
          style={{
            color:
              theme.textMuted,
          }}
        >
          ready
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
   MINI LINE CHART
   ========================================================================== */

function MiniLineChart({
  theme,
}) {
  return (
    <svg
      viewBox="0 0 300 80"
      preserveAspectRatio="none"
      className="h-[65px] w-full"
    >
      <defs>
        <linearGradient
          id="abhinavaLineFill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor={
              theme.primary
            }
            stopOpacity="0.18"
          />

          <stop
            offset="100%"
            stopColor={
              theme.primary
            }
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      <polygon
        points="0,72 0,58 25,51 52,55 78,46 105,49 132,39 158,42 185,32 211,37 238,25 268,29 300,12 300,72"
        fill="url(#abhinavaLineFill)"
      />

      <polyline
        points="0,58 25,51 52,55 78,46 105,49 132,39 158,42 185,32 211,37 238,25 268,29 300,12"
        fill="none"
        stroke={theme.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ============================================================================
   TABLE HEADER
   ========================================================================== */

function TableHeader({
  label,
  theme,
}) {
  return (
    <th
      className="whitespace-nowrap px-5 py-3.5 text-left text-[9px] font-semibold tracking-[0.05em]"
      style={{
        color:
          theme.textMuted,
        borderBottom:
          `1px solid ${theme.border}`,
      }}
    >
      {label}
    </th>
  );
}

/* ============================================================================
   CLIENT ROW
   ========================================================================== */

function DashboardClientRow({
  client,
  theme,
}) {
  return (
    <tr
      className="transition-colors"
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor =
          theme.surfaceHover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor =
          "transparent";
      }}
    >
      {/* CLIENT */}

      <td
        className="w-[32%] overflow-hidden px-5 py-4 sm:px-6"
        style={{
          borderBottom:
            `1px solid ${theme.border}`,
        }}
      >
        <div className="min-w-0">
          <div
            className="truncate text-[12px] font-semibold"
            style={{
              color: theme.text,
            }}
            title={
              client.business_name ||
              "Unnamed client"
            }
          >
            {client.business_name ||
              "Unnamed client"}
          </div>

          <div
            className="mt-1 truncate text-[9px]"
            style={{
              color: theme.textMuted,
            }}
          >
            Client #{client.id ?? "—"}
          </div>
        </div>
      </td>

      {/* PLAN */}

      <td
        className="w-[16%] overflow-hidden px-3 py-4"
        style={{
          borderBottom:
            `1px solid ${theme.border}`,
        }}
      >
        <span
          className="block truncate text-[10px] font-medium"
          style={{
            color: theme.textSoft,
          }}
        >
          {client.plan || "—"}
        </span>
      </td>

      {/* SUBSCRIPTION */}

      <td
        className="w-[18%] overflow-hidden px-3 py-4"
        style={{
          borderBottom:
            `1px solid ${theme.border}`,
        }}
      >
        <StatusBadge
          status={
            client.subscription_status
          }
          type="subscription"
          theme={theme}
        />
      </td>

      {/* TENANT STATUS */}

      <td
        className="w-[18%] overflow-hidden px-3 py-4"
        style={{
          borderBottom:
            `1px solid ${theme.border}`,
        }}
      >
        <StatusBadge
          status={
            client.provisioning_status ||
            client.display_status
          }
          type="tenant"
          theme={theme}
        />
      </td>

      {/* UPDATED */}

      <td
        className="w-[16%] overflow-hidden px-3 py-4"
        style={{
          borderBottom:
            `1px solid ${theme.border}`,
        }}
      >
        <div
          className="truncate text-[10px]"
          style={{
            color: theme.textSoft,
          }}
        >
          {formatDate(
            client.updated_at
          )}
        </div>

        <div
          className="mt-0.5 truncate text-[9px]"
          style={{
            color: theme.textLight,
          }}
        >
          {formatTime(
            client.updated_at
          )}
        </div>
      </td>
    </tr>
  );
}

/* ============================================================================
   STATUS BADGE
   ========================================================================== */

function StatusBadge({
  status,
  type,
  theme,
}) {
  const normalized = String(
    status || ""
  )
    .trim()
    .toUpperCase();

  let label = "Unknown";
  let color = theme.warning;
  let background =
    theme.goldSoft;

  if (type === "subscription") {
    if (normalized === "ACTIVE") {
      label = "Active";
      color = theme.success;
      background =
        theme.primarySoft;
    } else if (
      normalized === "TRIAL"
    ) {
      label = "Trial";
      color = theme.warning;
      background =
        theme.goldSoft;
    } else {
      label =
        normalized
          ? normalized
              .charAt(0)
              .toUpperCase() +
            normalized
              .slice(1)
              .toLowerCase()
          : "Unknown";

      color = theme.danger;

      background =
        theme.mode === "dark"
          ? "rgba(197,122,114,0.14)"
          : "#F3E3E0";
    }
  } else {
    if (normalized === "READY") {
      label = "Ready";
      color = theme.success;
      background =
        theme.primarySoft;
    } else if (
      normalized === "FAILED" ||
      normalized === "ERROR"
    ) {
      label = "Failed";
      color = theme.danger;

      background =
        theme.mode === "dark"
          ? "rgba(197,122,114,0.14)"
          : "#F3E3E0";
    } else {
      label = "Provisioning";
      color = theme.warning;
      background =
        theme.goldSoft;
    }
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-medium"
      style={{
        color,
        backgroundColor:
          background,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor:
            color,
        }}
      />

      {label}
    </span>
  );
}

/* ============================================================================
   EMPTY CLIENTS
   ========================================================================== */

function EmptyClients({
  theme,
}) {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <div className="text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              theme.primarySoft,
            color:
              theme.primary,
          }}
        >
          <Building2
            size={20}
            strokeWidth={1.6}
          />
        </div>

        <p
          className="mt-4 text-[12px] font-medium"
          style={{
            color:
              theme.textSoft,
          }}
        >
          No clients yet
        </p>

        <p
          className="mt-1 text-[10px]"
          style={{
            color:
              theme.textMuted,
          }}
        >
          Add your first client to
          begin provisioning.
        </p>
      </div>
    </div>
  );
}

/* ============================================================================
   PLATFORM HEALTH
   ========================================================================== */

function PlatformHealth({
  health,
  theme,
}) {
  return (
    <div
      className="rounded-[10px] border"
      style={{
        backgroundColor:
          theme.surface,
        borderColor:
          theme.border,
      }}
    >
      <div
        className="border-b px-5 py-5 sm:px-6"
        style={{
          borderColor:
            theme.border,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-[15px] font-semibold"
              style={{
                color:
                  theme.text,
              }}
            >
              Platform Health
            </h2>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              Core platform services
            </p>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              backgroundColor:
                theme.primarySoft,
              color:
                theme.success,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  theme.success,
              }}
            />

            <span className="text-[9px] font-semibold">
              Operational
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 py-2 sm:px-6">
        <HealthRow
          icon={Server}
          label="API"
          status={
            health.api ||
            "OPERATIONAL"
          }
          theme={theme}
        />

        <HealthRow
          icon={Database}
          label="Database"
          status={
            health.database ||
            "OPERATIONAL"
          }
          theme={theme}
        />

        <HealthRow
          icon={ShieldCheck}
          label="Authentication"
          status={
            health.authentication ||
            "OPERATIONAL"
          }
          theme={theme}
        />
      </div>
    </div>
  );
}

/* ============================================================================
   HEALTH ROW
   ========================================================================== */

function HealthRow({
  icon: Icon,
  label,
  status,
  theme,
}) {
  const operational =
    String(status || "")
      .toUpperCase()
      .includes("OPERATIONAL");

  return (
    <div
      className="flex items-center justify-between border-b py-3.5 last:border-b-0"
      style={{
        borderColor:
          theme.border,
      }}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={16}
          strokeWidth={1.6}
          style={{
            color:
              theme.textMuted,
          }}
        />

        <span
          className="text-[11px]"
          style={{
            color:
              theme.textSoft,
          }}
        >
          {label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor:
              operational
                ? theme.success
                : theme.danger,
          }}
        />

        <span
          className="text-[9px] font-medium"
          style={{
            color:
              operational
                ? theme.success
                : theme.danger,
          }}
        >
          {operational
            ? "Operational"
            : "Attention"}
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
   TENANT PROVISIONING
   ========================================================================== */

function TenantProvisioning({
  ready,
  pending,
  failed,
  total,
  percentage,
  theme,
}) {
  return (
    <div
      className="rounded-[10px] border"
      style={{
        backgroundColor:
          theme.surface,
        borderColor:
          theme.border,
      }}
    >
      <div
        className="border-b px-5 py-5 sm:px-6"
        style={{
          borderColor:
            theme.border,
        }}
      >
        <h2
          className="text-[15px] font-semibold"
          style={{
            color:
              theme.text,
          }}
        >
          Tenant Provisioning
        </h2>

        <p
          className="mt-1 text-[10px]"
          style={{
            color:
              theme.textMuted,
          }}
        >
          Firebase infrastructure
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-5">
          <ProvisioningRing
            percentage={percentage}
            theme={theme}
          />

          <div>
            <p
              className="text-[25px] font-semibold tracking-tight"
              style={{
                color:
                  theme.text,
              }}
            >
              {ready}

              <span
                className="text-[12px] font-normal"
                style={{
                  color:
                    theme.textMuted,
                }}
              >
                {" "}
                of {total}
              </span>
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              environments ready
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <ProvisioningStat
            label="Ready"
            value={ready}
            color={theme.success}
            theme={theme}
          />

          <ProvisioningStat
            label="Pending"
            value={pending}
            color={theme.warning}
            theme={theme}
          />

          <ProvisioningStat
            label="Failed"
            value={failed}
            color={theme.danger}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   PROVISIONING STAT
   ========================================================================== */

function ProvisioningStat({
  label,
  value,
  color,
  theme,
}) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        backgroundColor:
          theme.surfaceAlt,
        borderColor:
          theme.border,
      }}
    >
      <div
        className="text-[17px] font-semibold"
        style={{
          color,
        }}
      >
        {value}
      </div>

      <div
        className="mt-1 text-[9px]"
        style={{
          color:
            theme.textMuted,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ============================================================================
   PLATFORM STATE
   ========================================================================== */

function PlatformState({
  health,
  lastUpdated,
  theme,
}) {
  return (
    <div
      className="rounded-[10px] border"
      style={{
        backgroundColor:
          theme.surface,
        borderColor:
          theme.border,
      }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-[15px] font-semibold"
              style={{
                color:
                  theme.text,
              }}
            >
              Platform State
            </h2>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  theme.textMuted,
              }}
            >
              Control plane status
            </p>
          </div>

          <CheckCircle2
            size={18}
            strokeWidth={1.6}
            style={{
              color:
                theme.success,
            }}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">
          <StateItem
            label="Control Plane"
            value="Online"
            theme={theme}
          />

          <StateItem
            label="PostgreSQL"
            value={
              String(
                health.database ||
                  "Operational"
              ).toUpperCase() ===
              "OPERATIONAL"
                ? "Connected"
                : "Attention"
            }
            theme={theme}
          />

          <StateItem
            label="Last sync"
            value={formatTime(
              lastUpdated
            )}
            theme={theme}
          />

          <StateItem
            label="Auto refresh"
            value="60 seconds"
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   STATE ITEM
   ========================================================================== */

function StateItem({
  label,
  value,
  theme,
}) {
  return (
    <div>
      <div
        className="text-[9px] font-medium uppercase tracking-[0.04em]"
        style={{
          color:
            theme.textLight,
        }}
      >
        {label}
      </div>

      <div
        className="mt-1.5 text-[11px] font-medium"
        style={{
          color:
            theme.textSoft,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================================
   OVERVIEW STAT
   ========================================================================== */

function OverviewStat({
  label,
  value,
  description,
  icon: Icon,
  theme,
}) {
  return (
    <div className="flex items-center gap-4 p-5 sm:p-6">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor:
            theme.primarySoft,
          color:
            theme.primary,
        }}
      >
        <Icon
          size={18}
          strokeWidth={1.7}
        />
      </div>

      <div>
        <div
          className="text-[23px] font-semibold tracking-tight"
          style={{
            color:
              theme.text,
          }}
        >
          {value}
        </div>

        <div
          className="text-[10px] font-medium"
          style={{
            color:
              theme.textSoft,
          }}
        >
          {label}
        </div>

        <div
          className="mt-0.5 text-[9px]"
          style={{
            color:
              theme.textMuted,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   DATE / MODULE HELPERS
   ========================================================================== */

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function formatModules(modules) {
  if (!modules) return "—";

  if (Array.isArray(modules)) {
    return modules.join(" · ");
  }

  if (typeof modules === "string") {
    return modules;
  }

  return "—";
}