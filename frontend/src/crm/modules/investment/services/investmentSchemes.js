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


function validateSchemeInput(
  scheme
) {
  const errors = [];

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

  if (
    !cleanString(
      scheme.schemeType
    )
  ) {
    errors.push(
      "Scheme type is required."
    );
  }

  const duration =
    Number(
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


  const interestRate =
    Number(
      scheme.interestConfig
        ?.annualRate ?? 0
    );

  if (
    !Number.isFinite(
      interestRate
    ) ||
    interestRate < 0
  ) {
    errors.push(
      "Interest rate cannot be negative."
    );
  }


  if (errors.length) {
    throw new Error(
      errors.join("\n")
    );
  }
}


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
    await getDocs(reference);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  );
}


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
    await getDocs(reference);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  );
}


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
    await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}


export async function createInvestmentScheme(
  schemeInput,
  userId
) {
  validateSchemeInput(
    schemeInput
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
    schemeCode:
      cleanString(
        schemeInput.schemeCode
      ).toUpperCase(),

    schemeName:
      cleanString(
        schemeInput.schemeName
      ),

    schemeType:
      cleanString(
        schemeInput.schemeType
      ),

    status:
      schemeInput.status ||
      "ACTIVE",

    durationMonths:
      Number(
        schemeInput.durationMonths
      ),

    paymentFrequency:
      schemeInput.paymentFrequency ||
      "MONTHLY",

    installmentConfig:
      schemeInput.installmentConfig ||
      null,

    benefitConfig:
      schemeInput.benefitConfig ||
      null,

    interestConfig: {
      ...DEFAULT_INVESTMENT_SCHEME_CONFIG.interestConfig,
      ...(schemeInput.interestConfig ||
        {}),
    },

    calculationStrategyId:
      schemeInput.calculationStrategyId ||
      DEFAULT_INVESTMENT_SCHEME_CONFIG.calculationStrategyId,

    calculationVersion:
      Number(
        schemeInput.calculationVersion ||
          1
      ),

    accountNumberConfig: {
      ...DEFAULT_INVESTMENT_SCHEME_CONFIG.accountNumberConfig,
      ...(schemeInput.accountNumberConfig ||
        {}),
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
    await getDoc(reference);

  if (!existing.exists()) {
    throw new Error(
      "Investment scheme not found."
    );
  }


  /*
   * We intentionally do not allow
   * changing calculationVersion
   * casually through this method.
   *
   * A future versioning service should
   * create a new scheme version when
   * financial rules change.
   */

  const safeUpdates = {
    ...updates,

    updatedAt:
      serverTimestamp(),

    updatedBy:
      userId || null,
  };


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