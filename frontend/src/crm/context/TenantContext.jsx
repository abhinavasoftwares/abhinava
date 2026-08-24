import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTenant = async () => {
    if (!API_BASE_URL) {
      setError(
        "VITE_API_BASE_URL is not configured."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/crm/tenant`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to load CRM tenant."
        );
      }

      setTenant(data);
    } catch (error) {
      console.error(
        "Failed to load CRM tenant:",
        error
      );

      setTenant(null);
      setError(
        error.message ||
          "Unable to load CRM tenant."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        error,
        refreshTenant: loadTenant,
      }}
    >
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