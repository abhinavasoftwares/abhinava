import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createKareegarEmployee,
  subscribeToKareegarEmployees,
} from "../services/kareegarTransactions";

export function useKareegarEmployees() {
  const [employees, setEmployees] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==========================================================
  // REAL-TIME DIRECTORY LISTENER
  // ==========================================================

  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribe =
      subscribeToKareegarEmployees(
        (records) => {
          setEmployees(records);
          setLoading(false);
        },

        null,

        (error) => {
          console.error(
            "Failed to listen to Kareegar directory:",
            error
          );

          setError(
            error.message ||
              "Failed to load Kareegar directory."
          );

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // ==========================================================
  // ADD KAREEGAR
  // ==========================================================

  const addEmployee =
    useCallback(
      async (employee) => {
        try {
          setSaving(true);
          setError("");

          const created =
            await createKareegarEmployee(
              employee
            );

          /*
           * We intentionally do NOT manually append
           * the employee to state here.
           *
           * Firestore onSnapshot() will detect the
           * new document and update the list.
           */

          return created;
        } catch (error) {
          console.error(
            "Failed to create Kareegar employee:",
            error
          );

          setError(
            error.message ||
              "Failed to create Kareegar employee."
          );

          throw error;
        } finally {
          setSaving(false);
        }
      },
      []
    );

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    employees,

    loading,

    saving,

    error,

    addEmployee,

    /*
     * Kept for compatibility with existing pages.
     *
     * The directory is already real-time, so a manual
     * refresh simply does nothing here.
     */
    refreshEmployees:
      () => {},
  };
}