import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const INVESTORS_COLLECTION = "investmentInvestors";

function getCollectionRef() {
  const firestore = getCrmFirestore();

  return collection(
    firestore,
    INVESTORS_COLLECTION
  );
}

/**
 * Create a new investor.
 *
 * Investor identity is deliberately independent
 * from investment scheme/account information.
 */
export async function createInvestmentInvestor(
  investor
) {
  const firestore =
    getCrmFirestore();

  const payload = {
    fullName:
      investor.fullName.trim(),

    mobileNumber:
      investor.mobileNumber.trim(),

    alternateMobileNumber:
      investor.alternateMobileNumber?.trim() ||
      "",

    email:
      investor.email?.trim().toLowerCase() ||
      "",

    dateOfBirth:
      investor.dateOfBirth || "",

    address:
      investor.address?.trim() || "",

    city:
      investor.city?.trim() || "",

    state:
      investor.state?.trim() || "",

    pincode:
      investor.pincode?.trim() || "",

    gender:
      investor.gender || "",

    status: "ACTIVE",

    /*
     * Authentication is intentionally not stored
     * here yet.
     *
     * Mobile + OTP login will be introduced later.
     */

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };

  const reference =
    await addDoc(
      getCollectionRef(),
      payload
    );

  return {
    id: reference.id,
    ...payload,
  };
}


/**
 * Update investor profile.
 */
export async function updateInvestmentInvestor(
  investorId,
  updates
) {
  if (!investorId) {
    throw new Error(
      "Investor ID is required."
    );
  }

  const firestore =
    getCrmFirestore();

  const reference = doc(
    firestore,
    INVESTORS_COLLECTION,
    investorId
  );

  const payload = {
    ...updates,
    updatedAt:
      serverTimestamp(),
  };

  await updateDoc(
    reference,
    payload
  );

  return {
    id: investorId,
    ...payload,
  };
}


/**
 * Activate / deactivate investor.
 */
export async function updateInvestmentInvestorStatus(
  investorId,
  status
) {
  if (
    status !== "ACTIVE" &&
    status !== "INACTIVE"
  ) {
    throw new Error(
      "Invalid investor status."
    );
  }

  return updateInvestmentInvestor(
    investorId,
    {
      status,
    }
  );
}