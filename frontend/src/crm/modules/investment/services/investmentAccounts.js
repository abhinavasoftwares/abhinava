import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const INVESTMENT_ACCOUNTS_COLLECTION = "investmentAccounts";

/**
 * Create an investment account.
 *
 * IMPORTANT:
 * - Scheme defines the standard minimum.
 * - Account decides whether that minimum is enforced.
 * - Scheme snapshot is stored so historical accounts remain auditable
 *   even if the scheme configuration changes later.
 */
export async function createInvestmentAccount({
  investorId,
  scheme,
  accountNumber,
  contributionValue,
  startDate,
  minimumRestrictionEnabled = true,
}) {
  if (!investorId) {
    throw new Error("Investor ID is required.");
  }

  if (!scheme?.id) {
    throw new Error("Investment scheme is required.");
  }

  if (!accountNumber) {
    throw new Error("Account number is required.");
  }

  const value = Number(contributionValue);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Contribution must be greater than zero.");
  }

  const installmentConfig = scheme.installmentConfig || {};

  const unit =
    installmentConfig.unit ||
    (String(scheme.schemeType || "").toUpperCase().includes("GOLD")
      ? "GOLD_GRAMS"
      : "AMOUNT");

  const frequency =
    installmentConfig.frequency || "MONTHLY";

  const schemeMinimum =
    Number(installmentConfig.minimumAmount || 0);

  const minimumEnabled =
    Boolean(minimumRestrictionEnabled);

  // Server-side/client-side service validation.
  // The account keeps the decision permanently.
  if (minimumEnabled && schemeMinimum > 0 && value < schemeMinimum) {
    throw new Error(
      unit === "GOLD_GRAMS"
        ? `Minimum investment is ${schemeMinimum} g.`
        : `Minimum investment is ₹${schemeMinimum.toLocaleString("en-IN")}.`
    );
  }

  const db = getCrmFirestore();

  const accountData = {
    investorId,

    schemeId: scheme.id,

    accountNumber,

    status: "ACTIVE",

    contribution: {
      value,
      unit,
      frequency,
    },

    minimumRestriction: {
      enabled: minimumEnabled,
      schemeMinimum,
      unit,
    },

    schemeSnapshot: {
      id: scheme.id,
      schemeCode: scheme.schemeCode || "",
      schemeName: scheme.schemeName || "",
      schemeType: scheme.schemeType || "",

      installmentConfig: {
        ...installmentConfig,
      },

      durationConfig: {
        ...(scheme.durationConfig || {
          enabled: false,
          months: null,
        }),
      },

      interestConfig: {
        ...(scheme.interestConfig || {}),
      },

      benefitConfig: {
        ...(scheme.benefitConfig || {}),
      },
    },

    startDate,

    // Legacy-compatible fields.
    // These can be removed later after the migration is complete.
    monthlyAmount:
      unit === "AMOUNT" ? value : null,

    monthlyGoldGrams:
      unit === "GOLD_GRAMS" ? value : null,

    totalPaid: 0,

    totalGoldCredited: 0,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = collection(
    db,
    INVESTMENT_ACCOUNTS_COLLECTION
  );

  const created = await addDoc(
    reference,
    accountData
  );

  return {
    id: created.id,
    ...accountData,
  };
}

/**
 * Fetch a single investment account.
 */
export async function getInvestmentAccount(accountId) {
  if (!accountId) {
    throw new Error("Account ID is required.");
  }

  const db = getCrmFirestore();

  const reference = doc(
    db,
    INVESTMENT_ACCOUNTS_COLLECTION,
    accountId
  );

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error("Investment account not found.");
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/**
 * Update an investment account.
 */
export async function updateInvestmentAccount(
  accountId,
  updates
) {
  if (!accountId) {
    throw new Error("Account ID is required.");
  }

  const db = getCrmFirestore();

  const reference = doc(
    db,
    INVESTMENT_ACCOUNTS_COLLECTION,
    accountId
  );

  await updateDoc(reference, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}