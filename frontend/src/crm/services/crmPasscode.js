import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  getCrmFirestore,
} from "../firebase";

const SECURITY_COLLECTION = "crmSecurity";
const PASSCODE_DOCUMENT = "passcode";
const RESET_REQUEST_COLLECTION = "passcodeResetRequests";

const MIN_LENGTH = 6;
const MAX_LENGTH = 128;

// ============================================================
// HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
}

function getPasscodeRef(db) {
  return doc(
    db,
    SECURITY_COLLECTION,
    PASSCODE_DOCUMENT
  );
}

// ============================================================
// ACTOR
// ============================================================

function getActor() {
  try {
    const user =
      window.__CRM_CURRENT_USER__ || null;

    return {
      uid: user?.uid || null,
      email: user?.email || null,
      name: user?.displayName || user?.name || null,
    };
  } catch {
    return {
      uid: null,
      email: null,
      name: null,
    };
  }
}

// ============================================================
// CRYPTO
// ============================================================

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);

  let binary = "";

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function generateSalt() {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return arrayBufferToBase64(bytes.buffer);
}

async function hashPasscode(passcode, salt) {
  const encoder = new TextEncoder();

  const data = encoder.encode(
    `${salt}:${passcode}`
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return arrayBufferToBase64(digest);
}

function secureCompare(first, second) {
  if (
    typeof first !== "string" ||
    typeof second !== "string"
  ) {
    return false;
  }

  if (first.length !== second.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < first.length; i += 1) {
    result |=
      first.charCodeAt(i) ^
      second.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================
// VALIDATION
// ============================================================

function validatePasscodeFormat(passcode) {
  const value = clean(passcode);

  if (!value) {
    throw new Error(
      "CRM security passcode is required."
    );
  }

  if (value.length < MIN_LENGTH) {
    throw new Error(
      `CRM security passcode must contain at least ${MIN_LENGTH} characters.`
    );
  }

  if (value.length > MAX_LENGTH) {
    throw new Error(
      `CRM security passcode cannot exceed ${MAX_LENGTH} characters.`
    );
  }

  return value;
}

// ============================================================
// STATUS
// ============================================================

export async function getCrmPasscodeStatus() {
  const db = getCrmFirestore();

  const snapshot = await getDoc(
    getPasscodeRef(db)
  );

  if (!snapshot.exists()) {
    return {
      configured: false,
      enabled: false,
      version: 0,
      updatedAt: null,
      updatedByUid: null,
      updatedByEmail: null,
      updatedByName: null,
    };
  }

  const data = snapshot.data();

  return {
    configured: Boolean(
      data?.hash &&
      data?.salt
    ),

    enabled:
      data?.enabled === true,

    version:
      Number(data?.version ?? 1),

    updatedAt:
      data?.updatedAt || null,

    updatedByUid:
      data?.updatedByUid || null,

    updatedByEmail:
      data?.updatedByEmail || null,

    updatedByName:
      data?.updatedByName || null,
  };
}

export async function isCrmPasscodeConfigured() {
  const status =
    await getCrmPasscodeStatus();

  return Boolean(
    status.configured &&
    status.enabled
  );
}

// ============================================================
// CREATE
// ============================================================

export async function setCrmPasscode(passcode) {
  const value =
    validatePasscodeFormat(passcode);

  const db =
    getCrmFirestore();

  const reference =
    getPasscodeRef(db);

  const existing =
    await getDoc(reference);

  if (
    existing.exists() &&
    existing.data()?.hash
  ) {
    throw new Error(
      "CRM security passcode is already configured. Use Change Passcode instead."
    );
  }

  const salt =
    generateSalt();

  const hash =
    await hashPasscode(
      value,
      salt
    );

  const actor =
    getActor();

  await setDoc(reference, {
    hash,
    salt,

    enabled: true,

    version: 1,

    createdAt:
      serverTimestamp(),

    createdByUid:
      actor.uid,

    createdByEmail:
      actor.email,

    createdByName:
      actor.name,

    updatedAt:
      serverTimestamp(),

    updatedByUid:
      actor.uid,

    updatedByEmail:
      actor.email,

    updatedByName:
      actor.name,
  });

  return {
    success: true,
    enabled: true,
    version: 1,
  };
}

// ============================================================
// CHANGE
// ============================================================

export async function changeCrmPasscode({
  currentPasscode,
  newPasscode,
} = {}) {
  const current =
    validatePasscodeFormat(
      currentPasscode
    );

  const next =
    validatePasscodeFormat(
      newPasscode
    );

  if (current === next) {
    throw new Error(
      "New CRM security passcode must be different from the current passcode."
    );
  }

  const db =
    getCrmFirestore();

  const reference =
    getPasscodeRef(db);

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error(
      "CRM security passcode has not been configured yet."
    );
  }

  const existing =
    snapshot.data();

  if (
    existing?.enabled !== true
  ) {
    throw new Error(
      "CRM security passcode is currently disabled."
    );
  }

  const currentHash =
    await hashPasscode(
      current,
      existing.salt
    );

  if (
    !secureCompare(
      currentHash,
      existing.hash
    )
  ) {
    throw new Error(
      "Current CRM security passcode is incorrect."
    );
  }

  const newSalt =
    generateSalt();

  const newHash =
    await hashPasscode(
      next,
      newSalt
    );

  const version =
    Number(existing.version ?? 1) + 1;

  const actor =
    getActor();

  await setDoc(
    reference,
    {
      hash: newHash,
      salt: newSalt,
      enabled: true,
      version,

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

  return {
    success: true,
    enabled: true,
    version,
  };
}

// ============================================================
// VERIFY
// ============================================================

export async function verifyCrmPasscode(
  passcode
) {
  const value =
    validatePasscodeFormat(
      passcode
    );

  const db =
    getCrmFirestore();

  const snapshot =
    await getDoc(
      getPasscodeRef(db)
    );

  if (!snapshot.exists()) {
    throw new Error(
      "CRM security passcode has not been configured."
    );
  }

  const security =
    snapshot.data();

  if (
    security?.enabled !== true
  ) {
    throw new Error(
      "CRM security passcode is currently disabled."
    );
  }

  if (
    !security?.hash ||
    !security?.salt
  ) {
    throw new Error(
      "CRM security passcode configuration is invalid."
    );
  }

  const calculatedHash =
    await hashPasscode(
      value,
      security.salt
    );

  if (
    !secureCompare(
      calculatedHash,
      security.hash
    )
  ) {
    throw new Error(
      "Incorrect CRM security passcode."
    );
  }

  return {
    verified: true,

    verifiedAt:
      new Date().toISOString(),

    securityVersion:
      Number(
        security.version ?? 1
      ),
  };
}

// ============================================================
// REQUIRE
// ============================================================

export async function requireCrmPasscode(
  passcode
) {
  return verifyCrmPasscode(
    passcode
  );
}

// ============================================================
// RESET REQUEST
// ============================================================

export async function requestCrmPasscodeReset(
  note = ""
) {
  const db =
    getCrmFirestore();

  const actor =
    getActor();

  const requestRef =
    await addDoc(
      collection(
        db,
        SECURITY_COLLECTION,
        RESET_REQUEST_COLLECTION
      ),
      {
        requestedByUid:
          actor.uid,

        requestedByEmail:
          actor.email,

        requestedByName:
          actor.name,

        note:
          clean(note),

        status:
          "PENDING",

        requestedAt:
          serverTimestamp(),

        reviewedAt:
          null,

        reviewedByUid:
          null,

        reviewedByEmail:
          null,

        reviewedByName:
          null,

        version:
          1,

        immutable:
          true,
      }
    );

  return {
    success: true,
    requestId:
      requestRef.id,
    status:
      "PENDING",
  };
}

// ============================================================
// DISABLE
// ============================================================

export async function disableCrmPasscode() {
  const db =
    getCrmFirestore();

  const reference =
    getPasscodeRef(db);

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error(
      "CRM security passcode has not been configured."
    );
  }

  const actor =
    getActor();

  const version =
    Number(
      snapshot.data()?.version ?? 1
    ) + 1;

  await setDoc(
    reference,
    {
      enabled: false,

      version,

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

  return {
    success: true,
    enabled: false,
    version,
  };
}