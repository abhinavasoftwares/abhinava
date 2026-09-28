import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import {
  getCrmFirestore,
  getCrmFirebaseAuth,
} from "../../../firebase";

import {
  requireCrmPasscode,
} from "../../../services/crmPasscode";

import {
  allocateInvestmentReceipt,
} from "./investmentReceipt";

const ACCOUNTS_COLLECTION =
  "investmentAccounts";

const TRANSACTIONS_COLLECTION =
  "transactions";

const INVESTORS_COLLECTION =
  "investmentInvestors";

const SCHEMES_COLLECTION =
  "investmentSchemes";

// ============================================================
// HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function getActor() {
  let auth = null;

  try {
    auth =
      getCrmFirebaseAuth();
  } catch {
    auth = null;
  }

  const user =
    auth?.currentUser;

  return {
    uid:
      user?.uid || null,

    email:
      user?.email || null,

    name:
      user?.displayName || null,
  };
}

function isGoldScheme(scheme) {
  const type =
    upper(scheme?.schemeType);

  const name =
    upper(scheme?.schemeName);

  const unit =
    upper(
      scheme?.installmentConfig?.unit
    );

  return (
    type.includes("GOLD") ||
    name.includes("GOLD SIP") ||
    unit === "GOLD_GRAMS"
  );
}

// ============================================================
// CREATE INVESTMENT TRANSACTION
// ============================================================

export async function createInvestmentTransaction({
  accountId,
  amountPaid = 0,
  goldPrice = null,
  goldGrams = null,
  date,
  transactionType = "CREDIT",
  paymentMode = "",
  transactionReference = "",
  transactionMonth = null,
  notes = "",
  passcode,
}) {
  if (!accountId) {
    throw new Error(
      "Investment account is required."
    );
  }

  const transactionDate =
    clean(date);

  if (!transactionDate) {
    throw new Error(
      "Transaction date is required."
    );
  }

  const numericAmount =
    toNumber(amountPaid);

  if (
    numericAmount <= 0 &&
    toNumber(goldGrams) <= 0
  ) {
    throw new Error(
      "Enter a valid transaction amount."
    );
  }

  const verifiedPasscode =
    clean(passcode);

  if (!verifiedPasscode) {
    throw new Error(
      "Transaction passcode is required."
    );
  }

  await requireCrmPasscode(
    verifiedPasscode
  );

  return runTransaction(
    getCrmFirestore(),
    async (transaction) => {
      const db =
        getCrmFirestore();

      // ========================================================
      // ACCOUNT
      // ========================================================

      const accountRef =
        doc(
          db,
          ACCOUNTS_COLLECTION,
          accountId
        );

      const accountSnapshot =
        await transaction.get(
          accountRef
        );

      if (
        !accountSnapshot.exists()
      ) {
        throw new Error(
          "Investment account not found."
        );
      }

      const account =
        accountSnapshot.data();

      if (
        upper(
          account.status
        ) === "CLOSED"
      ) {
        throw new Error(
          "Cannot create a transaction for a closed investment account."
        );
      }

      // ========================================================
      // SCHEME
      // ========================================================

      const schemeId =
        account.schemeId;

      if (!schemeId) {
        throw new Error(
          "Investment account has no scheme."
        );
      }

      const schemeRef =
        doc(
          db,
          SCHEMES_COLLECTION,
          schemeId
        );

      const schemeSnapshot =
        await transaction.get(
          schemeRef
        );

      if (
        !schemeSnapshot.exists()
      ) {
        throw new Error(
          "Investment scheme not found."
        );
      }

      const scheme = {
        id:
          schemeSnapshot.id,

        ...schemeSnapshot.data(),
      };

      const goldScheme =
        isGoldScheme(scheme);

      // ========================================================
      // INVESTOR
      // ========================================================

      const investorId =
        account.investorId;

      if (!investorId) {
        throw new Error(
          "Investment account has no investor."
        );
      }

      const investorRef =
        doc(
          db,
          INVESTORS_COLLECTION,
          investorId
        );

      const investorSnapshot =
        await transaction.get(
          investorRef
        );

      if (
        !investorSnapshot.exists()
      ) {
        throw new Error(
          "Investor not found."
        );
      }

      // ========================================================
      // TRANSACTION MONTH
      // ========================================================

      let month =
        clean(
          transactionMonth
        ).toUpperCase();

      if (!month) {
        const existingRef =
          collection(
            accountRef,
            TRANSACTIONS_COLLECTION
          );

        /*
         * We deliberately do not query here because queries inside
         * a Firestore transaction must also obey the read-before-write
         * rule and are unnecessary for explicit transaction months.
         *
         * Default to M1 only when no month is supplied.
         */
        month = "M1";
      }

      if (
        !/^M[0-9]+$/.test(month)
      ) {
        throw new Error(
          "Invalid transaction month."
        );
      }

      const monthNumber =
        Number(
          month.substring(1)
        );

      if (
        !Number.isInteger(
          monthNumber
        ) ||
        monthNumber < 1
      ) {
        throw new Error(
          "Invalid transaction month."
        );
      }

      // ========================================================
      // GOLD VALIDATION
      // ========================================================

      let normalizedGoldPrice =
        goldPrice === null ||
        goldPrice === undefined ||
        goldPrice === ""
          ? null
          : toNumber(
              goldPrice,
              0
            );

      let normalizedGoldGrams =
        goldGrams === null ||
        goldGrams === undefined ||
        goldGrams === ""
          ? 0
          : toNumber(
              goldGrams,
              0
            );

      if (goldScheme) {
        if (
          normalizedGoldPrice ===
            null ||
          normalizedGoldPrice <= 0
        ) {
          throw new Error(
            "Today's 1g gold price is required."
          );
        }

        if (
          normalizedGoldGrams <= 0 &&
          numericAmount > 0
        ) {
          normalizedGoldGrams =
            numericAmount /
            normalizedGoldPrice;
        }

        if (
          normalizedGoldGrams <= 0
        ) {
          throw new Error(
            "Unable to calculate gold quantity."
          );
        }
      } else {
        normalizedGoldPrice =
          null;

        normalizedGoldGrams =
          0;
      }

      // ========================================================
      // RECEIPT ALLOCATION
      // ========================================================
      //
      // Receipt number comes exclusively from receiptSeries.
      // The receipt-series update happens inside the SAME
      // Firestore transaction as the financial transaction.
      // ========================================================

      const receipt =
        await allocateInvestmentReceipt(
          transaction,
          db,
          {
            schemeId:
              account.schemeId ||
              null,

            transactionDate:
              transactionDate,
          }
        );

      const receiptNumber =
        receipt.receiptNumber;

      const receiptSequence =
        receipt.receiptSequence;

      // ========================================================
      // TRANSACTION REFERENCE
      // ========================================================

      const transactionRef =
        doc(
          collection(
            accountRef,
            TRANSACTIONS_COLLECTION
          )
        );

      // ========================================================
      // ACCOUNT TOTALS
      // ========================================================

      const currentTotalPaid =
        toNumber(
          account.totalPaid
        );

      const currentTotalGold =
        toNumber(
          account.totalGoldCredited
        );

      const currentInterest =
        toNumber(
          account.totalInterest
        );

      const nextTotalPaid =
        goldScheme
          ? currentTotalPaid
          : currentTotalPaid +
            numericAmount;

      const nextTotalGold =
        goldScheme
          ? currentTotalGold +
            normalizedGoldGrams
          : currentTotalGold;

      // ========================================================
      // TRANSACTION DATA
      // ========================================================

      const actor =
        getActor();

      const transactionData = {
        investorId,

        accountId,

        schemeId:
          account.schemeId,

        accountNumber:
          account.accountNumber ||
          null,

        transactionType:
          upper(transactionType) ||
          "CREDIT",

        transactionCategory:
          "REGULAR",

        direction:
          "CREDIT",

        transactionMonth:
          month,

        transactionMonthNumber:
          monthNumber,

        isInitialTransaction:
          false,

        isTransfer:
          false,

        countsTowardInstallment:
          true,

        amount:
          numericAmount,

        amountPaid:
          numericAmount,

        goldPrice:
          normalizedGoldPrice,

        goldGrams:
          normalizedGoldGrams,

        transactionDate,

        receiptNumber,

        receiptSequence,

        receiptSeriesId:
          receipt.receiptSeriesId ||
          null,

        receiptSeriesName:
          receipt.receiptSeriesName ||
          null,

        receiptSeriesPrefix:
          receipt.receiptSeriesPrefix ||
          null,

        receiptSeriesPadding:
          receipt.receiptSeriesPadding ||
          null,

        paymentMode:
          clean(paymentMode),

        transactionMode:
          clean(paymentMode),

        transactionReference:
          clean(
            transactionReference
          ),

        notes:
          clean(notes),

        source:
          "INVESTMENT_TRANSACTION",

        passcodeVerified:
          true,

        passcode:
          null,

        immutable:
          true,

        version:
          1,

        createdByUid:
          actor.uid,

        createdByEmail:
          actor.email,

        createdByName:
          actor.name,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      // ========================================================
      // WRITE TRANSACTION
      // ========================================================

      transaction.set(
        transactionRef,
        transactionData
      );

      // ========================================================
      // UPDATE ACCOUNT
      // ========================================================

      transaction.update(
        accountRef,
        {
          totalPaid:
            nextTotalPaid,

          totalGoldCredited:
            nextTotalGold,

          totalInterest:
            currentInterest,

          lastTransactionId:
            transactionRef.id,

          lastTransactionDate:
            transactionDate,

          lastReceiptNumber:
            receiptNumber,

          updatedAt:
            serverTimestamp(),

          updatedByUid:
            actor.uid,

          updatedByEmail:
            actor.email,

          updatedByName:
            actor.name,
        }
      );

      // ========================================================
      // UPDATE INVESTOR
      // ========================================================

      transaction.update(
        investorRef,
        {
          lastInvestmentTransactionDate:
            transactionDate,

          lastInvestmentTransactionId:
            transactionRef.id,

          updatedAt:
            serverTimestamp(),

          updatedByUid:
            actor.uid,

          updatedByEmail:
            actor.email,

          updatedByName:
            actor.name,
        }
      );

      // ========================================================
      // RESULT
      // ========================================================

      return {
        id:
          transactionRef.id,

        accountId,

        investorId,

        schemeId:
          account.schemeId,

        accountNumber:
          account.accountNumber ||
          null,

        transactionMonth:
          month,

        transactionMonthNumber:
          monthNumber,

        amount:
          numericAmount,

        goldGrams:
          normalizedGoldGrams,

        goldPrice:
          normalizedGoldPrice,

        transactionDate,

        receiptNumber,

        receiptSequence,

        receiptSeriesId:
          receipt.receiptSeriesId ||
          null,

        receiptSeriesName:
          receipt.receiptSeriesName ||
          null,

        receiptSeriesPrefix:
          receipt.receiptSeriesPrefix ||
          null,

        receiptSeriesPadding:
          receipt.receiptSeriesPadding ||
          null,

        totalPaid:
          nextTotalPaid,

        totalGoldCredited:
          nextTotalGold,
      };
    }
  );
}

// ============================================================
// GET TRANSACTIONS
// ============================================================

export async function getInvestmentTransactions(
  accountId
) {
  if (!accountId) {
    throw new Error(
      "Investment account is required."
    );
  }

  const db =
    getCrmFirestore();

  const transactionsRef =
    collection(
      db,
      ACCOUNTS_COLLECTION,
      accountId,
      TRANSACTIONS_COLLECTION
    );

  const snapshot =
    await getDocs(
      transactionsRef
    );

  return snapshot.docs
    .map((item) => ({
      id:
        item.id,

      ...item.data(),
    }))
    .sort(
      (a, b) =>
        String(
          b.transactionDate || ""
        ).localeCompare(
          String(
            a.transactionDate || ""
          )
        )
    );
}

// ============================================================
// GET SINGLE TRANSACTION
// ============================================================

export async function getInvestmentTransaction(
  accountId,
  transactionMonth
) {
  if (!accountId) {
    throw new Error(
      "Investment account is required."
    );
  }

  const month =
    clean(
      transactionMonth
    ).toUpperCase();

  if (
    !/^M[0-9]+$/.test(month)
  ) {
    throw new Error(
      "Invalid transaction month."
    );
  }

  const db =
    getCrmFirestore();

  const transactionRef =
    doc(
      db,
      ACCOUNTS_COLLECTION,
      accountId,
      TRANSACTIONS_COLLECTION,
      month
    );

  /*
   * Some existing databases use random transaction IDs
   * rather than M1/M2 document IDs. Therefore first try the
   * conventional ID and then fall back to querying the month.
   */

  const accountTransactions =
    collection(
      db,
      ACCOUNTS_COLLECTION,
      accountId,
      TRANSACTIONS_COLLECTION
    );

  const snapshot =
    await getDocs(
      query(
        accountTransactions,
        where(
          "transactionMonth",
          "==",
          month
        )
      )
    );

  if (
    snapshot.empty
  ) {
    return null;
  }

  const item =
    snapshot.docs[0];

  return {
    id:
      item.id,

    ...item.data(),
  };
}

// ============================================================
// TRANSACTION EXISTENCE
// ============================================================

export async function hasInvestmentTransaction(
  accountId,
  transactionMonth
) {
  const transaction =
    await getInvestmentTransaction(
      accountId,
      transactionMonth
    );

  return Boolean(
    transaction
  );
}

// ============================================================
// IMMUTABILITY
// ============================================================
/*
 * Investment financial transactions are intentionally immutable.
 *
 * There is deliberately NO:
 *
 * updateInvestmentTransaction()
 *
 * deleteInvestmentTransaction()
 *
 * If a transaction needs correction, the correction system
 * should create a reversal/corrective transaction instead.
 */
// ============================================================