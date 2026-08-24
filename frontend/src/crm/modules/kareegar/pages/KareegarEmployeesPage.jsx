import { useState } from "react";
import {
  Edit3,
  Loader2,
  Plus,
  Users,
  AlertCircle,
  UserPlus
} from "lucide-react";

import { useKareegarEmployees } from "../hooks/useKareegarEmployees";
import KareegarEmployeeForm from "../components/KareegarEmployeeForm";

export default function KareegarEmployeesPage() {
  const {
    employees,
    loading,
    saving,
    error,
    addEmployee,
    editEmployee,
  } = useKareegarEmployees();

  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const handleSubmit = async (employee) => {
    if (editingEmployee) {
      await editEmployee(editingEmployee.id, employee);
    } else {
      await addEmployee(employee);
    }
    setEditingEmployee(null);
    setShowForm(false);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  return (
    // Natural page flow. Fills the screen width and vertically scrolls.
    <div className="flex flex-col gap-6 lg:gap-8 animate-in fade-in duration-500">

      {/* ==================================================
          HEADER & ACTION
      ================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1B241E] sm:text-2xl">
            Goldsmith Directory
          </h2>
          <p className="mt-1 text-xs font-medium text-[#68786D]">
            Manage goldsmith profiles and authorize their workflow types.
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setEditingEmployee(null);
              setShowForm(true);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#345343] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1B241E] hover:shadow-md hover:-translate-y-0.5"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Goldsmith
          </button>
        )}
      </div>

      {/* ==================================================
          ERROR STATE
      ================================================== */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 shadow-sm">
          <AlertCircle size={18} className="text-rose-600" />
          <span className="text-sm font-bold text-rose-800">{error}</span>
        </div>
      )}

      {/* ==================================================
          DYNAMIC FORM (Slides in when active)
      ================================================== */}
      {showForm && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <KareegarEmployeeForm
            employee={editingEmployee}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={() => {
              setEditingEmployee(null);
              setShowForm(false);
            }}
          />
        </div>
      )}

      {/* ==================================================
          DIRECTORY LIST
      ================================================== */}
      <div className="flex flex-col rounded-[2rem] border border-[#E2E8E4] bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] overflow-hidden">
        
        {/* List Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8E4]/60 bg-[#F5F7F5]/30 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2.5 text-[#345343]">
            <Users size={18} />
            <h3 className="text-sm font-bold text-[#1B241E]">Registered Goldsmiths</h3>
          </div>
          <span className="flex items-center justify-center rounded-full bg-white border border-[#E2E8E4] px-3 py-1 text-[10px] font-bold text-[#68786D] shadow-sm">
            {employees.length} Total
          </span>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#345343]" />
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#87968C]">Loading Directory...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F7F5] text-[#87968C]">
              <UserPlus size={28} />
            </div>
            <h3 className="text-base font-bold text-[#1B241E]">No Goldsmiths Found</h3>
            <p className="mt-1.5 max-w-sm text-xs font-medium text-[#68786D] leading-relaxed">
              Your directory is currently empty. Add your first goldsmith to start assigning raw materials and processing returns.
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-6 rounded-lg border border-[#E2E8E4] bg-white px-6 py-2.5 text-xs font-bold text-[#1B241E] shadow-sm transition-all hover:bg-[#F5F7F5]"
              >
                Add First Goldsmith
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#E2E8E4]/60">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="group flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-[#F5F7F5]/40 sm:flex-row sm:items-center sm:justify-between sm:px-8"
              >
                {/* Info Block */}
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E2E8E4] bg-white text-xs font-bold text-[#345343] shadow-sm">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1B241E]">{employee.name}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#87968C]">
                      ID: {employee.id}
                    </p>
                  </div>
                </div>

                {/* Badges & Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Work Type Badge */}
                  <span
                    className={`flex items-center justify-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      employee.workType === "B2B"
                        ? "border-[#E2E8E4] bg-white text-[#68786D]"
                        : employee.workType === "B2J"
                        ? "border-amber-200/60 bg-amber-50 text-amber-800"
                        : "border-indigo-200/60 bg-indigo-50 text-indigo-800"
                    }`}
                  >
                    {employee.workType === "BOTH" ? "B2B + B2J" : employee.workType}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`flex items-center justify-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      employee.status === "ACTIVE"
                        ? "border-emerald-200/60 bg-emerald-50 text-emerald-800"
                        : "border-rose-200/60 bg-rose-50 text-rose-800"
                    }`}
                  >
                    {employee.status}
                  </span>

                  {/* Edit Action */}
                  <button
                    type="button"
                    onClick={() => handleEdit(employee)}
                    className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-[#87968C] transition-colors hover:bg-[#F5F7F5] hover:text-[#1B241E]"
                    title="Edit Profile"
                  >
                    <Edit3 size={16} />
                  </button>
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}