// frontend/src/crm/modules/kareegar/calculations/strategies/b2b.js

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Keshava B2B Assignment strategy.
 */
export const B2B_ASSIGNMENT_STRATEGY = {
  id: "KESHAVA_B2B_ASSIGNMENT_V1",
  name: "Keshava B2B Assignment",
  businessType: "B2B",
  operation: "ASSIGNMENT",
  version: 1,

  calculate(input) {
    return {
      remainingWeight: toNumber(
        input.rawMaterialWeight
      ),

      remainingQuantity: toNumber(
        input.quantityNos
      ),
    };
  },
};

/**
 * Keshava B2B Return strategy.
 */
export const B2B_RETURN_STRATEGY = {
  id: "KESHAVA_B2B_RETURN_V1",
  name: "Keshava B2B Return",
  businessType: "B2B",
  operation: "RETURN",
  version: 1,

  calculate(input, options = {}) {
    const previousRemainingWeight =
      toNumber(input.previousRemainingWeight);

    const previousRemainingQuantity =
      toNumber(input.previousRemainingQuantity);

    const returnedWeight =
      toNumber(input.returnedWeight);

    const wastage =
      toNumber(input.wastage);

    const returnedQuantityNos =
      toNumber(input.returnedQuantityNos);

    const weightTolerance =
      Number.isFinite(
        Number(options.weightTolerance)
      )
        ? Number(options.weightTolerance)
        : 0.1;

    const remainingWeight =
      previousRemainingWeight -
      returnedWeight -
      wastage;

    const remainingQuantity =
      previousRemainingQuantity -
      returnedQuantityNos;

    return {
      remainingWeight,
      remainingQuantity,

      isClosed:
        remainingQuantity <= 0 &&
        remainingWeight <= weightTolerance,
    };
  },
};