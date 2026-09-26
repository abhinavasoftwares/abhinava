import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

import {
  getFirestore,
} from "firebase/firestore";

import { getCrmSlugFromPath } from "./utils/crmRoutes";


let app = null;
let auth = null;
let firestore = null;
let googleProvider = null;

let initializedSlug = null;

export async function initializeCrmFirebase() {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL;

  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL is not configured."
    );
  }

  const crmSlug = getCrmSlugFromPath();

  if (!crmSlug) {
    throw new Error(
      "CRM tenant slug is missing from the URL."
    );
  }

  /*
   * Prevent accidental reuse of a Firebase instance
   * belonging to another tenant.
   */
  if (
    initializedSlug &&
    initializedSlug !== crmSlug
  ) {
    throw new Error(
      "CRM tenant context cannot be changed within an active session."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/crm/${encodeURIComponent(
      crmSlug
    )}/firebase-config`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Failed to load CRM Firebase configuration."
    );
  }

  if (!data.firebase) {
    throw new Error(
      "CRM Firebase configuration was not returned."
    );
  }

  /*
   * Defensive backend/frontend tenant check.
   */
  if (
    data.crmSlug &&
    data.crmSlug.toLowerCase() !==
      crmSlug.toLowerCase()
  ) {
    throw new Error(
      "CRM tenant configuration mismatch."
    );
  }

  /*
   * Do not initialize a Firebase app for a
   * different tenant using the same CRM session.
   */
  if (!app) {
    app = initializeApp(
      data.firebase,
      "abhinava-crm"
    );
  console.log("=== CRM FIREBASE DEBUG ===");
  console.log("CRM Slug:", crmSlug);
  console.log("Firebase Project ID:", data.firebase.projectId);
  console.log("Firebase App Name:", app.name);

  auth = getAuth(app);
  firestore = getFirestore(app);

  console.log("Firestore App Project ID:", firestore.app.options.projectId);

  googleProvider =
    new GoogleAuthProvider();

  initializedSlug = crmSlug;
}

  return {
    app,
    auth,
    firestore,
    googleProvider,

    tenantId: data.tenantId,
    clientId: data.clientId,
    crmSlug: data.crmSlug,
    businessName: data.businessName,
    logoUrl: data.logoUrl,

    modules: data.modules || [],
  };
}

export function getCrmFirebaseAuth() {
  if (!auth) {
    throw new Error(
      "CRM Firebase has not been initialized."
    );
  }

  return auth;
}

export function getCrmFirestore() {
  if (!firestore) {
    throw new Error(
      "CRM Firebase has not been initialized."
    );
  }

  return firestore;
}

export function getCrmGoogleProvider() {
  if (!googleProvider) {
    throw new Error(
      "CRM Firebase has not been initialized."
    );
  }

  return googleProvider;
}

