import React from "react";
import { Navigate } from "react-router-dom";

import { useCrmAuth } from "../context/CrmAuthContext";
import { crmPath } from "../utils/crmRoutes";

export default function CrmProtectedRoute({ children }) {
  const {
    loading,
    isAuthenticated,
  } = useCrmAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={crmPath()} replace />;
  }

  return children;
}