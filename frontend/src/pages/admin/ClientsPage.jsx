import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  Download,
  Eye,
  Mail,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Layers,
  RefreshCw,
  ExternalLink,
  Copy,
  XCircle,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ClientsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Core Data States
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [sortField, setSortField] = useState("business_name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Pagination & Continuous Infinite Scroll States
  const [paginationMode, setPaginationMode] = useState("pagination"); // 'pagination' | 'infinite'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef(null);

  /* =======================================================
     FETCH DATA DIRECTORY
  ======================================================= */
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/clients`, {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (response.status === 403) {
        throw new Error("Clearance denied. Administrative privileges required.");
      }

      if (!response.ok) {
        throw new Error(`Directory query failed with status ${response.status}`);
      }

      const data = await response.json();
      setClients(Array.isArray(data.clients) ? data.clients : []);
    } catch (err) {
      console.error("Directory sync error:", err);
      setError(err?.message || "Failed to synchronize client directory.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  /* =======================================================
     SUCCESS TOAST
  ======================================================= */
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessToast(location.state.successMessage);
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setSuccessToast(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  /* =======================================================
     FILTER, SEARCH & SORT LOGIC
  ======================================================= */
  const filteredAndSortedClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = clients.filter((c) => {
      const matchSearch =
        !query ||
        c.business_name?.toLowerCase().includes(query) ||
        c.owner_name?.toLowerCase().includes(query) ||
        c.business_email?.toLowerCase().includes(query) ||
        String(c.id).toLowerCase().includes(query);

      const rawStatus = (c.subscription_status || "UNKNOWN").toUpperCase();
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && (rawStatus === "ACTIVE" || rawStatus === "READY")) ||
        (statusFilter === "PENDING" && (rawStatus === "PENDING" || rawStatus === "TRIAL")) ||
        (statusFilter === "INACTIVE" && (rawStatus === "INACTIVE" || rawStatus === "FAILED" || rawStatus === "CANCELLED"));

      const rawTier = (c.plan || "STANDARD").toUpperCase();
      const matchTier = tierFilter === "ALL" || rawTier.includes(tierFilter);

      return matchSearch && matchStatus && matchTier;
    });

    return filtered.sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [clients, searchQuery, statusFilter, tierFilter, sortField, sortDirection]);

  // Reset pagination on query changes
  useEffect(() => {
    setCurrentPage(1);
    setVisibleCount(20);
  }, [searchQuery, statusFilter, tierFilter, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    if (paginationMode === "infinite") {
      return filteredAndSortedClients.slice(0, visibleCount);
    }
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedClients.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedClients, paginationMode, currentPage, pageSize, visibleCount]);

  /* =======================================================
     INFINITE SCROLL INTERSECTION OBSERVER
  ======================================================= */
  useEffect(() => {
    if (paginationMode !== "infinite") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredAndSortedClients.length) {
          setVisibleCount((prev) => Math.min(prev + 15, filteredAndSortedClients.length));
        }
      },
      { threshold: 0.2 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [paginationMode, visibleCount, filteredAndSortedClients.length]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  /* =======================================================
     CSV EXPORT STREAMER
  ======================================================= */
  const handleExportCSV = () => {
    if (filteredAndSortedClients.length === 0) return;

    const headers = ["ID", "Business Name", "Owner Name", "Email", "Plan Tier", "Status", "Updated At"];
    const rows = filteredAndSortedClients.map((c) => [
      c.id ?? "",
      `"${(c.business_name || "").replace(/"/g, '""')}"`,
      `"${(c.owner_name || "").replace(/"/g, '""')}"`,
      `"${(c.business_email || "").replace(/"/g, '""')}"`,
      `"${c.plan || "Standard"}"`,
      `"${c.subscription_status || "Active"}"`,
      `"${c.updated_at || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const anchor = document.createElement("a");
    anchor.setAttribute("href", encodedUri);
    anchor.setAttribute("download", `abhinava_directory_${Date.now()}.csv`);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setSuccessToast(`Copied ${text} to clipboard`);
    setTimeout(() => setSuccessToast(""), 3000);
  };

  return (
    <div className="h-full max-h-full w-full flex flex-col bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden select-none">
      
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md animate-in slide-in-from-top-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
            <Check size={14} strokeWidth={2.5} />
          </div>
          <p className="text-xs font-semibold text-slate-800">{successToast}</p>
        </div>
      )}

      {/* =========================================================
          1. HEADER (STRICTLY SHRINK-0)
      ========================================================== */}
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
              <span>Tenant Ledger</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPaginationMode("pagination")}
                className={`rounded px-2.5 py-1 transition-all ${
                  paginationMode === "pagination"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Paged
              </button>
              <button
                type="button"
                onClick={() => setPaginationMode("infinite")}
                className={`rounded px-2.5 py-1 transition-all ${
                  paginationMode === "infinite"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Infinite Scroll
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredAndSortedClients.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Download size={13} className="text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={fetchClients}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
              title="Refresh Records"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : ""} />
            </button>

            <Link
              to="/admin/clients/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-slate-700 active:scale-[0.98] transition-all"
            >
              <Plus size={14} strokeWidth={2.4} />
              <span>Register Client</span>
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          2. SEARCH & FILTERS (STRICTLY SHRINK-0)
      ========================================================== */}
      <section className="shrink-0 border-b border-slate-200/80 bg-white px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          
          <div className="relative w-full md:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, ID, owner..."
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 appearance-none rounded-lg border border-slate-200 bg-slate-50/70 pl-2.5 pr-7 text-xs font-semibold text-slate-700 outline-none hover:bg-white focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active / Ready</option>
                <option value="PENDING">Pending / Trial</option>
                <option value="INACTIVE">Inactive / Cancelled</option>
              </select>
              <Filter size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-[10px] font-mono text-slate-600">
              <span>MATCHED:</span>
              <strong className="text-slate-900">{filteredAndSortedClients.length}</strong>
            </span>
          </div>

        </div>
      </section>

      {/* =========================================================
          3. MAIN VIEWPORT (STRICTLY CONTAINED IN VIEWPORT)
      ========================================================== */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 sm:p-5">
        
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
            <RefreshCw size={20} className="animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              Querying Tenant Instances...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
            <XCircle size={26} className="text-rose-600 mb-2" />
            <h3 className="text-sm font-bold text-rose-900">Query Exception Encountered</h3>
            <p className="text-xs text-rose-700 mt-1 max-w-sm">{error}</p>
            <button
              onClick={fetchClients}
              className="mt-3 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-black transition-all"
            >
              Re-attempt Sync
            </button>
          </div>
        )}

        {!loading && !error && filteredAndSortedClients.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Building2 size={28} className="text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-900">No Matching Client Ledgers</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
              {clients.length === 0
                ? "No client organizations registered yet."
                : "No clients match the current search filters."}
            </p>
          </div>
        )}

        {/* POPULATED DATA VIEW */}
        {!loading && !error && filteredAndSortedClients.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            
            {/* DESKTOP TABLE VIEW (INVISIBLE INTERNAL SCROLL) */}
            <div className="hidden lg:flex flex-col flex-1 min-h-0">
              
              {/* Fixed Table Heading */}
              <div className="shrink-0 grid grid-cols-[minmax(0,1.8fr)_minmax(180px,1.2fr)_120px_130px_120px_90px] border-b border-slate-200 bg-slate-50/80 px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                <button
                  type="button"
                  onClick={() => toggleSort("business_name")}
                  className="flex items-center gap-1 text-left hover:text-slate-900"
                >
                  <span>Organization</span>
                  <ArrowUpDown size={10} />
                </button>
                <span className="text-left">Primary Contact</span>
                <button
                  type="button"
                  onClick={() => toggleSort("plan")}
                  className="flex items-center gap-1 text-left hover:text-slate-900"
                >
                  <span>Tier</span>
                  <ArrowUpDown size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort("subscription_status")}
                  className="flex items-center gap-1 text-left hover:text-slate-900"
                >
                  <span>Subscription</span>
                  <ArrowUpDown size={10} />
                </button>
                <span className="text-left">Tenant DB</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Internal Body with Hidden Native Scrollbars */}
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {paginatedClients.map((client) => (
                  <div
                    key={client.id}
                    className="grid grid-cols-[minmax(0,1.8fr)_minmax(180px,1.2fr)_120px_130px_120px_90px] items-center px-6 py-3 hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="pr-4 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold font-mono text-[11px] shadow-2xs">
                          {getInitial(client.business_name)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/admin/clients/${client.id}`}
                            className="block truncate text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors leading-snug"
                          >
                            {client.business_name || "Unnamed Organization"}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-slate-400">
                              ID: #{client.id ?? "—"}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(client.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity"
                              title="Copy ID"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pr-4 min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {client.owner_name || "—"}
                      </p>
                      <p className="truncate text-[10.5px] text-slate-400 mt-0.5 font-mono">
                        {client.business_email || "No email"}
                      </p>
                    </div>

                    <div className="pr-3">
                      <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9.5px] font-mono font-bold text-slate-700 uppercase">
                        {client.plan || "Standard"}
                      </span>
                    </div>

                    <div className="pr-3">
                      <StatusBadge status={client.subscription_status} />
                    </div>

                    <div className="pr-3">
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>ISOLATED</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/admin/clients/${client.id}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        title="View Tenant Dossier"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(client.business_email)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Copy Email"
                      >
                        <Mail size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {paginationMode === "infinite" && (
                  <div ref={observerTarget} className="py-3 text-center text-xs font-mono text-slate-400">
                    {visibleCount < filteredAndSortedClients.length ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={11} className="animate-spin text-indigo-600" />
                        Loading more records...
                      </span>
                    ) : (
                      <span>All {filteredAndSortedClients.length} accounts loaded</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MOBILE & TABLET CARD STACK (INVISIBLE INTERNAL SCROLL) */}
            <div className="lg:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {paginatedClients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-3.5 hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold font-mono text-xs">
                        {getInitial(client.business_name)}
                      </div>
                      <div>
                        <Link
                          to={`/admin/clients/${client.id}`}
                          className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {client.business_name || "Unnamed Organization"}
                        </Link>
                        <p className="text-[10px] font-mono text-slate-400">
                          ID: #{client.id ?? "—"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={client.subscription_status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2">
                    <div>
                      <span className="text-[9.5px] font-mono text-slate-400 uppercase">Contact</span>
                      <p className="font-semibold text-slate-800 truncate mt-0.5">
                        {client.owner_name || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-slate-400 uppercase">Tier</span>
                      <p className="font-semibold text-slate-800 truncate mt-0.5">
                        {client.plan || "Standard"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <span className="text-[10.5px] font-mono text-slate-400 truncate max-w-[170px]">
                      {client.business_email || "No email"}
                    </span>
                    <Link
                      to={`/admin/clients/${client.id}`}
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline text-[11px]"
                    >
                      <span>View Dossier</span>
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                </div>
              ))}

              {paginationMode === "infinite" && (
                <div ref={observerTarget} className="py-3 text-center text-xs font-mono text-slate-400">
                  {visibleCount < filteredAndSortedClients.length
                    ? "Pulling next batch..."
                    : "End of active directory"}
                </div>
              )}
            </div>

            {/* =========================================================
                4. PAGINATION FOOTER (STRICTLY SHRINK-0)
            ========================================================== */}
            {paginationMode === "pagination" && (
              <div className="shrink-0 border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-mono">
                
                <div className="flex items-center gap-2 text-slate-500">
                  <span>SHOW:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 outline-none hover:border-slate-300"
                  >
                    <option value={10}>10 records</option>
                    <option value={15}>15 records</option>
                    <option value={25}>25 records</option>
                    <option value={50}>50 records</option>
                  </select>
                  <span className="text-slate-400">
                    of {filteredAndSortedClients.length} entries
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span className="px-2 text-xs font-bold text-slate-800">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

    </div>
  );
}

/* ============================================================================
   STATUS BADGE COMPONENT
============================================================================ */

function StatusBadge({ status }) {
  const normalized = String(status || "").trim().toUpperCase();

  let label = normalized || "UNKNOWN";
  let classes = "bg-slate-100 text-slate-600 border-slate-200";

  if (normalized === "ACTIVE" || normalized === "READY") {
    label = "Active";
    classes = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  } else if (normalized === "PENDING" || normalized === "TRIAL") {
    label = "Pending";
    classes = "bg-amber-50 text-amber-800 border-amber-200/80";
  } else if (normalized === "FAILED" || normalized === "CANCELLED" || normalized === "INACTIVE") {
    label = "Inactive";
    classes = "bg-rose-50 text-rose-700 border-rose-200/80";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[9.5px] font-mono font-bold border ${classes}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function getInitial(name) {
  if (!name) return "O";
  return name.trim().charAt(0).toUpperCase();
}