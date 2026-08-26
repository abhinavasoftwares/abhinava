import {
  calculateStandardInterest,
} from "./standardInterest";


const STRATEGIES = {
  STANDARD_INTEREST_V1:
    calculateStandardInterest,
};


export function getInvestmentCalculationStrategy(
  strategyId
) {
  const strategy =
    STRATEGIES[strategyId];

  if (!strategy) {
    throw new Error(
      `Unknown investment calculation strategy: ${strategyId}`
    );
  }

  return strategy;
}