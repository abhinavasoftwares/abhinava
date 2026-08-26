import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const COLLECTION =
  "investmentSchemes";

export function useInvestmentSchemes() {
  const [schemes, setSchemes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      const firestore =
        getCrmFirestore();

      const reference = query(
        collection(
          firestore,
          COLLECTION
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

      unsubscribe = onSnapshot(
        reference,
        (snapshot) => {
          const data =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          setSchemes(data);
          setLoading(false);
          setError("");
        },
        (snapshotError) => {
          console.error(
            "Investment scheme listener error:",
            snapshotError
          );

          setError(
            snapshotError.message ||
              "Failed to load investment schemes."
          );

          setLoading(false);
        }
      );
    } catch (initializationError) {
      console.error(
        "Failed to initialize scheme listener:",
        initializationError
      );

      setError(
        initializationError.message ||
          "Failed to initialize investment schemes."
      );

      setLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    schemes,
    loading,
    error,
  };
}