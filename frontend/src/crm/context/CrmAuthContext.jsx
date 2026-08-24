import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import {
  initializeCrmFirebase,
} from "../firebase";

const CrmAuthContext = createContext(null);

export function CrmAuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [googleProvider, setGoogleProvider] =
    useState(null);

  const [user, setUser] = useState(null);
  const [firebaseTenant, setFirebaseTenant] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe;

    const initialize = async () => {
      try {
        setLoading(true);
        setError("");

        const result =
          await initializeCrmFirebase();

        setAuth(result.auth);
        setGoogleProvider(
          result.googleProvider
        );

        setFirebaseTenant({
          tenantId: result.tenantId,
          clientId: result.clientId,
          businessName:
            result.businessName,
          logoUrl: result.logoUrl,
        });

        unsubscribe =
          onAuthStateChanged(
            result.auth,
            (currentUser) => {
              setUser(currentUser);
              setLoading(false);
            }
          );
      } catch (error) {
        console.error(
          "Failed to initialize CRM authentication:",
          error
        );

        setError(
          error.message ||
            "Unable to initialize CRM authentication."
        );

        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error(
        "CRM authentication is not ready."
      );
    }

    try {
      setSigningIn(true);
      setError("");

      const result =
        await signInWithPopup(
          auth,
          googleProvider
        );

      setUser(result.user);

      return result.user;
    } catch (error) {
      console.error(
        "CRM Google sign-in failed:",
        error
      );

      setError(
        error.message ||
          "Google sign-in failed."
      );

      throw error;
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    if (!auth) {
      return;
    }

    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error(
        "CRM logout failed:",
        error
      );

      setError(
        error.message ||
          "Unable to sign out."
      );
    }
  };

  return (
    <CrmAuthContext.Provider
      value={{
        user,
        auth,
        firebaseTenant,
        loading,
        signingIn,
        error,
        isAuthenticated: Boolean(user),
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </CrmAuthContext.Provider>
  );
}

export function useCrmAuth() {
  const context =
    useContext(CrmAuthContext);

  if (!context) {
    throw new Error(
      "useCrmAuth must be used inside CrmAuthProvider"
    );
  }

  return context;
}