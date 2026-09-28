import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const COLLECTION = "customers";

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeMobile(value) {
  return clean(value).replace(/\D/g, "");
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

/**
 * Find an existing customer using the normalized mobile number.
 *
 * We check the canonical mobileNumberSearch field first and also
 * support common legacy customer field names so existing customers
 * are not unnecessarily duplicated.
 */
export async function findCustomerByMobile(value) {
  const mobile = normalizeMobile(value);

  if (!/^[0-9]{10}$/.test(mobile)) {
    return null;
  }

  const db = getCrmFirestore();

  const candidates = [
    ["mobileNumberSearch", mobile],
    ["mobileNumber", mobile],
    ["mobile", mobile],
  ];

  for (const [field, valueToSearch] of candidates) {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTION),
          where(field, "==", valueToSearch),
          limit(1)
        )
      );

      if (!snapshot.empty) {
        const item = snapshot.docs[0];

        return {
          id: item.id,
          ...item.data(),
        };
      }
    } catch (error) {
      /*
       * A legacy field may not be indexed/configured.
       * Continue checking the other supported fields.
       */
      console.warn(
        `Customer lookup failed for field "${field}":`,
        error
      );
    }
  }

  return null;
}

/**
 * Create a customer from an investor identity.
 *
 * This is intentionally generic so the same customer record can later
 * be used by Sales, Estimations and other CRM modules.
 */
export async function createCustomerFromInvestor(input = {}) {
  const db = getCrmFirestore();

  const fullName = clean(input.fullName);
  const mobileNumber = normalizeMobile(input.mobileNumber);
  const email = normalizeEmail(input.email);

  if (!fullName) {
    throw new Error("Customer name is required.");
  }

  if (!/^[0-9]{10}$/.test(mobileNumber)) {
    throw new Error("Enter a valid 10-digit mobile number.");
  }

  const existing = await findCustomerByMobile(mobileNumber);

  if (existing) {
    return ensureCustomerInvestorRelationship(
      existing.id,
      input
    );
  }

  const data = {
    fullName,
    fullNameLower: fullName.toLowerCase(),

    mobileNumber,
    mobileNumberSearch: mobileNumber,

    email,

    dateOfBirth: clean(input.dateOfBirth),
    gender: clean(input.gender),
    address: clean(input.address),
    city: clean(input.city),
    pincode: clean(input.pincode),

    /*
     * Source history.
     *
     * Do not replace an existing source later.
     * A customer can originate from Sales and later become
     * an Investor.
     */
    source: "INVESTOR",
    sources: ["INVESTOR"],

    relationshipTypes: ["CUSTOMER", "INVESTOR"],

    investor: {
      isInvestor: true,
      investorId: input.investorId || null,
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, COLLECTION),
    data
  );

  return {
    id: ref.id,
    ...data,
  };
}

/**
 * Make an existing customer an investor without creating
 * a duplicate customer.
 */
export async function ensureCustomerInvestorRelationship(
  customerId,
  input = {}
) {
  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  const db = getCrmFirestore();

  const updates = {
    updatedAt: serverTimestamp(),

    sources: arrayUnion("INVESTOR"),

    relationshipTypes: arrayUnion(
      "CUSTOMER",
      "INVESTOR"
    ),

    investor: {
      isInvestor: true,
      investorId: input.investorId || null,
    },
  };

  /*
   * Preserve the customer's existing source.
   *
   * We only set source if the record does not already
   * have a meaningful source.
   */
  if (input.forceInvestorPrimarySource === true) {
    updates.source = "INVESTOR";
  }

  if (input.fullName) {
    updates.fullName = clean(input.fullName);
    updates.fullNameLower = clean(input.fullName).toLowerCase();
  }

  if (input.mobileNumber) {
    const mobile = normalizeMobile(input.mobileNumber);

    if (/^[0-9]{10}$/.test(mobile)) {
      updates.mobileNumber = mobile;
      updates.mobileNumberSearch = mobile;
    }
  }

  if (input.email !== undefined) {
    updates.email = normalizeEmail(input.email);
  }

  if (input.dateOfBirth !== undefined) {
    updates.dateOfBirth = clean(input.dateOfBirth);
  }

  if (input.gender !== undefined) {
    updates.gender = clean(input.gender);
  }

  if (input.address !== undefined) {
    updates.address = clean(input.address);
  }

  if (input.city !== undefined) {
    updates.city = clean(input.city);
  }

  if (input.pincode !== undefined) {
    updates.pincode = clean(input.pincode);
  }

  await updateDoc(
    doc(db, COLLECTION, customerId),
    updates
    );

  return {
    id: customerId,
    ...input,
  };
}

/**
 * Find an existing customer or create one.
 *
 * This is the main function Investment enrollment should use.
 */
export async function findOrCreateCustomerForInvestor(
  input = {}
) {
  const mobileNumber = normalizeMobile(
    input.mobileNumber
  );

  if (!/^[0-9]{10}$/.test(mobileNumber)) {
    throw new Error("Enter a valid 10-digit mobile number.");
  }

  const existing = await findCustomerByMobile(
    mobileNumber
  );

  if (existing) {
    return {
      customer: existing,
      created: false,
    };
  }

  const created =
    await createCustomerFromInvestor({
      ...input,
      mobileNumber,
    });

  return {
    customer: created,
    created: true,
  };
}