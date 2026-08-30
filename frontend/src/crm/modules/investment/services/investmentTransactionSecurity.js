import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  getCrmFirebaseAuth,
  getCrmFirestore,
} from "../../../firebase";

import {
  createInvestmentAuditLog,
} from "./investmentAudit";

const SECURITY_COLLECTION =
  "crmSecurity";

const SECURITY_DOCUMENT =
  "transactionPasscode";

// ============================================================
// HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
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

function getSecurityRef(db) {
  return doc(
    db,
    SECURITY_COLLECTION,
    SECURITY_DOCUMENT
  );
}

// ============================================================
// HASHING
// ============================================================

/*
 * We use Web Crypto API.
 *
 * The plaintext passcode is NEVER stored in Firestore.
 *
 * SHA-256 is combined with a random salt.
 */

function arrayBufferToBase64(
  buffer
) {
  const bytes =
    new Uint8Array(buffer);

  let binary = "";

  bytes.forEach(
    (byte) => {
      binary += String.fromCharCode(
        byte
      );
    }
  );

  return btoa(binary);
}

function base64ToArrayBuffer(
  base64
) {
  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function generateSalt() {
  const bytes =
    new Uint8Array(16);

  crypto.getRandomValues(
    bytes
  );

  return arrayBufferToBase64(
    bytes.buffer
  );
}

async function hashPasscode(
  passcode,
  salt
) {
  const encoder =
    new TextEncoder();

  const data =
    encoder.encode(
      `${salt}:${passcode}`
    );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return arrayBufferToBase64(
    digest
  );
}

// ============================================================
// CONSTANT-TIME COMPARISON
// ============================================================

function secureCompare(
  first,
  second
) {
  if (
    typeof first !==
      "string" ||
    typeof second !==
      "string"
  ) {
    return false;
  }

  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  let result = 0;

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    result |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return result === 0;
}

// ============================================================
// SET / CHANGE PASSCODE
// ============================================================

export async function setTransactionPasscode(
  passcode
) {
  const value =
    clean(passcode);

  if (!value) {
    throw new Error(
      "Transaction passcode is required."
    );
  }

  /*
   * Keep the passcode reasonably strong.
   *
   * We intentionally don't force a specific format yet,
   * because this is a CRM-wide operational passcode.
   */
  if (
    value.length < 6
  ) {
    throw new Error(
      "Transaction passcode must contain at least 6 characters."
    );
  }

  if (
    value.length > 128
  ) {
    throw new Error(
      "Transaction passcode cannot exceed 128 characters."
    );
  }

  const db =
    getCrmFirestore();

  const reference =
    getSecurityRef(db);

  const actor =
    getActor();

  const existing =
    await getDoc(
      reference
    );

  const salt =
    generateSalt();

  const hash =
    await hashPasscode(
      value,
      salt
    );

  await setDoc(
    reference,
    {
      hash,

      salt,

      enabled:
        true,

      version:
        existing.exists()
          ? Number(
              existing.data()
                ?.version ?? 1
            ) + 1
          : 1,

      updatedAt:
        serverTimestamp(),

      updatedByUid:
        actor.uid,

      updatedByEmail:
        actor.email,

      updatedByName:
        actor.name,

      /*
       * We intentionally never store:
       *
       * passcode: value
       */
    },
    {
      merge: true,
    }
  );

  await createInvestmentAuditLog({
    action:
      existing.exists()
        ? "TRANSACTION_PASSCODE_CHANGED"
        : "TRANSACTION_PASSCODE_CREATED",

    entityType:
      "CRM_SECURITY",

    entityId:
      SECURITY_DOCUMENT,

    description:
      existing.exists()
        ? "CRM transaction passcode was changed."
        : "CRM transaction passcode was created.",

    metadata: {
      version:
        existing.exists()
          ? Number(
              existing.data()
                ?.version ?? 1
            ) + 1
          : 1,

      changedByUid:
        actor.uid,

      changedByEmail:
        actor.email,
    },
  });

  return {
    success:
      true,

    enabled:
      true,
  };
}

// ============================================================
// CHECK WHETHER PASSCODE IS CONFIGURED
// ============================================================

export async function isTransactionPasscodeConfigured() {
  const db =
    getCrmFirestore();

  const reference =
    getSecurityRef(db);

  const snapshot =
    await getDoc(
      reference
    );

  if (
    !snapshot.exists()
  ) {
    return false;
  }

  const data =
    snapshot.data();

  return Boolean(
    data?.enabled &&
      data?.hash &&
      data?.salt
  );
}

// ============================================================
// VERIFY TRANSACTION PASSCODE
// ============================================================

export async function verifyTransactionPasscode(
  passcode
) {
  const value =
    clean(passcode);

  if (!value) {
    throw new Error(
      "Transaction passcode is required."
    );
  }

  const db =
    getCrmFirestore();

  const reference =
    getSecurityRef(db);

  const snapshot =
    await getDoc(
      reference
    );

  if (
    !snapshot.exists()
  ) {
    throw new Error(
      "Transaction passcode has not been configured. Please configure it in CRM Security Settings."
    );
  }

  const security =
    snapshot.data();

  if (
    security?.enabled !==
    true
  ) {
    throw new Error(
      "Transaction passcode is currently disabled."
    );
  }

  if (
    !security?.hash ||
    !security?.salt
  ) {
    throw new Error(
      "Transaction passcode configuration is invalid."
    );
  }

  const calculatedHash =
    await hashPasscode(
      value,
      security.salt
    );

  const valid =
    secureCompare(
      calculatedHash,
      security.hash
    );

  if (!valid) {
    /*
     * Deliberately don't reveal whether the passcode,
     * salt, hash or configuration was wrong.
     */
    throw new Error(
      "Incorrect transaction passcode."
    );
  }

  return {
    verified:
      true,

    verifiedAt:
      new Date().toISOString(),

    securityVersion:
      Number(
        security.version ?? 1
      ),
  };
}

// ============================================================
// GET SECURITY STATUS
// ============================================================

export async function getTransactionPasscodeStatus() {
  const db =
    getCrmFirestore();

  const reference =
    getSecurityRef(db);

  const snapshot =
    await getDoc(
      reference
    );

  if (
    !snapshot.exists()
  ) {
    return {
      configured:
        false,

      enabled:
        false,

      version:
        0,

      updatedAt:
        null,

      updatedByUid:
        null,

      updatedByEmail:
        null,

      updatedByName:
        null,
    };
  }

  const data =
    snapshot.data();

  return {
    configured:
      Boolean(
        data?.hash &&
          data?.salt
      ),

    enabled:
      Boolean(
        data?.enabled
      ),

    version:
      Number(
        data?.version ?? 1
      ),

    updatedAt:
      data?.updatedAt ||
      null,

    updatedByUid:
      data?.updatedByUid ||
      null,

    updatedByEmail:
      data?.updatedByEmail ||
      null,

    updatedByName:
      data?.updatedByName ||
      null,
  };
}

// ============================================================
// DISABLE PASSCODE
// ============================================================

export async function disableTransactionPasscode() {
  const db =
    getCrmFirestore();

  const reference =
    getSecurityRef(db);

  const existing =
    await getDoc(
      reference
    );

  if (
    !existing.exists()
  ) {
    throw new Error(
      "Transaction passcode is not configured."
    );
  }

  const actor =
    getActor();

  await setDoc(
    reference,
    {
      enabled:
        false,

      updatedAt:
        serverTimestamp(),

      updatedByUid:
        actor.uid,

      updatedByEmail:
        actor.email,

      updatedByName:
        actor.name,
    },
    {
      merge: true,
    }
  );

  await createInvestmentAuditLog({
    action:
      "TRANSACTION_PASSCODE_DISABLED",

    entityType:
      "CRM_SECURITY",

    entityId:
      SECURITY_DOCUMENT,

    description:
      "CRM transaction passcode was disabled.",

    metadata: {
      disabledByUid:
        actor.uid,

      disabledByEmail:
        actor.email,
    },
  });

  return {
    success:
      true,

    enabled:
      false,
  };
}