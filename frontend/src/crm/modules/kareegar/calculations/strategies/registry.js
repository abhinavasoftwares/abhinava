// frontend/src/crm/modules/kareegar/calculations/strategies/registry.js

import {
  B2B_ASSIGNMENT_STRATEGY,
  B2B_RETURN_STRATEGY,
} from "./b2b";

import {
  B2C_ASSIGNMENT_STRATEGY,
  B2C_RETURN_STRATEGY,
  B2C_BALANCE_STRATEGY,
} from "./b2c";

const STRATEGIES = {
  [B2B_ASSIGNMENT_STRATEGY.id]:
    B2B_ASSIGNMENT_STRATEGY,

  [B2B_RETURN_STRATEGY.id]:
    B2B_RETURN_STRATEGY,

  [B2C_ASSIGNMENT_STRATEGY.id]:
    B2C_ASSIGNMENT_STRATEGY,

  [B2C_RETURN_STRATEGY.id]:
    B2C_RETURN_STRATEGY,

  [B2C_BALANCE_STRATEGY.id]:
    B2C_BALANCE_STRATEGY,
};

export function getCalculationStrategy(strategyId) {
  const strategy = STRATEGIES[strategyId];

  if (!strategy) {
    throw new Error(
      `Unsupported Kareegar calculation strategy: ${strategyId}`
    );
  }

  return strategy;
}

export function getAvailableCalculationStrategies() {
  return Object.values(STRATEGIES);
}

/**
 * Get strategies available for a specific business type
 * and operation.
 *
 * businessType:
 *   B2B | B2C
 *
 * operation:
 *   ASSIGNMENT | RETURN | BALANCE
 */
export function getStrategiesForOperation(
  businessType,
  operation
) {
  return getAvailableCalculationStrategies().filter(
    (strategy) =>
      strategy.businessType === businessType &&
      strategy.operation === operation
  );
}