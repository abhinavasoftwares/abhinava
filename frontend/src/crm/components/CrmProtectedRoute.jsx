import { Navigate } from "react-router-dom";
import { useCrmAuth } from "../context/CrmAuthContext";

export default function CrmProtectedRoute({
  children,
}) {
  const {
    user,
    loading,
  } = useCrmAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0EDE6]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#B08968]/20 border-t-[#B08968] animate-spin" />
            <div className="h-2 w-2 rounded-full bg-[#B08968] animate-pulse" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-[#8A7B6E]">
            Opening CRM...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/crm"
        replace
      />
    );
  }

  return children;
}