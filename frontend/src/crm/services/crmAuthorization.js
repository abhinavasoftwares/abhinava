import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import {
  getCrmFirestore,
} from "../firebase";

import {
  getCrmSlugFromPath,
} from "../utils/crmRoutes";

/* =========================================================
   CONSTANTS
========================================================= */

const ACTIVE_STATUS = "ACTIVE";

const ADMIN_ROLE = "ADMIN_OWNER";

const ALLOWED_ROLES = new Set([
  "ADMIN_OWNER",
  "MANAGER_STOCK_COORDINATOR",
  "SALES_EXECUTIVE",
  "INVESTOR",
]);

const ALLOWED_LOGIN_METHODS = new Set([
  "google",
  "otp",
]);

const CRM_MODULES = [
  "sales",
  "investments",
  "customers",
  "inventory",
  "kareegar",
  "reports",
];


/* =========================================================
   HELPERS
========================================================= */

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}


function normalizePhone(phone) {
  const value = String(phone || "")
    .trim()
    .replace(/[()\s-]/g, "");

  if (
    value.length === 10 &&
    /^\d+$/.test(value)
  ) {
    return `+91${value}`;
  }

  return value;
}


function getLoginMethod(firebaseUser) {
  const providerIds =
    firebaseUser?.providerData?.map(
      (provider) => provider.providerId
    ) || [];

  if (
    providerIds.includes("google.com")
  ) {
    return "google";
  }

  if (
    providerIds.includes("phone")
  ) {
    return "otp";
  }

  return null;
}


/* =========================================================
   VALIDATE AUTHORIZATION DATA
========================================================= */

function validateAuthorizationDocument(
  firebaseUser,
  data,
) {
  if (!firebaseUser?.uid) {
    throw new Error(
      "Unable to identify the authenticated user."
    );
  }

  if (!data) {
    throw new Error(
      "CRM authorization data is missing."
    );
  }

  if (
    data.uid &&
    data.uid !== firebaseUser.uid
  ) {
    throw new Error(
      "Firebase identity mismatch."
    );
  }

  if (
    data.status !== ACTIVE_STATUS
  ) {
    throw new Error(
      "Your CRM access is currently disabled."
    );
  }

  if (
    !ALLOWED_ROLES.has(data.role)
  ) {
    throw new Error(
      "Your CRM account has an invalid role configuration."
    );
  }

  const loginMethod =
    getLoginMethod(firebaseUser);

  if (
    !loginMethod ||
    !ALLOWED_LOGIN_METHODS.has(loginMethod)
  ) {
    throw new Error(
      "This authentication method is not supported for CRM access."
    );
  }

  /* -------------------------------------------------------
     AUTH METHOD CONFIGURATION

     Firestore structure:

     auth: {
       google: true,
       phone: true
     }
  ------------------------------------------------------- */

  const loginMethods =
  data.loginMethods || data.auth || {};

if (
  loginMethod === "google" &&
  loginMethods.google !== true
) {
  throw new Error(
    "Google login is not enabled for your CRM account."
  );
}

if (
  loginMethod === "otp" &&
  loginMethods.otp !== true &&
  loginMethods.phone !== true
) {
  throw new Error(
    "Phone OTP login is not enabled for your CRM account."
  );
}


  /* -------------------------------------------------------
     GOOGLE IDENTITY
  ------------------------------------------------------- */

  if (
    loginMethod === "google"
  ) {
    const firebaseEmail =
      normalizeEmail(
        firebaseUser.email
      );

    const authorizedEmail =
      normalizeEmail(
        data.email
      );

    if (
      !firebaseEmail ||
      !authorizedEmail ||
      firebaseEmail !== authorizedEmail
    ) {
      throw new Error(
        "The signed-in Google account does not match the authorized CRM employee."
      );
    }
  }


  /* -------------------------------------------------------
     OTP IDENTITY
  ------------------------------------------------------- */

  if (
    loginMethod === "otp"
  ) {
    const firebasePhone =
      normalizePhone(
        firebaseUser.phoneNumber
      );

    const authorizedPhone =
      normalizePhone(
        data.mobile
      );

    if (
      !firebasePhone ||
      !authorizedPhone ||
      firebasePhone !== authorizedPhone
    ) {
      throw new Error(
        "The verified mobile number does not match the authorized CRM employee."
      );
    }
  }

  return loginMethod;
}


/* =========================================================
   BUILD FRONTEND AUTHORIZATION
========================================================= */

function buildAuthorization(
  firebaseUser,
  data,
) {
  const loginMethod =
    validateAuthorizationDocument(
      firebaseUser,
      data,
    );

  return {
    uid:
      firebaseUser.uid,

    employeeId:
      data.employeeId ||
      null,

    name:
      data.name ||
      "",

    email:
      data.email ||
      firebaseUser.email ||
      "",

    mobile:
      data.mobile ||
      firebaseUser.phoneNumber ||
      "",

    role:
      data.role,

    roleLabel:
      data.roleLabel ||
      data.role,

    status:
      data.status,

    loginMethod,

    loginMethods:
      data.loginMethods || data.auth || {
        google: false,
        otp: false,
      },

    permissions:
      data.permissions || {},

    enforce24HourLogout:
      data.enforce24HourLogout === true,

    tenantId:
      data.tenantId ||
      null,

    crmSlug:
      data.crmSlug ||
      null,

    authorizedAt:
      new Date().toISOString(),
  };
}


/* =========================================================
   READ EXISTING AUTHORIZATION
========================================================= */

export async function authorizeCrmUser(
  firebaseUser
) {
  if (!firebaseUser?.uid) {
    throw new Error(
      "Unable to identify the authenticated user."
    );
  }

  const db =
    getCrmFirestore();

  const userRef =
    doc(
      db,
      "users",
      firebaseUser.uid
    );

 console.log("=== CRM AUTH DEBUG ===");
console.log("Firebase UID:", firebaseUser.uid);
console.log("Firebase Email:", firebaseUser.email);
console.log("Firestore Project:", db.app.options.projectId);
console.log("Users Path:", `users/${firebaseUser.uid}`);

const snapshot =
  await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return buildAuthorization(
    firebaseUser,
    snapshot.data()
  );
}


/* =========================================================
   BACKEND FIRST-LOGIN AUTHORIZATION
========================================================= */

export async function bindCrmFirebaseUser(
  firebaseUser
) {
  if (!firebaseUser?.uid) {
    throw new Error(
      "Unable to identify the authenticated user."
    );
  }

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL;

  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL is not configured."
    );
  }

  const crmSlug =
    getCrmSlugFromPath();

  if (!crmSlug) {
    throw new Error(
      "CRM tenant slug is missing from the URL."
    );
  }

  /*
   * Do NOT force-refresh the token.
   *
   * Firebase automatically refreshes the ID token
   * when required.
   */

  const idToken =
    await firebaseUser.getIdToken();

  const response =
    await fetch(
      `${API_BASE_URL}/crm/${encodeURIComponent(
        crmSlug
      )}/auth/authorize`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${idToken}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({}),
      }
    );

  let data = null;

  try {
    data =
      await response.json();

      console.log("=== CRM BACKEND AUTH RESPONSE ===");
      console.log("Backend response:", data);
      console.log("Frontend Firebase UID:", firebaseUser.uid);
      console.log("Backend UID:", data?.uid);
      console.log("Backend employeeId:", data?.employeeId);
      console.log("Backend crmSlug:", data?.crmSlug);
      console.log("Backend authorized:", data?.authorized);
      console.log("Backend authorization:", data?.authorization);
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      "Your account is not authorized for this CRM."
    );
  }

  if (
    data?.crmSlug &&
    data.crmSlug.toLowerCase() !==
      crmSlug.toLowerCase()
  ) {
    throw new Error(
      "CRM tenant authorization mismatch."
    );
  }

  if (
    data?.uid &&
    data.uid !== firebaseUser.uid
  ) {
    throw new Error(
      "Firebase identity mismatch."
    );
  }

  return data;
}


/* =========================================================
   FIRST-LOGIN FIRESTORE PROVISIONING
========================================================= */

export async function provisionCrmFirebaseUser(
  firebaseUser,
  bootstrap,
) {
  if (!firebaseUser?.uid) {
    throw new Error(
      "Unable to identify the authenticated user."
    );
  }

  if (!bootstrap?.authorization) {
    throw new Error(
      "CRM authorization bootstrap data is missing."
    );
  }

  const authorization =
    bootstrap.authorization;

  /*
   * Validate the server-provided authorization
   * against the actual Firebase identity before
   * writing anything.
   */

  validateAuthorizationDocument(
    firebaseUser,
    authorization,
  );

  if (
    authorization.uid !==
    firebaseUser.uid
  ) {
    throw new Error(
      "Firebase identity mismatch."
    );
  }

  if (
    !authorization.employeeId
  ) {
    throw new Error(
      "Employee authorization record is incomplete."
    );
  }

  const db =
    getCrmFirestore();

  const userRef =
    doc(
      db,
      "users",
      firebaseUser.uid
    );

  const employeeRef =
    doc(
      db,
      "employees",
      authorization.employeeId
    );

  const batch =
    writeBatch(db);


  /* -------------------------------------------------------
     USERS/{UID}
  ------------------------------------------------------- */

  batch.set(
    userRef,
    {
      ...authorization,

      uid:
        firebaseUser.uid,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    },
    {
      merge: false,
    }
  );


  /* -------------------------------------------------------
     EMPLOYEES/{EMPLOYEE_ID}
  ------------------------------------------------------- */

  batch.update(
    employeeRef,
    {
      uid:
        firebaseUser.uid,

      provisionedAt:
        serverTimestamp(),

      lastLoginAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    }
  );


console.log("=== CRM FIRST LOGIN PROVISION ===");
console.log("Firebase UID:", firebaseUser.uid);
console.log("Employee ID:", authorization.employeeId);
console.log("Employee UID before binding:", authorization.uid);
console.log("Authorization:", authorization);
console.log("Firestore Project:", db.app.options.projectId);

console.log("Writing users document:", firebaseUser.uid);
console.log("Updating employee document:", authorization.employeeId);

try {
  await batch.commit();

  console.log("=== CRM FIRST LOGIN BATCH SUCCESS ===");
} catch (error) {
  console.error("=== CRM FIRST LOGIN BATCH FAILED ===");
  console.error("Firestore error code:", error?.code);
  console.error("Firestore error message:", error?.message);
  console.error("Full Firestore error:", error);

  throw error;
}


  /* -------------------------------------------------------
     READ CANONICAL DOCUMENT
  ------------------------------------------------------- */

  const snapshot =
    await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error(
      "CRM authorization was created but could not be read back."
    );
  }

  return buildAuthorization(
    firebaseUser,
    snapshot.data()
  );
}


/* =========================================================
   GET OR CREATE AUTHORIZATION
========================================================= */

export async function resolveCrmAuthorization(firebaseUser) {
  if (!firebaseUser) {
    throw new Error("Firebase user is required.");
  }

  console.log("=== CRM RESOLVE AUTH START ===");
  console.log("Firebase UID:", firebaseUser.uid);
  console.log("Firebase email:", firebaseUser.email);

  const bootstrap = await bindCrmFirebaseUser(firebaseUser);

  console.log("=== CRM BOOTSTRAP RESPONSE ===");
  console.log("Bootstrap:", bootstrap);
  console.log("Bootstrap status:", bootstrap?.status);
  console.log("Bootstrap UID:", bootstrap?.uid);
  console.log("Bootstrap employeeId:", bootstrap?.employeeId);
  console.log("Bootstrap role:", bootstrap?.role);
  console.log("Bootstrap loginMethod:", bootstrap?.loginMethod);
  console.log("Bootstrap authorization:", bootstrap?.authorization);

  if (bootstrap?.status !== "authorized") {
    throw new Error(
      "CRM authorization failed: backend did not authorize this Firebase user."
    );
  }

  if (!bootstrap?.authorization) {
    throw new Error(
      "CRM authorization failed: backend authorized the user but returned no authorization document."
    );
  }

  const authorization = buildAuthorization(
    firebaseUser,
    bootstrap.authorization
  );

  console.log("=== CRM FINAL AUTHORIZATION ===");
  console.log("Authorization:", authorization);

  return authorization;
}


/* =========================================================
   SESSION EXPIRY
========================================================= */

async function getOrCreateSessionExpiry(
  uid
) {
  const storedKey =
    `abhinava_crm_session_expiry_${uid}`;

  const existing =
    localStorage.getItem(
      storedKey
    );

  if (existing) {
    const timestamp =
      Number(existing);

    if (
      Number.isFinite(timestamp) &&
      Date.now() < timestamp
    ) {
      return timestamp;
    }

    localStorage.removeItem(
      storedKey
    );
  }

  const expiry =
    Date.now() +
    24 *
      60 *
      60 *
      1000;

  localStorage.setItem(
    storedKey,
    String(expiry)
  );

  return expiry;
}


/* =========================================================
   ROLE
========================================================= */

export function getCrmUserRole(
  authorization
) {
  return (
    authorization?.role ||
    null
  );
}


/* =========================================================
   MODULE PERMISSION
========================================================= */

export function getCrmModulePermission(
  authorization,
  moduleKey,
  permission = "read"
) {
  if (!authorization) {
    return false;
  }

  if (
    authorization.status !==
    ACTIVE_STATUS
  ) {
    return false;
  }

  /*
   * ADMIN_OWNER has full CRM module access.

   * IMPORTANT:
   * Firestore Security Rules will independently
   * enforce the actual database access.
   */

  if (
    authorization.role ===
    ADMIN_ROLE
  ) {
    return true;
  }

  if (
    !CRM_MODULES.includes(
      moduleKey
    )
  ) {
    return false;
  }

  const modulePermissions =
    authorization.permissions?.[
      moduleKey
    ];

  if (!modulePermissions) {
    return false;
  }

  if (
    permission === "write"
  ) {
    return (
      modulePermissions.read === true &&
      modulePermissions.write === true
    );
  }

  if (
    permission === "delete"
  ) {
    return (
      modulePermissions.read === true &&
      modulePermissions.write === true &&
      modulePermissions.delete === true
    );
  }

  return (
    modulePermissions.read === true
  );
}


/* =========================================================
   ADMIN CHECK
========================================================= */

export function isCrmAdmin(
  authorization
) {
  return (
    authorization?.status ===
      ACTIVE_STATUS &&
    authorization?.role ===
      ADMIN_ROLE
  );
}


/* =========================================================
   OPTIONAL PUBLIC HELPERS
========================================================= */

export {
  getOrCreateSessionExpiry,
};