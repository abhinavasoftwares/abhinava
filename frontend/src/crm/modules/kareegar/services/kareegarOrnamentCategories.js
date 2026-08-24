import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const COLLECTION_NAME =
  "kareegarOrnamentCategories";

function getCollection() {
  const firestore = getCrmFirestore();

  return collection(
    firestore,
    COLLECTION_NAME
  );
}

export function subscribeToKareegarOrnamentCategories(
  callback,
  onError
) {
  const categoriesQuery = query(
    getCollection(),
    orderBy("name", "asc")
  );

  return onSnapshot(
    categoriesQuery,
    (snapshot) => {
      const categories =
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

      callback(categories);
    },
    (error) => {
      console.error(
        "Failed to subscribe to Kareegar ornament categories:",
        error
      );

      onError?.(error);
    }
  );
}

export async function createKareegarOrnamentCategory(
  name
) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error(
      "Ornament category name is required."
    );
  }

  // Duplicate validation is also handled by the
  // settings UI. Firestore remains the source of truth.
  const document = await addDoc(
    getCollection(),
    {
      name: trimmedName,
      status: "ACTIVE",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return {
    id: document.id,
    name: trimmedName,
    status: "ACTIVE",
  };
}

export async function updateKareegarOrnamentCategoryStatus(
  categoryId,
  status
) {
  if (!categoryId) {
    throw new Error(
      "Ornament category ID is required."
    );
  }

  if (
    status !== "ACTIVE" &&
    status !== "DISABLED"
  ) {
    throw new Error(
      "Invalid ornament category status."
    );
  }

  await updateDoc(
    doc(
      getCollection(),
      categoryId
    ),
    {
      status,
      updatedAt: serverTimestamp(),
    }
  );
}