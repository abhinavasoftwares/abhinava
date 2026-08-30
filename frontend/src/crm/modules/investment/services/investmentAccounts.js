import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  getCrmFirestore,
  getCrmFirebaseAuth,
} from "../../../firebase";

import {
  requireCrmPasscode,
} from "../../../services/crmPasscode";

const ACCOUNTS = "investmentAccounts";
const SCHEMES = "investmentSchemes";
const INVESTORS = "investmentInvestors";
const TRANSACTIONS = "transactions";

const RECEIPT_SEQUENCE =
  "investmentSettings/receiptNumberSequence";

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

function isGoldScheme(scheme) {
  const type = upper(
    scheme?.schemeType
  );

  const name = upper(
    scheme?.schemeName
  );

  const unit = upper(
    scheme?.installmentConfig?.unit
  );

  return (
    type.includes("GOLD") ||
    name.includes("GOLD SIP") ||
    unit === "GOLD_GRAMS"
  );
}

function isGoldAccount(account) {
  const type = upper(
    account?.schemeSnapshot?.schemeType
  );

  const unit = upper(
    account?.contribution?.unit
  );

  return (
    type.includes("GOLD") ||
    unit === "GOLD_GRAMS"
  );
}

// ============================================================
// SCHEME MINIMUM
// ============================================================

function getSchemeMinimum(scheme) {
  if (isGoldScheme(scheme)) {
    return toNumber(
      scheme?.installmentConfig?.minimumGrams ??
        scheme?.minimumGrams ??
        0
    );
  }

  return toNumber(
    scheme?.installmentConfig?.amount ??
      scheme?.installmentConfig?.minimumAmount ??
      scheme?.minimumAmount ??
      scheme?.monthlyAmount ??
      0
  );
}

// ============================================================
// ACCOUNT NUMBER
// ============================================================

function normalizePrefix(value) {
  return clean(value).toUpperCase();
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
// DATE
// ============================================================

function validateDate(value, label = "Date") {
  const date = clean(value);

  if (!date) {
    throw new Error(`${label} is required.`);
  }

  const parsed =
    new Date(`${date}T00:00:00`);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      `Enter a valid ${label.toLowerCase()}.`
    );
  }

  return date;
}

// ============================================================
// CONTRIBUTION VALIDATION
// ============================================================

function validateContribution(
  scheme,
  value,
  restrictionEnabled
) {
  const gold =
    isGoldScheme(scheme);

  const contribution =
    Number(value);

  if (
    !Number.isFinite(
      contribution
    ) ||
    contribution <= 0
  ) {
    throw new Error(
      gold
        ? "Enter a valid monthly gold quantity."
        : "Enter a valid monthly investment amount."
    );
  }

  const minimum =
    getSchemeMinimum(scheme);

  if (
    restrictionEnabled &&
    minimum > 0 &&
    contribution < minimum
  ) {
    throw new Error(
      gold
        ? `Monthly gold must be at least ${minimum} g.`
        : `Monthly amount must be at least ₹${minimum.toLocaleString(
            "en-IN"
          )}.`
    );
  }

  return contribution;
}

// ============================================================
// INITIAL TRANSACTION
// ============================================================

function validateInitialTransaction(
  scheme,
  initialTransaction,
  minimumRestrictionEnabled
) {
  if (!initialTransaction) {
    return null;
  }

  const gold = isGoldScheme(scheme);

  const amountPaid = Number(
    initialTransaction.amountPaid ??
      initialTransaction.amount ??
      initialTransaction.value
  );

  if (
    !Number.isFinite(amountPaid) ||
    amountPaid <= 0
  ) {
    throw new Error(
      gold
        ? "Enter a valid amount paid for the Gold SIP first transaction."
        : "Enter a valid first transaction amount."
    );
  }

  const date = clean(
    initialTransaction.date
  );

  if (!date) {
    throw new Error(
      "First transaction date is required."
    );
  }

  const passcode = clean(
    initialTransaction.passcode
  );

  if (!passcode) {
    throw new Error(
      "Transaction passcode is required."
    );
  }

  let goldPrice = null;
  let goldGrams = 0;

  if (gold) {
    goldPrice = Number(
      initialTransaction.goldPrice
    );

    if (
      !Number.isFinite(goldPrice) ||
      goldPrice <= 0
    ) {
      throw new Error(
        "Today's 1g gold price is required for the Gold SIP first transaction."
      );
    }

    goldGrams =
      amountPaid / goldPrice;

    if (
      !Number.isFinite(goldGrams) ||
      goldGrams <= 0
    ) {
      throw new Error(
        "Unable to calculate gold credited from the amount paid and gold price."
      );
    }
  }

  /*
   * ==========================================================
   * INITIAL TRANSACTION MINIMUM
   * ==========================================================
   *
   * If minimum restriction is enabled, the first transaction
   * must also satisfy the scheme minimum.
   *
   * Cash scheme:
   *   amountPaid >= minimum
   *
   * Gold scheme:
   *   goldGrams >= minimum
   *
   * If restriction is disabled, this check is skipped.
   */
  const minimum = getSchemeMinimum(scheme);

  if (
    minimumRestrictionEnabled &&
    minimum > 0
  ) {
    if (gold) {
      if (goldGrams < minimum) {
        throw new Error(
          `First transaction must be at least ${minimum} g.`
        );
      }
    } else {
      if (amountPaid < minimum) {
        throw new Error(
          `First transaction must be at least ₹${minimum.toLocaleString(
            "en-IN"
          )}.`
        );
      }
    }
  }

  return {
  amountPaid,
  date,
  passcode,
  goldPrice,
  goldGrams,

  transactionType:
    clean(initialTransaction.transactionType) ||
    "CREDIT",

  paymentMode:
    clean(initialTransaction.paymentMode),

  transactionReference:
    clean(initialTransaction.transactionReference),
};
}

// ============================================================
// ACCOUNT BALANCE
// ============================================================

/*
 * Transfer balance is stored separately as opening balance.
 *
 * totalPaid / totalGoldCredited contain ONLY actual
 * transactions recorded against this account.
 */

function getAccountBalances(account) {
  return {
    amountBalance:
      toNumber(
        account?.openingBalanceAmount
      ) +
      toNumber(
        account?.totalPaid
      ),

    goldBalance:
      toNumber(
        account?.openingBalanceGoldGrams
      ) +
      toNumber(
        account?.totalGoldCredited
      ),
  };
}

// ============================================================
// ACCOUNT SUMMARY
// ============================================================

function normalizeAccountSummary(
  summary
) {
  return {
    totalAccounts:
      toNumber(
        summary?.totalAccounts
      ),

    activeAccounts:
      toNumber(
        summary?.activeAccounts
      ),

    closedAccounts:
      toNumber(
        summary?.closedAccounts
      ),

    activeAccountNumbers:
      Array.isArray(
        summary?.activeAccountNumbers
      )
        ? [
            ...summary.activeAccountNumbers,
          ]
        : [],

    closedAccountNumbers:
      Array.isArray(
        summary?.closedAccountNumbers
      )
        ? [
            ...summary.closedAccountNumbers,
          ]
        : [],
  };
}

// ============================================================
// ACTOR
// ============================================================

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
// CREATE INVESTMENT ACCOUNT
// ============================================================

export async function createInvestmentAccount({
  investorId,
  scheme,

  contributionValue,
  monthlyAmount,

  startDate,

  minimumRestrictionEnabled = true,

  openingBalanceAmount = 0,
  openingBalanceGoldGrams = 0,

  accountOrigin = "NEW",
  previousAccountId = null,

  transferGoldPrice = null,

  /*
   * Optional initial transaction.
   *
   * If supplied:
   * - it becomes M1
   * - it receives a global receipt number
   * - passcode is verified
   *
   * A transfer is NEVER treated as M1.
   */
  initialTransaction = null,

  /*
   * Used when carrying forward an account
   * without creating an initial payment.
   */
  transferPasscode = null,
}) {
  // ==========================================================
  // BASIC VALIDATION
  // ==========================================================

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
      "Enrollment date is required."
    );
  }

  const normalizedStartDate =
    validateDate(
      startDate,
      "Enrollment date"
    );

  const normalizedOrigin =
    upper(accountOrigin) || "NEW";

  if (
    ![
      "NEW",
      "CARRY_FORWARD",
    ].includes(
      normalizedOrigin
    )
  ) {
    throw new Error(
      "Invalid account origin."
    );
  }

  if (
    normalizedOrigin ===
      "CARRY_FORWARD" &&
    !previousAccountId
  ) {
    throw new Error(
      "Previous account is required for carry-forward."
    );
  }

  // ==========================================================
  // CONTRIBUTION
  // ==========================================================

  const contribution =
    Number(
      contributionValue ??
        monthlyAmount
    );

  validateContribution(
    scheme,
    contribution,
    Boolean(
      minimumRestrictionEnabled
    )
  );

  // ==========================================================
  // INITIAL TRANSACTION
  // ==========================================================

  const transactionInput =
  validateInitialTransaction(
    scheme,
    initialTransaction,
    Boolean(
      minimumRestrictionEnabled
    )
  );

  /*
   * Verify passcode BEFORE starting the Firestore
   * transaction.
   *
   * The plaintext passcode is never stored.
   */
  if (
    transactionInput
  ) {
    await requireCrmPasscode(
      transactionInput.passcode
    );
  }

  /*
   * Carry-forward closes the source account.
   * Therefore it also requires passcode protection.
   */
  if (
    normalizedOrigin ===
    "CARRY_FORWARD"
  ) {
    const transferCode =
      clean(
        transferPasscode ||
          transactionInput?.passcode
      );

    if (!transferCode) {
      throw new Error(
        "Transaction passcode is required to transfer and close the previous account."
      );
    }

    /*
     * If the same passcode was already verified
     * above, do not perform another verification.
     */
    if (
      !transactionInput ||
      transferCode !==
        transactionInput.passcode
    ) {
      await requireCrmPasscode(
        transferCode
      );
    }
  }

  // ==========================================================
  // FIRESTORE
  // ==========================================================

  const db =
    getCrmFirestore();

  const schemeRef =
    doc(
      db,
      SCHEMES,
      scheme.id
    );

  const investorRef =
    doc(
      db,
      INVESTORS,
      investorId
    );

  const accountRef =
    doc(
      collection(
        db,
        ACCOUNTS
      )
    );

  const receiptSequenceRef =
    doc(
      db,
      RECEIPT_SEQUENCE
    );

  const firstTransactionRef =
    transactionInput
      ? doc(
          collection(
            accountRef,
            TRANSACTIONS
          )
        )
      : null;

  const transferTransactionRef =
    normalizedOrigin ===
    "CARRY_FORWARD"
      ? doc(
          collection(
            accountRef,
            TRANSACTIONS
          )
        )
      : null;

  const actor =
    getActor();

  // ==========================================================
  // FIRESTORE TRANSACTION
  // ==========================================================

  return runTransaction(
    db,
    async (transaction) => {
      // ========================================================
      // ALL READS MUST HAPPEN BEFORE WRITES
      // ========================================================

      const schemeSnapshot =
        await transaction.get(
          schemeRef
        );

      const investorSnapshot =
        await transaction.get(
          investorRef
        );

      if (
        !schemeSnapshot.exists()
      ) {
        throw new Error(
          "Investment scheme no longer exists."
        );
      }

      if (
        !investorSnapshot.exists()
      ) {
        throw new Error(
          "Investor no longer exists."
        );
      }

      const currentScheme = {
        id:
          schemeSnapshot.id,

        ...schemeSnapshot.data(),
      };

      // ========================================================
      // SCHEME VALIDATION
      // ========================================================

      if (
        upper(
          currentScheme.status
        ) !== "ACTIVE"
      ) {
        throw new Error(
          "This investment scheme is not active."
        );
      }

      const destinationIsGold =
        isGoldScheme(
          currentScheme
        );

      const minimum =
        getSchemeMinimum(
          currentScheme
        );

      if (
        minimumRestrictionEnabled &&
        minimum > 0 &&
        contribution < minimum
      ) {
        throw new Error(
          destinationIsGold
            ? `Monthly gold must be at least ${minimum} g.`
            : `Monthly amount must be at least ₹${minimum.toLocaleString(
                "en-IN"
              )}.`
        );
      }

      // ========================================================
      // ACCOUNT NUMBER
      // ========================================================

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

      const padding =
        Number(
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

      const sequence =
        Number(
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

      // ========================================================
      // SOURCE ACCOUNT / TRANSFER
      // ========================================================

      let sourceAccount = null;

      let sourceAccountNumber =
        null;

      let transferAmount = 0;

      let transferGoldGrams = 0;

      let normalizedTransferGoldPrice =
        null;

      if (
        normalizedOrigin ===
        "CARRY_FORWARD"
      ) {
        const sourceRef =
          doc(
            db,
            ACCOUNTS,
            previousAccountId
          );

        const sourceSnapshot =
          await transaction.get(
            sourceRef
          );

        if (
          !sourceSnapshot.exists()
        ) {
          throw new Error(
            "The selected source account no longer exists."
          );
        }

        sourceAccount = {
          id:
            sourceSnapshot.id,

          ...sourceSnapshot.data(),
        };

        if (
          upper(
            sourceAccount.status
          ) === "CLOSED"
        ) {
          throw new Error(
            "The selected source account is already closed."
          );
        }

        if (
          clean(
            sourceAccount.investorId
          ) !==
          investorId
        ) {
          throw new Error(
            "The selected source account does not belong to this investor."
          );
        }

        sourceAccountNumber =
          sourceAccount.accountNumber ||
          null;

        const balances =
          getAccountBalances(
            sourceAccount
          );

        const sourceAmountBalance =
          balances.amountBalance;

        const sourceGoldBalance =
          balances.goldBalance;

        const sourceIsGold =
          isGoldAccount(
            sourceAccount
          );

        // ------------------------------------------------------
        // CASH → CASH
        // ------------------------------------------------------

        if (
          !sourceIsGold &&
          !destinationIsGold
        ) {
          transferAmount =
            sourceAmountBalance;
        }

        // ------------------------------------------------------
        // GOLD → GOLD
        // ------------------------------------------------------

        else if (
          sourceIsGold &&
          destinationIsGold
        ) {
          transferGoldGrams =
            sourceGoldBalance;
        }

        // ------------------------------------------------------
        // CASH → GOLD
        // ------------------------------------------------------

        else if (
          !sourceIsGold &&
          destinationIsGold
        ) {
          normalizedTransferGoldPrice =
            Number(
              transferGoldPrice
            );

          if (
            !Number.isFinite(
              normalizedTransferGoldPrice
            ) ||
            normalizedTransferGoldPrice <= 0
          ) {
            throw new Error(
              "Today's gold price is required for this inter-scheme transfer."
            );
          }

          transferGoldGrams =
            sourceAmountBalance /
            normalizedTransferGoldPrice;
        }

        // ------------------------------------------------------
        // GOLD → CASH
        // ------------------------------------------------------

        else {
          normalizedTransferGoldPrice =
            Number(
              transferGoldPrice
            );

          if (
            !Number.isFinite(
              normalizedTransferGoldPrice
            ) ||
            normalizedTransferGoldPrice <= 0
          ) {
            throw new Error(
              "Today's gold price is required for this inter-scheme transfer."
            );
          }

          transferAmount =
            sourceGoldBalance *
            normalizedTransferGoldPrice;
        }

        if (
          !Number.isFinite(
            transferAmount
          ) ||
          transferAmount < 0
        ) {
          throw new Error(
            "Invalid transfer amount calculated."
          );
        }

        if (
          !Number.isFinite(
            transferGoldGrams
          ) ||
          transferGoldGrams < 0
        ) {
          throw new Error(
            "Invalid transfer gold quantity calculated."
          );
        }
      }

      // ========================================================
      // RECEIPT ALLOCATION
      // ========================================================
      //
      // IMPORTANT:
      //
      // Firestore transactions require:
      //
      //     ALL READS
      //          ↓
      //     CALCULATIONS
      //          ↓
      //     ALL WRITES
      //
      // Do NOT call allocateInvestmentReceipt() twice here.
      // That helper performs a transaction.get() followed by
      // a transaction.set(). Calling it a second time would
      // attempt another READ after the first WRITE.
      //
      // Instead:
      //
      // 1. Read the global receipt sequence once.
      // 2. Calculate all required receipt numbers in memory.
      // 3. Write the increment once.
      //
      // This keeps the entire carry-forward operation atomic.
      // ========================================================

      const receiptCount =
        Number(Boolean(transactionInput)) +
        Number(Boolean(transferTransactionRef));

      let firstReceiptNumber = null;
      let firstReceiptSequence = null;

      let transferReceiptNumber = null;
      let transferReceiptSequence = null;

      if (receiptCount > 0) {
        // ------------------------------------------------------
        // READ — this is the ONLY receipt-sequence read.
        // ------------------------------------------------------

        const receiptSnapshot =
          await transaction.get(
            receiptSequenceRef
          );

        const nextReceiptSequence =
          Number(
            receiptSnapshot.exists()
              ? receiptSnapshot.data()?.nextSequence ?? 1
              : 1
          );

        if (
          !Number.isInteger(
            nextReceiptSequence
          ) ||
          nextReceiptSequence < 1
        ) {
          throw new Error(
            "Invalid receipt number sequence."
          );
        }

        // ------------------------------------------------------
        // CALCULATE — no Firestore reads/writes here.
        // ------------------------------------------------------

        let receiptOffset = 0;

        if (transactionInput) {
          firstReceiptSequence =
            nextReceiptSequence + receiptOffset;

          firstReceiptNumber =
            `RCP-${new Date().getFullYear()}-${String(
              firstReceiptSequence
            ).padStart(6, "0")}`;

          receiptOffset += 1;
        }

        if (transferTransactionRef) {
          transferReceiptSequence =
            nextReceiptSequence + receiptOffset;

          transferReceiptNumber =
            `RCP-${new Date().getFullYear()}-${String(
              transferReceiptSequence
            ).padStart(6, "0")}`;

          receiptOffset += 1;
        }

        // ------------------------------------------------------
        // WRITE — exactly one receipt-sequence write.
        // ------------------------------------------------------

        transaction.set(
          receiptSequenceRef,
          {
            nextSequence:
              nextReceiptSequence +
              receiptCount,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      }

      // ========================================================
      // OPENING BALANCE
      // ========================================================

      /*
       * Transfer balance is opening balance only.
       *
       * It does NOT increase:
       *
       * totalPaid
       * totalGoldCredited
       *
       * This prevents double counting.
       */

      const finalOpeningAmount =
        toNumber(
          openingBalanceAmount
        ) +
        transferAmount;

      const finalOpeningGold =
        toNumber(
          openingBalanceGoldGrams
        ) +
        transferGoldGrams;

      // ========================================================
      // INITIAL TOTALS
      // ========================================================

      const initialAmount =
        transactionInput
          ? transactionInput.amountPaid
          : 0;

      const initialGold =
        transactionInput
          ? transactionInput.goldGrams
          : 0;

      // ========================================================
      // INTEREST START DATE
      // ========================================================

      const interestStartDate =
        transactionInput?.date ||
        normalizedStartDate;

      // ========================================================
      // INVESTOR SUMMARY
      // ========================================================

      const investor =
        investorSnapshot.data();

      const summary =
        normalizeAccountSummary(
          investor.accountSummary
        );

      const nextSummary = {
        totalAccounts:
          summary.totalAccounts +
          1,

        activeAccounts:
          summary.activeAccounts +
          1,

        closedAccounts:
          summary.closedAccounts,

        activeAccountNumbers: [
          ...summary.activeAccountNumbers,
          accountNumber,
        ],

        closedAccountNumbers: [
          ...summary.closedAccountNumbers,
        ],
      };

      // ========================================================
      // TRANSFER SUMMARY
      // ========================================================

      if (
        sourceAccount
      ) {
        const sourceNumber =
          sourceAccountNumber;

        nextSummary.activeAccounts =
          Math.max(
            0,
            nextSummary.activeAccounts -
              1
          );

        nextSummary.closedAccounts +=
          1;

        nextSummary.activeAccountNumbers =
          nextSummary.activeAccountNumbers.filter(
            (number) =>
              number !==
              sourceNumber
          );

        if (
          sourceNumber &&
          !nextSummary.closedAccountNumbers.includes(
            sourceNumber
          )
        ) {
          nextSummary.closedAccountNumbers.push(
            sourceNumber
          );
        }
      }

      // ========================================================
      // ACCOUNT DATA
      // ========================================================

      const accountData = {
        // ------------------------------------------------------
        // IDENTITY
        // ------------------------------------------------------

        investorId,

        schemeId:
          currentScheme.id,

        accountNumber,

        accountSequence:
          sequence,

        // ------------------------------------------------------
        // CONTRIBUTION
        // ------------------------------------------------------

        contribution: {
          unit:
            destinationIsGold
              ? "GOLD_GRAMS"
              : "AMOUNT",

          value:
            contribution,
        },

        monthlyAmount:
          destinationIsGold
            ? null
            : contribution,

        monthlyGoldGrams:
          destinationIsGold
            ? contribution
            : null,

        // ------------------------------------------------------
        // MINIMUM RESTRICTION
        // ------------------------------------------------------

        minimumRestriction: {
          enabled:
            Boolean(
              minimumRestrictionEnabled
            ),

          unit:
            destinationIsGold
              ? "GOLD_GRAMS"
              : "AMOUNT",

          schemeMinimum:
            minimum,
        },

        // ------------------------------------------------------
        // OPENING BALANCE
        // ------------------------------------------------------

        openingBalanceAmount:
          finalOpeningAmount,

        openingBalanceGoldGrams:
          finalOpeningGold,

        // ------------------------------------------------------
        // ORIGIN
        // ------------------------------------------------------

        accountOrigin:
          normalizedOrigin,

        previousAccountId:
          previousAccountId ||
          null,

        // ------------------------------------------------------
        // DATES
        // ------------------------------------------------------

        startDate:
          normalizedStartDate,

        interestStartDate,

        // ------------------------------------------------------
        // SCHEME SNAPSHOT
        // ------------------------------------------------------

        schemeSnapshot: {
          schemeCode:
            currentScheme
              .schemeCode || "",

          schemeName:
            currentScheme
              .schemeName || "",

          schemeType:
            currentScheme
              .schemeType || "",

          durationMonths:
            Number(
              currentScheme
                .durationMonths || 0
            ),

          paymentFrequency:
            currentScheme
              .paymentFrequency ||
            "MONTHLY",

          installmentConfig:
            currentScheme
              .installmentConfig ||
            {},

          benefitConfig:
            currentScheme
              .benefitConfig ||
            {},

          interestConfig:
            currentScheme
              .interestConfig ||
            {},

          calculationStrategyId:
            currentScheme
              .calculationStrategyId ||
            "",

          calculationVersion:
            Number(
              currentScheme
                .calculationVersion ||
                1
            ),
        },

        // ------------------------------------------------------
        // STATUS
        // ------------------------------------------------------

        status:
          "ACTIVE",

        // ------------------------------------------------------
        // ACCOUNT TOTALS
        // ------------------------------------------------------

        /*
         * ONLY actual transactions.
         *
         * Transfer is NOT included.
         */

        totalPaid:
          destinationIsGold
            ? 0
            : initialAmount,

        totalInterest:
          0,

        totalGoldCredited:
          destinationIsGold
            ? initialGold
            : 0,

        // ------------------------------------------------------
        // INITIAL TRANSACTION REFERENCE
        // ------------------------------------------------------

        firstTransactionId:
          firstTransactionRef?.id ||
          null,

        firstReceiptNumber:
          firstReceiptNumber ||
          null,

        // ------------------------------------------------------
        // TRANSFER REFERENCE
        // ------------------------------------------------------

        transferTransactionId:
          transferTransactionRef?.id ||
          null,

        transferReceiptNumber:
          transferReceiptNumber ||
          null,

        transferGoldPrice:
          normalizedTransferGoldPrice,

        // ------------------------------------------------------
        // AUDIT METADATA
        // ------------------------------------------------------

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

        updatedByUid:
          actor.uid,

        updatedByEmail:
          actor.email,

        updatedByName:
          actor.name,
      };

      // ========================================================
      // CREATE DESTINATION ACCOUNT
      // ========================================================

      transaction.set(
        accountRef,
        accountData
      );

      // ========================================================
      // INITIAL TRANSACTION
      // ========================================================

      if (
        firstTransactionRef &&
        transactionInput
      ) {
        transaction.set(
          firstTransactionRef,
          {
            // --------------------------------------------------
            // IDENTITY
            // --------------------------------------------------

            investorId,

            accountId:
              accountRef.id,

            schemeId:
              currentScheme.id,

            accountNumber,

            // --------------------------------------------------
            // CLASSIFICATION
            // --------------------------------------------------

            type:
              transactionInput.transactionType ||
              "CREDIT",

            transactionCategory:
              "INITIAL",

            direction:
              "CREDIT",

            unit:
              destinationIsGold
                ? "AMOUNT_AND_GOLD"
                : "AMOUNT",

            // --------------------------------------------------
            // INSTALLMENT
            // --------------------------------------------------

            transactionMonth:
              "M1",

            transactionMonthNumber:
              1,

            isInitialTransaction:
              true,

            isTransfer:
              false,

            countsTowardInstallment:
              true,

            // --------------------------------------------------
            // VALUES
            // --------------------------------------------------

            amount:
              transactionInput.amountPaid,

            amountPaid:
              transactionInput.amountPaid,

            goldPrice:
              transactionInput.goldPrice,

            goldGrams:
              transactionInput.goldGrams,

            // --------------------------------------------------
            // DATE
            // --------------------------------------------------

            transactionDate:
              transactionInput.date,

            // --------------------------------------------------
            // RECEIPT
            // --------------------------------------------------

            receiptNumber:
              firstReceiptNumber,

            receiptSequence:
              firstReceiptSequence,

            // --------------------------------------------------
            // PAYMENT
            // --------------------------------------------------

            paymentMode:
              transactionInput.paymentMode,

            transactionMode:
              transactionInput.paymentMode,

            transactionReference:
              transactionInput.transactionReference,

            // --------------------------------------------------
            // SOURCE
            // --------------------------------------------------

            source:
              "ACCOUNT_CREATION",

            // --------------------------------------------------
            // SECURITY
            // --------------------------------------------------

            passcodeVerified:
              true,

            // Never store plaintext passcode.
            passcode:
              null,

            immutable:
              true,

            version:
              1,

            // --------------------------------------------------
            // ACTOR
            // --------------------------------------------------

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
          }
        );
      }

      // ========================================================
      // TRANSFER TRANSACTION
      // ========================================================

      if (
        transferTransactionRef &&
        sourceAccount
      ) {
        transaction.set(
          transferTransactionRef,
          {
            // --------------------------------------------------
            // IDENTITY
            // --------------------------------------------------

            investorId,

            accountId:
              accountRef.id,

            schemeId:
              currentScheme.id,

            accountNumber,

            // --------------------------------------------------
            // CLASSIFICATION
            // --------------------------------------------------

            type:
              "TRANSFER",

            transactionCategory:
              "TRANSFER",

            direction:
              "CREDIT",

            unit:
              destinationIsGold
                ? "GOLD_GRAMS"
                : "AMOUNT",

            // --------------------------------------------------
            // IMPORTANT
            //
            // Transfer is NOT M1.
            // It is NOT an installment.
            // --------------------------------------------------

            transactionMonth:
              null,

            transactionMonthNumber:
              null,

            isInitialTransaction:
              false,

            isTransfer:
              true,

            countsTowardInstallment:
              false,

            // --------------------------------------------------
            // VALUES
            // --------------------------------------------------

            amountPaid:
              destinationIsGold
                ? 0
                : transferAmount,

            amount:
              destinationIsGold
                ? 0
                : transferAmount,

            goldGrams:
              destinationIsGold
                ? transferGoldGrams
                : 0,

            goldPrice:
              normalizedTransferGoldPrice,

            // --------------------------------------------------
            // DATE
            // --------------------------------------------------

            transactionDate:
              normalizedStartDate,

            // --------------------------------------------------
            // RECEIPT
            // --------------------------------------------------

            receiptNumber:
              transferReceiptNumber,

            receiptSequence:
              transferReceiptSequence,

            // --------------------------------------------------
            // PAYMENT
            // --------------------------------------------------

            paymentMode:
              "TRANSFER",

            transactionMode:
              "TRANSFER",

            transactionReference:
              null,

            // --------------------------------------------------
            // SOURCE
            // --------------------------------------------------

            source:
              "ACCOUNT_TRANSFER",

            previousAccountId,

            previousAccountNumber:
              sourceAccountNumber,

            // --------------------------------------------------
            // SECURITY
            // --------------------------------------------------

            passcodeVerified:
              true,

            passcode:
              null,

            immutable:
              true,

            version:
              1,

            // --------------------------------------------------
            // ACTOR
            // --------------------------------------------------

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
          }
        );

        // ======================================================
        // CLOSE SOURCE ACCOUNT
        // ======================================================

        transaction.update(
          doc(
            db,
            ACCOUNTS,
            previousAccountId
          ),
          {
            status:
              "CLOSED",

            closedAt:
              serverTimestamp(),

            closureReason:
              "TRANSFERRED_TO_NEW_ACCOUNT",

            transferredToAccountId:
              accountRef.id,

            transferredToAccountNumber:
              accountNumber,

            closedByUid:
              actor.uid,

            closedByEmail:
              actor.email,

            closedByName:
              actor.name,

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
      }

      // ========================================================
      // UPDATE INVESTOR SUMMARY
      // ========================================================

      transaction.update(
        investorRef,
        {
          accountSummary:
            nextSummary,

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
      // INCREMENT ACCOUNT NUMBER
      // ========================================================

      transaction.update(
        schemeRef,
        {
          nextAccountNumber:
            sequence + 1,

          updatedAt:
            serverTimestamp(),
        }
      );

      // ========================================================
      // RESULT
      // ========================================================

      return {
        id:
          accountRef.id,

        investorId,

        schemeId:
          currentScheme.id,

        accountNumber,

        accountSequence:
          sequence,

        contributionValue:
          contribution,

        contributionUnit:
          destinationIsGold
            ? "GOLD_GRAMS"
            : "AMOUNT",

        startDate:
          normalizedStartDate,

        interestStartDate,

        status:
          "ACTIVE",

        minimumRestrictionEnabled:
          Boolean(
            minimumRestrictionEnabled
          ),

        initialTransactionAdded:
          Boolean(
            transactionInput
          ),

        initialTransactionId:
          firstTransactionRef?.id ||
          null,

        initialReceiptNumber:
          firstReceiptNumber,

        transferTransactionId:
          transferTransactionRef?.id ||
          null,

        transferReceiptNumber:
          transferReceiptNumber,

        transferGoldPrice:
          normalizedTransferGoldPrice,

        transferAmount,

        transferGoldGrams,

        openingBalanceAmount:
          finalOpeningAmount,

        openingBalanceGoldGrams:
          finalOpeningGold,

        accountSummary:
          nextSummary,
      };
    }
  );
}

// ============================================================
// CLOSE INVESTMENT ACCOUNT
// ============================================================

export async function closeInvestmentAccount(
  accountId,
  passcode,
  reason = "ACCOUNT_CLOSED"
) {
  if (!accountId) {
    throw new Error(
      "Investment account is required."
    );
  }

  const securityPasscode =
    clean(passcode);

  if (!securityPasscode) {
    throw new Error(
      "Transaction passcode is required to close the account."
    );
  }

  /*
   * REAL verification.
   *
   * The plaintext passcode is never stored.
   */
  await requireCrmPasscode(
    securityPasscode
  );

  const db =
    getCrmFirestore();

  const auth =
    getCrmFirebaseAuth();

  const actor =
    auth?.currentUser || null;

  const accountRef =
    doc(
      db,
      ACCOUNTS,
      accountId
    );

  return runTransaction(
    db,
    async (transaction) => {
      // ========================================================
      // READ ACCOUNT
      // ========================================================

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
          "This investment account is already closed."
        );
      }

      // ========================================================
      // UPDATE ACCOUNT
      // ========================================================

      transaction.update(
        accountRef,
        {
          status:
            "CLOSED",

          closedAt:
            serverTimestamp(),

          closureReason:
            clean(reason) ||
            "ACCOUNT_CLOSED",

          closedByUid:
            actor?.uid ||
            null,

          closedByEmail:
            actor?.email ||
            null,

          closedByName:
            actor?.displayName ||
            null,

          updatedAt:
            serverTimestamp(),

          updatedByUid:
            actor?.uid ||
            null,

          updatedByEmail:
            actor?.email ||
            null,

          updatedByName:
            actor?.displayName ||
            null,

          /*
           * This indicates that the operation passed
           * the passcode verification step.
           *
           * Plaintext passcode is NEVER stored.
           */
          passcodeVerified:
            true,
        }
      );

      return {
        id:
          accountId,

        investorId:
          account.investorId ||
          null,

        accountNumber:
          account.accountNumber ||
          null,

        status:
          "CLOSED",

        closureReason:
          clean(reason) ||
          "ACCOUNT_CLOSED",
      };
    }
  );
}