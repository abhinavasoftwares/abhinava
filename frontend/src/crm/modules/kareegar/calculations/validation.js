
import {
  getCalculationStrategy,
  getAvailableCalculationStrategies,
} from "./strategies/registry";

function validateStrategyId(
  value,
  path,
  errors
) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || !value.trim()) {
    errors.push(
      `${path} must be a valid strategy ID.`
    );
    return;
  }

  try {
    getCalculationStrategy(value);
  } catch {
    errors.push(
      `${path} contains unsupported strategy: ${value}`
    );
  }
}

export function validateKareegarCalculationConfig(
  tenantConfig = null
) {
  const errors = [];

  if (
    tenantConfig !== null &&
    (
      typeof tenantConfig !== "object" ||
      Array.isArray(tenantConfig)
    )
  ) {
    return {
      valid: false,
      errors: ["Configuration must be an object."],
    };
  }

  if (!tenantConfig) {
    return {
      valid: true,
      errors: [],
    };
  }

  validateStrategyId(
    tenantConfig.b2b?.assignment?.strategyId,
    "b2b.assignment.strategyId",
    errors
  );

  validateStrategyId(
    tenantConfig.b2b?.return?.strategyId,
    "b2b.return.strategyId",
    errors
  );

  validateStrategyId(
    tenantConfig.b2c?.assignment?.strategyId,
    "b2c.assignment.strategyId",
    errors
  );

  validateStrategyId(
    tenantConfig.b2c?.return?.strategyId,
    "b2c.return.strategyId",
    errors
  );

  validateStrategyId(
    tenantConfig.b2c?.balance?.strategyId,
    "b2c.balance.strategyId",
    errors
  );

  const tolerance =
    tenantConfig.b2b?.closing?.weightTolerance;

  if (
    tolerance !== undefined &&
    (
      typeof tolerance !== "number" ||
      !Number.isFinite(tolerance) ||
      tolerance < 0
    )
  ) {
    errors.push(
      "b2b.closing.weightTolerance must be a non-negative number."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getSupportedKareegarStrategies() {
  return getAvailableCalculationStrategies();
}

