import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createKareegarOrnamentCategory,
  subscribeToKareegarOrnamentCategories,
  updateKareegarOrnamentCategoryStatus,
} from "../services/kareegarOrnamentCategories";

export function useKareegarOrnamentCategories({
  activeOnly = false,
} = {}) {
  const [categories, setCategories] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribe =
      subscribeToKareegarOrnamentCategories(
        (items) => {
          const filtered =
            activeOnly
              ? items.filter(
                  (item) =>
                    item.status ===
                    "ACTIVE"
                )
              : items;

          setCategories(filtered);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Ornament category listener failed:",
            error
          );

          setError(
            error.message ||
              "Failed to load ornament categories."
          );

          setLoading(false);
        }
      );

    return unsubscribe;
  }, [activeOnly]);

  const addCategory =
    useCallback(async (name) => {
      try {
        setSaving(true);
        setError("");

        return await createKareegarOrnamentCategory(
          name
        );
      } catch (error) {
        setError(
          error.message ||
            "Failed to create ornament category."
        );

        throw error;
      } finally {
        setSaving(false);
      }
    }, []);

  const setCategoryStatus =
    useCallback(
      async (categoryId, status) => {
        try {
          setSaving(true);
          setError("");

          await updateKareegarOrnamentCategoryStatus(
            categoryId,
            status
          );
        } catch (error) {
          setError(
            error.message ||
              "Failed to update ornament category."
          );

          throw error;
        } finally {
          setSaving(false);
        }
      },
      []
    );

  return {
    categories,
    loading,
    saving,
    error,
    addCategory,
    setCategoryStatus,
  };
}