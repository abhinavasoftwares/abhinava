import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FileChartColumn,
  LayoutDashboard,
  LogOut,
  Settings,
  Sun,
  Users,
  Moon,
  Bell,
  Menu,
  X,
  Command,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

function AdminLayout({ children }) {
  const { darkMode, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close menu and unlock scroll when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
    document.body.style.overflow = "auto";
  }, [location.pathname]);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    document.body.style.overflow = !mobileMenuOpen ? "hidden" : "auto";
  };

  const navigation = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Clients", path: "/admin/clients", icon: Users },
    { name: "Reports", path: "/admin/reports", icon: FileChartColumn },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 antialiased transition-colors dark:bg-[#050505] dark:text-gray-100">
      
      {/* =========================================================
          FIXED TOP NAVBAR (Full Width)
      ========================================================= */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8 dark:border-neutral-800 dark:bg-[#0a0a0a]/80">
        
        {/* Left Side: Brand Logo & Name */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-600 text-white shadow-inner">
            <Command size={18} strokeWidth={2.5} />
          </div>
          {/* Always show name, or hide on very small screens if preferred. Keeping it visible for brand presence. */}
          <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Abhinava
          </span>
        </div>

        {/* Right Side: Navigation & Actions (Desktop - hidden on sm and md) */}
        <div className="hidden lg:flex lg:items-center lg:gap-8">
          
          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    }`
                  }
                >
                  <Icon size={16} strokeWidth={2} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="h-6 w-[1px] bg-gray-200 dark:bg-neutral-800" />

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white">
              <Bell size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Right Side: Hamburger Menu (Small & Medium Screens Only) */}
        <div className="flex items-center lg:hidden">
          <button
            onClick={handleMenuToggle}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-900 transition-colors dark:bg-neutral-800 dark:text-white"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* =========================================================
          FULL-SCREEN MOBILE MENU (lg:hidden)
      ========================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 lg:hidden dark:bg-[#050505]/95">
          
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 sm:px-6 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-600 text-white shadow-inner">
                <Command size={18} strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Abhinava</span>
            </div>
            <button
              onClick={handleMenuToggle}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-900 transition-colors dark:bg-neutral-800 dark:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-8 sm:px-6">
            <nav className="flex flex-col gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-4 rounded-2xl px-5 py-4 text-lg font-bold transition-all ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                          : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                      }`
                    }
                  >
                    <Icon size={24} strokeWidth={2} />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-8 flex flex-col gap-4 border-t border-gray-200 pt-8 dark:border-neutral-800">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-4 rounded-2xl px-5 py-4 text-lg font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                {darkMode ? <Sun size={24} /> : <Moon size={24} />}
                {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </button>
              
              <button className="flex items-center gap-4 rounded-2xl bg-red-50 px-5 py-4 text-lg font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                <LogOut size={24} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MAIN CANVAS
      ========================================================= */}
      {/* 
        pt-24 (96px) ensures the content clears the 64px header 
        and adds a clean 32px gap before the page content begins.
      */}
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        {children}
      </main>
      
    </div>
  );
}

export default AdminLayout;