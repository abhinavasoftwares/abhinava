import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import {
  AdminLayout,
  Dashboard,
} from "./layouts/AdminLayout";

import ClientsPage from "./pages/admin/ClientsPage";
import AddClientPage from "./pages/admin/AddClientPage";
import ClientDetailsPage from "./pages/admin/ClientDetailsPage";

import GoogleLoginTest from "./pages/GoogleLoginTest";
import LoginPage from "./pages/LoginPage";

import { AuthProvider } from "./context/AuthContext";

import { TenantProvider } from "./crm/context/TenantContext";
import { CrmAuthProvider } from "./crm/context/CrmAuthContext";

import CrmLoginPage from "./crm/pages/CrmLoginPage";
import CrmLayout from "./crm/layouts/CrmLayout";
import CrmDashboardPage from "./crm/pages/CrmDashboardPage";

import CrmProtectedRoute from "./crm/components/CrmProtectedRoute";

/* ============================================================
   KAREEGAR
============================================================ */

import KareegarManagementPage from "./crm/modules/kareegar/pages/KareegarManagementPage";
import KareegarLedgerPage from "./crm/modules/kareegar/pages/KareegarLedgerPage";
import KareegarReportsPage from "./crm/modules/kareegar/pages/KareegarReportsPage";

import KareegarCalculationSettingsPage from "./crm/modules/kareegar/pages/KareegarCalculationSettingsPage";
import KareegarOrnamentCategoriesPage from "./crm/modules/kareegar/pages/KareegarOrnamentCategoriesPage";

import CrmKareegarDirectoryPage from "./crm/pages/CrmKareegarDirectoryPage";

/* ============================================================
   CRM SETTINGS
============================================================ */

import CrmSettingsPage from "./crm/pages/CrmSettingsPage";
import CrmKareegarSettingsPage from "./crm/pages/CrmKareegarSettingsPage";

/* ============================================================
   INVESTMENT
============================================================ */

import InvestmentSchemesPage from "./crm/modules/investment/pages/InvestmentSchemesPage";
import InvestmentInvestorsPage from "./crm/modules/investment/pages/InvestmentInvestorsPage";

/* ============================================================
   ICONS
============================================================ */

import {
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Activity,
} from "lucide-react";


/* ============================================================
   ADMIN HOME
============================================================ */

function AdminHome() {
  const clientMetrics = [
    {
      label: "Total Clients",
      value: "24",
      icon: Users,
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
    {
      label: "New Acquisitions",
      value: "6",
      icon: UserPlus,
      color: "text-[#c59b27]",
      bg: "bg-[#c59b27]/10",
      trend: "+2 this week",
    },
    {
      label: "Active Clients",
      value: "21",
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Inactive Clients",
      value: "3",
      icon: UserMinus,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
  ];

  const financialMetrics = [
    {
      label: "Monthly Revenue",
      value: "₹2,40,000",
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Monthly Expenses",
      value: "₹48,000",
      icon: TrendingDown,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      label: "Monthly Profit",
      value: "₹1,92,000",
      icon: TrendingUp,
      color: "text-[#c59b27]",
      bg: "bg-[#c59b27]/10",
      highlight: true,
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto bg-[#faf8f3] p-4 pb-12 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">

        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-1.5 self-start rounded-lg bg-[#c59b27]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#c59b27]">
            <Activity
              size={14}
              strokeWidth={2.5}
            />

            <span>
              Live Overview
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Real-time metrics and platform analytics for Abhinava.
            </p>
          </div>
        </div>


        {/* ==================================================
            CLIENT METRICS
        ================================================== */}

        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {clientMetrics.map((metric) => (
              <div
                key={metric.label}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between">

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      {metric.label}
                    </p>

                    <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
                      {metric.value}
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[16px] transition-transform group-hover:scale-105 ${metric.bg}`}
                  >
                    <metric.icon
                      size={22}
                      className={metric.color}
                      strokeWidth={2}
                    />
                  </div>

                </div>

                {metric.trend && (
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <TrendingUp
                      size={14}
                      strokeWidth={2.5}
                    />

                    <span>
                      {metric.trend}
                    </span>
                  </div>
                )}

              </div>
            ))}

          </div>
        </section>


        {/* ==================================================
            FINANCIAL METRICS
        ================================================== */}

        <section>
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Financial Performance
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">

            {financialMetrics.map((metric) => (
              <div
                key={metric.label}
                className={`group relative overflow-hidden rounded-[24px] border p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                  metric.highlight
                    ? "border-[#c59b27]/20 bg-gradient-to-br from-[#faf8f3] to-white"
                    : "border-slate-200/60 bg-white"
                }`}
              >
                <div className="flex items-center gap-4">

                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] transition-transform group-hover:scale-105 ${metric.bg}`}
                  >
                    <metric.icon
                      size={26}
                      className={metric.color}
                      strokeWidth={2}
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      {metric.label}
                    </p>

                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                      {metric.value}
                    </p>
                  </div>

                </div>
              </div>
            ))}

          </div>
        </section>


        {/* ==================================================
            PENDING TASKS
        ================================================== */}

        <section>
          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Pending Tasks
            </h2>

            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-bold text-[#c59b27] transition hover:text-slate-900"
            >
              View all

              <ArrowRight
                size={14}
                strokeWidth={2.5}
              />
            </button>

          </div>

          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white py-12 text-center shadow-sm transition-colors hover:border-slate-300">

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-50">
              <CheckCircle2
                size={28}
                className="text-emerald-500"
                strokeWidth={2.5}
              />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              You're all caught up!
            </h3>

            <p className="mt-1.5 max-w-sm text-sm font-medium text-slate-500">
              No immediate actions required. Your workspace is currently up to date.
            </p>

          </div>
        </section>

      </div>
    </div>
  );
}


/* ============================================================
   ADMIN AUTH LAYOUT
============================================================ */

function AdminAuthLayout() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AdminLayout>
          <Outlet />
        </AdminLayout>
      </ProtectedRoute>
    </AuthProvider>
  );
}


/* ============================================================
   CRM APP LAYOUT
============================================================ */

function CrmAppLayout() {
  return (
    <TenantProvider>
      <CrmAuthProvider>
        <Outlet />
      </CrmAuthProvider>
    </TenantProvider>
  );
}


/* ============================================================
   APPLICATION ROUTES
============================================================ */

function App() {
  return (
    <Routes>

      {/* ======================================================
          ABHINAVA PLATFORM LOGIN
      ====================================================== */}

      <Route
        path="/login"
        element={<LoginPage />}
      />


      {/* ======================================================
          ABHINAVA PLATFORM
      ====================================================== */}

      <Route element={<AdminAuthLayout />}>

        <Route
          path="/admin"
          element={<Dashboard />}
        />

        <Route
          path="/admin/clients"
          element={<ClientsPage />}
        />

        <Route
          path="/admin/clients/new"
          element={<AddClientPage />}
        />

        <Route
          path="/admin/clients/:clientId"
          element={<ClientDetailsPage />}
        />

      </Route>


      {/* ======================================================
          GOOGLE LOGIN TEST
      ====================================================== */}

      <Route
        path="/test/google-login"
        element={<GoogleLoginTest />}
      />


      {/* ======================================================
          CLIENT CRM
      ====================================================== */}

      <Route element={<CrmAppLayout />}>

        {/* ------------------------------------------------------
            CRM LOGIN
        ------------------------------------------------------ */}

        <Route
          path="/crm"
          element={<CrmLoginPage />}
        />


        {/* ------------------------------------------------------
            CRM DASHBOARD
        ------------------------------------------------------ */}

        <Route
          path="/crm/dashboard"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <CrmDashboardPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ======================================================
            KAREEGAR
        ====================================================== */}

        {/* ------------------------------------------------------
            KAREEGAR FORMS
        ------------------------------------------------------ */}

        <Route
          path="/crm/kareegar/forms"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <KareegarManagementPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ------------------------------------------------------
            KAREEGAR LEDGER
        ------------------------------------------------------ */}

        <Route
          path="/crm/kareegar/ledger"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <KareegarLedgerPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ------------------------------------------------------
            KAREEGAR REPORTS
        ------------------------------------------------------ */}

        <Route
          path="/crm/kareegar/reports"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <KareegarReportsPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ======================================================
            CRM SETTINGS
        ====================================================== */}

        <Route
          path="/crm/settings"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <CrmSettingsPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ------------------------------------------------------
            KAREEGAR SETTINGS
        ------------------------------------------------------ */}

        <Route
          path="/crm/settings/kareegar"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <CrmKareegarSettingsPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ------------------------------------------------------
            KAREEGAR DIRECTORY
        ------------------------------------------------------ */}

        <Route
          path="/crm/settings/kareegar/directory"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <CrmKareegarDirectoryPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ------------------------------------------------------
            KAREEGAR CALCULATION SETTINGS
        ------------------------------------------------------ */}

        <Route
          path="/crm/kareegar/settings/calculations"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <KareegarCalculationSettingsPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ------------------------------------------------------
            KAREEGAR ORNAMENT CATEGORIES
        ------------------------------------------------------ */}

        <Route
          path="/crm/kareegar/settings/ornament-categories"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <KareegarOrnamentCategoriesPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />


        {/* ======================================================
            INVESTMENT
        ====================================================== */}

        {/* ------------------------------------------------------
            INVESTMENT SCHEMES
        ------------------------------------------------------ */}

        <Route
          path="/crm/investment/schemes"
          element={
            <CrmProtectedRoute>
              <CrmLayout>
                <InvestmentSchemesPage />
              </CrmLayout>
            </CrmProtectedRoute>
          }
        />

        <Route
            path="/crm/investment/investors"
            element={
              <CrmProtectedRoute>
                <CrmLayout>
                  <InvestmentInvestorsPage />
                </CrmLayout>
              </CrmProtectedRoute>
            }
        />

      </Route>


      {/* ======================================================
          FALLBACK
      ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/admin"
            replace
          />
        }
      />

    </Routes>
  );
}


export default App;