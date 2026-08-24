import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createKareegarReturn,
  getKareegarReturns,
} from "../services/kareegarTransactions";

export function useKareegarReturns(
  filters = {}
) {
  const [returns, setReturns] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadReturns =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const result =
          await getKareegarReturns(
            filters
          );

        setReturns(result);
      } catch (error) {
        console.error(
          "Failed to load Kareegar returns:",
          error
        );

        setError(
          error.message ||
            "Failed to load Kareegar returns."
        );
      } finally {
        setLoading(false);
      }
    }, [
      filters.assignmentId,
      filters.employeeId,
      filters.limit,
    ]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const addReturn = async (
    returnData
  ) => {
    try {
      setSaving(true);
      setError("");

      const created =
        await createKareegarReturn(
          returnData
        );

      setReturns((current) => [
        created,
        ...current,
      ]);

      return created;
    } catch (error) {
      console.error(
        "Failed to create Kareegar return:",
        error
      );

      setError(
        error.message ||
          "Failed to create Kareegar return."
      );

      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    returns,
    loading,
    saving,
    error,
    addReturn,
    refreshReturns:
      loadReturns,
  };
}