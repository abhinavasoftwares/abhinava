import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  UserRound,
  Edit,
  Clock,
  Package,
  Users,
  ShoppingCart,
  Receipt,
  Wallet,
  BookOpen,
  BarChart3,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

const API_URL = "https://sturdy-train-77rj957xr4pp2x675-8000.app.github.dev";
const GOLD = "#c59b27";

const MODULE_DEFINITIONS = [
  { key: "customers", label: "Customers", icon: Users },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "purchases", label: "Purchases", icon: ShoppingCart },
  { key: "sales", label: "Sales", icon: Receipt },
  { key: "payments", label: "Payments", icon: Wallet },
  { key: "ledger", label: "Ledger", icon: BookOpen },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

export default function ClientDetailsPage() {
  const { clientId } = useParams();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/clients/${clientId}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("Client not found.");
          throw new Error("Failed to load client.");
        }

        const data = await response.json();
        setClient(data.client);
      } catch (error) {
        console.error("Error fetching client:", error);
        setError(error.message || "Unable to load client.");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50/60 p-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#c59b27]" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading client record...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="h-full w-full overflow-y-auto bg-slate-50/60 p-4 sm:p-5 lg:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div>
          <Link
            to="/admin/clients"
            className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={14} /> Back to Clients
          </Link>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-12">
            <h2 className="text-lg font-semibold text-rose-700">Unable to load record</h2>
            <p className="mt-2 text-sm font-medium text-rose-600">{error || "Client not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const status = client.subscription_status?.toLowerCase();
  const statusClass =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  const modules = client.modules && typeof client.modules === "object" ? client.modules : {};
  const enabledModules = MODULE_DEFINITIONS.filter((module) => modules[module.key] === true);

  return (
    // STRICT VIEWPORT HEIGHT LOCK: Prevents outer page scrolling on desktop
    <div className="h-full w-full overflow-y-auto lg:overflow-hidden flex flex-col gap-4 bg-slate-50/60 p-4 sm:p-5 lg:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

      {/* ---------------- NAVIGATION ---------------- */}
      <div className="shrink-0">
        <Link
          to="/admin/clients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={14} /> Directory
        </Link>
      </div>

      {/* ---------------- COMPACT PROFILE HEADER ---------------- */}
      <div className="shrink-0 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div 
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold shadow-sm bg-[#faf8f3]"
              style={{ color: GOLD }}
            >
              {client.business_name?.charAt(0).toUpperCase() || "C"}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  {client.business_name}
                </h1>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusClass}`}>
                  {client.subscription_status}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge icon={<CreditCard size={11} />} label={client.plan} />
                <Badge icon={<Clock size={11} />} label={`${client.billing_cycle} billing`} capitalize />
                <Badge icon={<CalendarDays size={11} />} label={`Since ${client.start_date}`} />
              </div>
            </div>
          </div>

          <div className="flex shrink-0">
            <button className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
              <Edit size={14} /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- 50/50 SPLIT WORKSPACE (Locked Height, Internal Scroll) ---------------- */}
      <div className="min-h-0 flex-1 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:overflow-hidden">
        
        {/* LEFT COLUMN (50%): Records (Business + Owner) */}
        <div className="flex flex-col gap-4 lg:col-span-6 lg:h-full lg:overflow-hidden">
          
          {/* Business Record */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col">
            <div className="mb-2 flex items-center gap-2 shrink-0">
              <Building2 size={15} style={{ color: GOLD }} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Business Record</h2>
            </div>
            <div className="flex flex-col">
              <RecordRow label="Legal Name" value={client.legal_business_name} />
              <RecordRow label="Type" value={client.business_type} capitalize />
              <RecordRow label="Country" value={client.country} />
              <RecordRow label="Email" value={client.business_email} />
              <RecordRow label="Phone" value={client.business_phone} isLast />
            </div>
          </section>

          {/* Owner Record */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col">
            <div className="mb-2 flex items-center gap-2 shrink-0">
              <UserRound size={15} style={{ color: GOLD }} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Owner Record</h2>
            </div>
            <div className="flex flex-col">
              <RecordRow label="Full Name" value={client.owner_name} />
              <RecordRow label="Account Role" value={client.owner_role} capitalize />
              <RecordRow label="Email Address" value={client.owner_email} />
              <RecordRow label="Contact Number" value={client.owner_phone} isLast />
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN (50%): Configuration & Documents */}
        <div className="flex flex-col gap-4 lg:col-span-6 lg:h-full lg:overflow-hidden">
          
          {/* Product Configuration */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col lg:flex-1 lg:overflow-hidden">
            <div className="flex items-center justify-between shrink-0 mb-3">
              <div className="flex items-center gap-2">
                <Package size={15} style={{ color: GOLD }} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Product Configuration</h2>
              </div>
              <span className="inline-flex rounded-lg bg-[#faf8f3] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c59b27] border border-slate-200/50">
                {client.domain || "Standard"}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MODULE_DEFINITIONS.map((module) => {
                  const Icon = module.icon;
                  const isEnabled = modules[module.key] === true;
                  return (
                    <div 
                      key={module.key} 
                      className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
                        isEnabled 
                          ? "border-emerald-100 bg-emerald-50/30 text-slate-900" 
                          : "border-slate-100 bg-slate-50/40 text-slate-400 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isEnabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                          <Icon size={14} />
                        </div>
                        <span className="text-xs font-bold truncate">{module.label}</span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {isEnabled ? "Active" : "Off"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Verification Documents */}
          <section className="shrink-0 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center gap-2">
              <FileText size={15} style={{ color: GOLD }} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Verification Documents</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DocumentCard label="PAN Card" status={client.pan ? "Verified" : "Missing"} />
              <DocumentCard label="GSTIN" status={client.gstin ? "Verified" : "Missing"} />
              <DocumentCard label="Aadhaar" status="Missing" />
              <DocumentCard label="Agreement" status="Missing" />
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}

// ---------------- MICRO-COMPONENTS ----------------

function Badge({ icon, label, capitalize }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
      {icon}
      <span className={capitalize ? "capitalize" : ""}>{label}</span>
    </div>
  );
}

function RecordRow({ label, value, capitalize, isLast }) {
  return (
    <div className={`flex items-center justify-between py-2 text-xs ${!isLast ? "border-b border-slate-100" : ""}`}>
      <span className="font-medium text-slate-400">{label}</span>
      <span className={`text-right font-semibold text-slate-900 ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function DocumentCard({ label, status }) {
  const isVerified = status === "Verified";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
      <span className="text-[11px] font-semibold text-slate-900 truncate">{label}</span>
      <div className="mt-2 flex items-center justify-between">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
          isVerified ? "bg-emerald-50 text-emerald-600" : "bg-slate-200/60 text-slate-500"
        }`}>
          {status}
        </span>
        {isVerified && <CheckCircle2 size={12} className="text-emerald-500" />}
      </div>
    </div>
  );
}