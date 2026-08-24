// frontend/src/crm/modules/kareegar/hooks/useB2JBalance.js

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getB2JBalance,
} from "../services/kareegarBalance";


export function useB2JBalance(
  employeeId
) {
  const [balance, setBalance] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadBalance =
    useCallback(async () => {
      if (!employeeId) {
        setBalance(null);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result =
          await getB2JBalance(
            employeeId
          );

        setBalance(result);
      } catch (error) {
        console.error(
          "Failed to load B2J balance:",
          error
        );

        setError(
          error.message ||
            "Failed to load B2J balance."
        );
      } finally {
        setLoading(false);
      }
    }, [employeeId]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  return {
    balance,
    loading,
    error,
    refreshBalance:
      loadBalance,
  };
}