import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import {
  getCrmFirestore,
} from "../../../firebase";

import {
  getAuth,
} from "firebase/auth";


const COLLECTION =
  "investmentAccountNumberChangeRequests";

const AUDIT_COLLECTION =
  "investmentAuditLogs";


function getCurrentUser() {
  try {
    const auth =
      getAuth();

    return auth.currentUser || null;
  } catch {
    return null;
  }
}


// ============================================================
// CREATE CHANGE REQUEST
// ============================================================

export async function createAccountNumberChangeRequest({
  schemeId,
  schemeName,
  currentTheme,
  requestedTheme = null,
  reason,
}) {
  if (!schemeId) {
    throw new Error(
      "Scheme ID is required."
    );
  }

  if (!reason?.trim()) {
    throw new Error(
      "Reason for change is required."
    );
  }


  const firestore =
    getCrmFirestore();

  const user =
    getCurrentUser();


  const requestReference =
    await addDoc(
      collection(
        firestore,
        COLLECTION
      ),
      {
        schemeId,

        schemeName:
          schemeName || "",

        currentTheme: {
          prefix:
            currentTheme?.prefix ||
            "",

          padding:
            Number(
              currentTheme?.padding ||
              0
            ),
        },

        requestedTheme:
          requestedTheme
            ? {
                prefix:
                  requestedTheme.prefix ||
                  "",

                padding:
                  Number(
                    requestedTheme.padding ||
                    0
                  ),
              }
            : null,

        reason:
          reason.trim(),

        status:
          "PENDING",

        requestedBy:
          user?.uid || null,

        requestedByEmail:
          user?.email || null,

        requestedAt:
          serverTimestamp(),

        reviewedBy:
          null,

        reviewedAt:
          null,

        appliedAt:
          null,
      }
    );


  // ==========================================================
  // AUDIT LOG
  // ==========================================================

  await addDoc(
    collection(
      firestore,
      AUDIT_COLLECTION
    ),
    {
      action:
        "ACCOUNT_NUMBER_THEME_CHANGE_REQUESTED",

      entityType:
        "INVESTMENT_SCHEME",

      entityId:
        schemeId,

      schemeId,

      schemeName:
        schemeName || "",

      requestId:
        requestReference.id,

      previousValue: {
        accountNumberConfig:
          currentTheme || {},
      },

      requestedValue:
        requestedTheme || null,

      reason:
        reason.trim(),

      performedBy:
        user?.uid || null,

      performedByEmail:
        user?.email || null,

      performedAt:
        serverTimestamp(),

      source:
        "CRM_UI",

    }
  );


  return {
    id:
      requestReference.id,

    status:
      "PENDING",
  };
}