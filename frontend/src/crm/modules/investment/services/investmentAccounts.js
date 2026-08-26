import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const ACCOUNTS_COLLECTION =
  "investmentAccounts";

const SCHEMES_COLLECTION =
  "investmentSchemes";


function formatAccountNumber(
  prefix,
  sequence
) {
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}


/**
 * Creates an investment account and atomically
 * reserves the next account number for the scheme.
 *
 * Example:
 *
 * prefix = "K12"
 *
 * 1 -> K12-001
 * 2 -> K12-002
 * 3 -> K12-003
 */
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

  if (!startDate) {
    throw new Error(
      "Investment start date is required."
    );
  }

  const amount =
    Number(monthlyAmount);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Enter a valid monthly amount."
    );
  }

  const minimumAmount =
    Number(
      scheme.monthlyAmount
    );

  if (
    !Number.isFinite(
      minimumAmount
    ) ||
    minimumAmount <= 0
  ) {
    throw new Error(
      "Selected scheme has an invalid monthly amount."
    );
  }

  if (
    amount < minimumAmount
  ) {
    throw new Error(
      `Monthly amount cannot be less than ₹${minimumAmount.toLocaleString(
        "en-IN"
      )}.`
    );
  }


  const prefix =
    String(
      scheme.accountNumberPrefix ||
      ""
    ).trim();


  if (!prefix) {
    throw new Error(
      "The selected scheme does not have an account number theme configured."
    );
  }


  const firestore =
    getCrmFirestore();


  const schemeReference =
    doc(
      firestore,
      SCHEMES_COLLECTION,
      scheme.id
    );


  const accountReference =
    doc(
      collection(
        firestore,
        ACCOUNTS_COLLECTION
      )
    );


  let createdAccount = null;


  await runTransaction(
    firestore,
    async (transaction) => {

      const schemeSnapshot =
        await transaction.get(
          schemeReference
        );


      if (!schemeSnapshot.exists()) {
        throw new Error(
          "Investment scheme no longer exists."
        );
      }


      const currentScheme =
        schemeSnapshot.data();


      if (
        currentScheme.status !==
        "ACTIVE"
      ) {
        throw new Error(
          "The selected investment scheme is no longer active."
        );
      }


      const currentMinimum =
        Number(
          currentScheme.monthlyAmount
        );


      if (
        !Number.isFinite(
          currentMinimum
        ) ||
        currentMinimum <= 0
      ) {
        throw new Error(
          "Investment scheme has an invalid monthly amount."
        );
      }


      if (
        amount < currentMinimum
      ) {
        throw new Error(
          `Monthly amount must be at least ₹${currentMinimum.toLocaleString(
            "en-IN"
          )}.`
        );
      }


      const currentPrefix =
        String(
          currentScheme.accountNumberPrefix ||
          ""
        ).trim();


      if (!currentPrefix) {
        throw new Error(
          "The selected scheme does not have an account number theme configured."
        );
      }


      /*
       * nextAccountNumber belongs to the scheme.
       *
       * If it does not exist, start at 1.
       */
      const nextNumber =
        Number(
          currentScheme.nextAccountNumber
        ) || 1;


      const accountNumber =
        formatAccountNumber(
          currentPrefix,
          nextNumber
        );


      /*
       * Reserve the next number.
       */
      transaction.update(
        schemeReference,
        {
          nextAccountNumber:
            nextNumber + 1,

          updatedAt:
            serverTimestamp(),
        }
      );


      /*
       * Create the investment account.
       */
      transaction.set(
        accountReference,
        {
          investorId,

          schemeId:
            scheme.id,

          schemeName:
            currentScheme.schemeName ||
            "",

          schemeType:
            currentScheme.schemeType ||
            "",

          accountNumber,

          accountNumberPrefix:
            currentPrefix,

          accountSequence:
            nextNumber,

          monthlyAmount:
            amount,

          schemeMinimumAmount:
            currentMinimum,

          startDate,

          status: "ACTIVE",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );


      createdAccount = {
        id:
          accountReference.id,

        investorId,

        schemeId:
          scheme.id,

        schemeName:
          currentScheme.schemeName ||
          "",

        schemeType:
          currentScheme.schemeType ||
          "",

        accountNumber,

        accountNumberPrefix:
          currentPrefix,

        accountSequence:
          nextNumber,

        monthlyAmount:
          amount,

        schemeMinimumAmount:
          currentMinimum,

        startDate,

        status: "ACTIVE",
      };
    }
  );


  return createdAccount;
}


/**
 * Update an investment account.
 */
export async function updateInvestmentAccount(
  accountId,
  updates
) {
  if (!accountId) {
    throw new Error(
      "Investment account ID is required."
    );
  }


  const firestore =
    getCrmFirestore();


  const reference =
    doc(
      firestore,
      ACCOUNTS_COLLECTION,
      accountId
    );


  await runTransaction(
    firestore,
    async (transaction) => {

      const snapshot =
        await transaction.get(
          reference
        );


      if (!snapshot.exists()) {
        throw new Error(
          "Investment account not found."
        );
      }


      transaction.update(
        reference,
        {
          ...updates,

          updatedAt:
            serverTimestamp(),
        }
      );
    }
  );


  return {
    id: accountId,
    ...updates,
  };
}


/**
 * Activate / deactivate account.
 */
export async function updateInvestmentAccountStatus(
  accountId,
  status
) {
  if (
    status !== "ACTIVE" &&
    status !== "INACTIVE"
  ) {
    throw new Error(
      "Invalid investment account status."
    );
  }


  return updateInvestmentAccount(
    accountId,
    {
      status,
    }
  );
}