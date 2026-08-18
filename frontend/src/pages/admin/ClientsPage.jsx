import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Users,
  Download,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
} from "lucide-react";
import { Link,useLocation, useNavigate} from "react-router-dom";


const API_URL = "https://sturdy-train-77rj957xr4pp2x675-8000.app.github.dev";

function ClientsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Clients");

useEffect(() => {
  if (location.state?.successMessage) {
    setSuccessMessage(location.state.successMessage);

    // Clear navigation state so refresh doesn't show it again
    navigate(location.pathname, {
      replace: true,
      state: {},
    });

    // Automatically hide toast
    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }
}, [location, navigate]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/clients`);
        if (!response.ok) throw new Error("Failed to fetch clients");
        const data = await response.json();
        setClients(data.clients);
      } catch (error) {
        console.error("Error fetching clients:", error);
        setError("Unable to load clients.");
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.business_email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All Clients" ||
        client.subscription_status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const handleExport = () => {
    alert(`Exporting ${filteredClients.length} clients to CSV...`);
  };

  return (
    <div className="flex h-full flex-col gap-6 pb-8">
      {successMessage && (
        <div className="fixed right-6 top-6 z-50 flex max-w-md items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-xl shadow-black/10 dark:border-emerald-500/20 dark:bg-[#171717]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            ✓
          </div>

          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              Client created successfully
            </p>

            <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-gray-400 transition hover:text-gray-700 dark:hover:text-white"
          >
            ×
          </button>
        </div>
      )}
      {/* ---------------- HEADER & PRIMARY ACTIONS ---------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Client Management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Clients Directory
          </h1>
          <p className="mt-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
            Manage Abhinava client accounts, subscriptions, and onboarding.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-neutral-800 dark:bg-[#171717] dark:text-gray-300 dark:hover:bg-neutral-800"
          >
            <Download size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            to="/admin/clients/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Client
          </Link>
        </div>
      </div>

      {/* ---------------- COMPACT SEARCH & FILTERS ---------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Showing <span className="font-bold text-gray-900 dark:text-white">{filteredClients.length}</span> clients
        </div>
        
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search names, emails..."
              className="w-full rounded-[14px] border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-800 dark:bg-[#171717] dark:text-white dark:focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-[14px] border border-gray-200 bg-white px-4 py-2 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:w-40 dark:border-neutral-800 dark:bg-[#171717] dark:text-white dark:focus:border-indigo-500"
          >
            <option value="All Clients">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* ---------------- STATES (LOADING / ERROR) ---------------- */}
      {loading && (
        <div className="flex h-64 flex-col items-center justify-center rounded-[24px] border border-gray-200 bg-gray-50/50 dark:border-neutral-800 dark:bg-[#171717]/30">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-500/20 dark:border-t-indigo-500" />
          <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Loading directory...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-red-200 bg-red-50 py-12 dark:border-red-500/20 dark:bg-red-500/5">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ---------------- CONTENT AREA ---------------- */}
      {!loading && !error && filteredClients.length > 0 && (
        <>
          {/* DESKTOP VIEW: PERFECT INTERNAL SCROLL TABLE */}
          <div className="hidden overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm md:flex md:flex-col dark:border-neutral-800 dark:bg-[#121212]">
            <div className="max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm dark:bg-[#1a1a1a]/95">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Business</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Owner Contact</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Plan</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-[#171717]/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-indigo-100/50 font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            {client.business_name.charAt(0).toUpperCase()}
                          </div>
                          <Link
                            to={`/admin/clients/${client.id}`}
                            className="font-semibold text-gray-900 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                          >
                            {client.business_name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-gray-200">{client.owner_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{client.business_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
                          {client.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
                            client.subscription_status.toLowerCase() === "active"
                              ? "bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : client.subscription_status.toLowerCase() === "pending"
                              ? "bg-amber-100/60 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-red-100/60 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {client.subscription_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/clients/${client.id}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-500 dark:hover:bg-neutral-800 dark:hover:text-indigo-400"
                          >
                            <Eye size={16} />
                          </Link>
                          <button className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-500 dark:hover:bg-neutral-800 dark:hover:text-indigo-400">
                            <Edit size={16} />
                          </button>
                          <button className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                            <Trash2 size={16} />
                          </button>
                          <button className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-neutral-800 dark:hover:text-white">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW: ENTERPRISE CARDS */}
          <div className="flex flex-col gap-4 md:hidden">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex flex-col rounded-[20px] border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-[#121212]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-indigo-100/50 text-lg font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {client.business_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link 
                        to={`/admin/clients/${client.id}`}
                        className="font-bold text-gray-900 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                      >
                        {client.business_name}
                      </Link>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {client.owner_name}
                      </p>
                    </div>
                  </div>
                  <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800">
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <div className="mb-4 mt-4 h-[1px] w-full bg-gray-100 dark:bg-neutral-800/50" />

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Plan & Status</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
                        {client.plan}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                          client.subscription_status.toLowerCase() === "active"
                            ? "bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : client.subscription_status.toLowerCase() === "pending"
                            ? "bg-amber-100/60 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                            : "bg-red-100/60 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                        }`}
                      >
                        {client.subscription_status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/clients/${client.id}`}
                      className="rounded-[10px] border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:text-indigo-600 dark:border-neutral-700 dark:bg-[#171717] dark:hover:text-indigo-400"
                    >
                      <Eye size={14} />
                    </Link>
                    <button className="rounded-[10px] border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:text-indigo-600 dark:border-neutral-700 dark:bg-[#171717] dark:hover:text-indigo-400">
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------------- EMPTY STATE ---------------- */}
      {!loading && !error && filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-gray-200 bg-gray-50/50 py-20 text-center dark:border-neutral-800 dark:bg-[#171717]/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-indigo-100/50 dark:bg-indigo-500/10">
            <Users size={28} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
            {clients.length === 0 ? "No clients yet" : "No matching clients"}
          </h2>
          <p className="mt-2 max-w-sm text-sm font-medium text-gray-500 dark:text-gray-400">
            {clients.length === 0
              ? "Add your first client to begin the Abhinava onboarding process."
              : "Try adjusting your search query or status filter."}
          </p>
          {clients.length === 0 && (
            <Link
              to="/admin/clients/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-[#171717] dark:text-white dark:hover:bg-neutral-800"
            >
              <Plus size={18} strokeWidth={2.5} />
              Add your first client
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default ClientsPage;