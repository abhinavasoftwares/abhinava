import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

import {
  getFirestore,
} from "firebase/firestore";

let app = null;
let auth = null;
let firestore = null;
let googleProvider = null;

export async function initializeCrmFirebase() {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL;

  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL is not configured."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/crm/firebase-config`
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

  app = initializeApp(
    data.firebase,
    "abhinava-crm"
  );

  auth = getAuth(app);
  firestore = getFirestore(app);
  googleProvider = new GoogleAuthProvider();

  return {
    app,
    auth,
    firestore,
    googleProvider,
    tenantId: data.tenantId,
    clientId: data.clientId,
    businessName: data.businessName,
    logoUrl: data.logoUrl,
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