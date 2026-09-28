import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import {
  getCrmFirebaseAuth,
  getCrmFirestore,
} from "../../../firebase";

import {
  createInvestmentAuditLog,
} from "./investmentAudit";

const COMMUNICATIONS_COLLECTION =
  "investmentCommunications";

const AUDIT_COLLECTION =
  "investmentAuditLogs";

const CHANNELS = [
  "EMAIL",
  "WHATSAPP",
  "SMS",
];

const COMMUNICATION_STATUS = [
  "PENDING",
  "SENT",
  "FAILED",
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

function getActor() {
  let auth = null;

  try {
    auth = getCrmFirebaseAuth();
  } catch {
    auth = null;
  }

  const user = auth?.currentUser;

  return {
    uid: user?.uid || null,
    email: user?.email || null,
    name: user?.displayName || null,
  };
}

function getDb() {
  return getCrmFirestore();
}

// ============================================================
// CREATE COMMUNICATION RECORD
// ============================================================

export async function createInvestmentCommunication({
  investorId,
  accountId,
  channel,
  subject = "",
  templateId = null,
  messageReference = null,
  status = "PENDING",
  providerMessageId = null,
  recipient = null,
  metadata = {},
} = {}) {
  if (!investorId) {
    throw new Error(
      "Investor is required."
    );
  }

  // ----------------------------------------------------------
  // ACCOUNT IS MANDATORY
  // ----------------------------------------------------------

  if (!accountId) {
    throw new Error(
      "Investment account must be selected before sending a communication."
    );
  }

  const normalizedChannel =
    upper(channel);

  if (
    !CHANNELS.includes(
      normalizedChannel
    )
  ) {
    throw new Error(
      "Invalid communication channel."
    );
  }

  const normalizedStatus =
    upper(status);

  if (
    !COMMUNICATION_STATUS.includes(
      normalizedStatus
    )
  ) {
    throw new Error(
      "Invalid communication status."
    );
  }

  const db = getDb();

  // ----------------------------------------------------------
  // INVESTOR
  // ----------------------------------------------------------

  const investorRef = doc(
    db,
    "investmentInvestors",
    investorId
  );

  const investorSnapshot =
    await getDoc(investorRef);

  if (!investorSnapshot.exists()) {
    throw new Error(
      "Investor not found."
    );
  }

  // ----------------------------------------------------------
  // ACCOUNT
  // ----------------------------------------------------------

  const accountRef = doc(
    db,
    "investmentAccounts",
    accountId
  );

  const accountSnapshot =
    await getDoc(accountRef);

  if (!accountSnapshot.exists()) {
    throw new Error(
      "Investment account not found."
    );
  }

  const account =
    accountSnapshot.data();

  if (
    account?.investorId !==
    investorId
  ) {
    throw new Error(
      "The selected account does not belong to this investor."
    );
  }

  const actor = getActor();

  // ----------------------------------------------------------
  // CREATE IMMUTABLE COMMUNICATION RECORD
  // ----------------------------------------------------------

  const reference =
    await addDoc(
      collection(
        db,
        COMMUNICATIONS_COLLECTION
      ),
      {
        investorId,

        accountId,

        accountNumber:
          account?.accountNumber ||
          null,

        schemeId:
          account?.schemeId ||
          null,

        schemeName:
          account?.schemeSnapshot
            ?.schemeName ||
          null,

        channel:
          normalizedChannel,

        subject:
          clean(subject),

        templateId:
          clean(templateId) ||
          null,

        messageReference:
          clean(messageReference) ||
          null,

        status:
          normalizedStatus,

        providerMessageId:
          clean(
            providerMessageId
          ) || null,

        recipient:
          clean(recipient) ||
          null,

        metadata:
          metadata || {},

        sentAt:
          normalizedStatus ===
          "SENT"
            ? serverTimestamp()
            : null,

        createdAt:
          serverTimestamp(),

        createdByUid:
          actor.uid,

        createdByEmail:
          actor.email,

        createdByName:
          actor.name,

        immutable: true,

        version: 1,
      }
    );

  // ----------------------------------------------------------
  // AUDIT
  // ----------------------------------------------------------

  await createInvestmentAuditLog({
    action:
      "INVESTMENT_COMMUNICATION_RECORDED",

    entityType:
      "INVESTMENT_COMMUNICATION",

    entityId:
      reference.id,

    description:
      `Investment communication was recorded for investor ${investorId}, account ${accountId}.`,

    metadata: {
      investorId,

      accountId,

      accountNumber:
        account?.accountNumber ||
        null,

      channel:
        normalizedChannel,

      subject:
        clean(subject),

      status:
        normalizedStatus,

      templateId:
        clean(templateId) ||
        null,

      providerMessageId:
        clean(
          providerMessageId
        ) || null,

      createdByUid:
        actor.uid,

      createdByEmail:
        actor.email,

      createdByName:
        actor.name,
    },
  });

  return {
    id:
      reference.id,

    investorId,

    accountId,

    accountNumber:
      account?.accountNumber ||
      null,

    schemeId:
      account?.schemeId ||
      null,

    schemeName:
      account?.schemeSnapshot
        ?.schemeName ||
      null,

    channel:
      normalizedChannel,

    subject:
      clean(subject),

    templateId:
      clean(templateId) ||
      null,

    messageReference:
      clean(messageReference) ||
      null,

    status:
      normalizedStatus,

    providerMessageId:
      clean(
        providerMessageId
      ) || null,

    recipient:
      clean(recipient) ||
      null,

    immutable: true,

    version: 1,
  };
}

// ============================================================
// GET INVESTOR COMMUNICATIONS
// ============================================================

export async function getInvestmentCommunications(
  investorId
) {
  if (!investorId) {
    throw new Error(
      "Investor ID is required."
    );
  }

  const db = getDb();

  /*
   * Use createdAt for history ordering.
   *
   * sentAt can legitimately be null for PENDING/FAILED
   * records, whereas every communication record has
   * createdAt.
   */
  const reference = query(
    collection(
      db,
      COMMUNICATIONS_COLLECTION
    ),
    where(
      "investorId",
      "==",
      investorId
    ),
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
// GET ACCOUNT COMMUNICATIONS
// ============================================================

export async function getInvestmentAccountCommunications(
  accountId
) {
  if (!accountId) {
    throw new Error(
      "Account ID is required."
    );
  }

  const db = getDb();

  const reference = query(
    collection(
      db,
      COMMUNICATIONS_COLLECTION
    ),
    where(
      "accountId",
      "==",
      accountId
    ),
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
// GET INVESTOR AUDIT HISTORY
// ============================================================

export async function getInvestmentInvestorAuditHistory(
  investorId
) {
  if (!investorId) {
    throw new Error(
      "Investor ID is required."
    );
  }

  const db = getDb();

  const reference = query(
    collection(
      db,
      AUDIT_COLLECTION
    ),
    where(
      "metadata.investorId",
      "==",
      investorId
    ),
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
// GET ACCOUNT AUDIT HISTORY
// ============================================================

export async function getInvestmentAccountAuditHistory(
  accountId
) {
  if (!accountId) {
    throw new Error(
      "Account ID is required."
    );
  }

  const db = getDb();

  const reference = query(
    collection(
      db,
      AUDIT_COLLECTION
    ),
    where(
      "metadata.accountId",
      "==",
      accountId
    ),
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