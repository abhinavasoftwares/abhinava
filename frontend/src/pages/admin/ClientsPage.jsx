import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleOff,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  XCircle,
  Download,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ============================================================
   HELPERS & DATA EXTRACTION
============================================================ */

function getAuthHeaders() {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function getAccountStatus(client) {
  return normalizeStatus(client.account_status || client.status || "ACTIVE");
}

function getSubscriptionStatus(client) {
  return normalizeStatus(
    client.subscription_status || client.subscription?.status || "ACTIVE"
  );
}

function getProvisioningStatus(client) {
  return normalizeStatus(
    client.provisioning_status || client.firebase_provisioning_status || "READY"
  );
}

function getPlanName(client) {
  return client.plan || client.plan_name || client.subscription_plan || "Standard";
}

function getOwnerName(client) {
  return client.owner_name || client.owner_email || "—";
}

function getInitial(name) {
  if (!name) return "C";
  return name.trim().charAt(0).toUpperCase();
}

/* ============================================================
   SOOTHING, NATURAL STATUS BADGES
============================================================ */

function AccountStatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  if (normalized === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50/60 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  if (normalized === "DISABLED" || normalized === "INACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-mono font-medium text-rose-800">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Disabled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100/80 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {status || "Unknown"}
    </span>
  );
}

function SubscriptionStatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  if (normalized === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/70 bg-emerald-50/60 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-800">
        <CheckCircle2 size={11} className="text-emerald-600" />
        Active
      </span>
    );
  }

  if (normalized === "EXPIRED" || normalized === "CANCELLED" || normalized === "CANCELED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-mono font-medium text-rose-800">
        <XCircle size={11} className="text-rose-500" />
        {normalized.startsWith("CANCEL") ? "Cancelled" : "Expired"}
      </span>
    );
  }

  if (normalized === "PENDING" || normalized === "SCHEDULED" || normalized === "TRIAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200/70 bg-amber-50/60 px-2 py-0.5 text-[10px] font-mono font-medium text-amber-800">
        <Clock3 size={11} className="text-amber-600" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-500">
      {status || "—"}
    </span>
  );
}

function ProvisioningBadge({ status }) {
  const normalized = normalizeStatus(status);

  if (normalized === "READY") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Ready
      </span>
    );
  }

  if (normalized === "FAILED" || normalized === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-rose-700">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Failed
      </span>
    );
  }

  if (normalized === "PENDING" || normalized === "IN_PROGRESS" || normalized === "PROVISIONING") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-700">
        <Loader2 size={11} className="animate-spin text-amber-600" />
        Provisioning
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
      {status || "—"}
    </span>
  );
}

/* ============================================================
   ARCHITECTURAL METRIC TILE
============================================================ */

function MetricCard({ label, value, icon: Icon, description }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors hover:border-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-slate-600">
          <Icon size={14} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-2.5">
        <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 leading-tight">
          {value}
        </p>
        {description && (
          <p className="mt-0.5 text-[11px] font-normal text-slate-500 truncate">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN CLIENTS WORKSPACE COMPONENT
============================================================ */

export default function ClientsPage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* ==========================================================
     FETCH CLIENTS
  ========================================================== */
  const loadClients = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      if (!API_BASE_URL) {
        throw new Error("VITE_API_BASE_URL endpoint is not defined.");
      }

      const response = await fetch(`${API_BASE_URL}/clients`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        let detail = `Failed to load clients (${response.status}).`;
        try {
          const data = await response.json();
          if (typeof data?.detail === "string") {
            detail = data.detail;
          }
        } catch {
          // Keep fallback message
        }
        throw new Error(detail);
      }

      const data = await response.json();
      const clientList = Array.isArray(data)
        ? data
        : Array.isArray(data?.clients)
        ? data.clients
        : [];

      setClients(clientList);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setError(err?.message || "Unable to load client ledgers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  /* ==========================================================
     SEARCH & FILTER COMPUTATION
  ========================================================== */
  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      const accountStatus = getAccountStatus(client);

      if (statusFilter !== "ALL" && accountStatus !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const searchableText = [
        client.business_name,
        client.legal_business_name,
        client.owner_name,
        client.owner_email,
        client.business_email,
        client.business_phone,
        client.crm_slug,
        client.tenant_id,
        client.id,
        getPlanName(client),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [clients, search, statusFilter]);

  /* ==========================================================
     METRICS CALCULATION
  ========================================================== */
  const metrics = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => getAccountStatus(c) === "ACTIVE").length;
    const disabled = clients.filter(
      (c) => getAccountStatus(c) === "DISABLED" || getAccountStatus(c) === "INACTIVE"
    ).length;
    const ready = clients.filter((c) => getProvisioningStatus(c) === "READY").length;

    return { total, active, disabled, ready };
  }, [clients]);

  /* ==========================================================
     EXPORT CSV UTILITY
  ========================================================== */
  const handleExportCSV = () => {
    if (filteredClients.length === 0) return;

    const headers = [
      "ID",
      "Organization",
      "Contact",
      "Email",
      "Plan",
      "Account Status",
      "Subscription",
      "Provisioning",
    ];
    const rows = filteredClients.map((c) => [
      c.id ?? "",
      `"${(c.business_name || "").replace(/"/g, '""')}"`,
      `"${(getOwnerName(c) || "").replace(/"/g, '""')}"`,
      `"${(c.business_email || "").replace(/"/g, '""')}"`,
      `"${getPlanName(c)}"`,
      `"${getAccountStatus(c)}"`,
      `"${getSubscriptionStatus(c)}"`,
      `"${getProvisioningStatus(c)}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `abhinava_clients_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full max-h-full w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none">
      
      {/* ====================================================
          1. METRICS ROW (SHRINK-0)
      ==================================================== */}
      {/* <section className="shrink-0 border-b border-slate-200/80 bg-white px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            label="Total Accounts"
            value={metrics.total}
            description="Tenant database registries"
            icon={Users}
          />
          <MetricCard
            label="Active Clients"
            value={metrics.active}
            description="Operational subscriptions"
            icon={CheckCircle2}
          />
          <MetricCard
            label="Inactive / Hold"
            value={metrics.disabled}
            description="Suspended client access"
            icon={CircleOff}
          />
          <MetricCard
            label="Isolated Ready"
            value={metrics.ready}
            description="Dedicated tenant deployments"
            icon={ShieldCheck}
          />
        </div>
      </section> */}

      {/* ====================================================
          2. SEARCH & ACTION CONTROLS (SHRINK-0)
      ==================================================== */}
      <section className="shrink-0 border-b border-slate-200/80 bg-[#FAFAFA] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Search Field */}
          <div className="relative w-full sm:w-80">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients, owner, slug, email..."
              className="h-8 w-full rounded-lg border border-slate-200/90 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-slate-400 focus:ring-1 focus:ring-slate-200 font-sans shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
            />
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 appearance-none rounded-lg border border-slate-200/90 bg-white pl-3 pr-7 text-xs font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-200 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled / Inactive</option>
              </select>
              <Filter
                size={11}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredClients.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50"
            >
              <Download size={13} className="text-slate-400" />
              <span>Export</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => loadClients({ silent: true })}
              disabled={loading || refreshing}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50"
              title="Refresh Records"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin text-slate-800" : "text-slate-400"}
              />
            </button>

            {/* Solid Graphite Action Button */}
            <button
              type="button"
              onClick={() => navigate("/admin/clients/new")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-black active:scale-[0.98]"
            >
              <Plus size={14} strokeWidth={2.4} />
              <span>Register Client</span>
            </button>

          </div>
        </div>
      </section>

      {/* ====================================================
          3. MAIN VIEWPORT (STRICTLY CONTAINED)
      ==================================================== */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 sm:p-5">
        
        {/* Error Notification */}
        {error && (
          <div className="mb-3 shrink-0 rounded-xl border border-rose-200 bg-rose-50/70 p-3 flex items-start gap-2.5 text-xs font-mono text-rose-800">
            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error Loading Directory</p>
              <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white">
            <RefreshCw size={20} className="animate-spin text-slate-400 mb-2.5" />
            <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              Synchronizing Tenant Ledgers...
            </p>
          </div>
        )}

        {/* Empty Directory State */}
        {!loading && filteredClients.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Building2 size={26} className="text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-900">
              {clients.length === 0 ? "No clients registered yet" : "No matching clients"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xs leading-relaxed">
              {clients.length === 0
                ? "Register your first organization to initialize tenant provisioning."
                : "Try adjusting your search criteria or resetting the status filter."}
            </p>
            {clients.length === 0 && (
              <button
                type="button"
                onClick={() => navigate("/admin/clients/new")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-black transition-all"
              >
                <Plus size={14} strokeWidth={2.4} />
                <span>Register First Client</span>
              </button>
            )}
          </div>
        )}

        {/* Populated Table & Mobile Cards */}
        {!loading && filteredClients.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            
            {/* DESKTOP TABLE VIEW (INVISIBLE INTERNAL SCROLL) */}
            <div className="hidden lg:flex flex-col flex-1 min-h-0">
              
              {/* Table Column Headers */}
              <div className="shrink-0 grid grid-cols-[minmax(0,1.8fr)_minmax(180px,1.2fr)_110px_120px_120px_110px_36px] border-b border-slate-200/80 bg-[#FAFAFA] px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                <span>Client Organization</span>
                <span>Primary Contact</span>
                <span>Account</span>
                <span>Tier</span>
                <span>Subscription</span>
                <span>Tenant DB</span>
                <span />
              </div>

              {/* Scrollable Rows Container (Hidden Scrollbars) */}
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {filteredClients.map((client) => {
                  const accountStatus = getAccountStatus(client);
                  const subscriptionStatus = getSubscriptionStatus(client);
                  const provisioningStatus = getProvisioningStatus(client);

                  return (
                    <div
                      key={client.id}
                      onClick={() => navigate(`/admin/clients/${client.id}`)}
                      className="grid grid-cols-[minmax(0,1.8fr)_minmax(180px,1.2fr)_110px_120px_120px_110px_36px] items-center px-6 py-3 transition-colors duration-150 hover:bg-slate-50/90 group cursor-pointer"
                    >
                      {/* Organization Name & Slug */}
                      <div className="pr-4 min-w-0">
                        <div className="flex items-center gap-3">
                          {client.logo_url ? (
                            <img
                              src={client.logo_url}
                              alt=""
                              className="h-8 w-8 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-bold font-mono text-xs shadow-2xs">
                              {getInitial(client.business_name)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-black transition-colors leading-snug">
                              {client.business_name || "Unnamed Client"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400">
                                ID: #{client.id ?? "—"}
                              </span>
                              {client.crm_slug && (
                                <span className="font-mono text-[10px] text-slate-500 font-medium">
                                  /{client.crm_slug}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Primary Contact */}
                      <div className="pr-4 min-w-0">
                        <p className="truncate text-xs font-medium text-slate-800">
                          {getOwnerName(client)}
                        </p>
                        <p className="truncate text-[10.5px] text-slate-400 font-mono mt-0.5">
                          {client.business_email || "No email recorded"}
                        </p>
                      </div>

                      {/* Account Status */}
                      <div className="pr-3">
                        <AccountStatusBadge status={accountStatus} />
                      </div>

                      {/* Plan Name */}
                      <div className="pr-3">
                        <span className="inline-block rounded bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 text-[9.5px] font-mono font-medium text-slate-700 uppercase">
                          {getPlanName(client)}
                        </span>
                      </div>

                      {/* Subscription Status */}
                      <div className="pr-3">
                        <SubscriptionStatusBadge status={subscriptionStatus} />
                      </div>

                      {/* Provisioning Status */}
                      <div className="pr-3">
                        <ProvisioningBadge status={provisioningStatus} />
                      </div>

                      {/* Action Chevron */}
                      <div className="flex justify-end text-slate-300 transition-colors group-hover:text-slate-700">
                        <ChevronRight size={15} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MOBILE & TABLET STACK (SCREENS < LG) */}
            <div className="lg:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {filteredClients.map((client) => {
                const accountStatus = getAccountStatus(client);
                const subscriptionStatus = getSubscriptionStatus(client);

                return (
                  <div
                    key={client.id}
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                    className="rounded-xl border border-slate-200/90 bg-white p-3.5 transition-all hover:border-slate-300 hover:shadow-2xs space-y-2.5 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-bold font-mono text-xs">
                          {getInitial(client.business_name)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {client.business_name || "Unnamed Organization"}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            ID: #{client.id ?? "—"}
                          </p>
                        </div>
                      </div>
                      <AccountStatusBadge status={accountStatus} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2">
                      <div>
                        <span className="text-[9.5px] font-mono text-slate-400 uppercase">Contact</span>
                        <p className="font-medium text-slate-800 truncate mt-0.5">
                          {getOwnerName(client)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-mono text-slate-400 uppercase">Subscription</span>
                        <div className="mt-0.5">
                          <SubscriptionStatusBadge status={subscriptionStatus} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <span className="text-[10.5px] font-mono text-slate-400 truncate max-w-[180px]">
                        {client.business_email || "No email"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900 text-[11px] group-hover:underline">
                        <span>Open Details</span>
                        <ChevronRight size={12} className="text-slate-400" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Footer */}
            <div className="shrink-0 border-t border-slate-200/80 bg-[#FAFAFA] px-5 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Displaying {filteredClients.length} of {clients.length} accounts</span>
              <span>Encrypted Master Directory</span>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}