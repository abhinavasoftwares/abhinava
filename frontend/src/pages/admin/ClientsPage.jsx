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
  Mail,
  Phone,
  Building2,
  CreditCard,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_BASE_URL;

/* =========================================================
   ABHINAVA THEME
========================================================= */

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
  },
};

function getStoredTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return localStorage.getItem("abhinava-admin-theme") === "dark"
    ? "dark"
    : "light";
}

/* =========================================================
   PAGE
========================================================= */

function ClientsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Clients");

  const [themeMode, setThemeMode] = useState(getStoredTheme);

  const theme = THEMES[themeMode];

  /* =======================================================
     SYNC WITH ADMINLAYOUT THEME
  ======================================================== */

  useEffect(() => {
    const root = document.documentElement;

    const updateTheme = () => {
      const mode =
        root.getAttribute("data-abhinava-theme") === "dark"
          ? "dark"
          : "light";

      setThemeMode(mode);
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-abhinava-theme"],
    });

    return () => observer.disconnect();
  }, []);

  /* =======================================================
     SUCCESS MESSAGE
  ======================================================== */

  useEffect(() => {
    if (!location.state?.successMessage) {
      return;
    }

    setSuccessMessage(location.state.successMessage);

    navigate(location.pathname, {
      replace: true,
      state: {},
    });

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [location, navigate]);

  /* =======================================================
     FETCH CLIENTS
  ======================================================== */

  useEffect(() => {
    const fetchClients = async () => {
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

        setClients(
          Array.isArray(data.clients)
            ? data.clients
            : []
        );
      } catch (err) {
        console.error("Error fetching clients:", err);

        setError(
          err.message || "Unable to load clients."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [navigate]);

  /* =======================================================
     FILTER
  ======================================================== */

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const businessName =
        client.business_name?.toLowerCase() || "";

      const ownerName =
        client.owner_name?.toLowerCase() || "";

      const email =
        client.business_email?.toLowerCase() || "";

      const status =
        client.subscription_status?.toLowerCase() || "";

      const matchesSearch =
        !search ||
        businessName.includes(search) ||
        ownerName.includes(search) ||
        email.includes(search);

      const matchesStatus =
        statusFilter === "All Clients" ||
        status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [
    clients,
    searchTerm,
    statusFilter,
  ]);

  /* =======================================================
     EXPORT
  ======================================================== */

  const handleExport = () => {
    alert(
      `Exporting ${filteredClients.length} clients to CSV...`
    );
  };

  /* =======================================================
     RENDER
  ======================================================== */

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{
        backgroundColor: theme.background,
        color: theme.text,
      }}
    >
      {/* ===================================================
          SUCCESS TOAST
      ==================================================== */}

      {successMessage && (
        <div
          className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-xl border px-4 py-3.5 sm:right-6 sm:top-6"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            boxShadow:
              theme.mode === "dark"
                ? "0 18px 50px rgba(0,0,0,0.35)"
                : "0 18px 50px rgba(40,60,40,0.12)",
          }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: theme.primarySoft,
              color: theme.success,
            }}
          >
            <CheckCircle2
              size={17}
              strokeWidth={2}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-[12px] font-semibold"
              style={{ color: theme.text }}
            >
              Client created successfully
            </p>

            <p
              className="mt-0.5 text-[11px] leading-relaxed"
              style={{ color: theme.textMuted }}
            >
              {successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="shrink-0 text-lg leading-none transition"
            style={{
              color: theme.textMuted,
            }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* ===================================================
          PAGE HEADER
          DOES NOT SCROLL
      ==================================================== */}

      <header
        className="shrink-0 border-b px-4 py-5 sm:px-6 lg:px-8"
        style={{
          backgroundColor: theme.background,
          borderColor: theme.border,
        }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]"
              style={{
                backgroundColor: theme.primarySoft,
                color: theme.primary,
              }}
            >
              <Users
                size={12}
                strokeWidth={2}
              />

              Client Management
            </div>

            <h1
              className="mt-2 text-[24px] font-semibold tracking-[-0.025em] sm:text-[28px]"
              style={{
                color: theme.text,
              }}
            >
              Clients Directory
            </h1>

            <p
              className="mt-1 max-w-2xl text-[12px] leading-relaxed sm:text-[13px]"
              style={{
                color: theme.textMuted,
              }}
            >
              Manage Abhinava client accounts,
              subscriptions, and onboarding.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-[11px] font-semibold transition"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textSoft,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme.surface;
              }}
            >
              <Download
                size={14}
                strokeWidth={1.9}
              />

              Export
            </button>

            <Link
              to="/admin/clients/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-[11px] font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: theme.primary,
                color: "#FFFFFF",
              }}
            >
              <Plus
                size={15}
                strokeWidth={2.2}
              />

              Add Client
            </Link>
          </div>
        </div>
      </header>

      {/* ===================================================
          FILTER BAR
          DOES NOT SCROLL
      ==================================================== */}

      <div
        className="shrink-0 px-4 py-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: theme.background,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="text-[11px]"
            style={{
              color: theme.textMuted,
            }}
          >
            Showing{" "}
            <span
              className="font-semibold"
              style={{
                color: theme.text,
              }}
            >
              {filteredClients.length}
            </span>{" "}
            of{" "}
            <span
              className="font-semibold"
              style={{
                color: theme.text,
              }}
            >
              {clients.length}
            </span>{" "}
            clients
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row lg:w-auto">
            {/* SEARCH */}

            <div className="relative w-full sm:w-[280px]">
              <Search
                size={15}
                strokeWidth={1.8}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{
                  color: theme.textLight,
                }}
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="Search clients, owners, emails..."
                className="h-9 w-full rounded-lg border py-2 pl-9 pr-3 text-[11px] font-medium outline-none transition"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    theme.primary;

                  e.currentTarget.style.boxShadow =
                    `0 0 0 2px ${theme.primarySoft}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    theme.border;

                  e.currentTarget.style.boxShadow =
                    "none";
                }}
              />
            </div>

            {/* STATUS */}

            <div className="relative w-full sm:w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="h-9 w-full appearance-none rounded-lg border px-3 pr-8 text-[11px] font-medium outline-none transition"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.textSoft,
                }}
              >
                <option value="All Clients">
                  All Statuses
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

                <option value="Pending">
                  Pending
                </option>
              </select>

              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  color: theme.textLight,
                }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          MAIN RESULTS REGION

          Desktop:
          - Does NOT scroll.
          - Table body handles scrolling.

          Mobile/tablet:
          - Cards handle vertical content.
      ==================================================== */}

      <main className="min-h-0 flex-1 overflow-hidden px-4 pb-6 sm:px-6 lg:px-8">
        {/* =================================================
            LOADING
        ================================================== */}

        {loading && (
          <div
            className="flex h-full min-h-[240px] items-center justify-center rounded-xl border"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="h-7 w-7 animate-spin rounded-full border-[3px]"
                style={{
                  borderColor: theme.border,
                  borderTopColor: theme.primary,
                }}
              />

              <p
                className="mt-3 text-[11px] font-medium"
                style={{
                  color: theme.textMuted,
                }}
              >
                Loading directory...
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================== */}

        {!loading && error && (
          <div
            className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border px-6 text-center"
            style={{
              backgroundColor:
                theme.mode === "dark"
                  ? "#241A19"
                  : "#FCF3F2",

              borderColor:
                theme.mode === "dark"
                  ? "#4A302E"
                  : "#E8C9C5",
            }}
          >
            <XCircle
              size={28}
              strokeWidth={1.5}
              style={{
                color: theme.danger,
              }}
            />

            <p
              className="mt-3 text-[12px] font-semibold"
              style={{
                color: theme.danger,
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* =================================================
            CLIENT CONTENT
        ================================================== */}

        {!loading &&
          !error &&
          filteredClients.length > 0 && (
            <>
              {/* =============================================
                  DESKTOP TABLE
                  >= lg

                  IMPORTANT:
                  The table body is the ONLY scroll container.
              ============================================== */}

              <div
                className="hidden h-full min-h-0 overflow-hidden rounded-xl border lg:flex lg:flex-col"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                }}
              >
                {/* TABLE HEADER */}

                <div
                  className="grid shrink-0 grid-cols-[minmax(0,1.65fr)_minmax(180px,1.15fr)_110px_120px_110px] border-b px-5 py-3.5"
                  style={{
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                  }}
                >
                  <TableHeading
                    label="Business"
                    theme={theme}
                  />

                  <TableHeading
                    label="Owner Contact"
                    theme={theme}
                  />

                  <TableHeading
                    label="Plan"
                    theme={theme}
                  />

                  <TableHeading
                    label="Status"
                    theme={theme}
                  />

                  <TableHeading
                    label="Actions"
                    theme={theme}
                    align="right"
                  />
                </div>

                {/* =========================================
                    ONLY SCROLLABLE AREA

                    No fixed height is applied.

                    overflow-y-auto only displays a scrollbar
                    when the content actually exceeds this area.
                ========================================== */}

                <div
                  className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: `${theme.primary} transparent`,
                  }}
                >
                  {filteredClients.map((client) => (
                    <DesktopClientRow
                      key={client.id}
                      client={client}
                      theme={theme}
                    />
                  ))}
                </div>

                {/* TABLE FOOTER */}

                <div
                  className="flex shrink-0 items-center justify-between border-t px-5 py-3"
                  style={{
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                  }}
                >
                  <span
                    className="text-[10px]"
                    style={{
                      color: theme.textMuted,
                    }}
                  >
                    {filteredClients.length} client
                    {filteredClients.length !== 1
                      ? "s"
                      : ""}
                  </span>

                  <span
                    className="text-[10px]"
                    style={{
                      color: theme.textLight,
                    }}
                  >
                    Client directory
                  </span>
                </div>
              </div>

              {/* =============================================
                  MOBILE + TABLET
                  < lg

                  Everything is represented as a card.
              ============================================== */}

              <div className="h-full overflow-y-auto overflow-x-hidden pb-2 lg:hidden">
                <div className="grid grid-cols-1 gap-3">
                  {filteredClients.map((client) => (
                    <MobileClientCard
                      key={client.id}
                      client={client}
                      theme={theme}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

        {/* =================================================
            EMPTY STATE
        ================================================== */}

        {!loading &&
          !error &&
          filteredClients.length === 0 && (
            <div
              className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border px-6 text-center"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: theme.primarySoft,
                  color: theme.primary,
                }}
              >
                <Building2
                  size={21}
                  strokeWidth={1.7}
                />
              </div>

              <h2
                className="mt-4 text-[14px] font-semibold"
                style={{
                  color: theme.text,
                }}
              >
                {clients.length === 0
                  ? "No clients yet"
                  : "No matching clients"}
              </h2>

              <p
                className="mt-1.5 max-w-sm text-[11px] leading-relaxed"
                style={{
                  color: theme.textMuted,
                }}
              >
                {clients.length === 0
                  ? "Add your first client to begin the Abhinava onboarding process."
                  : "Try adjusting your search query or status filter."}
              </p>

              {clients.length === 0 && (
                <Link
                  to="/admin/clients/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[11px] font-semibold transition"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  <Plus
                    size={15}
                    strokeWidth={2}
                  />

                  Add your first client
                </Link>
              )}
            </div>
          )}
      </main>
    </div>
  );
}

/* =========================================================
   TABLE HEADING
========================================================= */

function TableHeading({
  label,
  theme,
  align = "left",
}) {
  return (
    <div
      className={`text-[9px] font-semibold uppercase tracking-[0.07em] ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
      style={{
        color: theme.textMuted,
      }}
    >
      {label}
    </div>
  );
}

/* =========================================================
   DESKTOP CLIENT ROW
========================================================= */

function DesktopClientRow({
  client,
  theme,
}) {
  return (
    <div
      className="grid grid-cols-[minmax(0,1.65fr)_minmax(180px,1.15fr)_110px_120px_110px] items-center border-b px-5 py-4 transition-colors last:border-b-0"
      style={{
        borderColor: theme.border,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor =
          theme.surfaceHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor =
          "transparent";
      }}
    >
      {/* BUSINESS */}

      <div className="min-w-0 pr-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold"
            style={{
              backgroundColor: theme.primarySoft,
              color: theme.primary,
            }}
          >
            {getInitial(client.business_name)}
          </div>

          <div className="min-w-0">
            <Link
              to={`/admin/clients/${client.id}`}
              className="block truncate text-[12px] font-semibold transition"
              style={{
                color: theme.text,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color =
                  theme.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color =
                  theme.text;
              }}
            >
              {client.business_name ||
                "Unnamed client"}
            </Link>

            <span
              className="mt-0.5 block truncate text-[9px]"
              style={{
                color: theme.textMuted,
              }}
            >
              Client #{client.id ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* OWNER */}

      <div className="min-w-0 pr-4">
        <div
          className="truncate text-[11px] font-medium"
          style={{
            color: theme.textSoft,
          }}
        >
          {client.owner_name || "—"}
        </div>

        <div
          className="mt-0.5 truncate text-[9px]"
          style={{
            color: theme.textMuted,
          }}
        >
          {client.business_email ||
            "No email"}
        </div>
      </div>

      {/* PLAN */}

      <div className="min-w-0 pr-3">
        <span
          className="inline-flex max-w-full truncate rounded-md px-2 py-1 text-[9px] font-semibold"
          style={{
            backgroundColor: theme.surfaceAlt,
            color: theme.textSoft,
          }}
          title={client.plan || "—"}
        >
          {client.plan || "—"}
        </span>
      </div>

      {/* STATUS */}

      <div className="min-w-0 pr-3">
        <StatusBadge
          status={client.subscription_status}
          theme={theme}
        />
      </div>

      {/* ACTIONS */}

      <div className="flex items-center justify-end gap-0.5">
        <ActionButton
          to={`/admin/clients/${client.id}`}
          icon={Eye}
          label="View client"
          theme={theme}
        />

        <ActionButton
          icon={Edit}
          label="Edit client"
          theme={theme}
        />

        <ActionButton
          icon={Trash2}
          label="Delete client"
          theme={theme}
          danger
        />

        <ActionButton
          icon={MoreHorizontal}
          label="More actions"
          theme={theme}
        />
      </div>
    </div>
  );
}

/* =========================================================
   MOBILE / TABLET CLIENT CARD
========================================================= */

function MobileClientCard({
  client,
  theme,
}) {
  const phone =
    client.whatsapp_number ||
    client.primary_number ||
    "";

  return (
    <div
      className="rounded-xl border p-4 transition"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      {/* HEADER */}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold"
            style={{
              backgroundColor: theme.primarySoft,
              color: theme.primary,
            }}
          >
            {getInitial(client.business_name)}
          </div>

          <div className="min-w-0">
            <Link
              to={`/admin/clients/${client.id}`}
              className="block truncate text-[13px] font-semibold"
              style={{
                color: theme.text,
              }}
            >
              {client.business_name ||
                "Unnamed client"}
            </Link>

            <p
              className="mt-0.5 truncate text-[10px]"
              style={{
                color: theme.textMuted,
              }}
            >
              {client.owner_name ||
                "Owner not specified"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 transition"
          style={{
            color: theme.textMuted,
          }}
          aria-label="More actions"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              theme.surfaceHover;

            e.currentTarget.style.color =
              theme.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              "transparent";

            e.currentTarget.style.color =
              theme.textMuted;
          }}
        >
          <MoreHorizontal size={17} />
        </button>
      </div>

      {/* DIVIDER */}

      <div
        className="my-4 h-px"
        style={{
          backgroundColor: theme.border,
        }}
      />

      {/* PLAN + STATUS */}

      <div className="grid grid-cols-2 gap-3">
        <InfoBlock
          label="Plan"
          value={client.plan || "—"}
          icon={CreditCard}
          theme={theme}
        />

        <InfoBlock
          label="Status"
          theme={theme}
          customValue={
            <StatusBadge
              status={client.subscription_status}
              theme={theme}
            />
          }
        />
      </div>

      {/* CONTACT */}

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <ContactItem
          icon={Mail}
          value={
            client.business_email ||
            "No email available"
          }
          theme={theme}
        />

        <ContactItem
          icon={Phone}
          value={
            phone || "No phone available"
          }
          theme={theme}
        />
      </div>

      {/* FOOTER ACTIONS */}

      <div
        className="mt-4 flex items-center justify-between border-t pt-3.5"
        style={{
          borderColor: theme.border,
        }}
      >
        <span
          className="text-[9px]"
          style={{
            color: theme.textLight,
          }}
        >
          Client #{client.id ?? "—"}
        </span>

        <div className="flex items-center gap-1.5">
          <Link
            to={`/admin/clients/${client.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-semibold transition"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.textSoft,
            }}
          >
            <Eye size={13} />
            View
          </Link>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold transition"
            style={{
              backgroundColor: theme.primarySoft,
              color: theme.primary,
            }}
          >
            <Edit size={13} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INFO BLOCK
========================================================= */

function InfoBlock({
  label,
  value,
  icon: Icon,
  customValue,
  theme,
}) {
  return (
    <div
      className="min-w-0 rounded-lg px-3 py-2.5"
      style={{
        backgroundColor: theme.surfaceAlt,
      }}
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            size={12}
            strokeWidth={1.7}
            style={{
              color: theme.textMuted,
            }}
          />
        )}

        <span
          className="text-[8px] font-semibold uppercase tracking-[0.07em]"
          style={{
            color: theme.textMuted,
          }}
        >
          {label}
        </span>
      </div>

      <div className="mt-1.5 min-w-0">
        {customValue || (
          <span
            className="block truncate text-[10px] font-semibold"
            style={{
              color: theme.text,
            }}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CONTACT ITEM
========================================================= */

function ContactItem({
  icon: Icon,
  value,
  theme,
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2.5"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <Icon
        size={13}
        strokeWidth={1.7}
        className="shrink-0"
        style={{
          color: theme.primary,
        }}
      />

      <span
        className="truncate text-[10px]"
        style={{
          color: theme.textSoft,
        }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
  theme,
}) {
  const normalized =
    status?.toLowerCase() || "";

  let color = theme.textMuted;
  let background = theme.surfaceAlt;
  let Icon = Clock3;

  if (
    normalized === "active" ||
    normalized === "trial"
  ) {
    color = theme.success;
    background = theme.primarySoft;
    Icon = CheckCircle2;
  } else if (
    normalized === "pending" ||
    normalized === "provisioning"
  ) {
    color = theme.warning;
    background = theme.goldSoft;
    Icon = Clock3;
  } else if (
    normalized === "inactive" ||
    normalized === "failed" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    color = theme.danger;

    background =
      theme.mode === "dark"
        ? "#382522"
        : "#F5E6E4";

    Icon = XCircle;
  }

  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-semibold"
      style={{
        backgroundColor: background,
        color,
      }}
    >
      <Icon
        size={11}
        strokeWidth={2}
        className="shrink-0"
      />

      <span className="truncate">
        {status || "Unknown"}
      </span>
    </span>
  );
}

/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  to,
  icon: Icon,
  label,
  theme,
  danger = false,
}) {
  const content = (
    <Icon
      size={14}
      strokeWidth={1.8}
    />
  );

  const className =
    "rounded-md p-1.5 transition";

  const style = {
    color: danger
      ? theme.danger
      : theme.textMuted,
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.backgroundColor =
      danger
        ? theme.mode === "dark"
          ? "#382522"
          : "#F5E6E4"
        : theme.surfaceHover;

    e.currentTarget.style.color = danger
      ? theme.danger
      : theme.text;
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.backgroundColor =
      "transparent";

    e.currentTarget.style.color = danger
      ? theme.danger
      : theme.textMuted;
  };

  if (to) {
    return (
      <Link
        to={to}
        aria-label={label}
        title={label}
        className={className}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={className}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {content}
    </button>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getInitial(name) {
  if (!name) {
    return "C";
  }

  return name
    .trim()
    .charAt(0)
    .toUpperCase();
}

export default ClientsPage;