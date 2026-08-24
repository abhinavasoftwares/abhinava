import { describe, expect, it } from "vitest";

import {
  calculateB2BAssignment,
  calculateB2BReturn,
  calculateB2CAssignment,
  calculateB2CReturn,
  calculateB2CBalance,
} from "../engine";

import {
  resolveKareegarCalculationConfig,
} from "../config";

import {
  DEFAULT_KAREEGAR_CALCULATION,
} from "../defaults";

import {
  validateKareegarCalculationConfig,
  getSupportedKareegarStrategies,
} from "../validation";

import {
  getStrategiesForOperation,
} from "../strategies/registry";


describe("Kareegar Calculation Engine", () => {
  describe("B2B Assignment", () => {
    it("should initialize remaining weight and quantity from the assignment", () => {
      const result = calculateB2BAssignment({
        rawMaterialWeight: 100,
        quantityNos: 10,
      });

      expect(result.remainingWeight).toBe(100);
      expect(result.remainingQuantity).toBe(10);
    });

    it("should safely handle missing numeric values", () => {
      const result = calculateB2BAssignment({});

      expect(result.remainingWeight).toBe(0);
      expect(result.remainingQuantity).toBe(0);
    });
  });


  describe("B2B Return", () => {
    it("should subtract returned weight and wastage", () => {
      const result = calculateB2BReturn({
        previousRemainingWeight: 100,
        previousRemainingQuantity: 10,
        returnedWeight: 30,
        wastage: 2,
        returnedQuantityNos: 3,
      });

      expect(result.remainingWeight).toBe(68);
      expect(result.remainingQuantity).toBe(7);
      expect(result.isClosed).toBe(false);
    });

    it("should close when quantity is exhausted and weight is within tolerance", () => {
      const result = calculateB2BReturn({
        previousRemainingWeight: 0.08,
        previousRemainingQuantity: 1,
        returnedWeight: 0.08,
        wastage: 0,
        returnedQuantityNos: 1,
      });

      expect(result.remainingWeight).toBe(0);
      expect(result.remainingQuantity).toBe(0);
      expect(result.isClosed).toBe(true);
    });

    it("should not close when remaining weight exceeds the tolerance", () => {
      const result = calculateB2BReturn({
        previousRemainingWeight: 1,
        previousRemainingQuantity: 0,
        returnedWeight: 0,
        wastage: 0,
        returnedQuantityNos: 0,
      });

      expect(result.isClosed).toBe(false);
    });
  });


  describe("B2C Assignment", () => {
    it("should calculate effective gold using weight and purity", () => {
      const result = calculateB2CAssignment({
        rawMaterialWeight: 100,
        purity: 91.7,
      });

      expect(result.effectiveGoldAssigned).toBeCloseTo(
        91.7,
        10
      );
    });
  });


  describe("B2C Return", () => {
    it("should calculate effective returned gold including wastage", () => {
      const result = calculateB2CReturn({
        returnedWeight: 50,
        wastage: 1,
        purity: 91.7,
      });

      expect(result.effectiveGoldReturned).toBeCloseTo(
        46.767,
        10
      );
    });
  });


  describe("B2C Balance", () => {
    it("should add assignments and subtract returns", () => {
      const result = calculateB2CBalance({
        previousBalance: 100,
        effectiveGoldAssigned: 25,
        effectiveGoldReturned: 10,
      });

      expect(result).toBe(115);
    });
  });
});


describe("Kareegar Calculation Configuration", () => {
  it("should return Keshava defaults when no tenant configuration exists", () => {
    const result = resolveKareegarCalculationConfig();

    expect(result).toEqual(
      DEFAULT_KAREEGAR_CALCULATION
    );
  });

  it("should override only the configured tenant strategy", () => {
    const result = resolveKareegarCalculationConfig({
      b2c: {
        return: {
          strategyId: "KESHAVA_B2C_RETURN_V1",
        },
      },
    });

    expect(result.b2c.return.strategyId).toBe(
      "KESHAVA_B2C_RETURN_V1"
    );

    expect(result.b2c.assignment.strategyId).toBe(
      DEFAULT_KAREEGAR_CALCULATION.b2c.assignment.strategyId
    );

    expect(result.b2b).toEqual(
      DEFAULT_KAREEGAR_CALCULATION.b2b
    );
  });

  it("should preserve default closing tolerance when tenant does not override it", () => {
    const result = resolveKareegarCalculationConfig({
      b2b: {
        assignment: {
          strategyId: "KESHAVA_B2B_ASSIGNMENT_V1",
        },
      },
    });

    expect(result.b2b.assignment.strategyId).toBe(
      "KESHAVA_B2B_ASSIGNMENT_V1"
    );

    expect(result.b2b.closing.weightTolerance).toBe(
      DEFAULT_KAREEGAR_CALCULATION.b2b.closing.weightTolerance
    );
  });
});


describe("Kareegar Calculation Configuration Validation", () => {
  it("should accept an empty configuration", () => {
    const result =
      validateKareegarCalculationConfig();

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should accept supported tenant strategies", () => {
    const result =
      validateKareegarCalculationConfig({
        b2c: {
          return: {
            strategyId:
              "KESHAVA_B2C_RETURN_V1",
          },
        },

        b2b: {
          closing: {
            weightTolerance: 0.1,
          },
        },
      });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should reject unsupported calculation strategies", () => {
    const result =
      validateKareegarCalculationConfig({
        b2c: {
          return: {
            strategyId:
              "CUSTOM_ARBITRARY_STRATEGY",
          },
        },
      });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it("should reject an invalid closing tolerance", () => {
    const result =
      validateKareegarCalculationConfig({
        b2b: {
          closing: {
            weightTolerance: -1,
          },
        },
      });

    expect(result.valid).toBe(false);
  });

  it("should expose registered calculation strategies", () => {
    const strategies =
      getSupportedKareegarStrategies();

    expect(strategies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "KESHAVA_B2C_RETURN_V1",
        }),

        expect.objectContaining({
          id: "KESHAVA_B2B_ASSIGNMENT_V1",
        }),
      ])
    );
  });
});

describe("Kareegar Strategy Registry", () => {
  it("should return only B2B assignment strategies", () => {
    const strategies =
      getStrategiesForOperation(
        "B2B",
        "ASSIGNMENT"
      );

    expect(strategies).toHaveLength(1);

    expect(strategies[0].id).toBe(
      "KESHAVA_B2B_ASSIGNMENT_V1"
    );
  });

  it("should return only B2C return strategies", () => {
    const strategies =
      getStrategiesForOperation(
        "B2C",
        "RETURN"
      );

    expect(strategies).toHaveLength(1);

    expect(strategies[0].id).toBe(
      "KESHAVA_B2C_RETURN_V1"
    );
  });

  it("should return B2C balance strategies", () => {
    const strategies =
      getStrategiesForOperation(
        "B2C",
        "BALANCE"
      );

    expect(strategies).toHaveLength(1);

    expect(strategies[0].id).toBe(
      "KESHAVA_B2C_BALANCE_V1"
    );
  });

  it("should return no strategies for an unsupported operation", () => {
    const strategies =
      getStrategiesForOperation(
        "B2B",
        "BALANCE"
      );

    expect(strategies).toEqual([]);
  });
});