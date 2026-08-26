/**
 * Standard investment interest calculation.
 *
 * Default model:
 *
 * Interest =
 * Principal × Annual Rate × Days / Day Count Basis
 *
 * This strategy is intentionally deterministic.
 *
 * The scheme decides:
 * - annual rate
 * - simple/compound mode
 * - day-count convention
 * - rounding
 *
 * More client-specific strategies can be added later
 * without changing existing transaction logic.
 */

function round(value, scale = 2) {
  const factor =
    10 ** Number(scale || 2);

  return Math.round(
    (Number(value) + Number.EPSILON) *
      factor
  ) / factor;
}


function getDayCountBasis(
  convention = "ACTUAL_365"
) {
  switch (convention) {
    case "ACTUAL_360":
      return 360;

    case "ACTUAL_365":
      return 365;

    case "ACTUAL_366":
      return 366;

    default:
      return 365;
  }
}


function getDaysBetween(
  startDate,
  endDate
) {
  const start =
    new Date(startDate);

  const end =
    new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    throw new Error(
      "Invalid interest calculation dates."
    );
  }

  const milliseconds =
    end.getTime() -
    start.getTime();

  return Math.max(
    0,
    milliseconds /
      (1000 * 60 * 60 * 24)
  );
}


export function calculateStandardInterest(
  {
    principal,
    annualRate,
    startDate,
    endDate,
    calculationMethod = "SIMPLE",
    dayCountConvention = "ACTUAL_365",
    roundingScale = 2,
  }
) {
  const amount =
    Number(principal);

  const rate =
    Number(annualRate);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      "Invalid principal amount."
    );
  }

  if (
    !Number.isFinite(rate) ||
    rate < 0
  ) {
    throw new Error(
      "Invalid annual interest rate."
    );
  }

  const days =
    getDaysBetween(
      startDate,
      endDate
    );

  const basis =
    getDayCountBasis(
      dayCountConvention
    );

  const decimalRate =
    rate / 100;


  let interest = 0;


  if (
    calculationMethod ===
    "SIMPLE"
  ) {
    interest =
      amount *
      decimalRate *
      (days / basis);
  } else {
    /*
     * Compound interest is kept deterministic
     * and will use the configured compounding
     * frequency when the scheme provides it.
     *
     * For now, monthly compounding is supported.
     */

    const periodsPerYear = 12;

    const periods =
      (days / basis) *
      periodsPerYear;

    interest =
      amount *
      (
        Math.pow(
          1 +
            decimalRate /
              periodsPerYear,
          periods
        ) - 1
      );
  }


  const roundedInterest =
    round(
      interest,
      roundingScale
    );


  return {
    principal: round(
      amount,
      roundingScale
    ),

    annualRate: rate,

    days,

    interest:
      roundedInterest,

    total:
      round(
        amount +
          roundedInterest,
        roundingScale
      ),

    calculationMethod,

    dayCountConvention,

    roundingScale,
  };
}