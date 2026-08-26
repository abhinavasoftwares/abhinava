import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

let app = null;
let auth = null;
let googleProvider = null;

export async function initializeFirebase() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL is not configured."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/crm/firebase-config`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load Firebase configuration: ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.firebase) {
    throw new Error(
      "Firebase configuration was not returned."
    );
  }

  app = initializeApp(
    data.firebase,
    `tenant-${data.tenantId}`
  );

  auth = getAuth(app);

  googleProvider = new GoogleAuthProvider();

  return {
    app,
    auth,
    googleProvider,
    tenantId: data.tenantId,
    clientId: data.clientId,
    businessName: data.businessName,
  };
}

export function getFirebaseAuth() {
  if (!auth) {
    throw new Error(
      "Firebase has not been initialized."
    );
  }

  return auth;
}

export function getGoogleProvider() {
  if (!googleProvider) {
    throw new Error(
      "Firebase has not been initialized."
    );
  }

  return googleProvider;
}