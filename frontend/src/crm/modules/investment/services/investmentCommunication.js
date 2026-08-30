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

function getDb() {
  return getCrmFirestore();
}

// ============================================================
// CREATE COMMUNICATION RECORD
// ============================================================

/*
 * This service records investment-related communication.
 *
 * It does NOT actually send Email / WhatsApp / SMS.
 *
 * Sending will be handled later by the communication provider
 * layer.
 *
 * Example:
 *
 * {
 *   investorId,
 *   accountId,
 *   channel: "EMAIL",
 *   subject: "Investment Payment Reminder",
 *   templateId: "PAYMENT_REMINDER",
 *   status: "SENT",
 *   providerMessageId: "..."
 * }
 */
export async function createInvestmentCommunication({
  investorId,
  accountId = null,
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

  const db =
    getDb();

  const investorRef =
    doc(
      db,
      "investmentInvestors",
      investorId
    );

  const investorSnapshot =
    await getDoc(
      investorRef
    );

  if (
    !investorSnapshot.exists()
  ) {
    throw new Error(
      "Investor not found."
    );
  }

  if (accountId) {
    const accountRef =
      doc(
        db,
        "investmentAccounts",
        accountId
      );

    const accountSnapshot =
      await getDoc(
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
      account.investorId !==
      investorId
    ) {
      throw new Error(
        "The selected account does not belong to this investor."
      );
    }
  }

  const actor =
    getActor();

  const reference =
    await addDoc(
      collection(
        db,
        COMMUNICATIONS_COLLECTION
      ),
      {
        investorId,

        accountId:
          accountId || null,

        channel:
          normalizedChannel,

        subject:
          clean(subject),

        templateId:
          clean(templateId) ||
          null,

        messageReference:
          clean(
            messageReference
          ) || null,

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

        /*
         * Communication records are historical records.
         * They should not be modified through the normal
         * investment UI.
         */
        immutable:
          true,

        version:
          1,
      }
    );

  await createInvestmentAuditLog({
    action:
      "INVESTMENT_COMMUNICATION_RECORDED",

    entityType:
      "INVESTMENT_COMMUNICATION",

    entityId:
      reference.id,

    description:
      `Investment communication was recorded for investor ${investorId}.`,

    metadata: {
      investorId,

      accountId:
        accountId || null,

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

    accountId:
      accountId || null,

    channel:
      normalizedChannel,

    subject:
      clean(subject),

    templateId:
      clean(templateId) ||
      null,

    messageReference:
      clean(
        messageReference
      ) || null,

    status:
      normalizedStatus,

    providerMessageId:
      clean(
        providerMessageId
      ) || null,

    recipient:
      clean(recipient) ||
      null,

    immutable:
      true,

    version:
      1,
  };
}

// ============================================================
// MARK COMMUNICATION AS SENT
// ============================================================

/*
 * IMPORTANT:
 *
 * This function is intentionally NOT exported.
 *
 * Communication history should be immutable from the
 * investment UI.
 *
 * Later, when we integrate an actual provider, the provider
 * service should write the final delivery status through a
 * controlled backend path.
 */

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

  const db =
    getDb();

  const reference =
    query(
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

  const db =
    getDb();

  const reference =
    query(
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

  const db =
    getDb();

  const reference =
    query(
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

  const db =
    getDb();

  const reference =
    query(
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