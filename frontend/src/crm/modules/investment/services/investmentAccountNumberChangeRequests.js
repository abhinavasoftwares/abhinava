import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { getCrmFirestore } from "../../../firebase";

const COLLECTION =
  "investmentAccountNumberChangeRequests";

const AUDIT_COLLECTION =
  "investmentAuditLogs";

function getCurrentUser() {
  try {
    return getAuth().currentUser || null;
  } catch {
    return null;
  }
}

function getApiBaseUrl() {
  const value =
    import.meta.env.VITE_API_BASE_URL;

  if (!value) {
    throw new Error(
      "VITE_API_BASE_URL is not configured."
    );
  }

  return value.replace(/\/+$/, "");
}

async function getFirebaseIdToken() {
  const user = getCurrentUser();

  if (!user) {
    throw new Error(
      "You must be signed in to submit this request."
    );
  }

  return user.getIdToken();
}

/**
 * Creates the Firestore request.
 *
 * Firestore remains the source of truth.
 * Email notification is handled separately by the backend.
 */
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

  if (!user) {
    throw new Error(
      "You must be signed in."
    );
  }

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
            currentTheme?.prefix || "",

          padding: Number(
            currentTheme?.padding || 0
          ),
        },

        requestedTheme:
          requestedTheme
            ? {
                prefix:
                  requestedTheme.prefix ||
                  "",

                padding: Number(
                  requestedTheme.padding || 0
                ),
              }
            : null,

        reason:
          reason.trim(),

        status:
          "PENDING",

        requestedBy:
          user.uid,

        requestedByEmail:
          user.email || null,

        requestedAt:
          serverTimestamp(),

        emailNotificationStatus:
          "PENDING",

        emailNotificationId:
          null,

        emailNotificationSentAt:
          null,

        reviewedBy:
          null,

        reviewedAt:
          null,

        appliedAt:
          null,
      }
    );

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
        user.uid,

      performedByEmail:
        user.email || null,

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

/**
 * Ask the Abhinava backend to send the Resend notification.
 *
 * Resend API credentials never reach the browser.
 */
export async function notifyAccountNumberChangeRequest({
  crmSlug,
  requestId,
}) {
  if (!crmSlug) {
    throw new Error(
      "CRM slug is required."
    );
  }

  if (!requestId) {
    throw new Error(
      "Request ID is required."
    );
  }

  const token =
    await getFirebaseIdToken();

  const response =
    await fetch(
      `${getApiBaseUrl()}/crm/${encodeURIComponent(
        crmSlug
      )}/investment/account-number-change-requests/${encodeURIComponent(
        requestId
      )}/notify`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },
      }
    );

  let payload = null;

  try {
    payload =
      await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.detail ||
        payload?.message ||
        "Failed to send admin notification."
    );
  }

  return payload;
}