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
import { Link, useLocation, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const GOLD = "#c59b27";

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

      navigate(location.pathname, {
        replace: true,
        state: {},
      });

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

        const response = await fetch(`${API_URL}/clients`, {
          credentials: "include",
        });

        if (response.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to view clients."
          );
        }

        if (!response.ok) {
          throw new Error(
            `Failed to fetch clients (${response.status})`
          );
        }

        const data = await response.json();
        setClients(data.clients);
      } catch (error) {
        console.error("Error fetching clients:", error);
        setError(
          error.message || "Unable to load clients."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [navigate]);

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
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-[#faf8f3] p-4 pb-12 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed right-6 top-6 z-50 flex max-w-md items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-xl shadow-black/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
            ✓
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Client created successfully</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-slate-400 transition hover:text-slate-700"
          >
            ×
          </button>
        </div>
      )}

      {/* ---------------- HEADER & PRIMARY ACTIONS ---------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 self-start rounded-lg bg-[#c59b27]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#c59b27]">
            <Users size={14} strokeWidth={2.5} />
            <span>Client Management</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Clients Directory
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Manage Abhinava client accounts, subscriptions, and onboarding.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Download size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            to="/admin/clients/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
            style={{ backgroundColor: GOLD }}
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Client
          </Link>
        </div>
      </div>

      {/* ---------------- COMPACT SEARCH & FILTERS ---------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-slate-500">
          Showing <span className="font-bold text-slate-900">{filteredClients.length}</span> clients
        </div>
        
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search names, emails..."
              className="w-full rounded-xl border border-slate-200/70 bg-white py-2 pl-9 pr-4 text-sm font-medium outline-none transition focus:border-[#c59b27] focus:ring-2 focus:ring-[#c59b27]/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200/70 bg-white px-4 py-2 text-sm font-medium outline-none transition focus:border-[#c59b27] focus:ring-2 focus:ring-[#c59b27]/20 sm:w-40"
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
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#c59b27]" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading directory...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-12">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </div>
      )}

      {/* ---------------- CONTENT AREA ---------------- */}
      {!loading && !error && filteredClients.length > 0 && (
        <>
          {/* DESKTOP VIEW: PROFESSIONAL TABLE WITH INTERNAL SCROLL */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm md:flex md:flex-col">
            <div className="max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Business</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Owner Contact</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Plan</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-sm bg-[#faf8f3]"
                            style={{ color: GOLD }}
                          >
                            {client.business_name.charAt(0).toUpperCase()}
                          </div>
                          <Link
                            to={`/admin/clients/${client.id}`}
                            className="font-semibold text-slate-900 transition hover:text-[#c59b27]"
                          >
                            {client.business_name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{client.owner_name}</div>
                        <div className="text-xs text-slate-500">{client.business_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {client.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
                            client.subscription_status.toLowerCase() === "active"
                              ? "bg-emerald-50 text-emerald-600"
                              : client.subscription_status.toLowerCase() === "pending"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {client.subscription_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/clients/${client.id}`}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye size={16} />
                          </Link>
                          <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
                            <Edit size={16} />
                          </button>
                          <button className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 size={16} />
                          </button>
                          <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
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

          {/* MOBILE & TABLET VIEW: ENTERPRISE CARDS */}
          <div className="flex flex-col gap-4 md:hidden">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex flex-col rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold shadow-sm bg-[#faf8f3]"
                      style={{ color: GOLD }}
                    >
                      {client.business_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link 
                        to={`/admin/clients/${client.id}`}
                        className="font-bold text-slate-900 transition hover:text-[#c59b27]"
                      >
                        {client.business_name}
                      </Link>
                      <p className="text-sm font-medium text-slate-500">
                        {client.owner_name}
                      </p>
                    </div>
                  </div>
                  <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <div className="mb-4 mt-4 h-[1px] w-full bg-slate-100" />

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan & Status</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {client.plan}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                          client.subscription_status.toLowerCase() === "active"
                            ? "bg-emerald-50 text-emerald-600"
                            : client.subscription_status.toLowerCase() === "pending"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {client.subscription_status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/clients/${client.id}`}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-slate-900"
                    >
                      <Eye size={14} />
                    </Link>
                    <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-slate-900">
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#faf8f3] text-[#c59b27]">
            <Users size={28} />
          </div>
          <h2 className="mt-5 text-lg font-bold text-slate-900">
            {clients.length === 0 ? "No clients yet" : "No matching clients"}
          </h2>
          <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
            {clients.length === 0
              ? "Add your first client to begin the Abhinava onboarding process."
              : "Try adjusting your search query or status filter."}
          </p>
          {clients.length === 0 && (
            <Link
              to="/admin/clients/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
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