import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  getCrmFirebaseAuth,
  getCrmFirestore,
} from "../../../firebase";

import {
  requireCrmPasscode,
} from "../../../services/crmPasscode";

import {
  createInvestmentAuditLog,
} from "./investmentAudit";

import {
  allocateInvestmentReceipt,
} from "./investmentReceipt";

// ============================================================
// COLLECTIONS
// ============================================================

const ACCOUNTS_COLLECTION =
  "investmentAccounts";

const INVESTORS_COLLECTION =
  "investmentInvestors";

const TRANSACTIONS_COLLECTION =
  "transactions";

const RECEIPT_SEQUENCE_PATH =
  "investmentSettings/receiptNumberSequence";

// ============================================================
// ENUMS
// ============================================================

const PAYMENT_MODES = [
  "UPI",
  "CASH",
  "NEFT",
  "BANK_TRANSFER",
  "OTHER",
];

const TRANSACTION_TYPES = [
  "CREDIT",
  "DEBIT",
  "TRANSFER",
];

const TRANSACTION_CATEGORIES = [
  "INITIAL",
  "MONTHLY_INSTALLMENT",
  "ADJUSTMENT",
  "REVERSAL",
  "TRANSFER",
];

// ============================================================
// HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function toNumber(
  value,
  fallback = 0
) {
  const result =
    Number(value);

  return Number.isFinite(
    result
  )
    ? result
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

// ============================================================
// GOLD ACCOUNT
// ============================================================

function isGoldAccount(account) {
  const schemeType =
    upper(
      account
        ?.schemeSnapshot
        ?.schemeType
    );

  const contributionUnit =
    upper(
      account
        ?.contribution
        ?.unit
    );

  return (
    schemeType.includes("GOLD") ||
    contributionUnit ===
      "GOLD_GRAMS"
  );
}

// ============================================================
// DURATION
// ============================================================

function getDurationMonths(account) {
  const duration =
    toNumber(
      account
        ?.schemeSnapshot
        ?.durationMonths,
      0
    );

  if (
    !Number.isInteger(
      duration
    ) ||
    duration <= 0
  ) {
    return null;
  }

  return duration;
}

// ============================================================
// MAXIMUM MONTH
// ============================================================
//
// 12 month scheme:
//
// M1 ... M13
//
// M13 is the additional / final month.
//
// ============================================================

function getMaximumTransactionMonth(
  account
) {
  const duration =
    getDurationMonths(
      account
    );

  if (!duration) {
    return null;
  }

  return duration + 1;
}

// ============================================================
// MONTH VALIDATION
// ============================================================

function validateTransactionMonth(
  account,
  value
) {
  const month =
    upper(value);

  if (
    !/^M[0-9]+$/.test(
      month
    )
  ) {
    throw new Error(
      "Select a valid transaction month."
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
      "Transaction month must be M1 or later."
    );
  }

  const maximum =
    getMaximumTransactionMonth(
      account
    );

  if (
    maximum &&
    monthNumber > maximum
  ) {
    throw new Error(
      `This account allows transactions only up to M${maximum}.`
    );
  }

  return {
    month,
    monthNumber,
  };
}

// ============================================================
// DATE
// ============================================================

function validateTransactionDate(
  value
) {
  const date =
    clean(value);

  if (!date) {
    throw new Error(
      "Transaction date is required."
    );
  }

  const parsed =
    new Date(
      `${date}T00:00:00`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "Enter a valid transaction date."
    );
  }

  return date;
}

// ============================================================
// PAYMENT MODE
// ============================================================

function validatePaymentMode(
  value
) {
  const mode =
    upper(value);

  if (
    !PAYMENT_MODES.includes(
      mode
    )
  ) {
    throw new Error(
      "Select a valid transaction mode."
    );
  }

  return mode;
}

// ============================================================
// TRANSACTION TYPE
// ============================================================

function validateTransactionType(
  value
) {
  const type =
    upper(
      value || "CREDIT"
    );

  if (
    !TRANSACTION_TYPES.includes(
      type
    )
  ) {
    throw new Error(
      "Invalid transaction type."
    );
  }

  return type;
}

// ============================================================
// TRANSACTION CATEGORY
// ============================================================

function validateTransactionCategory(
  value,
  type
) {
  const category =
    upper(
      value ||
        (
          type === "TRANSFER"
            ? "TRANSFER"
            : "MONTHLY_INSTALLMENT"
        )
    );

  if (
    !TRANSACTION_CATEGORIES.includes(
      category
    )
  ) {
    throw new Error(
      "Invalid transaction category."
    );
  }

  if (
    type === "TRANSFER" &&
    category !== "TRANSFER"
  ) {
    throw new Error(
      "Transfer transactions must use the TRANSFER category."
    );
  }

  if (
    category === "TRANSFER" &&
    type !== "TRANSFER"
  ) {
    throw new Error(
      "TRANSFER category requires transaction type TRANSFER."
    );
  }

  return category;
}

// ============================================================
// PASSCODE
// ============================================================

function validatePasscode(
  value
) {
  const passcode =
    clean(value);

  if (!passcode) {
    throw new Error(
      "Transaction passcode is required."
    );
  }

  return passcode;
}

// ============================================================
// CREATE TRANSACTION
// ============================================================

export async function createInvestmentTransaction(
  {
    accountId,

    transactionMonth,

    transactionDate,

    amountPaid,

    goldPrice = null,

    paymentMode,

    transactionReference,

    transactionType =
      "CREDIT",

    transactionCategory =
      "MONTHLY_INSTALLMENT",

    passcode,
  } = {}
) {
  // ==========================================================
  // BASIC VALIDATION
  // ==========================================================

  if (!accountId) {
    throw new Error(
      "Investment account is required."
    );
  }

  const date =
    validateTransactionDate(
      transactionDate
    );

  const type =
    validateTransactionType(
      transactionType
    );

  const category =
    validateTransactionCategory(
      transactionCategory,
      type
    );

  const reference =
    clean(
      transactionReference
    );

  if (!reference) {
    throw new Error(
      "Transaction reference number is required."
    );
  }

  const mode =
    validatePaymentMode(
      paymentMode
    );

  // ==========================================================
  // PASSCODE
  // ==========================================================

  const verifiedPasscode =
    validatePasscode(
      passcode
    );

  await requireCrmPasscode(
    verifiedPasscode
  );

  // ==========================================================
  // FIRESTORE
  // ==========================================================

  const db =
    getCrmFirestore();

  const accountRef =
    doc(
      db,
      ACCOUNTS_COLLECTION,
      accountId
    );

  const receiptSequenceRef =
    doc(
      db,
      RECEIPT_SEQUENCE_PATH
    );

  const actor =
    getActor();

  let result = null;

  // ==========================================================
  // ATOMIC TRANSACTION
  // ==========================================================

  result =
    await runTransaction(
      db,
      async (
        transaction
      ) => {
        // ====================================================
        // READ ACCOUNT
        // ====================================================

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

        const account = {
          id:
            accountSnapshot.id,

          ...accountSnapshot.data(),
        };

        // ====================================================
        // ACCOUNT STATUS
        // ====================================================

        if (
          upper(
            account.status
          ) !== "ACTIVE"
        ) {
          throw new Error(
            "Transactions can only be added to an active account."
          );
        }

        // ====================================================
        // INVESTOR
        // ====================================================

        const investorId =
          clean(
            account.investorId
          );

        if (!investorId) {
          throw new Error(
            "This account is not linked to an investor."
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
            "Investor linked to this account was not found."
          );
        }

        // ====================================================
        // TRANSACTION REFERENCE
        // ====================================================

        let month = null;
        let monthNumber = null;
        let transactionRef = null;

        if (
          type === "TRANSFER"
        ) {
          /*
           * TRANSFER IS NOT AN INSTALLMENT.
           *
           * Therefore it gets a generated Firestore ID.
           *
           * It does NOT use:
           *
           * transactions/M1
           * transactions/M2
           *
           * etc.
           */

          transactionRef =
            doc(
              collection(
                accountRef,
                TRANSACTIONS_COLLECTION
              )
            );
        } else {
          const validatedMonth =
            validateTransactionMonth(
              account,
              transactionMonth
            );

          month =
            validatedMonth.month;

          monthNumber =
            validatedMonth.monthNumber;

          transactionRef =
            doc(
              accountRef,
              TRANSACTIONS_COLLECTION,
              month
            );

          const existingTransaction =
            await transaction.get(
              transactionRef
            );

          if (
            existingTransaction.exists()
          ) {
            throw new Error(
              `${month} already has a transaction for this account.`
            );
          }
        }

        // ====================================================
        // GOLD / NORMAL
        // ====================================================

        const gold =
          isGoldAccount(
            account
          );

        const paid =
          toNumber(
            amountPaid
          );

        if (
          !Number.isFinite(
            paid
          ) ||
          paid <= 0
        ) {
          throw new Error(
            "Enter a valid amount paid."
          );
        }

        let normalizedGoldPrice =
          null;

        let goldGrams =
          0;

        if (gold) {
          normalizedGoldPrice =
            toNumber(
              goldPrice
            );

          if (
            !Number.isFinite(
              normalizedGoldPrice
            ) ||
            normalizedGoldPrice <= 0
          ) {
            throw new Error(
              "Today's gold price is required for a Gold SIP transaction."
            );
          }

          goldGrams =
            paid /
            normalizedGoldPrice;

          if (
            !Number.isFinite(
              goldGrams
            ) ||
            goldGrams <= 0
          ) {
            throw new Error(
              "Unable to calculate gold credited."
            );
          }
        }

        // ====================================================
        // GLOBAL RECEIPT
        // ====================================================

        const receipt =
          await allocateInvestmentReceipt(
            transaction,
            receiptSequenceRef,
            date
          );

        const receiptNumber =
          receipt.receiptNumber;

        const receiptSequence =
          receipt.receiptSequence;

        // ====================================================
        // OLD TOTALS
        // ====================================================

        const oldTotalPaid =
          toNumber(
            account.totalPaid
          );

        const oldTotalGold =
          toNumber(
            account.totalGoldCredited
          );

        const oldTotalInterest =
          toNumber(
            account.totalInterest
          );

        // ====================================================
        // NEW TOTALS
        // ====================================================

        let newTotalPaid =
          oldTotalPaid;

        let newTotalGold =
          oldTotalGold;

        /*
         * TRANSFER DOES NOT ALTER INSTALLMENT TOTALS.
         */

        if (
          type !== "TRANSFER"
        ) {
          if (gold) {
            newTotalGold =
              oldTotalGold +
              goldGrams;
          } else if (
            type === "CREDIT"
          ) {
            newTotalPaid =
              oldTotalPaid +
              paid;
          } else if (
            type === "DEBIT"
          ) {
            newTotalPaid =
              Math.max(
                0,
                oldTotalPaid -
                  paid
              );
          }
        }

        // ====================================================
        // BALANCE
        // ====================================================

        const openingAmount =
          toNumber(
            account.openingBalanceAmount
          );

        const openingGold =
          toNumber(
            account.openingBalanceGoldGrams
          );

        const balanceAmount =
          openingAmount +
          newTotalPaid;

        const balanceGoldGrams =
          openingGold +
          newTotalGold;

        // ====================================================
        // INTEREST START
        // ====================================================

        const interestStartDate =
          account.interestStartDate ||
          date;

        // ====================================================
        // TRANSACTION DATA
        // ====================================================

        const transactionData = {
          investorId,

          accountId,

          schemeId:
            account.schemeId ||
            null,

          accountNumber:
            account.accountNumber ||
            null,

          // --------------------------------------------------
          // RECEIPT
          // --------------------------------------------------

          receiptNumber,

          receiptSequence,

          transactionReference:
            reference,

          // --------------------------------------------------
          // MONTH
          // --------------------------------------------------

          transactionMonth:
            month,

          transactionMonthNumber:
            monthNumber,

          // --------------------------------------------------
          // CLASSIFICATION
          // --------------------------------------------------

          type,

          direction:
            type === "DEBIT"
              ? "DEBIT"
              : "CREDIT",

          transactionCategory:
            category,

          // --------------------------------------------------
          // UNIT
          // --------------------------------------------------

          unit:
            gold
              ? "AMOUNT_AND_GOLD"
              : "AMOUNT",

          // --------------------------------------------------
          // PAYMENT
          // --------------------------------------------------

          paymentMode:
            mode,

          // --------------------------------------------------
          // FINANCIAL VALUES
          // --------------------------------------------------

          amountPaid:
            paid,

          amount:
            paid,

          goldPrice:
            normalizedGoldPrice,

          goldGrams:
            gold
              ? goldGrams
              : 0,

          // --------------------------------------------------
          // BALANCE
          // --------------------------------------------------

          balanceAmount,

          balanceGoldGrams,

          // --------------------------------------------------
          // INTEREST
          // --------------------------------------------------

          interestStartDate,

          interestAmount:
            0,

          // --------------------------------------------------
          // SOURCE
          // --------------------------------------------------

          source:
            type === "TRANSFER"
              ? "ACCOUNT_TRANSFER"
              : "MANUAL_TRANSACTION",

          // --------------------------------------------------
          // FLAGS
          // --------------------------------------------------

          isInitialTransaction:
            category === "INITIAL",

          isTransfer:
            type === "TRANSFER",

          countsTowardInstallment:
            type !== "TRANSFER" &&
            category !== "ADJUSTMENT" &&
            category !== "REVERSAL",

          // --------------------------------------------------
          // SECURITY
          // --------------------------------------------------

          immutable:
            true,

          version:
            1,

          passcodeVerified:
            true,

          // --------------------------------------------------
          // ACTOR
          // --------------------------------------------------

          createdAt:
            serverTimestamp(),

          createdByUid:
            actor.uid,

          createdByEmail:
            actor.email,

          createdByName:
            actor.name,
        };

        // ====================================================
        // TRANSFER DATA
        // ====================================================

        if (
          type === "TRANSFER"
        ) {
          transactionData.transfer = {
            type:
              "ACCOUNT_TRANSFER",

            sourceAccountId:
              account
                .previousAccountId ||
              null,

            sourceAccountNumber:
              account
                .previousAccountNumber ||
              null,

            destinationAccountId:
              accountId,

            destinationAccountNumber:
              account.accountNumber ||
              null,
          };
        }

        // ====================================================
        // WRITE TRANSACTION
        // ====================================================

        transaction.set(
          transactionRef,
          transactionData
        );

        // ====================================================
        // UPDATE ACCOUNT
        // ====================================================

        const accountUpdates = {
          totalPaid:
            newTotalPaid,

          totalGoldCredited:
            newTotalGold,

          totalInterest:
            oldTotalInterest,

          lastTransactionId:
            transactionRef.id,

          lastTransactionDate:
            date,

          lastReceiptNumber:
            receiptNumber,

          interestStartDate,

          updatedAt:
            serverTimestamp(),
        };

        /*
         * A transfer is NOT an installment.
         *
         * Therefore it must not overwrite
         * lastTransactionMonth.
         */

        if (
          type !== "TRANSFER"
        ) {
          accountUpdates.lastTransactionMonth =
            month;
        }

        transaction.update(
          accountRef,
          accountUpdates
        );

        // ====================================================
        // UPDATE INVESTOR
        // ====================================================

        transaction.update(
          investorRef,
          {
            updatedAt:
              serverTimestamp(),
          }
        );

        // ====================================================
        // RETURN
        // ====================================================

        return {
          id:
            transactionRef.id,

          ...transactionData,

          schemeName:
            account
              ?.schemeSnapshot
              ?.schemeName ||
            null,

          schemeType:
            account
              ?.schemeSnapshot
              ?.schemeType ||
            null,
        };
      }
    );

  // ==========================================================
  // AUDIT
  // ==========================================================

  try {
    await createInvestmentAuditLog({
      action:
        result.type === "TRANSFER"
          ? "INVESTMENT_TRANSFER_CREATED"
          : "INVESTMENT_TRANSACTION_CREATED",

      entityType:
        "INVESTMENT_TRANSACTION",

      entityId:
        result.id,

      description:
        result.type === "TRANSFER"
          ? `Transfer transaction ${result.receiptNumber} was recorded for account ${result.accountNumber || accountId}.`
          : `Transaction ${result.receiptNumber} was recorded for account ${result.accountNumber || accountId}.`,

      metadata: {
        investorId:
          result.investorId,

        accountId:
          result.accountId,

        accountNumber:
          result.accountNumber,

        schemeId:
          result.schemeId,

        schemeName:
          result.schemeName,

        transactionType:
          result.type,

        transactionCategory:
          result.transactionCategory,

        transactionMonth:
          result.transactionMonth,

        transactionMonthNumber:
          result.transactionMonthNumber,

        transactionReference:
          result.transactionReference,

        receiptNumber:
          result.receiptNumber,

        receiptSequence:
          result.receiptSequence,

        paymentMode:
          result.paymentMode,

        amountPaid:
          result.amountPaid,

        goldPrice:
          result.goldPrice,

        goldGrams:
          result.goldGrams,

        source:
          result.source,

        isTransfer:
          result.isTransfer,

        isInitialTransaction:
          result.isInitialTransaction,

        countsTowardInstallment:
          result.countsTowardInstallment,

        createdByUid:
          actor.uid,

        createdByEmail:
          actor.email,

        createdByName:
          actor.name,
      },
    });
  } catch (auditError) {
    /*
     * The financial transaction has already committed.
     *
     * Do NOT modify/delete the transaction because the audit
     * write failed.
     */

    console.error(
      "Investment transaction was created, but audit logging failed:",
      auditError
    );
  }

  return result;
}

// ============================================================
// GET SINGLE INSTALLMENT TRANSACTION
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
    upper(
      transactionMonth
    );

  if (
    !/^M[0-9]+$/.test(
      month
    )
  ) {
    throw new Error(
      "Invalid transaction month."
    );
  }

  const db =
    getCrmFirestore();

  const reference =
    doc(
      db,
      ACCOUNTS_COLLECTION,
      accountId,
      TRANSACTIONS_COLLECTION,
      month
    );

  const snapshot =
    await getDoc(
      reference
    );

  if (
    !snapshot.exists()
  ) {
    return null;
  }

  return {
    id:
      snapshot.id,

    ...snapshot.data(),
  };
}

// ============================================================
// GET ALL ACCOUNT TRANSACTIONS
// ============================================================
//
// Includes:
//
// M1
// M2
// M3
// ...
// TRANSFER
//
// Transfers are included because they use generated IDs.
//
// ============================================================

export async function getInvestmentAccountTransactions(
  accountId
) {
  if (!accountId) {
    throw new Error(
      "Investment account is required."
    );
  }

  const db =
    getCrmFirestore();

  const reference =
    collection(
      db,
      ACCOUNTS_COLLECTION,
      accountId,
      TRANSACTIONS_COLLECTION
    );

  const snapshot =
    await getDocs(
      reference
    );

  return snapshot.docs.map(
    (item) => ({
      id:
        item.id,

      ...item.data(),
    })
  );
}

// ============================================================
// NO UPDATE / DELETE
// ============================================================
//
// Financial transaction documents are immutable.
//
// Corrections should be represented by:
//
// ORIGINAL
//    ↓
// REVERSAL
//    ↓
// CORRECTIVE CREDIT / DEBIT
//
// ============================================================