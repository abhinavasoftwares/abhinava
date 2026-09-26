import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";


import {
  getCrmFirestore,
  getCrmFirebaseAuth,
} from "../firebase";
import { getCrmSlugFromPath } from "../utils/crmRoutes"

import {
  createCrmActivity,
  CRM_ACTIVITY_ACTIONS,
  CRM_ACTIVITY_MODULES,
} from "./crmActivity";

const EMPLOYEE_COLLECTION = "employees";

const ALLOWED_ROLES = [
  "ADMIN_OWNER",
  "MANAGER_STOCK_COORDINATOR",
  "SALES_EXECUTIVE",
  "INVESTOR",
];

const ALLOWED_MODULES = [
  "sales",
  "investments",
  "customers",
  "inventory",
  "kareegar",
  "reports",
];

const DEFAULT_PERMISSIONS = Object.fromEntries(
  ALLOWED_MODULES.map((module) => [
    module,
    {
      read: false,
      write: false,
      delete: false,
    },
  ])
);

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeMobile(value) {
  return String(value || "").trim();
}

function sanitizePermissions(permissions = {}) {
  const result = {};

  for (const module of ALLOWED_MODULES) {
    const source = permissions?.[module] || {};

    const read = Boolean(source.read);
    const write = read && Boolean(source.write);
    const remove = write && Boolean(source.delete);

    result[module] = {
      read,
      write,
      delete: remove,
    };
  }

  return result;
}

function validatePermissions(role, permissions) {
  const sanitized = sanitizePermissions(permissions);

  if (role === "ADMIN_OWNER") {
    for (const module of ALLOWED_MODULES) {
      sanitized[module] = {
        read: true,
        write: true,
        delete: true,
      };
    }
  }

  if (role === "INVESTOR") {
    for (const module of ALLOWED_MODULES) {
      sanitized[module] = {
        read: false,
        write: false,
        delete: false,
      };
    }

    sanitized.investments = {
      read: true,
      write: true,
      delete: false,
    };
  }

  return sanitized;
}

function validateEmployeePayload(payload) {
  const name = String(payload?.name || "").trim();
  const email = normalizeEmail(payload?.email);
  const mobile = normalizeMobile(payload?.mobile);
  const role = String(payload?.role || "").trim();

  if (!name) {
    throw new Error("Employee full name is required.");
  }

  if (!email) {
    throw new Error("Employee email is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid employee email address.");
  }

  if (!mobile) {
    throw new Error("Employee mobile number is required.");
  }

  if (!role) {
    throw new Error("Employee role is required.");
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Invalid employee role.");
  }

  const enableGoogleLogin = Boolean(payload?.enableGoogleLogin);
  const enableOtpLogin = Boolean(payload?.enableOtpLogin);

  if (!enableGoogleLogin && !enableOtpLogin) {
    throw new Error("At least one login method must be enabled.");
  }

  const permissions = validatePermissions(
    role,
    payload?.permissions || DEFAULT_PERMISSIONS
  );

  const hasReadPermission = Object.values(permissions).some(
    (permission) => permission.read
  );

  if (!hasReadPermission) {
    throw new Error("At least one CRM module must be authorized.");
  }

  return {
    name,
    email,
    mobile,
    role,
    roleLabel: String(payload?.roleLabel || role),
    loginMethods: {
      google: enableGoogleLogin,
      otp: enableOtpLogin,
    },
    permissions,
    enforce24HourLogout: Boolean(payload?.enforce24HourLogout),
  };
}

/* =========================================================
   CREATE EMPLOYEE
   IMPORTANT:
   This function ONLY creates the employee.
   Welcome email is now sent separately.
========================================================= */

export async function createEmployeeAccess(
  payload,
  actor = null
) {
  const validated =
    validateEmployeePayload(payload);

  const db =
    getCrmFirestore();

  const employeeDocument = {
    ...validated,

    status: "ACTIVE",

    uid: null,

    provisionedAt: null,

    lastLoginAt: null,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };


  const documentReference =
    await addDoc(
      collection(
        db,
        EMPLOYEE_COLLECTION
      ),
      employeeDocument
    );


  const employeeId =
    documentReference.id;


  /*
   * Record employee creation.
   *
   * The activity is created only after
   * the employee itself has been created.
   */

  try {
    await createCrmActivity({
      action:
        CRM_ACTIVITY_ACTIONS.CREATE,

      module:
        CRM_ACTIVITY_MODULES.EMPLOYEES,

      entityType:
        "employee",

      entityId:
        employeeId,

      title:
        "Employee created",

      description:
        `${validated.name} was added to the CRM.`,

      actor,

      metadata: {
        employeeId,

        employeeName:
          validated.name,

        role:
          validated.role,

        email:
          validated.email,

        loginMethods:
          validated.loginMethods,

        status:
          "ACTIVE",
      },
    });
  } catch (activityError) {
    /*
     * Do not fail employee creation merely because
     * activity logging failed.
     *
     * The employee has already been created successfully.
     */

    console.error(
      "Failed to record employee creation activity:",
      activityError
    );
  }


  return {
    id: employeeId,
    ...employeeDocument,
  };
}

/* =========================================================
   UPDATE EMPLOYEE
========================================================= */

export async function updateEmployeeAccess(employeeId, payload) {
  if (!employeeId) {
    throw new Error("Employee ID is required.");
  }

  const validated = validateEmployeePayload(payload);

  const db = getCrmFirestore();

  const employeeReference = doc(
    db,
    EMPLOYEE_COLLECTION,
    employeeId
  );

  await updateDoc(employeeReference, {
    ...validated,
    updatedAt: serverTimestamp(),
  });

  return {
    id: employeeId,
    ...validated,
  };
}

/* =========================================================
   SEND / RESEND WELCOME EMAIL
========================================================= */

export async function sendEmployeeWelcomeEmail(employeeId) {
  if (!employeeId) {
    throw new Error("Employee ID is required.");
  }

  /*
   * IMPORTANT:
   * Use the already initialized tenant Firebase Auth instance.
   *
   * Do NOT initialize Firebase again here.
   */
  const firebaseAuth = getCrmFirebaseAuth();

  const firebaseUser = firebaseAuth.currentUser;

  if (!firebaseUser) {
    throw new Error(
      "Your administrator session has expired. Please sign in again."
    );
  }

  /*
   * Firebase automatically refreshes the ID token when required.
   */
  const idToken = await firebaseUser.getIdToken();

  const crmSlug = getCrmSlugFromPath();

  if (!crmSlug) {
    throw new Error(
      "Unable to determine the current CRM tenant."
    );
  }

  const apiBaseUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "");

  const response = await fetch(
    `${apiBaseUrl}/crm/${encodeURIComponent(
      crmSlug
    )}/employees/${encodeURIComponent(
      employeeId
    )}/welcome-email`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },

      credentials: "include",
    }
  );

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.detail ||
        result?.message ||
        `Unable to send welcome email (${response.status}).`
    );
  }

  return result;
}

/* =========================================================
   DISABLE EMPLOYEE
========================================================= */

export async function disableEmployeeAccess(employeeId) {
  if (!employeeId) {
    throw new Error("Employee ID is required.");
  }

  const db = getCrmFirestore();

  const employeeReference = doc(
    db,
    EMPLOYEE_COLLECTION,
    employeeId
  );

  await updateDoc(employeeReference, {
    status: "DISABLED",
    updatedAt: serverTimestamp(),
  });

  return {
    id: employeeId,
    status: "DISABLED",
  };
}

/* =========================================================
   ENABLE EMPLOYEE
========================================================= */

export async function enableEmployeeAccess(employeeId) {
  if (!employeeId) {
    throw new Error("Employee ID is required.");
  }

  const db = getCrmFirestore();

  const employeeReference = doc(
    db,
    EMPLOYEE_COLLECTION,
    employeeId
  );

  await updateDoc(employeeReference, {
    status: "ACTIVE",
    updatedAt: serverTimestamp(),
  });

  return {
    id: employeeId,
    status: "ACTIVE",
  };
}

/* =========================================================
   EMPLOYEE SUBSCRIPTION
========================================================= */

export function subscribeToEmployees(onData, onError) {
  const db = getCrmFirestore();

  const employeesQuery = query(
    collection(db, EMPLOYEE_COLLECTION),
    orderBy("name", "asc")
  );

  return onSnapshot(
    employeesQuery,
    (snapshot) => {
      const employees = snapshot.docs.map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      }));

      onData(employees);
    },
    (error) => {
      console.error("Employee subscription failed:", error);

      if (onError) {
        onError(error);
      }
    }
  );
}