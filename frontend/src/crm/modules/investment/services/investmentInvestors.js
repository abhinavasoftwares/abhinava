import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  getCrmFirebaseAuth,
  getCrmFirestore,
} from "../../../firebase";

import { createInvestmentAuditLog } from "./investmentAudit";

const COLLECTION = "investmentInvestors";

function getActor() {
  let auth = null;
  try { auth = getCrmFirebaseAuth(); } catch {}
  const user = auth?.currentUser;
  return {
    uid: user?.uid || null,
    email: user?.email || null,
    name: user?.displayName || null,
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function mobile(value) {
  return clean(value).replace(/\D/g, "");
}

function normalize(input = {}) {
  const fullName = clean(input?.fullName);
  const mobileNumber = mobile(input?.mobileNumber);
  const alternateMobileNumber = mobile(
    input?.alternateMobileNumber
  );
  const email = clean(input?.email).toLowerCase();
  const city = clean(input?.city);

  return {
    fullName,
    fullNameLower: fullName.toLowerCase(),

    mobileNumber,
    mobileNumberSearch: mobileNumber,

    alternateMobileNumber,
    alternateMobileNumberSearch:
      alternateMobileNumber,

    email,
    emailSearch: email,

    dateOfBirth: clean(input?.dateOfBirth),
    gender: clean(input?.gender),
    address: clean(input?.address),
    city,
    cityLower: city.toLowerCase(),
    pincode: clean(input?.pincode),
  };
}

export async function createInvestmentInvestor(input = {}) {
  const data = normalize(input);

  if (!data.fullName) throw new Error("Investor name is required.");
  if (!/^[0-9]{10}$/.test(data.mobileNumber)) {
    throw new Error("Enter a valid 10-digit mobile number.");
  }

  const db = getCrmFirestore();
  const a = getActor();

  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,

    status: input.status || "ACTIVE",

    // ==========================================================
    // ACCOUNT SUMMARY
    // ==========================================================
    // Account documents remain the source of truth.
    // These counters are maintained for quick investor-level
    // overview and dashboard queries.
    accountSummary: {
      totalAccounts: 0,
      activeAccounts: 0,
      closedAccounts: 0,
    },

    createdAt: serverTimestamp(),

    createdByUid: a.uid,
    createdByEmail: a.email,
    createdByName: a.name,

    updatedAt: serverTimestamp(),

    updatedByUid: a.uid,
    updatedByEmail: a.email,
    updatedByName: a.name,
  });

  await createInvestmentAuditLog({
    action: "INVESTOR_CREATED",
    entityType: "INVESTOR",
    entityId: ref.id,
    description: `Investor "${data.fullName}" was created.`,
    metadata: {
      mobileNumber: data.mobileNumber,
      email: data.email || null,
    },
  });

  return { id: ref.id, ...data, status: input.status || "ACTIVE" };
}

export async function getInvestmentInvestor(investorId) {
  if (!investorId) throw new Error("Investor ID is required.");

  const db = getCrmFirestore();
  const snap = await getDoc(doc(db, COLLECTION, investorId));

  return snap.exists()
    ? { id: snap.id, ...snap.data() }
    : null;
}

export async function updateInvestmentInvestor(investorId, updates = {}) {
  if (!investorId) throw new Error("Investor ID is required.");

  const db = getCrmFirestore();
  const ref = doc(db, COLLECTION, investorId);
  const existing = await getDoc(ref);

  if (!existing.exists()) throw new Error("Investor not found.");

  const old = existing.data();
  const data = {};

  if (updates.fullName !== undefined) data.fullName = clean(updates.fullName);

  if (updates.mobileNumber !== undefined) {
    const m = mobile(updates.mobileNumber);
    if (!/^[0-9]{10}$/.test(m)) {
      throw new Error("Enter a valid 10-digit mobile number.");
    }
    data.mobileNumber = m;
  }

  if (updates.alternateMobileNumber !== undefined) {
    data.alternateMobileNumber = mobile(updates.alternateMobileNumber);
  }

  if (updates.email !== undefined) data.email = clean(updates.email).toLowerCase();
  if (updates.dateOfBirth !== undefined) data.dateOfBirth = clean(updates.dateOfBirth);
  if (updates.gender !== undefined) data.gender = clean(updates.gender);
  if (updates.address !== undefined) data.address = clean(updates.address);
  if (updates.city !== undefined) data.city = clean(updates.city);
  if (updates.pincode !== undefined) data.pincode = clean(updates.pincode);

  if (!Object.keys(data).length) return { id: investorId, ...old };

  const a = getActor();

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
    updatedByUid: a.uid,
    updatedByEmail: a.email,
    updatedByName: a.name,
  });

  await createInvestmentAuditLog({
    action: "INVESTOR_UPDATED",
    entityType: "INVESTOR",
    entityId: investorId,
    description: `Investor "${data.fullName || old.fullName || ""}" was updated.`,
    metadata: {
      changedFields: Object.keys(data),
    },
  });

  return getInvestmentInvestor(investorId);
}

export async function updateInvestmentInvestorStatus(investorId, status) {
  if (!investorId) throw new Error("Investor ID is required.");

  const normalized = String(status || "").toUpperCase();

  if (!["ACTIVE", "INACTIVE"].includes(normalized)) {
    throw new Error("Invalid investor status.");
  }

  const db = getCrmFirestore();
  const ref = doc(db, COLLECTION, investorId);
  const existing = await getDoc(ref);

  if (!existing.exists()) throw new Error("Investor not found.");

  const a = getActor();

  await updateDoc(ref, {
    status: normalized,
    updatedAt: serverTimestamp(),
    updatedByUid: a.uid,
    updatedByEmail: a.email,
    updatedByName: a.name,

    ...(normalized === "INACTIVE"
      ? {
          deactivatedAt: serverTimestamp(),
          deactivatedByUid: a.uid,
          deactivatedByEmail: a.email,
          deactivatedByName: a.name,
        }
      : {
          reactivatedAt: serverTimestamp(),
          reactivatedByUid: a.uid,
          reactivatedByEmail: a.email,
          reactivatedByName: a.name,
        }),
  });

  await createInvestmentAuditLog({
    action:
      normalized === "INACTIVE"
        ? "INVESTOR_DEACTIVATED"
        : "INVESTOR_REACTIVATED",
    entityType: "INVESTOR",
    entityId: investorId,
    description:
      normalized === "INACTIVE"
        ? "Investor was deactivated."
        : "Investor was reactivated.",
  });

  return getInvestmentInvestor(investorId);
}

export async function deleteInvestmentInvestor(investorId) {
  if (!investorId) throw new Error("Investor ID is required.");

  const db = getCrmFirestore();
  const ref = doc(db, COLLECTION, investorId);
  const existing = await getDoc(ref);

  if (!existing.exists()) throw new Error("Investor not found.");

  const investor = existing.data();

  await deleteDoc(ref);

  await createInvestmentAuditLog({
    action: "INVESTOR_DELETED",
    entityType: "INVESTOR",
    entityId: investorId,
    description: `Investor "${investor.fullName || ""}" was permanently deleted.`,
    metadata: {
      deletedInvestorName: investor.fullName || null,
      deletedInvestorMobile: investor.mobileNumber || null,
    },
  });

  return { id: investorId, deleted: true };
}
