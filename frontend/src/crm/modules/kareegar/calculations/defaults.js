// frontend/src/crm/modules/kareegar/calculations/defaults.js

/**
 * Keshava-compatible default Kareegar calculations.
 *
 * These are the platform defaults.
 * Tenant-specific calculation rules must override
 * these through configuration rather than modifying
 * this file.
 */

export const DEFAULT_KAREEGAR_CALCULATION = {
  version: 1,

  b2b: {
    assignment: {
      strategyId: "KESHAVA_B2B_ASSIGNMENT_V1",
    },

    return: {
      strategyId: "KESHAVA_B2B_RETURN_V1",
    },

    closing: {
      weightTolerance: 0.1,
    },
  },

  b2c: {
    assignment: {
      strategyId: "KESHAVA_B2C_ASSIGNMENT_V1",
    },

    return: {
      strategyId: "KESHAVA_B2C_RETURN_V1",
    },

    balance: {
      strategyId: "KESHAVA_B2C_BALANCE_V1",
    },
  },
};