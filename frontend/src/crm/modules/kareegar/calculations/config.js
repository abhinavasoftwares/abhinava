// frontend/src/crm/modules/kareegar/calculations/config.js

import {
  DEFAULT_KAREEGAR_CALCULATION,
} from "./defaults";

/**
 * Resolve the effective Kareegar calculation configuration.
 *
 * Tenant configuration is treated as an override.
 * Missing values fall back to the Keshava defaults.
 */
export function resolveKareegarCalculationConfig(
  tenantConfig = null
) {
  if (!tenantConfig) {
    return DEFAULT_KAREEGAR_CALCULATION;
  }

  return {
    ...DEFAULT_KAREEGAR_CALCULATION,

    ...tenantConfig,

    b2b: {
      ...DEFAULT_KAREEGAR_CALCULATION.b2b,
      ...(tenantConfig.b2b || {}),

      assignment: {
        ...DEFAULT_KAREEGAR_CALCULATION.b2b.assignment,
        ...(tenantConfig.b2b?.assignment || {}),
      },

      return: {
        ...DEFAULT_KAREEGAR_CALCULATION.b2b.return,
        ...(tenantConfig.b2b?.return || {}),
      },

      closing: {
        ...DEFAULT_KAREEGAR_CALCULATION.b2b.closing,
        ...(tenantConfig.b2b?.closing || {}),
      },
    },

    b2c: {
      ...DEFAULT_KAREEGAR_CALCULATION.b2c,
      ...(tenantConfig.b2c || {}),

      assignment: {
        ...DEFAULT_KAREEGAR_CALCULATION.b2c.assignment,
        ...(tenantConfig.b2c?.assignment || {}),
      },

      return: {
        ...DEFAULT_KAREEGAR_CALCULATION.b2c.return,
        ...(tenantConfig.b2c?.return || {}),
      },

      balance: {
        ...DEFAULT_KAREEGAR_CALCULATION.b2c.balance,
        ...(tenantConfig.b2c?.balance || {}),
      },
    },
  };
}