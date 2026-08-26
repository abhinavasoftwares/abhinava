import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

import {
  DEFAULT_INVESTMENT_SCHEME_CONFIG,
} from "../calculations/defaults";

const COLLECTION = "investmentSchemes";

function getCollectionRef() {
  return collection(getCrmFirestore(), COLLECTION);
}

function cleanString(value) {
  return String(value ?? "").trim();
}

/**
 * Validate investment scheme.
 *
 * Business rules:
 *
 * FIXED_INSTALLMENT
 * -----------------
 * - Duration is required.
 *
 * GOLD_SIP
 * --------
 * - Open-ended.
 * - Duration is NOT required.
 * - Contribution unit is GOLD_GRAMS.
 *
 * Interest
 * --------
 * - Optional for every scheme.
 * - Only validated when explicitly enabled.
 */
function validateSchemeInput(scheme) {
  const errors = [];

  const schemeType = cleanString(
    scheme.schemeType
  ).toUpperCase();

  const isGoldSip = schemeType === "GOLD_SIP";

  // ============================================================
  // BASIC DETAILS
  // ============================================================

  if (!cleanString(scheme.schemeName)) {
    errors.push("Scheme name is required.");
  }

  if (!cleanString(scheme.schemeCode)) {
    errors.push("Scheme code is required.");
  }

  if (!schemeType) {
    errors.push("Scheme type is required.");
  }

  // ============================================================
  // DURATION
  // ============================================================

  if (!isGoldSip) {
    const duration = Number(
      scheme.durationMonths
    );

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      errors.push(
        "Duration must be greater than zero."
      );
    }
  }

  // ============================================================
  // PAYMENT FREQUENCY
  // ============================================================

  if (
    !cleanString(
      scheme.paymentFrequency
    )
  ) {
    errors.push(
      "Payment frequency is required."
    );
  }

  // ============================================================
  // CONTRIBUTION
  // ============================================================

  const contribution =
    scheme.installmentConfig || {};

  const contributionType =
    cleanString(
      contribution.type
    ).toUpperCase();

  const contributionUnit =
    cleanString(
      contribution.unit
    ).toUpperCase();

  const contributionAmount =
    Number(
      contribution.amount
    );

  if (
    contributionType !== "VARIABLE"
  ) {
    if (
      !Number.isFinite(
        contributionAmount
      ) ||
      contributionAmount <= 0
    ) {
      errors.push(
        isGoldSip
          ? "Minimum gold contribution must be greater than zero grams."
          : "Minimum contribution amount must be greater than zero."
      );
    }
  }

  // ============================================================
  // GOLD SIP UNIT
  // ============================================================

  if (isGoldSip) {
    if (
      contributionUnit &&
      contributionUnit !== "GOLD_GRAMS"
    ) {
      errors.push(
        "Gold SIP contribution unit must be GOLD_GRAMS."
      );
    }
  }

  // ============================================================
  // INTEREST
  // ============================================================

  const interestConfig =
    scheme.interestConfig;

  const interestEnabled =
    Boolean(
      interestConfig?.enabled
    );

  /*
   * Interest is completely optional.
   *
   * If disabled:
   *   interestConfig.enabled = false
   *   no rate validation is performed.
   *
   * If enabled:
   *   annual rate must be valid.
   */
  if (interestEnabled) {
    const interestRate =
      Number(
        interestConfig?.annualRate
      );

    if (
      !Number.isFinite(
        interestRate
      ) ||
      interestRate < 0
    ) {
      errors.push(
        "Interest rate must be zero or greater when interest is enabled."
      );
    }

    if (
      !cleanString(
        interestConfig?.strategyId
      )
    ) {
      errors.push(
        "Interest strategy is required when interest is enabled."
      );
    }

    const roundingScale =
      Number(
        interestConfig?.roundingScale ?? 2
      );

    if (
      !Number.isInteger(
        roundingScale
      ) ||
      roundingScale < 0 ||
      roundingScale > 6
    ) {
      errors.push(
        "Interest rounding scale must be between 0 and 6."
      );
    }
  }

  // ============================================================
  // ACCOUNT NUMBER
  // ============================================================

  const accountConfig =
    scheme.accountNumberConfig || {};

  const prefix =
    cleanString(
      accountConfig.prefix
    );

  if (
    prefix &&
    !/^[A-Z0-9_-]{1,20}$/i.test(
      prefix
    )
  ) {
    errors.push(
      "Account prefix is invalid."
    );
  }

  const padding =
    Number(
      accountConfig.padding ?? 3
    );

  if (
    !Number.isInteger(
      padding
    ) ||
    padding < 3 ||
    padding > 10
  ) {
    errors.push(
      "Account padding must be between 3 and 10 digits."
    );
  }

  if (errors.length) {
    throw new Error(
      errors.join("\n")
    );
  }
}

// ============================================================
// GET ALL
// ============================================================

export async function getInvestmentSchemes() {
  const reference = query(
    getCollectionRef(),
    orderBy(
      "createdAt",
      "desc"
    )
  );

  const snapshot =
    await getDocs(reference);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  );
}

// ============================================================
// GET ACTIVE
// ============================================================

export async function getActiveInvestmentSchemes() {
  const reference = query(
    getCollectionRef(),
    where(
      "status",
      "==",
      "ACTIVE"
    ),
    orderBy(
      "schemeName",
      "asc"
    )
  );

  const snapshot =
    await getDocs(reference);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  );
}

// ============================================================
// GET ONE
// ============================================================

export async function getInvestmentScheme(
  schemeId
) {
  if (!schemeId) {
    throw new Error(
      "Scheme ID is required."
    );
  }

  const reference = doc(
    getCrmFirestore(),
    COLLECTION,
    schemeId
  );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

// ============================================================
// CREATE
// ============================================================

export async function createInvestmentScheme(
  schemeInput,
  userId
) {
  validateSchemeInput(
    schemeInput
  );

  const firestore =
    getCrmFirestore();

  const reference = doc(
    collection(
      firestore,
      COLLECTION
    )
  );

  const schemeType =
    cleanString(
      schemeInput.schemeType
    ).toUpperCase();

  const isGoldSip =
    schemeType === "GOLD_SIP";

  const interestEnabled =
    Boolean(
      schemeInput.interestConfig?.enabled
    );

  const installmentConfig = {
    type:
      schemeInput.installmentConfig
        ?.type || "FIXED",

    unit:
      isGoldSip
        ? "GOLD_GRAMS"
        : (
            schemeInput.installmentConfig
              ?.unit || "AMOUNT"
          ),

    amount:
      Number(
        schemeInput.installmentConfig
          ?.amount || 0
      ),
  };

  const interestConfig =
    interestEnabled
      ? {
          ...DEFAULT_INVESTMENT_SCHEME_CONFIG.interestConfig,

          ...(schemeInput.interestConfig || {}),

          enabled: true,

          annualRate:
            Number(
              schemeInput.interestConfig
                ?.annualRate || 0
            ),

          roundingScale:
            Number(
              schemeInput.interestConfig
                ?.roundingScale ?? 2
            ),
        }
      : {
          enabled: false,
        };

  const scheme = {
    schemeCode:
      cleanString(
        schemeInput.schemeCode
      ).toUpperCase(),

    schemeName:
      cleanString(
        schemeInput.schemeName
      ),

    schemeType,

    status:
      schemeInput.status ||
      "ACTIVE",

    /*
     * Gold SIP = open-ended.
     * Store null explicitly so the schema
     * remains clear.
     */
    durationMonths:
      isGoldSip
        ? null
        : Number(
            schemeInput.durationMonths
          ),

    paymentFrequency:
      schemeInput.paymentFrequency ||
      "MONTHLY",

    installmentConfig,

    benefitConfig:
      schemeInput.benefitConfig ||
      {
        type: "NONE",
        value: 0,
      },

    interestConfig,

    calculationStrategyId:
      schemeInput.calculationStrategyId ||
      (
        isGoldSip
          ? "GOLD_SIP_V1"
          : "FIXED_INSTALLMENT_V1"
      ),

    calculationVersion:
      Number(
        schemeInput.calculationVersion ||
          1
      ),

    accountNumberConfig: {
      ...DEFAULT_INVESTMENT_SCHEME_CONFIG.accountNumberConfig,

      ...(schemeInput.accountNumberConfig || {}),

      prefix:
        cleanString(
          schemeInput.accountNumberConfig
            ?.prefix || "INV"
        ).toUpperCase(),

      padding:
        Number(
          schemeInput.accountNumberConfig
            ?.padding || 3
        ),

      nextSequence: 1,
    },

    createdAt:
      serverTimestamp(),

    createdBy:
      userId || null,

    updatedAt:
      serverTimestamp(),

    updatedBy:
      userId || null,
  };

  await setDoc(
    reference,
    scheme
  );

  return {
    id: reference.id,
    ...scheme,
  };
}

// ============================================================
// UPDATE
// ============================================================

export async function updateInvestmentScheme(
  schemeId,
  updates,
  userId
) {
  if (!schemeId) {
    throw new Error(
      "Scheme ID is required."
    );
  }

  const reference = doc(
    getCrmFirestore(),
    COLLECTION,
    schemeId
  );

  const existing =
    await getDoc(reference);

  if (!existing.exists()) {
    throw new Error(
      "Investment scheme not found."
    );
  }

  const existingData =
    existing.data();

  const merged = {
    ...existingData,
    ...updates,
  };

  /*
   * If scheme becomes GOLD_SIP,
   * duration must always become null.
   */
  if (
    cleanString(
      merged.schemeType
    ).toUpperCase() ===
    "GOLD_SIP"
  ) {
    merged.durationMonths = null;

    merged.installmentConfig = {
      ...(merged.installmentConfig || {}),
      unit: "GOLD_GRAMS",
    };
  }

  validateSchemeInput(
    merged
  );

  const safeUpdates = {
    ...updates,

    updatedAt:
      serverTimestamp(),

    updatedBy:
      userId || null,
  };

  /*
   * Gold SIP must never retain an old duration.
   */
  if (
    cleanString(
      merged.schemeType
    ).toUpperCase() ===
    "GOLD_SIP"
  ) {
    safeUpdates.durationMonths =
      null;

    safeUpdates.installmentConfig = {
      ...(updates.installmentConfig ||
        existingData.installmentConfig ||
        {}),
      unit: "GOLD_GRAMS",
    };
  }

  /*
   * Normalise interest configuration.
   */
  if (
    updates.interestConfig
  ) {
    if (
      updates.interestConfig.enabled ===
      false
    ) {
      safeUpdates.interestConfig = {
        enabled: false,
      };
    } else {
      safeUpdates.interestConfig = {
        ...(existingData.interestConfig ||
          {}),
        ...updates.interestConfig,
        enabled: true,
      };
    }
  }

  delete safeUpdates.createdAt;
  delete safeUpdates.createdBy;
  delete safeUpdates.calculationVersion;

  await updateDoc(
    reference,
    safeUpdates
  );

  return getInvestmentScheme(
    schemeId
  );
}

// ============================================================
// DEACTIVATE
// ============================================================

export async function deactivateInvestmentScheme(
  schemeId,
  userId
) {
  return updateInvestmentScheme(
    schemeId,
    {
      status: "INACTIVE",
    },
    userId
  );
}