import {
  collection,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// ============================================================
// COLLECTIONS
// ============================================================

const RECEIPT_SERIES_COLLECTION = "receiptSeries";

// ============================================================
// HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
}

function toNumber(value, fallback = 0) {
  const result = Number(value);

  return Number.isFinite(result) ? result : fallback;
}

function padNumber(number, padding) {
  return String(number).padStart(padding, "0");
}

function normalizePrefix(prefix) {
  return clean(prefix);
}

function formatReceiptNumber(prefix, number, padding) {
  return `${normalizePrefix(prefix)}${padNumber(number, padding)}`;
}

function isActiveInvestmentSeries(series) {
  return (
    series?.status === "ACTIVE" &&
    Array.isArray(series?.modules) &&
    (
      series.modules.includes("INVESTMENTS") ||
      series.modules.includes("ALL")
    )
  );
}

function getApplicableSchemes(series) {
  return Array.isArray(series?.applicableSchemes)
    ? series.applicableSchemes.filter(Boolean)
    : [];
}

// ============================================================
// FIND RECEIPT SERIES
// ============================================================

/**
 * Receipt-series selection rules:
 *
 * 1. Active scheme-specific INVESTMENT series wins.
 *
 * 2. Otherwise use active overall INVESTMENT series.
 *
 * 3. If neither exists, transaction is rejected.
 *
 * This allows a client to configure:
 *
 * Overall:
 *   INV/00001
 *
 * Scheme-specific:
 *   GOLD/00001
 *
 * while keeping both within the same tenant Firebase.
 */
async function findInvestmentReceiptSeries(
  transaction,
  db,
  schemeId
) {
  const receiptSeriesRef = collection(
    db,
    RECEIPT_SERIES_COLLECTION
  );

  const snapshot = await getDocs(
  query(
    receiptSeriesRef,
    where("status", "==", "ACTIVE")
  )
);

  const series = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .filter(isActiveInvestmentSeries);

  if (!series.length) {
    throw new Error(
      "No active Investment Receipt Series is configured. Please configure Receipt Series in Settings before recording a transaction."
    );
  }

  const normalizedSchemeId = clean(schemeId);

  // ----------------------------------------------------------
  // 1. SCHEME-SPECIFIC SERIES
  // ----------------------------------------------------------

  if (normalizedSchemeId) {
    const schemeSeries = series.filter((item) => {
      const schemes = getApplicableSchemes(item);

      return (
        schemes.length > 0 &&
        schemes.includes(normalizedSchemeId)
      );
    });

    if (schemeSeries.length > 1) {
      throw new Error(
        `Multiple active receipt series are configured for investment scheme ${normalizedSchemeId}. Please keep only one scheme-specific investment receipt series active.`
      );
    }

    if (schemeSeries.length === 1) {
      return schemeSeries[0];
    }
  }

  // ----------------------------------------------------------
  // 2. OVERALL INVESTMENT SERIES
  // ----------------------------------------------------------

  const overallSeries = series.filter((item) => {
    const schemes = getApplicableSchemes(item);

    return schemes.length === 0;
  });

  if (overallSeries.length > 1) {
    throw new Error(
      "Multiple active overall Investment Receipt Series are configured. Please keep only one overall investment receipt series active."
    );
  }

  if (overallSeries.length === 1) {
    return overallSeries[0];
  }

  // ----------------------------------------------------------
  // 3. NO MATCH
  // ----------------------------------------------------------

  throw new Error(
    normalizedSchemeId
      ? "No active receipt series is configured for this investment scheme, and no overall Investment Receipt Series is configured."
      : "No overall Investment Receipt Series is configured."
  );
}

// ============================================================
// ALLOCATE RECEIPT
// ============================================================

/**
 * IMPORTANT:
 *
 * This function is called from the SAME Firestore
 * runTransaction() used to create the investment transaction.
 *
 * Therefore:
 *
 * receipt number reservation
 * +
 * transaction creation
 * +
 * account update
 *
 * remain atomic.
 *
 * The old global sequence:
 *
 * investmentSettings/receiptNumberSequence
 *
 * is intentionally NOT used anymore.
 */
/**
 * Allocate multiple Investment receipts atomically inside the caller's
 * existing Firestore transaction.
 *
 * `receipts` is an array of objects:
 *   { schemeId, transactionDate }
 *
 * All receipts in one call are allocated from the same resolved series.
 * This is used by account creation because a carry-forward can create
 * both an initial transaction receipt and a transfer receipt.
 */
export async function allocateInvestmentReceipts(
  transaction,
  db,
  {
    receipts = [],
  } = {}
) {
  if (!transaction) {
    throw new Error(
      "Firestore transaction is required for receipt allocation."
    );
  }

  if (!db) {
    throw new Error(
      "Firestore database instance is required for receipt allocation."
    );
  }

  if (!Array.isArray(receipts) || receipts.length === 0) {
    return [];
  }

  const firstRequest = receipts[0] || {};

  const series = await findInvestmentReceiptSeries(
    transaction,
    db,
    firstRequest.schemeId
  );

  // ----------------------------------------------------------
  // SERIES VALIDATION
  // ----------------------------------------------------------

  const prefix = normalizePrefix(
    series.prefix
  );

  const padding = Math.max(
    1,
    Math.trunc(
      toNumber(
        series.padding,
        5
      )
    )
  );

  const firstNumber = Math.trunc(
    toNumber(
      series.nextNumber,
      0
    )
  );

  if (firstNumber <= 0) {
    throw new Error(
      `Receipt series "${series.name || series.id}" has an invalid next receipt number.`
    );
  }

  // ----------------------------------------------------------
  // ALLOCATE CONSECUTIVE NUMBERS IN MEMORY
  // ----------------------------------------------------------

  const allocated = receipts.map(
    (item, index) => {
      const receiptSequence =
        firstNumber + index;

      return {
        receiptNumber:
          formatReceiptNumber(
            prefix,
            receiptSequence,
            padding
          ),

        receiptSequence,

        receiptSeriesId:
          series.id,

        receiptSeriesName:
          series.name || null,

        receiptSeriesPrefix:
          prefix,

        receiptSeriesPadding:
          padding,

        transactionDate:
          item?.transactionDate || null,

        schemeId:
          item?.schemeId || null,
      };
    }
  );

  // ----------------------------------------------------------
  // ONE SERIES UPDATE
  // ----------------------------------------------------------

  const seriesRef = doc(
    db,
    RECEIPT_SERIES_COLLECTION,
    series.id
  );

  transaction.update(
    seriesRef,
    {
      nextNumber:
        firstNumber + receipts.length,

      usageCount:
        toNumber(
          series.usageCount,
          0
        ) + receipts.length,

      updatedAt:
        serverTimestamp(),
    }
  );

  return allocated;
}

/**
 * Allocate one Investment receipt.
 *
 * Kept as the public single-receipt API so normal transaction creation
 * continues to use the same interface.
 */
export async function allocateInvestmentReceipt(
  transaction,
  db,
  {
    schemeId,
    transactionDate,
  } = {}
) {
  const receipts =
    await allocateInvestmentReceipts(
      transaction,
      db,
      {
        receipts: [
          {
            schemeId,
            transactionDate,
          },
        ],
      }
    );

  return receipts[0];
}
