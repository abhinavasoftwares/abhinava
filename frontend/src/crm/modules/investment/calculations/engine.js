import {
  getInvestmentCalculationStrategy,
} from "./strategies/registry";

import {
  DEFAULT_INVESTMENT_SCHEME_CONFIG,
} from "./defaults";


export function calculateInvestmentInterest(
  input,
  interestConfig = {}
) {
  const config = {
    ...DEFAULT_INVESTMENT_SCHEME_CONFIG.interestConfig,
    ...interestConfig,
  };

  const strategy =
    getInvestmentCalculationStrategy(
      config.strategyId
    );

  return strategy({
    ...input,

    annualRate:
      config.annualRate,

    calculationMethod:
      config.calculationMethod,

    compoundingFrequency:
      config.compoundingFrequency,

    dayCountConvention:
      config.dayCountConvention,

    roundingScale:
      config.roundingScale,
  });
}