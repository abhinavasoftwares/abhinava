// frontend/src/crm/modules/kareegar/calculations/strategies/b2c.js

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function calculateEffectiveGold(
  weight,
  purity
) {
  return (
    toNumber(weight) *
    toNumber(purity)
  ) / 100;
}

/**
 * Keshava B2C / Job Work Assignment strategy.
 */
export const B2C_ASSIGNMENT_STRATEGY = {
  id: "KESHAVA_B2C_ASSIGNMENT_V1",
  name: "Keshava B2C Assignment",
  businessType: "B2C",
  operation: "ASSIGNMENT",
  version: 1,

  calculate(input) {
    return {
      effectiveGoldAssigned:
        calculateEffectiveGold(
          input.rawMaterialWeight,
          input.purity
        ),
    };
  },
};

/**
 * Keshava B2C / Job Work Return strategy.
 */
export const B2C_RETURN_STRATEGY = {
  id: "KESHAVA_B2C_RETURN_V1",
  name: "Keshava B2C Return",
  businessType: "B2C",
  operation: "RETURN",
  version: 1,

  calculate(input) {
    const returnedWeight =
      toNumber(input.returnedWeight);

    const wastage =
      toNumber(input.wastage);

    const purity =
      toNumber(input.purity);

    return {
      effectiveGoldReturned:
        calculateEffectiveGold(
          returnedWeight + wastage,
          purity
        ),
    };
  },
};

/**
 * Keshava B2C / Job Work Balance strategy.
 */
export const B2C_BALANCE_STRATEGY = {
  id: "KESHAVA_B2C_BALANCE_V1",
  name: "Keshava B2C Balance",
  businessType: "B2C",
  operation: "BALANCE",
  version: 1,

  calculate(input) {
    const previousBalance =
      toNumber(input.previousBalance);

    const effectiveGoldAssigned =
      toNumber(input.effectiveGoldAssigned);

    const effectiveGoldReturned =
      toNumber(input.effectiveGoldReturned);

    return (
      previousBalance +
      effectiveGoldAssigned -
      effectiveGoldReturned
    );
  },
};