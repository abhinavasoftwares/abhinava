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

import {
  getCrmFirestore,
} from "../../../firebase";

import {
  DEFAULT_INVESTMENT_SCHEME_CONFIG,
} from "../calculations/defaults";


const COLLECTION =
  "investmentSchemes";


function getCollectionRef() {
  return collection(
    getCrmFirestore(),
    COLLECTION
  );
}


function cleanString(value) {
  return String(
    value ?? ""
  ).trim();
}


// ============================================================
// VALIDATION
// ============================================================

function validateSchemeInput(
  scheme
) {
  const errors = [];

  const schemeType =
    cleanString(
      scheme.schemeType
    );

  const isGoldSip =
    schemeType === "GOLD_SIP";


  // ----------------------------------------------------------
  // BASIC
  // ----------------------------------------------------------

  if (
    !cleanString(
      scheme.schemeName
    )
  ) {
    errors.push(
      "Scheme name is required."
    );
  }

  if (
    !cleanString(
      scheme.schemeCode
    )
  ) {
    errors.push(
      "Scheme code is required."
    );
  }

  if (!schemeType) {
    errors.push(
      "Scheme type is required."
    );
  }


  // ----------------------------------------------------------
  // PAYMENT FREQUENCY
  // ----------------------------------------------------------

  if (
    !cleanString(
      scheme.paymentFrequency
    )
  ) {
    errors.push(
      "Payment frequency is required."
    );
  }


  // ----------------------------------------------------------
  // GOLD SIP
  // ----------------------------------------------------------

  if (isGoldSip) {

    const minimumGrams =
      Number(
        scheme.installmentConfig
          ?.minimumGrams
      );

    if (
      !Number.isFinite(
        minimumGrams
      ) ||
      minimumGrams <= 0
    ) {
      errors.push(
        "Minimum gold contribution must be greater than 0 grams."
      );
    }

  }


  // ----------------------------------------------------------
  // NON GOLD
  // ----------------------------------------------------------

  else {

    const duration =
      Number(
        scheme.durationMonths
      );

    if (
      !Number.isFinite(
        duration
      ) ||
      duration <= 0
    ) {
      errors.push(
        "Duration must be greater than zero."
      );
    }


    const minimumAmount =
      Number(
        scheme.installmentConfig
          ?.minimumAmount ??
        scheme.installmentConfig
          ?.amount
      );

    if (
      !Number.isFinite(
        minimumAmount
      ) ||
      minimumAmount <= 0
    ) {
      errors.push(
        "Minimum contribution amount must be greater than zero."
      );
    }

  }


  // ----------------------------------------------------------
  // INTEREST
  // ----------------------------------------------------------

  const interestEnabled =
    scheme.interestConfig
      ?.enabled === true;

  if (interestEnabled) {

    const rate =
      Number(
        scheme.interestConfig
          ?.annualRate
      );

    if (
      !Number.isFinite(rate) ||
      rate < 0
    ) {
      errors.push(
        "Interest rate cannot be negative."
      );
    }

  }


  // ----------------------------------------------------------
  // ACCOUNT NUMBER
  // ----------------------------------------------------------

  const prefix =
    cleanString(
      scheme.accountNumberConfig
        ?.prefix
    ).toUpperCase();

  if (!prefix) {
    errors.push(
      "Account number theme is required."
    );
  }

  if (
    prefix &&
    !/^[A-Z0-9_-]{1,20}$/.test(
      prefix
    )
  ) {
    errors.push(
      "Account number theme may contain only letters, numbers, hyphens and underscores."
    );
  }


  const padding =
    Number(
      scheme.accountNumberConfig
        ?.padding
    );

  if (
    !Number.isInteger(
      padding
    ) ||
    padding < 3 ||
    padding > 10
  ) {
    errors.push(
      "Account number padding must be between 3 and 10 digits."
    );
  }


  if (
    scheme.accountNumberConfig
      ?.locked !== true
  ) {
    errors.push(
      "Account number theme must be locked."
    );
  }


  if (errors.length) {
    throw new Error(
      errors.join("\n")
    );
  }
}


// ============================================================
// NORMALIZE PAYLOAD
// ============================================================

function normalizeSchemePayload(
  schemeInput
) {
  const schemeType =
    cleanString(
      schemeInput.schemeType
    );

  const isGoldSip =
    schemeType === "GOLD_SIP";


  const minimumAmount =
    Number(
      schemeInput
        .installmentConfig
        ?.minimumAmount ??
      schemeInput
        .installmentConfig
        ?.amount ??
      0
    );


  const minimumGrams =
    Number(
      schemeInput
        .installmentConfig
        ?.minimumGrams ??
      0
    );


  const interestEnabled =
    schemeInput
      .interestConfig
      ?.enabled === true;


  return {

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


    // Gold SIP has no duration.
    durationMonths:
      isGoldSip
        ? null
        : Number(
            schemeInput
              .durationMonths
          ),


    paymentFrequency:
      schemeInput.paymentFrequency ||
      "MONTHLY",


    installmentConfig:
      isGoldSip
        ? {
            type: "FIXED",
            unit: "GOLD_GRAMS",
            minimumGrams,
          }
        : {
            type:
              schemeInput
                .installmentConfig
                ?.type ||
              "FIXED",

            unit: "AMOUNT",

            minimumAmount,

            // Keep amount for compatibility
            // with the current account service.
            amount: minimumAmount,
          },


    benefitConfig:
      schemeInput.benefitConfig ||
      {
        type: "NONE",
        value: 0,
      },


    interestConfig:
      interestEnabled
        ? {
            enabled: true,

            strategyId:
              schemeInput
                .interestConfig
                ?.strategyId ||
              "STANDARD_INTEREST_V1",

            annualRate:
              Number(
                schemeInput
                  .interestConfig
                  ?.annualRate ||
                0
              ),

            calculationMethod:
              schemeInput
                .interestConfig
                ?.calculationMethod ||
              "SIMPLE",

            compoundingFrequency:
              schemeInput
                .interestConfig
                ?.compoundingFrequency ||
              "NONE",

            dayCountConvention:
              schemeInput
                .interestConfig
                ?.dayCountConvention ||
              "ACTUAL_365",

            roundingScale:
              Number(
                schemeInput
                  .interestConfig
                  ?.roundingScale ||
                2
              ),
          }
        : {
            enabled: false,
            strategyId: null,
            annualRate: 0,
            calculationMethod: null,
            compoundingFrequency: null,
            dayCountConvention: null,
            roundingScale: 2,
          },


    calculationStrategyId:
      schemeInput
        .calculationStrategyId ||
      (
        isGoldSip
          ? "GOLD_SIP_V1"
          : "FIXED_INSTALLMENT_V1"
      ),


    calculationVersion:
      Number(
        schemeInput
          .calculationVersion ||
        1
      ),


    accountNumberConfig: {
      prefix:
        cleanString(
          schemeInput
            .accountNumberConfig
            ?.prefix
        ).toUpperCase(),

      padding:
        Number(
          schemeInput
            .accountNumberConfig
            ?.padding ||
          6
        ),

      // Mandatory.
      locked: true,
    },
  };
}


// ============================================================
// GET ALL
// ============================================================

export async function getInvestmentSchemes() {
  const reference =
    query(
      getCollectionRef(),
      orderBy(
        "createdAt",
        "desc"
      )
    );

  const snapshot =
    await getDocs(
      reference
    );

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
  const reference =
    query(
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
    await getDocs(
      reference
    );

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

  const reference =
    doc(
      getCrmFirestore(),
      COLLECTION,
      schemeId
    );

  const snapshot =
    await getDoc(
      reference
    );

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
  const payload =
    normalizeSchemePayload(
      schemeInput
    );

  validateSchemeInput(
    payload
  );

  const firestore =
    getCrmFirestore();

  const reference =
    doc(
      collection(
        firestore,
        COLLECTION
      )
    );


  const scheme = {

    ...payload,


    accountNumberConfig: {
      ...payload.accountNumberConfig,

      nextSequence: 1,
    },


    // Kept at top level for compatibility
    // with the existing account service.
    nextAccountNumber: 1,


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


  const reference =
    doc(
      getCrmFirestore(),
      COLLECTION,
      schemeId
    );


  const existing =
    await getDoc(
      reference
    );


  if (!existing.exists()) {
    throw new Error(
      "Investment scheme not found."
    );
  }


  const current =
    existing.data();


  // ==========================================================
  // ACCOUNT NUMBER THEME PROTECTION
  // ==========================================================

  const currentConfig =
    current.accountNumberConfig ||
    {};

  const currentLocked =
    currentConfig.locked === true;


  if (currentLocked) {

    const incomingConfig =
      updates.accountNumberConfig;


    if (incomingConfig) {

      const currentPrefix =
        String(
          currentConfig.prefix || ""
        )
          .trim()
          .toUpperCase();

      const currentPadding =
        Number(
          currentConfig.padding || 0
        );


      const incomingPrefix =
        String(
          incomingConfig.prefix ??
          currentPrefix
        )
          .trim()
          .toUpperCase();

      const incomingPadding =
        Number(
          incomingConfig.padding ??
          currentPadding
        );


      if (
        incomingPrefix !==
          currentPrefix ||
        incomingPadding !==
          currentPadding
      ) {
        throw new Error(
          "Account number theme is locked. Request an approved theme change instead."
        );
      }
    }
  }


  // Never allow the client UI to unlock it.
  if (
    updates.accountNumberConfig
      ?.locked === false
  ) {
    throw new Error(
      "Account number theme cannot be unlocked."
    );
  }


  const safeUpdates = {
    ...updates,

    updatedAt:
      serverTimestamp(),

    updatedBy:
      userId || null,
  };


  delete safeUpdates.createdAt;
  delete safeUpdates.createdBy;


  // Calculation version is controlled
  // by the calculation/versioning system.
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