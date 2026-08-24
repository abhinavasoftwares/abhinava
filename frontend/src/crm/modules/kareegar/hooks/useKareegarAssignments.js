import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createKareegarAssignment,
  getKareegarAssignments,
  getKareegarAssignment,
  updateKareegarAssignmentStatus,
} from "../services/kareegarTransactions";

export function useKareegarAssignments(
  filters = {}
) {
  const [assignments, setAssignments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadAssignments =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const result =
          await getKareegarAssignments(
            filters
          );

        setAssignments(result);
      } catch (error) {
        console.error(
          "Failed to load Kareegar assignments:",
          error
        );

        setError(
          error.message ||
            "Failed to load Kareegar assignments."
        );
      } finally {
        setLoading(false);
      }
    }, [
      filters.employeeId,
      filters.type,
      filters.status,
      filters.limit,
    ]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const addAssignment = async (
    assignment
  ) => {
    try {
      setSaving(true);
      setError("");

      const created =
        await createKareegarAssignment(
          assignment
        );

      setAssignments((current) => [
        created,
        ...current,
      ]);

      return created;
    } catch (error) {
      console.error(
        "Failed to create Kareegar assignment:",
        error
      );

      setError(
        error.message ||
          "Failed to create Kareegar assignment."
      );

      throw error;
    } finally {
      setSaving(false);
    }
  };

  const getAssignment = async (
    assignmentId
  ) => {
    return getKareegarAssignment(
      assignmentId
    );
  };

  const changeAssignmentStatus =
    async (
      assignmentId,
      status
    ) => {
      try {
        setSaving(true);
        setError("");

        const result =
          await updateKareegarAssignmentStatus(
            assignmentId,
            status
          );

        setAssignments((current) =>
          current.map((item) =>
            item.id === assignmentId
              ? {
                  ...item,
                  status,
                }
              : item
          )
        );

        return result;
      } catch (error) {
        console.error(
          "Failed to update Kareegar assignment status:",
          error
        );

        setError(
          error.message ||
            "Failed to update assignment status."
        );

        throw error;
      } finally {
        setSaving(false);
      }
    };

  return {
    assignments,
    loading,
    saving,
    error,
    addAssignment,
    getAssignment,
    changeAssignmentStatus,
    refreshAssignments:
      loadAssignments,
  };
}