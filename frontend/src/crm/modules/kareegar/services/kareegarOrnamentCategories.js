import {
  addDoc,
  collection,
  doc,
  getDocs,
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
  return collection(
    getCrmFirestore(),
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
      const categories = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

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
  const trimmedName =
    String(name || "").trim();

  if (!trimmedName) {
    throw new Error(
      "Ornament category name is required."
    );
  }

  const existingSnapshot =
    await getDocs(
      query(
        getCollection(),
        orderBy("name", "asc")
      )
    );

  const duplicate = existingSnapshot.docs.some(
    (item) =>
      String(item.data()?.name || "")
        .trim()
        .toLowerCase() ===
      trimmedName.toLowerCase()
  );

  if (duplicate) {
    throw new Error(
      "This ornament category already exists."
    );
  }

  const reference =
    await addDoc(
      getCollection(),
      {
        name: trimmedName,
        status: "ACTIVE",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

  return {
    id: reference.id,
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
      getCrmFirestore(),
      COLLECTION_NAME,
      categoryId
    ),
    {
      status,
      updatedAt: serverTimestamp(),
    }
  );
}