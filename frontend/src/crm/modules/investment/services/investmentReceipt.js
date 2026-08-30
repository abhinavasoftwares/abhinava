import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  getCrmFirestore,
} from "../../../firebase";

const RECEIPT_SETTINGS_PATH =
  "investmentSettings/receiptNumberSequence";

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_RECEIPT_CONFIG = {
  prefix: "RCP",
  separator: "-",
  yearEnabled: true,
  yearDigits: 4,
  sequencePadding: 6,
  nextSequence: 1,
};

// ============================================================
// HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeConfig(data = {}) {
  const prefix =
    clean(data.prefix)
      .toUpperCase() ||
    DEFAULT_RECEIPT_CONFIG.prefix;

  const separator =
    data.separator !== undefined
      ? String(data.separator)
      : DEFAULT_RECEIPT_CONFIG.separator;

  const yearEnabled =
    data.yearEnabled !== undefined
      ? Boolean(data.yearEnabled)
      : DEFAULT_RECEIPT_CONFIG.yearEnabled;

  const yearDigits =
    Number.isInteger(
      Number(data.yearDigits)
    ) &&
    Number(data.yearDigits) >= 2 &&
    Number(data.yearDigits) <= 4
      ? Number(data.yearDigits)
      : DEFAULT_RECEIPT_CONFIG.yearDigits;

  const sequencePadding =
    Number.isInteger(
      Number(data.sequencePadding)
    ) &&
    Number(data.sequencePadding) >= 1 &&
    Number(data.sequencePadding) <= 12
      ? Number(data.sequencePadding)
      : DEFAULT_RECEIPT_CONFIG.sequencePadding;

  const nextSequence =
    Number.isInteger(
      Number(data.nextSequence)
    ) &&
    Number(data.nextSequence) >= 1
      ? Number(data.nextSequence)
      : DEFAULT_RECEIPT_CONFIG.nextSequence;

  return {
    prefix,
    separator,
    yearEnabled,
    yearDigits,
    sequencePadding,
    nextSequence,
  };
}

// ============================================================
// GET CONFIGURATION
// ============================================================

export async function getInvestmentReceiptConfig() {
  const db =
    getCrmFirestore();

  const reference =
    doc(
      db,
      RECEIPT_SETTINGS_PATH
    );

  const snapshot =
    await getDoc(
      reference
    );

  if (!snapshot.exists()) {
    return {
      ...DEFAULT_RECEIPT_CONFIG,
    };
  }

  return normalizeConfig(
    snapshot.data()
  );
}

// ============================================================
// FORMAT RECEIPT NUMBER
// ============================================================

export function formatInvestmentReceiptNumber(
  config,
  sequence,
  date = new Date()
) {
  const normalized =
    normalizeConfig(config);

  const sequencePart =
    String(sequence).padStart(
      normalized.sequencePadding,
      "0"
    );

  const parts = [
    normalized.prefix,
  ];

  if (
    normalized.yearEnabled
  ) {
    parts.push(
      String(
        date.getFullYear()
      ).padStart(
        normalized.yearDigits,
        "0"
      )
    );
  }

  parts.push(
    sequencePart
  );

  return parts.join(
    normalized.separator
  );
}

// ============================================================
// ALLOCATE RECEIPT INSIDE AN EXISTING FIRESTORE TRANSACTION
// ============================================================
//
// IMPORTANT:
//
// This function does NOT create its own Firestore transaction.
//
// It participates in the caller's existing transaction.
//
// Therefore:
//
// Account creation
//       +
// Initial transaction
//       +
// Transfer transaction
//       +
// Receipt sequence
//
// can all commit atomically.
//
// ============================================================

export async function allocateInvestmentReceipt(
  transaction,
  receiptSequenceRef,
  transactionDate = null
) {
  if (!transaction) {
    throw new Error(
      "Firestore transaction is required for receipt allocation."
    );
  }

  if (!receiptSequenceRef) {
    throw new Error(
      "Receipt sequence reference is required."
    );
  }

  const snapshot =
    await transaction.get(
      receiptSequenceRef
    );

  const config =
    snapshot.exists()
      ? normalizeConfig(
          snapshot.data()
        )
      : normalizeConfig();

  const sequence =
    config.nextSequence;

  const date =
    transactionDate
      ? new Date(
          `${transactionDate}T00:00:00`
        )
      : new Date();

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      "Invalid receipt transaction date."
    );
  }

  const receiptNumber =
    formatInvestmentReceiptNumber(
      config,
      sequence,
      date
    );

  transaction.set(
    receiptSequenceRef,
    {
      prefix:
        config.prefix,

      separator:
        config.separator,

      yearEnabled:
        config.yearEnabled,

      yearDigits:
        config.yearDigits,

      sequencePadding:
        config.sequencePadding,

      nextSequence:
        sequence + 1,

      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return {
    receiptNumber,
    receiptSequence:
      sequence,
  };
}

// ============================================================
// LEGACY / STANDALONE RECEIPT GENERATION
// ============================================================
//
// Keep this for places that genuinely need to allocate a receipt
// outside an existing transaction.
//
// Account and transaction creation should use
// allocateInvestmentReceipt() instead.
//
// ============================================================

export async function generateInvestmentReceiptNumber(
  transactionDate = null
) {
  const db =
    getCrmFirestore();

  const reference =
    doc(
      db,
      RECEIPT_SETTINGS_PATH
    );

  return runTransaction(
    db,
    async (
      transaction
    ) => {
      return allocateInvestmentReceipt(
        transaction,
        reference,
        transactionDate
      );
    }
  );
}

// ============================================================
// PREVIEW
// ============================================================

export function previewInvestmentReceiptNumber(
  config = {},
  sequence = 1,
  date = new Date()
) {
  return formatInvestmentReceiptNumber(
    config,
    sequence,
    date
  );
}

// ============================================================
// UPDATE CONFIGURATION
// ============================================================
//
// Changing the format NEVER resets nextSequence.
//
// ============================================================

export async function updateInvestmentReceiptConfig(
  updates = {}
) {
  const db =
    getCrmFirestore();

  const reference =
    doc(
      db,
      RECEIPT_SETTINGS_PATH
    );

  return runTransaction(
    db,
    async (
      transaction
    ) => {
      const snapshot =
        await transaction.get(
          reference
        );

      const existing =
        snapshot.exists()
          ? normalizeConfig(
              snapshot.data()
            )
          : normalizeConfig();

      const nextConfig =
        normalizeConfig({
          ...existing,
          ...updates,

          // Never reset sequence.
          nextSequence:
            existing.nextSequence,
        });

      transaction.set(
        reference,
        {
          prefix:
            nextConfig.prefix,

          separator:
            nextConfig.separator,

          yearEnabled:
            nextConfig.yearEnabled,

          yearDigits:
            nextConfig.yearDigits,

          sequencePadding:
            nextConfig.sequencePadding,

          nextSequence:
            existing.nextSequence,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return nextConfig;
    }
  );
}