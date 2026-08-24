import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";


// ============================================================
// COLLECTIONS
// ============================================================

// ------------------------------------------------------------
// KAREEGAR DIRECTORY
// ------------------------------------------------------------

const B2B_KAREEGAR_COLLECTION =
  "b2bKareegars";

const B2J_KAREEGAR_COLLECTION =
  "b2jKareegars";


// ------------------------------------------------------------
// TRANSACTIONS
// ------------------------------------------------------------

const ASSIGNMENTS_COLLECTION =
  "kareegarAssignments";

const RETURNS_COLLECTION =
  "kareegarReturns";


// ============================================================
// HELPERS
// ============================================================

function cleanValue(value) {
  if (value === undefined) {
    return null;
  }

  return value;
}


function cleanObject(object) {
  return Object.fromEntries(
    Object.entries(object).map(
      ([key, value]) => [
        key,
        cleanValue(value),
      ]
    )
  );
}


function normalizeType(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
}


function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}


function normalizeMobile(mobile) {
  return String(mobile || "")
    .trim();
}


function getKareegarCollectionName(
  type
) {
  const normalizedType =
    normalizeType(type);

  if (normalizedType === "B2B") {
    return B2B_KAREEGAR_COLLECTION;
  }

  if (normalizedType === "B2J") {
    return B2J_KAREEGAR_COLLECTION;
  }

  throw new Error(
    "Kareegar type must be B2B or B2J."
  );
}


// ============================================================
// KAREEGAR ID GENERATION
// ============================================================

async function generateKareegarId(
  type
) {
  const normalizedType =
    normalizeType(type);

  const collectionName =
    getKareegarCollectionName(
      normalizedType
    );

  const db =
    getCrmFirestore();

  const snapshot =
    await getDocs(
      collection(
        db,
        collectionName
      )
    );

  let highestNumber = 0;

  const prefix =
    normalizedType === "B2B"
      ? "B2B"
      : "B2J";

  snapshot.forEach(
    (document) => {
      const data =
        document.data();

      const kareegarId =
        data.kareegarId;

      if (
        typeof kareegarId !==
        "string"
      ) {
        return;
      }

      if (
        !kareegarId.startsWith(
          prefix
        )
      ) {
        return;
      }

      const numberPart =
        kareegarId.slice(
          prefix.length
        );

      const number =
        Number(numberPart);

      if (
        Number.isInteger(number) &&
        number > highestNumber
      ) {
        highestNumber = number;
      }
    }
  );

  const nextNumber =
    highestNumber + 1;

  return `${prefix}${String(
    nextNumber
  ).padStart(2, "0")}`;
}


// ============================================================
// KAREEGAR EMPLOYEES / DIRECTORY
// ============================================================

export async function createKareegarEmployee(
  employee
) {
  const db =
    getCrmFirestore();

  const type =
    normalizeType(
      employee?.type
    );

  const name =
    String(
      employee?.name || ""
    ).trim();

  const mobileNumber =
    normalizeMobile(
      employee?.mobileNumber
    );

  const email =
    normalizeEmail(
      employee?.email
    );

  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (
    type !== "B2B" &&
    type !== "B2J"
  ) {
    throw new Error(
      "Kareegar type must be B2B or B2J."
    );
  }

  if (!name) {
    throw new Error(
      "Kareegar name is required."
    );
  }

  if (!mobileNumber) {
    throw new Error(
      "Mobile number is required."
    );
  }

  if (!email) {
    throw new Error(
      "Email is required."
    );
  }

  // ----------------------------------------------------------
  // COLLECTION
  // ----------------------------------------------------------

  const collectionName =
    getKareegarCollectionName(
      type
    );

  // ----------------------------------------------------------
  // AUTO ID
  // ----------------------------------------------------------

  const kareegarId =
    await generateKareegarId(
      type
    );

  // ----------------------------------------------------------
  // PAYLOAD
  // ----------------------------------------------------------

  const payload =
    cleanObject({
      kareegarId,

      type,

      name,

      mobileNumber,

      email,

      dateOfBirth:
        employee?.dateOfBirth ||
        null,

      city:
        employee?.city ||
        null,

      loginEnabled:
        Boolean(
          employee?.loginEnabled
        ),

      status:
        employee?.status ||
        "ACTIVE",

      authUserId:
        employee?.authUserId ||
        null,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    });

  // ----------------------------------------------------------
  // CREATE
  // ----------------------------------------------------------

  const reference =
    await addDoc(
      collection(
        db,
        collectionName
      ),
      payload
    );

  return {
    id:
      reference.id,

    ...employee,

    kareegarId,

    type,

    name,

    mobileNumber,

    email,

    dateOfBirth:
      employee?.dateOfBirth ||
      null,

    city:
      employee?.city ||
      null,

    loginEnabled:
      Boolean(
        employee?.loginEnabled
      ),

    status:
      employee?.status ||
      "ACTIVE",

    authUserId:
      employee?.authUserId ||
      null,
  };
}


// ============================================================
// GET SINGLE KAREEGAR
// ============================================================

export async function getKareegarEmployee(
  type,
  documentId
) {
  const db =
    getCrmFirestore();

  const collectionName =
    getKareegarCollectionName(
      type
    );

  const reference =
    doc(
      db,
      collectionName,
      documentId
    );

  const snapshot =
    await getDoc(
      reference
    );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id:
      snapshot.id,

    ...snapshot.data(),
  };
}


// ============================================================
// GET ALL KAREEGARS
// ============================================================
//
// type = "B2B" -> only B2B
// type = "B2J" -> only B2J
// type = null -> both
//
// This is a one-time read.
// Directory UI should use subscribeToKareegarEmployees()
// for real-time updates.
// ============================================================

export async function getKareegarEmployees(
  type = null
) {
  const db =
    getCrmFirestore();

  const normalizedType =
    type
      ? normalizeType(type)
      : null;

  const types =
    normalizedType
      ? [normalizedType]
      : ["B2B", "B2J"];

  const results = [];

  for (
    const currentType of types
  ) {
    const collectionName =
      getKareegarCollectionName(
        currentType
      );

    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            collectionName
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );

    snapshot.forEach(
      (document) => {
        results.push({
          id:
            document.id,

          ...document.data(),
        });
      }
    );
  }

  return results;
}


// ============================================================
// REAL-TIME KAREEGAR DIRECTORY
// ============================================================
//
// Subscribes to:
//
//   b2bKareegars
//   b2jKareegars
//
// callback receives:
//
//   [
//     B2B01,
//     B2B02,
//     B2J01,
//     B2J02,
//     ...
//   ]
//
// Returns an unsubscribe function.
// ============================================================

export function subscribeToKareegarEmployees(
  callback,
  type = null,
  onError
) {
  const db =
    getCrmFirestore();

  const normalizedType =
    type
      ? normalizeType(type)
      : null;

  const types =
    normalizedType
      ? [normalizedType]
      : ["B2B", "B2J"];

  const snapshots =
    new Map();

  const unsubscribers =
    types.map(
      (
        currentType,
        index
      ) => {
        const collectionName =
          getKareegarCollectionName(
            currentType
          );

        const reference =
          query(
            collection(
              db,
              collectionName
            ),
            orderBy(
              "createdAt",
              "desc"
            )
          );

        return onSnapshot(
          reference,

          (snapshot) => {
            const records =
              snapshot.docs.map(
                (document) => ({
                  id:
                    document.id,

                  ...document.data(),
                })
              );

            snapshots.set(
              index,
              records
            );

            const combined =
              [];

            snapshots.forEach(
              (records) => {
                combined.push(
                  ...records
                );
              }
            );

            combined.sort(
              (a, b) =>
                String(
                  a.kareegarId ||
                    ""
                ).localeCompare(
                  String(
                    b.kareegarId ||
                      ""
                  ),
                  undefined,
                  {
                    numeric: true,
                    sensitivity:
                      "base",
                  }
                )
            );

            callback(
              combined
            );
          },

          (error) => {
            console.error(
              "Kareegar real-time listener failed:",
              error
            );

            if (onError) {
              onError(error);
            }
          }
        );
      }
    );

  return () => {
    unsubscribers.forEach(
      (unsubscribe) => {
        unsubscribe();
      }
    );
  };
}


// ============================================================
// UPDATE KAREEGAR
// ============================================================

export async function updateKareegarEmployee(
  type,
  documentId,
  updates
) {
  const db =
    getCrmFirestore();

  const collectionName =
    getKareegarCollectionName(
      type
    );

  const reference =
    doc(
      db,
      collectionName,
      documentId
    );

  const payload =
    cleanObject({
      ...updates,

      updatedAt:
        serverTimestamp(),
    });

  await updateDoc(
    reference,
    payload
  );

  return {
    id:
      documentId,

    ...updates,
  };
}


// ============================================================
// ENABLE / DISABLE KAREEGAR
// ============================================================

export async function setKareegarStatus(
  type,
  documentId,
  status
) {
  const normalizedStatus =
    String(status || "")
      .trim()
      .toUpperCase();

  if (
    normalizedStatus !==
      "ACTIVE" &&
    normalizedStatus !==
      "DISABLED"
  ) {
    throw new Error(
      "Kareegar status must be ACTIVE or DISABLED."
    );
  }

  return updateKareegarEmployee(
    type,
    documentId,
    {
      status:
        normalizedStatus,
    }
  );
}


// ============================================================
// ENABLE / DISABLE LOGIN
// ============================================================

export async function setKareegarLoginEnabled(
  type,
  documentId,
  enabled
) {
  return updateKareegarEmployee(
    type,
    documentId,
    {
      loginEnabled:
        Boolean(enabled),
    }
  );
}


// ============================================================
// ASSIGNMENTS
// ============================================================

export async function createKareegarAssignment(
  assignment
) {
  const db =
    getCrmFirestore();

  const payload =
    cleanObject({
      ...assignment,

      status:
        assignment.status ||
        "OPEN",

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    });

  const reference =
    await addDoc(
      collection(
        db,
        ASSIGNMENTS_COLLECTION
      ),
      payload
    );

  return {
    id:
      reference.id,

    ...assignment,

    status:
      assignment.status ||
      "OPEN",
  };
}


// ============================================================
// GET SINGLE ASSIGNMENT
// ============================================================

export async function getKareegarAssignment(
  assignmentId
) {
  const db =
    getCrmFirestore();

  const reference =
    doc(
      db,
      ASSIGNMENTS_COLLECTION,
      assignmentId
    );

  const snapshot =
    await getDoc(
      reference
    );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id:
      snapshot.id,

    ...snapshot.data(),
  };
}


// ============================================================
// GET ASSIGNMENTS
// ============================================================

export async function getKareegarAssignments(
  filters = {}
) {
  const db =
    getCrmFirestore();

  const constraints = [];

  if (filters.employeeId) {
    constraints.push(
      where(
        "employeeId",
        "==",
        filters.employeeId
      )
    );
  }

  if (filters.type) {
    constraints.push(
      where(
        "type",
        "==",
        filters.type
      )
    );
  }

  if (filters.status) {
    constraints.push(
      where(
        "status",
        "==",
        filters.status
      )
    );
  }

  constraints.push(
    orderBy(
      "createdAt",
      "desc"
    )
  );

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          ASSIGNMENTS_COLLECTION
        ),
        ...constraints,
        limit(
          filters.limit || 100
        )
      )
    );

  return snapshot.docs.map(
    (item) => ({
      id:
        item.id,

      ...item.data(),
    })
  );
}


// ============================================================
// UPDATE ASSIGNMENT STATUS
// ============================================================

export async function updateKareegarAssignmentStatus(
  assignmentId,
  status
) {
  const db =
    getCrmFirestore();

  const reference =
    doc(
      db,
      ASSIGNMENTS_COLLECTION,
      assignmentId
    );

  await updateDoc(
    reference,
    {
      status,

      updatedAt:
        serverTimestamp(),
    }
  );

  return {
    id:
      assignmentId,

    status,
  };
}


// ============================================================
// RETURNS
// ============================================================

export async function createKareegarReturn(
  returnData
) {
  const db =
    getCrmFirestore();

  const payload =
    cleanObject({
      ...returnData,

      status:
        returnData.status ||
        "RECORDED",

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    });

  const reference =
    await addDoc(
      collection(
        db,
        RETURNS_COLLECTION
      ),
      payload
    );

  return {
    id:
      reference.id,

    ...returnData,

    status:
      returnData.status ||
      "RECORDED",
  };
}


// ============================================================
// GET SINGLE RETURN
// ============================================================

export async function getKareegarReturn(
  returnId
) {
  const db =
    getCrmFirestore();

  const reference =
    doc(
      db,
      RETURNS_COLLECTION,
      returnId
    );

  const snapshot =
    await getDoc(
      reference
    );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id:
      snapshot.id,

    ...snapshot.data(),
  };
}


// ============================================================
// GET RETURNS
// ============================================================

export async function getKareegarReturns(
  filters = {}
) {
  const db =
    getCrmFirestore();

  const constraints = [];

  if (filters.assignmentId) {
    constraints.push(
      where(
        "assignmentId",
        "==",
        filters.assignmentId
      )
    );
  }

  if (filters.employeeId) {
    constraints.push(
      where(
        "employeeId",
        "==",
        filters.employeeId
      )
    );
  }

  constraints.push(
    orderBy(
      "createdAt",
      "desc"
    )
  );

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          RETURNS_COLLECTION
        ),
        ...constraints,
        limit(
          filters.limit || 100
        )
      )
    );

  return snapshot.docs.map(
    (item) => ({
      id:
        item.id,

      ...item.data(),
    })
  );
}