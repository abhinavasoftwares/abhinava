import React, { useMemo, useState } from "react";
import {
  Plus,
  Receipt,
  Trash2,
  Pencil,
  Lock,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const MODULES = [
  { id: "SALES", label: "Sales" },
  { id: "INVESTMENTS", label: "Investments" },
];

const EMPTY_FORM = {
  name: "",
  prefix: "",
  startingNumber: "1",
  modules: [],
};

export default function ReceiptSeriesSettings() {
  const [series, setSeries] = useState([
    {
      id: "demo-sales",
      name: "Sales Receipt",
      prefix: "SR-",
      nextNumber: 1042,
      modules: ["SALES"],
      usageCount: 1041,
      status: "ACTIVE",
    },
    {
      id: "demo-investments",
      name: "Investment Receipt",
      prefix: "INV-",
      nextNumber: 238,
      modules: ["INVESTMENTS"],
      usageCount: 237,
      status: "ACTIVE",
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);

  const hasAll = form.modules.includes("ALL");

  const total = series.length;

  const activeCount = useMemo(
    () => series.filter((item) => item.status === "ACTIVE").length,
    [series]
  );

  const toggleModule = (moduleId) => {
    setForm((current) => {
      if (moduleId === "ALL") {
        return {
          ...current,
          modules: current.modules.includes("ALL")
            ? []
            : ["ALL"],
        };
      }

      const withoutAll = current.modules.filter(
        (item) => item !== "ALL"
      );

      if (withoutAll.includes(moduleId)) {
        return {
          ...current,
          modules: withoutAll.filter(
            (item) => item !== moduleId
          ),
        };
      }

      return {
        ...current,
        modules: [...withoutAll, moduleId],
      };
    });
  };

  const handleCreate = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const prefix = form.prefix.trim();
    const startingNumber = Number(form.startingNumber);

    if (!name) {
      setToast({
        type: "error",
        message: "Enter a receipt series name.",
      });
      return;
    }

    if (!prefix) {
      setToast({
        type: "error",
        message: "Enter a receipt prefix.",
      });
      return;
    }

    if (!Number.isInteger(startingNumber) || startingNumber < 1) {
      setToast({
        type: "error",
        message: "Starting number must be a valid positive number.",
      });
      return;
    }

    if (form.modules.length === 0) {
      setToast({
        type: "error",
        message: "Select at least one module.",
      });
      return;
    }

    const newSeries = {
      id: crypto.randomUUID(),
      name,
      prefix,
      nextNumber: startingNumber,
      modules: form.modules,
      usageCount: 0,
      status: "ACTIVE",
    };

    setSeries((current) => [...current, newSeries]);
    setForm(EMPTY_FORM);
    setShowForm(false);

    setToast({
      type: "success",
      message: "Receipt series created successfully.",
    });
  };

  const disableSeries = (id) => {
    setSeries((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "DISABLED" }
          : item
      )
    );
  };

  return (
    <div className="min-h-full p-5 sm:p-7 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}

            <span>{toast.message}</span>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* HEADER */}

        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-cyan-700" />

              <h1 className="text-xl font-bold text-slate-950">
                Receipt Series
              </h1>
            </div>

            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Configure receipt numbering sequences and select
              which CRM modules can use each series.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM);
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-black"
          >
            <Plus size={15} />
            Add Receipt Series
          </button>
        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-mono uppercase text-slate-400">
              Total Series
            </p>
            <p className="mt-1 text-xl font-bold">{total}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-mono uppercase text-slate-400">
              Active
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              {activeCount}
            </p>
          </div>

          <div className="hidden rounded-xl border border-slate-200 bg-white p-4 sm:block">
            <p className="text-[10px] font-mono uppercase text-slate-400">
              Policy
            </p>
            <p className="mt-1 text-xs font-bold text-slate-700">
              Used series cannot be edited
            </p>
          </div>
        </div>

        {/* FORM */}

        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">
                  Create Receipt Series
                </h2>

                <p className="mt-1 text-[11px] text-slate-500">
                  Once a receipt from a series is generated,
                  its numbering configuration becomes immutable.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="mt-6 space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field
                  label="Series Name"
                  value={form.name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                  placeholder="Sales Receipt"
                />

                <Field
                  label="Prefix"
                  value={form.prefix}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      prefix: value,
                    }))
                  }
                  placeholder="SR-"
                />

                <Field
                  label="Starting Number"
                  type="number"
                  value={form.startingNumber}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      startingNumber: value,
                    }))
                  }
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Modules Using This Series
                </label>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ModuleCheckbox
                    label="Sales"
                    checked={form.modules.includes("SALES")}
                    disabled={hasAll}
                    onChange={() => toggleModule("SALES")}
                  />

                  <ModuleCheckbox
                    label="Investments"
                    checked={form.modules.includes("INVESTMENTS")}
                    disabled={hasAll}
                    onChange={() =>
                      toggleModule("INVESTMENTS")
                    }
                  />

                  <ModuleCheckbox
                    label="All Modules"
                    checked={hasAll}
                    onChange={() => toggleModule("ALL")}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white"
                >
                  Create Series
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SERIES LIST */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold">
              Configured Receipt Series
            </h2>

            <p className="mt-1 text-[11px] text-slate-500">
              Used series cannot be edited or deleted to preserve
              financial document integrity.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {series.map((item) => {
              const used = item.usageCount > 0;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {item.name}
                      </h3>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                          item.status === "ACTIVE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                      <span className="rounded bg-slate-50 px-2 py-1">
                        PREFIX: {item.prefix}
                      </span>

                      <span className="rounded bg-slate-50 px-2 py-1">
                        NEXT: {item.nextNumber}
                      </span>

                      <span className="rounded bg-slate-50 px-2 py-1">
                        USED: {item.usageCount}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.modules.map((module) => (
                        <span
                          key={module}
                          className="rounded-full bg-cyan-50 px-2 py-1 text-[9px] font-bold text-cyan-800"
                        >
                          {module === "ALL"
                            ? "ALL MODULES"
                            : module}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {used ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500">
                        <Lock size={12} />
                        Edit & Delete Disabled
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSeries((current) =>
                              current.filter(
                                (entry) =>
                                  entry.id !== item.id
                              )
                            );
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-none focus:border-slate-400 focus:bg-white"
      />
    </div>
  );
}

/* =========================================================
   MODULE CHECKBOX
========================================================= */

function ModuleCheckbox({
  label,
  checked,
  disabled,
  onChange,
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
        checked
          ? "border-cyan-200 bg-cyan-50"
          : "border-slate-200 bg-white"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 accent-cyan-700"
      />

      <span className="text-xs font-bold text-slate-800">
        {label}
      </span>
    </label>
  );
}