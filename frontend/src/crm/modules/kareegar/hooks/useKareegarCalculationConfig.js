// frontend/src/crm/modules/kareegar/hooks/useKareegarCalculationConfig.js

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  loadKareegarCalculationConfig,
  saveKareegarCalculationConfig,
} from "../services/calculationConfig";

export function useKareegarCalculationConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result =
        await loadKareegarCalculationConfig();

      setConfig(result);
    } catch (err) {
      console.error(
        "Failed to load Kareegar calculation configuration:",
        err
      );

      setError(
        err.message ||
          "Failed to load calculation configuration."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(
    async (nextConfig) => {
      try {
        setSaving(true);
        setSaveError("");

        const result =
          await saveKareegarCalculationConfig(
            nextConfig
          );

        setConfig(result);

        return result;
      } catch (err) {
        console.error(
          "Failed to save Kareegar calculation configuration:",
          err
        );

        const message =
          err.message ||
          "Failed to save calculation configuration.";

        setSaveError(message);

        throw err;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    config,
    loading,
    saving,
    error,
    saveError,
    reload: loadConfig,
    saveConfig,
  };
}