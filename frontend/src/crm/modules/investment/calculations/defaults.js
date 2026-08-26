// Investment calculation defaults
//
// These are application defaults only.
// Actual scheme configuration will be stored per client/scheme.

export const DEFAULT_INVESTMENT_INTEREST_CONFIG = {
  strategyId: "STANDARD_INTEREST_V1",

  annualRate: 0,

  calculationMethod: "SIMPLE",

  compoundingFrequency: "NONE",

  dayCountConvention: "ACTUAL_365",

  roundingScale: 2,
};


export const DEFAULT_INVESTMENT_SCHEME_CONFIG = {
  interestConfig: {
    ...DEFAULT_INVESTMENT_INTEREST_CONFIG,
  },

  calculationStrategyId:
    "FIXED_INSTALLMENT_V1",

  calculationVersion: 1,

  paymentFrequency: "MONTHLY",

  accountNumberConfig: {
    prefix: "INV",
    padding: 6,
  },
};