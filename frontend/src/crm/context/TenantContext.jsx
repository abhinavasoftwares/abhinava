import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCrmSlugFromPath } from "../utils/crmRoutes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const crmSlug = getCrmSlugFromPath();

  const loadTenant = async () => {
    if (!API_BASE_URL) {
      setError("VITE_API_BASE_URL is not configured.");
      setLoading(false);
      return;
    }

    if (!crmSlug) {
      setError("CRM tenant could not be identified from the URL.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/crm/${encodeURIComponent(crmSlug)}/tenant`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to load CRM tenant."
        );
      }

      /*
       * --------------------------------------------------------
       * Defensive tenant validation
       * --------------------------------------------------------
       * Backend remains the source of truth.
       */
      if (
        !data?.client_id ||
        !data?.tenant_id ||
        !data?.crm_slug
      ) {
        throw new Error(
          "Invalid CRM tenant configuration."
        );
      }

      if (
        data.crm_slug.toLowerCase() !==
        crmSlug.toLowerCase()
      ) {
        throw new Error("CRM tenant mismatch.");
      }

      /*
       * --------------------------------------------------------
       * Normalize enabled modules
       * --------------------------------------------------------
       *
       * Backend should provide:
       *
       * modules: [...]
       *
       * We keep the original tenant response intact and
       * normalize modules into an array so the frontend can
       * safely perform entitlement checks.
       */
      const modules = Array.isArray(data.modules)
        ? data.modules
        : [];

      setTenant({
        ...data,
        modules,
      });
    } catch (error) {
      console.error(
        "Failed to load CRM tenant:",
        error
      );

      setTenant(null);

      setError(
        error?.message ||
          "Unable to load CRM tenant."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [crmSlug]);

  /*
   * ------------------------------------------------------------
   * MODULE ACCESS
   * ------------------------------------------------------------
   *
   * This is the frontend entitlement source.
   *
   * Example:
   *
   * hasModule("kareegar")
   * hasModule("inventory")
   * hasModule("investments")
   *
   * Module names are compared case-insensitively.
   */
  const hasModule = (moduleName) => {
    if (!moduleName) {
      return false;
    }

    const requestedModule = String(moduleName)
      .trim()
      .toLowerCase();

    return tenant?.modules?.some(
      (module) =>
        String(module).trim().toLowerCase() ===
        requestedModule
    );
  };

  /*
   * ------------------------------------------------------------
   * MULTIPLE MODULE CHECK
   * ------------------------------------------------------------
   */
  const hasAnyModule = (moduleNames = []) => {
    if (!Array.isArray(moduleNames)) {
      return false;
    }

    return moduleNames.some((moduleName) =>
      hasModule(moduleName)
    );
  };

  const hasAllModules = (moduleNames = []) => {
    if (!Array.isArray(moduleNames)) {
      return false;
    }

    return moduleNames.every((moduleName) =>
      hasModule(moduleName)
    );
  };

  /*
   * ------------------------------------------------------------
   * CONTEXT VALUE
   * ------------------------------------------------------------
   */
  const contextValue = useMemo(
    () => ({
      tenant,
      loading,
      error,
      crmSlug,

      /*
       * Raw enabled modules returned by backend.
       */
      modules: tenant?.modules || [],

      /*
       * Entitlement helpers.
       */
      hasModule,
      hasAnyModule,
      hasAllModules,

      refreshTenant: loadTenant,
    }),
    [
      tenant,
      loading,
      error,
      crmSlug,
    ]
  );

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error(
      "useTenant must be used inside TenantProvider"
    );
  }

  return context;
}

