import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const INVESTMENT_ACCOUNTS_COLLECTION =
  "investmentAccounts";

const INVESTMENT_SCHEMES_COLLECTION =
  "investmentSchemes";

// ============================================================
// HELPERS
// ============================================================

function normalizePrefix(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getSchemeInstallmentType(scheme) {
  return (
    scheme?.installmentConfig?.type ||
    scheme?.installmentType ||
    "FIXED"
  );
}

function getSchemeMinimumAmount(scheme) {
  /*
   * Support both structures because existing schemes
   * may have been created using either field.
   *
   * Preferred:
   * installmentConfig.amount
   *
   * Backward compatible:
   * monthlyAmount
   */

  const configuredAmount =
    scheme?.installmentConfig?.amount;

  if (
    configuredAmount !== undefined &&
    configuredAmount !== null &&
    configuredAmount !== ""
  ) {
    return Number(configuredAmount);
  }

  return Number(
    scheme?.monthlyAmount || 0
  );
}

function buildAccountNumber(
  prefix,
  sequence,
  padding
) {
  return `${prefix}-${String(sequence).padStart(
    padding,
    "0"
  )}`;
}

// ============================================================
// CREATE INVESTMENT ACCOUNT
// ============================================================

export async function createInvestmentAccount({
  investorId,
  scheme,
  monthlyAmount,
  startDate,
}) {
  if (!investorId) {
    throw new Error(
      "Investor is required."
    );
  }

  if (!scheme?.id) {
    throw new Error(
      "Investment scheme is required."
    );
  }

  const amount = Number(
    monthlyAmount
  );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Enter a valid monthly amount."
    );
  }

  if (!startDate) {
    throw new Error(
      "Enrollment date is required."
    );
  }

  const db =
    getCrmFirestore();

  // ==========================================================
  // IMPORTANT
  // Read the authoritative scheme document inside the
  // Firestore transaction.
  // ==========================================================

  const schemeRef = doc(
    db,
    INVESTMENT_SCHEMES_COLLECTION,
    scheme.id
  );

  const accountRef = doc(
    collection(
      db,
      INVESTMENT_ACCOUNTS_COLLECTION
    )
  );

  return runTransaction(
    db,
    async (transaction) => {
      // ------------------------------------------------------
      // READ SCHEME
      // ------------------------------------------------------

      const schemeSnapshot =
        await transaction.get(
          schemeRef
        );

      if (!schemeSnapshot.exists()) {
        throw new Error(
          "Investment scheme no longer exists."
        );
      }

      const currentScheme =
        schemeSnapshot.data();

      // ------------------------------------------------------
      // SCHEME STATUS
      // ------------------------------------------------------

      if (
        currentScheme.status !==
          "ACTIVE"
      ) {
        throw new Error(
          "This investment scheme is not active."
        );
      }

      // ------------------------------------------------------
      // INSTALLMENT CONFIGURATION
      // ------------------------------------------------------

      const installmentType =
        getSchemeInstallmentType(
          currentScheme
        );

      const minimumAmount =
        getSchemeMinimumAmount(
          currentScheme
        );

      // ------------------------------------------------------
      // FIXED SCHEME VALIDATION
      // ------------------------------------------------------

      if (
        installmentType ===
        "FIXED"
      ) {
        if (
          !Number.isFinite(
            minimumAmount
          ) ||
          minimumAmount <= 0
        ) {
          throw new Error(
            "The selected scheme does not have a valid monthly installment amount."
          );
        }

        if (
          amount < minimumAmount
        ) {
          throw new Error(
            `Monthly amount must be at least ₹${minimumAmount.toLocaleString(
              "en-IN"
            )}.`
          );
        }
      }

      // ------------------------------------------------------
      // ACCOUNT NUMBER CONFIGURATION
      // ------------------------------------------------------

      const prefix =
        normalizePrefix(
          currentScheme
            ?.accountNumberConfig
            ?.prefix
        );

      if (!prefix) {
        throw new Error(
          "The selected scheme does not have an account number theme."
        );
      }

      const padding = Number(
        currentScheme
          ?.accountNumberConfig
          ?.padding ?? 3
      );

      if (
        !Number.isInteger(
          padding
        ) ||
        padding < 3 ||
        padding > 10
      ) {
        throw new Error(
          "The selected scheme has invalid account number padding."
        );
      }

      // ------------------------------------------------------
      // NEXT ACCOUNT NUMBER
      // ------------------------------------------------------

      const sequence = Number(
        currentScheme
          ?.nextAccountNumber ?? 1
      );

      if (
        !Number.isInteger(
          sequence
        ) ||
        sequence < 1
      ) {
        throw new Error(
          "The selected scheme has an invalid account number counter."
        );
      }

      const accountNumber =
        buildAccountNumber(
          prefix,
          sequence,
          padding
        );

      // ======================================================
      // CREATE ACCOUNT
      // ======================================================

      transaction.set(
        accountRef,
        {
          // --------------------------------------------------
          // RELATIONSHIPS
          // --------------------------------------------------

          investorId,

          schemeId:
            scheme.id,

          // --------------------------------------------------
          // ACCOUNT IDENTITY
          // --------------------------------------------------

          accountNumber,

          accountSequence:
            sequence,

          // --------------------------------------------------
          // INVESTOR CONTRIBUTION
          // --------------------------------------------------

          monthlyAmount:
            amount,

          startDate,

          // --------------------------------------------------
          // SCHEME SNAPSHOT
          //
          // We store the configuration used when the
          // account was opened so future scheme edits
          // don't silently rewrite historical account logic.
          // --------------------------------------------------

          schemeSnapshot: {
            schemeCode:
              currentScheme
                ?.schemeCode || "",

            schemeName:
              currentScheme
                ?.schemeName || "",

            schemeType:
              currentScheme
                ?.schemeType || "",

            durationMonths:
              Number(
                currentScheme
                  ?.durationMonths || 0
              ),

            paymentFrequency:
              currentScheme
                ?.paymentFrequency ||
              "MONTHLY",

            installmentConfig:
              currentScheme
                ?.installmentConfig ||
              {},

            benefitConfig:
              currentScheme
                ?.benefitConfig ||
              {},

            interestConfig:
              currentScheme
                ?.interestConfig ||
              {},

            calculationStrategyId:
              currentScheme
                ?.calculationStrategyId ||
              "",

            calculationVersion:
              currentScheme
                ?.calculationVersion ||
              1,
          },

          // --------------------------------------------------
          // ACCOUNT STATE
          // --------------------------------------------------

          status:
            "ACTIVE",

          totalPaid:
            0,

          totalInterest:
            0,

          totalGoldCredited:
            0,

          // --------------------------------------------------
          // AUDIT
          // --------------------------------------------------

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      // ======================================================
      // ATOMICALLY INCREMENT ACCOUNT NUMBER
      // ======================================================

      transaction.update(
        schemeRef,
        {
          nextAccountNumber:
            sequence + 1,

          updatedAt:
            serverTimestamp(),
        }
      );

      // ======================================================
      // RETURN CREATED ACCOUNT
      // ======================================================

      return {
        id:
          accountRef.id,

        investorId,

        schemeId:
          scheme.id,

        accountNumber,

        accountSequence:
          sequence,

        monthlyAmount:
          amount,

        startDate,

        status:
          "ACTIVE",
      };
    }
  );
}