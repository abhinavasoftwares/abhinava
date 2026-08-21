import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = async () => {
    if (!API_BASE_URL) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/me`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();

      setUser(data);
    } catch (error) {
      console.error(
        "Failed to load authenticated user:",
        error
      );

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
          redirect: "manual",
        }
      );

      if (
        response.status !== 303 &&
        response.status !== 200
      ) {
        console.error(
          "Logout request failed:",
          response.status
        );
      }
    } catch (error) {
      console.error(
        "Logout request failed:",
        error
      );
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        refreshUser: loadCurrentUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}