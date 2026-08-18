
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
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

const API_URL =
  "https://sturdy-train-77rj957xr4pp2x675-8000.app.github.dev";

const MODULE_DEFINITIONS = [
  {
    key: "customers",
    label: "Customers",
    icon: Users,
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: Package,
  },
  {
    key: "purchases",
    label: "Purchases",
    icon: ShoppingCart,
  },
  {
    key: "sales",
    label: "Sales",
    icon: Receipt,
  },
  {
    key: "payments",
    label: "Payments",
    icon: Wallet,
  },
  {
    key: "ledger",
    label: "Ledger",
    icon: BookOpen,
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
  },
];

function ClientDetailsPage() {
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
          if (response.status === 404) {
            throw new Error("Client not found.");
          }

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

  // ---------------- STATES ----------------

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-6 pb-8">
        <div className="flex h-64 flex-col items-center justify-center rounded-[24px] border border-gray-200 bg-gray-50/50 dark:border-neutral-800 dark:bg-[#171717]/30">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-500/20 dark:border-t-indigo-500" />

          <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            Loading client record...
          </p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex h-full flex-col gap-6 pb-8">
        <div>
          <Link
            to="/admin/clients"
            className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to Clients
          </Link>

          <div className="flex flex-col items-center justify-center rounded-[24px] border border-red-200 bg-red-50 py-12 dark:border-red-500/20 dark:bg-red-500/5">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
              Unable to load record
            </h2>

            <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400/80">
              {error || "Client not found."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- BADGE LOGIC ----------------

  const status = client.subscription_status?.toLowerCase();

  const statusClass =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
      : status === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
      : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";

  // ---------------- MODULE DATA ----------------

  const modules =
    client.modules && typeof client.modules === "object"
      ? client.modules
      : {};

  const enabledModules = MODULE_DEFINITIONS.filter(
    (module) => modules[module.key] === true
  );

  return (
    <div className="flex h-full flex-col gap-5 pb-8">

      {/* ---------------- NAVIGATION ---------------- */}

      <div>
        <Link
          to="/admin/clients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          Directory
        </Link>
      </div>

      {/* ---------------- PROFILE HEADER ---------------- */}

      <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-[#121212]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            {/* Avatar */}

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-indigo-100/60 text-2xl font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              {client.business_name?.charAt(0).toUpperCase() || "C"}
            </div>

            {/* Name & Badges */}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                  {client.business_name}
                </h1>

                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}
                >
                  {client.subscription_status}
                </span>
              </div>

              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Client ID #{client.id}
              </p>

              {/* Inline Indicators */}

              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge
                  icon={<CreditCard size={12} />}
                  label={client.plan}
                />

                <Badge
                  icon={<Clock size={12} />}
                  label={`${client.billing_cycle} billing`}
                  capitalize
                />

                <Badge
                  icon={<CalendarDays size={12} />}
                  label={`Since ${client.start_date}`}
                />

                {client.domain && (
                  <Badge
                    icon={<Package size={12} />}
                    label={client.domain}
                    capitalize
                  />
                )}
              </div>
            </div>
          </div>

          {/* Edit */}

          <div className="flex shrink-0 sm:self-start">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 sm:w-auto dark:border-neutral-700 dark:bg-[#1a1a1a] dark:text-gray-300 dark:hover:bg-[#222]"
            >
              <Edit size={16} />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- BUSINESS + OWNER ---------------- */}

      <div className="grid gap-5 md:grid-cols-2">

        {/* Business Record */}

        <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-[#121212]">
          <div className="mb-4 flex items-center gap-2">
            <Building2
              size={18}
              className="text-indigo-600 dark:text-indigo-400"
            />

            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Business Record
            </h2>
          </div>

          <div className="flex flex-col">
            <RecordRow
              label="Legal Name"
              value={client.legal_business_name}
            />

            <RecordRow
              label="Type"
              value={client.business_type}
              capitalize
            />

            <RecordRow
              label="Country"
              value={client.country}
            />

            <RecordRow
              label="Email"
              value={client.business_email}
            />

            <RecordRow
              label="Phone"
              value={client.business_phone}
              isLast
            />
          </div>
        </section>

        {/* Owner Record */}

        <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-[#121212]">
          <div className="mb-4 flex items-center gap-2">
            <UserRound
              size={18}
              className="text-indigo-600 dark:text-indigo-400"
            />

            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Owner Record
            </h2>
          </div>

          <div className="flex flex-col">
            <RecordRow
              label="Full Name"
              value={client.owner_name}
            />

            <RecordRow
              label="Account Role"
              value={client.owner_role}
              capitalize
            />

            <RecordRow
              label="Email Address"
              value={client.owner_email}
            />

            <RecordRow
              label="Contact Number"
              value={client.owner_phone}
              isLast
            />
          </div>
        </section>
      </div>

      {/* ---------------- PRODUCT CONFIGURATION ---------------- */}

      <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-[#121212]">

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-2">
            <Package
              size={18}
              className="text-indigo-600 dark:text-indigo-400"
            />

            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Product Configuration
              </h2>

              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Domain and modules enabled for this client
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            {client.domain || "Not configured"}
          </span>
        </div>

        {/* Domain */}

        <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-neutral-800/80 dark:bg-[#1a1a1a]/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Business Domain
              </p>

              <p className="mt-1 text-sm font-bold capitalize text-gray-900 dark:text-white">
                {client.domain || "—"}
              </p>
            </div>

            <Package
              size={20}
              className="text-gray-400 dark:text-gray-600"
            />
          </div>
        </div>

        {/* Modules */}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                Enabled Modules
              </p>

              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                {enabledModules.length} module
                {enabledModules.length === 1 ? "" : "s"} enabled
              </p>
            </div>

            {client.plan === "overall" && (
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                Full Software
              </span>
            )}
          </div>

          {enabledModules.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {enabledModules.map((module) => {
                const Icon = module.icon;

                return (
                  <div
                    key={module.key}
                    className="flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-3 dark:border-emerald-500/10 dark:bg-emerald-500/5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Icon size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {module.label}
                      </p>

                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Enabled
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center dark:border-neutral-800 dark:bg-[#171717]">
              <Package
                size={22}
                className="mx-auto text-gray-400 dark:text-gray-600"
              />

              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                No modules configured
              </p>

              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Module configuration is not available for this client yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- DOCUMENTS ---------------- */}

      <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-[#121212]">

        <div className="mb-4 flex items-center gap-2">
          <FileText
            size={18}
            className="text-indigo-600 dark:text-indigo-400"
          />

          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Verification Documents
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DocumentCard
            label="PAN Card"
            status={client.pan ? "Verified" : "Missing"}
          />

          <DocumentCard
            label="GSTIN"
            status={client.gstin ? "Verified" : "Missing"}
          />

          <DocumentCard
            label="Aadhaar"
            status="Missing"
          />

          <DocumentCard
            label="Client Agreement"
            status="Missing"
          />
        </div>
      </section>
    </div>
  );
}

// ---------------- MICRO-COMPONENTS ----------------

function Badge({ icon, label, capitalize }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-neutral-800/80 dark:text-gray-300">
      {icon}

      <span className={capitalize ? "capitalize" : ""}>
        {label}
      </span>
    </div>
  );
}

function RecordRow({
  label,
  value,
  capitalize,
  isLast,
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 text-sm ${
        !isLast
          ? "border-b border-gray-100 dark:border-neutral-800/50"
          : ""
      }`}
    >
      <span className="font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>

      <span
        className={`text-right font-semibold text-gray-900 dark:text-white ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function DocumentCard({ label, status }) {
  const isVerified = status === "Verified";

  return (
    <div className="flex items-center justify-between rounded-[16px] border border-gray-100 bg-gray-50/50 p-3 dark:border-neutral-800/80 dark:bg-[#1a1a1a]/50">
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {label}
      </span>

      <span
        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          isVerified
            ? "bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-gray-200/60 text-gray-500 dark:bg-neutral-800 dark:text-gray-400"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

export default ClientDetailsPage;

