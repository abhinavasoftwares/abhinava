import { useEffect, useState } from "react";
import {
  Plus,
  Tag,
  Pencil,
  Power,
  RefreshCw,
  Percent,
  IndianRupee,
  CalendarDays,
  Hash,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const GOLD = "#c59b27";

const card =
  "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export default function ReferralCodesPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [editing, setEditing] =
    useState(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "PERCENTAGE",
    discount_value: "",
    max_uses: "",
    valid_from: "",
    valid_until: "",
  });

  const fetchCodes = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/referrals`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load referral codes."
        );
      }

      const data =
        await response.json();

      setCodes(
        data.referral_codes || []
      );
    } catch (error) {
      console.error(
        "Referral loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const openCreate = () => {
    setEditing(null);

    setForm({
      code: "",
      description: "",
      discount_type: "PERCENTAGE",
      discount_value: "",
      max_uses: "",
      valid_from: "",
      valid_until: "",
    });

    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);

    setForm({
      code: item.code || "",
      description:
        item.description || "",
      discount_type:
        item.discount_type ||
        "PERCENTAGE",
      discount_value:
        item.discount_value ?? "",
      max_uses:
        item.max_uses ?? "",
      valid_from:
        item.valid_from || "",
      valid_until:
        item.valid_until || "",
    });

    setShowModal(true);
  };

  const saveCode = async () => {
    if (!form.code.trim()) {
      alert("Referral code is required.");
      return;
    }

    if (
      form.discount_value === "" ||
      Number(form.discount_value) <= 0
    ) {
      alert(
        "Enter a valid discount value."
      );
      return;
    }

    try {
      const payload = {
        code: form.code
          .trim()
          .toUpperCase(),

        description:
          form.description.trim() ||
          null,

        discount_type:
          form.discount_type,

        discount_value:
          Number(form.discount_value),

        max_uses:
          form.max_uses === ""
            ? null
            : Number(form.max_uses),

        valid_from:
          form.valid_from || null,

        valid_until:
          form.valid_until || null,
      };

      const url = editing
        ? `${API_URL}/referrals/${editing.id}`
        : `${API_URL}/referrals`;

      const response = await fetch(
        url,
        {
          method: editing
            ? "PATCH"
            : "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.detail)
            ? data.detail
                .map(
                  (item) =>
                    item.msg ||
                    JSON.stringify(item)
                )
                .join(", ")
            : data?.detail ||
              "Unable to save referral code."
        );
      }

      setShowModal(false);
      await fetchCodes();
    } catch (error) {
      console.error(
        "Referral save error:",
        error
      );

      alert(
        error.message ||
          "Unable to save referral code."
      );
    }
  };

  const toggleCode = async (item) => {
    try {
      const response = await fetch(
        `${API_URL}/referrals/${item.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            is_active:
              !item.is_active,
          }),
        }
      );

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.detail ||
            "Unable to update referral code."
        );
      }

      await fetchCodes();
    } catch (error) {
      alert(
        error.message ||
          "Unable to update referral code."
      );
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50/60">
      <header className="shrink-0 border-b border-slate-200/70 bg-white">
        <div className="flex min-h-[72px] items-center justify-between px-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Tag
                size={18}
                className="text-[#c59b27]"
              />

              <h1 className="text-lg font-semibold text-slate-900">
                Referral Codes
              </h1>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Create and manage promotional discounts for client onboarding.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCodes}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white"
              style={{
                backgroundColor: GOLD,
              }}
            >
              <Plus size={15} />
              New Referral Code
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <RefreshCw
              size={25}
              className="animate-spin text-[#c59b27]"
            />
          </div>
        ) : codes.length === 0 ? (
          <div
            className={`${card} flex min-h-[400px] flex-col items-center justify-center text-center`}
          >
            <Tag
              size={28}
              className="text-[#c59b27]"
            />

            <h2 className="mt-4 text-sm font-bold text-slate-900">
              No referral codes yet
            </h2>

            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Create a promotional code that can be
              applied during client onboarding.
            </p>

            <button
              onClick={openCreate}
              className="mt-5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white"
              style={{
                backgroundColor: GOLD,
              }}
            >
              Create Referral Code
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {codes.map((item) => (
              <div
                key={item.id}
                className={`${card} overflow-hidden`}
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Hash
                        size={14}
                        className="text-[#c59b27]"
                      />

                      <h2 className="text-sm font-bold tracking-wide text-slate-900">
                        {item.code}
                      </h2>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.description ||
                        "No description"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                      item.is_active
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {item.is_active
                      ? "ACTIVE"
                      : "INACTIVE"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                  <Metric
                    icon={item.discount_type === "PERCENTAGE"
                      ? Percent
                      : IndianRupee}
                    label="Discount"
                    value={
                      item.discount_type ===
                      "PERCENTAGE"
                        ? `${item.discount_value}%`
                        : `₹${Number(
                            item.discount_value
                          ).toLocaleString(
                            "en-IN"
                          )}`
                    }
                  />

                  <Metric
                    icon={Hash}
                    label="Usage"
                    value={`${item.used_count || 0}${
                      item.max_uses != null
                        ? ` / ${item.max_uses}`
                        : ""
                    }`}
                  />

                  <Metric
                    icon={CalendarDays}
                    label="Valid From"
                    value={
                      item.valid_from ||
                      "Anytime"
                    }
                  />

                  <Metric
                    icon={CalendarDays}
                    label="Valid Until"
                    value={
                      item.valid_until ||
                      "No expiry"
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                  <button
                    type="button"
                    onClick={() =>
                      openEdit(item)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleCode(item)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Power size={12} />
                    {item.is_active
                      ? "Disable"
                      : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {editing
                    ? "Edit Referral Code"
                    : "Create Referral Code"}
                </h2>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  Configure the discount and usage rules.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="text-xs text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-5">
              <Field
                label="Referral Code"
                value={form.code}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    code: value,
                  }))
                }
                placeholder="WELCOME500"
              />

              <Field
                label="Description"
                value={form.description}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    description: value,
                  }))
                }
                placeholder="New client welcome discount"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Discount Type
                  </label>

                  <select
                    value={
                      form.discount_type
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        discount_type:
                          event.target
                            .value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs"
                  >
                    <option value="PERCENTAGE">
                      Percentage
                    </option>

                    <option value="FIXED">
                      Fixed Amount
                    </option>
                  </select>
                </div>

                <Field
                  label="Discount Value"
                  type="number"
                  value={
                    form.discount_value
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      discount_value:
                        value,
                    }))
                  }
                  placeholder={
                    form.discount_type ===
                    "PERCENTAGE"
                      ? "10"
                      : "500"
                  }
                />
              </div>

              <Field
                label="Maximum Uses"
                type="number"
                value={form.max_uses}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    max_uses: value,
                  }))
                }
                placeholder="Unlimited"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Valid From"
                  type="date"
                  value={
                    form.valid_from
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      valid_from:
                        value,
                    }))
                  }
                />

                <Field
                  label="Valid Until"
                  type="date"
                  value={
                    form.valid_until
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      valid_until:
                        value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={saveCode}
                  className="rounded-lg px-5 py-2.5 text-xs font-semibold text-white"
                  style={{
                    backgroundColor: GOLD,
                  }}
                >
                  {editing
                    ? "Save Changes"
                    : "Create Code"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[#c59b27]"
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <Icon
        size={13}
        className="text-[#c59b27]"
      />

      <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-xs font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}