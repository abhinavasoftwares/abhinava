import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import {
  getCrmFirestore,
} from "../firebase";

import {
  getCrmSlugFromPath,
} from "../utils/crmRoutes";


const ACTIVITY_COLLECTION = "auditLogs";


/*
|--------------------------------------------------------------------------
| Activity Types
|--------------------------------------------------------------------------
|
| Keep these values consistent across the CRM.
|
*/

export const CRM_ACTIVITY_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  ASSIGN: "ASSIGN",
  COMPLETE: "COMPLETE",
  CANCEL: "CANCEL",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
};


/*
|--------------------------------------------------------------------------
| Activity Modules
|--------------------------------------------------------------------------
*/

export const CRM_ACTIVITY_MODULES = {
  AUTH: "auth",
  EMPLOYEES: "employees",
  CUSTOMERS: "customers",
  SALES: "sales",
  ESTIMATIONS: "estimations",
  PURCHASES: "purchases",
  INVENTORY: "inventory",
  INVESTMENTS: "investments",
  KAREEGAR: "kareegar",
  REPORTS: "reports",
  SETTINGS: "settings",
  SYSTEM: "system",
};


/*
|--------------------------------------------------------------------------
| Safe value helper
|--------------------------------------------------------------------------
*/

function cleanValue(value) {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}


/*
|--------------------------------------------------------------------------
| Create CRM activity
|--------------------------------------------------------------------------
|
| This is the central function every CRM module should use.
|
*/

export async function createCrmActivity({
  action,
  module,
  entityType = null,
  entityId = null,

  title,
  description = null,

  actor = null,

  metadata = {},
}) {
  if (!action) {
    throw new Error(
      "CRM activity action is required."
    );
  }

  if (!module) {
    throw new Error(
      "CRM activity module is required."
    );
  }

  if (!title) {
    throw new Error(
      "CRM activity title is required."
    );
  }

  const db = getCrmFirestore();

  const crmSlug =
    getCrmSlugFromPath();

  if (!crmSlug) {
    throw new Error(
      "Unable to determine CRM tenant."
    );
  }


  /*
   * Actor information.
   *
   * This is passed by the module performing the action.
   *
   * We intentionally do not trust the frontend for authorization.
   * Firestore rules remain the final security layer.
   */

  const actorData = actor
    ? {
        uid: actor.uid || null,
        employeeId:
          actor.employeeId || null,
        name:
          actor.name || null,
        email:
          actor.email || null,
        role:
          actor.role || null,
      }
    : {
        uid: null,
        employeeId: null,
        name: null,
        email: null,
        role: null,
      };


  const activity = {
    tenant: {
      crmSlug,
    },

    action,
    module,

    entity: {
      type: entityType,
      id: entityId,
    },

    title,

    description,

    actor: actorData,

    metadata:
      cleanValue(metadata) || {},

    createdAt:
      serverTimestamp(),
  };


  const reference = await addDoc(
    collection(
      db,
      ACTIVITY_COLLECTION
    ),
    activity
  );


  return {
    id: reference.id,
    ...activity,
  };
}