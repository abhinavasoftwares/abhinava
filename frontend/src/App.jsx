import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import ClientsPage from "./pages/admin/ClientsPage";
import AddClientPage from "./pages/admin/AddClientPage";
import ClientDetailsPage from "./pages/admin/ClientDetailsPage";
import GoogleLoginTest from "./pages/GoogleLoginTest";
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

function AdminHome() {
  const clientMetrics = [
    {
      label: "Total Clients",
      value: "24",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100/50 dark:bg-blue-500/10",
    },
    {
      label: "New Acquisitions",
      value: "6",
      icon: UserPlus,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-100/50 dark:bg-indigo-500/10",
      trend: "+2 this week",
    },
    {
      label: "Active Clients",
      value: "21",
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100/50 dark:bg-emerald-500/10",
    },
    {
      label: "Inactive Clients",
      value: "3",
      icon: UserMinus,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-100/50 dark:bg-rose-500/10",
    },
  ];

  const financialMetrics = [
    {
      label: "Monthly Revenue",
      value: "₹2,40,000",
      icon: IndianRupee,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100/50 dark:bg-emerald-500/10",
    },
    {
      label: "Monthly Expenses",
      value: "₹48,000",
      icon: TrendingDown,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-100/50 dark:bg-rose-500/10",
    },
    {
      label: "Monthly Profit",
      value: "₹1,92,000",
      icon: TrendingUp,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-100/50 dark:bg-indigo-500/10",
      highlight: true,
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-4">
      {/* ---------------- PAGE HEADER ---------------- */}
      <div className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-1.5 self-start rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Activity size={14} strokeWidth={2.5} />
          <span>Live Overview</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
            Real-time metrics and platform analytics for Abhinava.
          </p>
        </div>
      </div>

      {/* ---------------- CLIENT METRICS ---------------- */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {clientMetrics.map((metric) => (
            <div
              key={metric.label}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-neutral-800 dark:bg-[#121212]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {metric.label}
                  </p>
                  <p className="mt-1.5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-[16px] transition-transform group-hover:scale-105 ${metric.bg}`}
                >
                  <metric.icon size={22} className={metric.color} strokeWidth={2} />
                </div>
              </div>
              {metric.trend && (
                <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={14} strokeWidth={2.5} />
                  <span>{metric.trend}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FINANCIAL METRICS ---------------- */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Financial Performance
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {financialMetrics.map((metric) => (
            <div
              key={metric.label}
              className={`group relative overflow-hidden rounded-[24px] border p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                metric.highlight
                  ? "border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white dark:border-indigo-500/20 dark:from-indigo-500/5 dark:to-[#121212]"
                  : "border-gray-200 bg-white dark:border-neutral-800 dark:bg-[#121212]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] transition-transform group-hover:scale-105 ${metric.bg}`}
                >
                  <metric.icon size={26} className={metric.color} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- IMMEDIATE ACTIONS ---------------- */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Pending Tasks
          </h2>
          <button className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            View all <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-gray-200 bg-white py-12 text-center transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-[#121212] dark:hover:border-neutral-700">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-100/50 dark:bg-emerald-500/10">
            <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            You're all caught up!
          </h3>
          <p className="mt-1.5 max-w-sm text-sm font-medium text-gray-500 dark:text-gray-400">
            No immediate actions required. Your workspace is currently up to date.
          </p>
        </div>
      </section>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminLayout>
            <AdminHome />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <AdminLayout>
            <ClientsPage />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/clients/new"
        element={
          <AdminLayout>
            <AddClientPage />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/clients/:clientId"
        element={
          <AdminLayout>
            <ClientDetailsPage />
          </AdminLayout>
        }
      />
      <Route
        path="/test/google-login"
        element={<GoogleLoginTest />}
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default App;