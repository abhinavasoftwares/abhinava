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

import {
  allocateInvestmentReceipts,
} from "./investmentReceipt";

const ACCOUNTS = "investmentAccounts";
const SCHEMES = "investmentSchemes";
const INVESTORS = "investmentInvestors";
const TRANSACTIONS = "transactions";

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
  investorId = null,
  investorData = null,
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

  if (!investorId && !investorData) {
    throw new Error(
      "Investor is required."
    );
  }

  if (!investorId && investorData) {
    const newInvestorName = clean(investorData.fullName);
    const newInvestorMobile = clean(investorData.mobileNumber).replace(/\D/g, "");

    if (!newInvestorName) {
      throw new Error("Investor name is required.");
    }

    if (!/^[0-9]{10}$/.test(newInvestorMobile)) {
      throw new Error("Enter a valid 10-digit mobile number.");
    }
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

  // For a new investor, generate the document ID now but DO NOT write it
  // until the same transaction that creates the account succeeds.
  // This makes investor + account creation atomic.
  const newInvestorRef =
    !investorId
      ? doc(collection(db, INVESTORS))
      : null;

  const effectiveInvestorId =
    investorId || newInvestorRef.id;

  const investorRef =
    investorId
      ? doc(db, INVESTORS, investorId)
      : newInvestorRef;

  const accountRef =
    doc(
      collection(
        db,
        ACCOUNTS
      )
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
        investorId
          ? await transaction.get(investorRef)
          : null;

      if (
        !schemeSnapshot.exists()
      ) {
        throw new Error(
          "Investment scheme no longer exists."
        );
      }

      if (
        investorId &&
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
      // All Investment receipts come from receiptSeries.
      //
      // A carry-forward can create two receipts in this same
      // Firestore transaction:
      //
      //   1. Initial/M1 transaction receipt (when supplied)
      //   2. Transfer receipt
      //
      // Allocate both in ONE allocator call so the receipt-series
      // document is read once and updated once.
      // ========================================================

      const receiptRequests = [];

      if (transactionInput) {
        receiptRequests.push({
          schemeId:
            currentScheme.id,

          transactionDate:
            transactionInput.date,

          key:
            "FIRST",
        });
      }

      if (transferTransactionRef) {
        receiptRequests.push({
          schemeId:
            currentScheme.id,

          transactionDate:
            normalizedStartDate,

          key:
            "TRANSFER",
        });
      }

      const allocatedReceipts =
        await allocateInvestmentReceipts(
          transaction,
          db,
          {
            receipts:
              receiptRequests,
          }
        );

      const firstReceipt =
        receiptRequests.some(
          (item) =>
            item.key === "FIRST"
        )
          ? allocatedReceipts[
              receiptRequests.findIndex(
                (item) =>
                  item.key === "FIRST"
              )
            ] || null
          : null;

      const transferReceipt =
        receiptRequests.some(
          (item) =>
            item.key === "TRANSFER"
        )
          ? allocatedReceipts[
              receiptRequests.findIndex(
                (item) =>
                  item.key === "TRANSFER"
              )
            ] || null
          : null;

      const firstReceiptNumber =
        firstReceipt?.receiptNumber ||
        null;

      const firstReceiptSequence =
        firstReceipt?.receiptSequence ??
        null;

      const transferReceiptNumber =
        transferReceipt?.receiptNumber ||
        null;

      const transferReceiptSequence =
        transferReceipt?.receiptSequence ??
        null;

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
        investorId
          ? investorSnapshot.data()
          : {
              accountSummary: {
                totalAccounts: 0,
                activeAccounts: 0,
                closedAccounts: 0,
              },
            };

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

        investorId: effectiveInvestorId,

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

        firstReceiptSeriesId:
          firstReceipt?.receiptSeriesId ||
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

        transferReceiptSeriesId:
          transferReceipt?.receiptSeriesId ||
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
      // CREATE / UPDATE INVESTOR
      // ========================================================
      // For a NEW investor this is the first write in the same
      // transaction as the account. If anything later fails,
      // Firestore rolls this write back automatically.
      // ========================================================

      if (!investorId) {
        const newInvestor = investorData || {};
        const newInvestorMobile = clean(newInvestor.mobileNumber).replace(/\D/g, "");
        const newInvestorAlternateMobile = clean(newInvestor.alternateMobileNumber).replace(/\D/g, "");
        const newInvestorEmail = clean(newInvestor.email).toLowerCase();
        const newInvestorCity = clean(newInvestor.city);
        const newInvestorName = clean(newInvestor.fullName);

        transaction.set(
          investorRef,
          {
            fullName: newInvestorName,
            fullNameLower: newInvestorName.toLowerCase(),
            mobileNumber: newInvestorMobile,
            mobileNumberSearch: newInvestorMobile,
            alternateMobileNumber: newInvestorAlternateMobile,
            alternateMobileNumberSearch: newInvestorAlternateMobile,
            email: newInvestorEmail,
            emailSearch: newInvestorEmail,
            dateOfBirth: clean(newInvestor.dateOfBirth),
            gender: clean(newInvestor.gender),
            address: clean(newInvestor.address),
            city: newInvestorCity,
            cityLower: newInvestorCity.toLowerCase(),
            pincode: clean(newInvestor.pincode),
            emailPreferences: newInvestor.emailPreferences || {
              enabled: false,
              language: "EN",
            },
            status: newInvestor.status || "ACTIVE",
            accountSummary: nextSummary,
            createdAt: serverTimestamp(),
            createdByUid: actor.uid,
            createdByEmail: actor.email,
            createdByName: actor.name,
            updatedAt: serverTimestamp(),
            updatedByUid: actor.uid,
            updatedByEmail: actor.email,
            updatedByName: actor.name,
          }
        );
      }

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

            investorId: effectiveInvestorId,

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

            receiptSeriesId:
              firstReceipt?.receiptSeriesId ||
              null,

            receiptSeriesName:
              firstReceipt?.receiptSeriesName ||
              null,

            receiptSeriesPrefix:
              firstReceipt?.receiptSeriesPrefix ||
              null,

            receiptSeriesPadding:
              firstReceipt?.receiptSeriesPadding ||
              null,

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

            investorId: effectiveInvestorId,

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

            receiptSeriesId:
              transferReceipt?.receiptSeriesId ||
              null,

            receiptSeriesName:
              transferReceipt?.receiptSeriesName ||
              null,

            receiptSeriesPrefix:
              transferReceipt?.receiptSeriesPrefix ||
              null,

            receiptSeriesPadding:
              transferReceipt?.receiptSeriesPadding ||
              null,

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

      if (investorId) {
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
      }

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

        investorId: effectiveInvestorId,

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