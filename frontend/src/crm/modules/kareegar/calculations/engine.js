// frontend/src/crm/modules/kareegar/calculations/engine.js

import {
  getCalculationStrategy,
} from "./strategies/registry";

import {
  DEFAULT_KAREEGAR_CALCULATION,
} from "./defaults";

function getStrategyId(
  configuredStrategyId,
  defaultStrategyId
) {
  return configuredStrategyId || defaultStrategyId;
}

export function calculateB2BAssignment(
  input,
  calculationConfig = DEFAULT_KAREEGAR_CALCULATION
) {
  const strategyId = getStrategyId(
    calculationConfig.b2b?.assignment?.strategyId,
    "KESHAVA_B2B_ASSIGNMENT_V1"
  );

  return getCalculationStrategy(strategyId).calculate(input);
}

export function calculateB2BReturn(
  input,
  options = {},
  calculationConfig = DEFAULT_KAREEGAR_CALCULATION
) {
  const strategyId = getStrategyId(
    calculationConfig.b2b?.return?.strategyId,
    "KESHAVA_B2B_RETURN_V1"
  );

  return getCalculationStrategy(strategyId).calculate(
    input,
    {
      ...options,
      weightTolerance:
        calculationConfig.b2b?.closing?.weightTolerance ??
        0.1,
    }
  );
}

export function calculateB2CAssignment(
  input,
  calculationConfig = DEFAULT_KAREEGAR_CALCULATION
) {
  const strategyId = getStrategyId(
    calculationConfig.b2c?.assignment?.strategyId,
    "KESHAVA_B2C_ASSIGNMENT_V1"
  );

  return getCalculationStrategy(strategyId).calculate(input);
}

export function calculateB2CReturn(
  input,
  calculationConfig = DEFAULT_KAREEGAR_CALCULATION
) {
  const strategyId = getStrategyId(
    calculationConfig.b2c?.return?.strategyId,
    "KESHAVA_B2C_RETURN_V1"
  );

  return getCalculationStrategy(strategyId).calculate(input);
}

export function calculateB2CBalance(
  input,
  calculationConfig = DEFAULT_KAREEGAR_CALCULATION
) {
  const strategyId = getStrategyId(
    calculationConfig.b2c?.balance?.strategyId,
    "KESHAVA_B2C_BALANCE_V1"
  );

  return getCalculationStrategy(strategyId).calculate(input);
}