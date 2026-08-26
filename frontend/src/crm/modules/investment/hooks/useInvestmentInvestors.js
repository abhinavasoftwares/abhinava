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

const INVESTORS_COLLECTION =
  "investmentInvestors";

export function useInvestmentInvestors() {
  const [investors, setInvestors] =
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
          INVESTORS_COLLECTION
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

          setInvestors(data);
          setLoading(false);
          setError("");
        },
        (snapshotError) => {
          console.error(
            "Investment investor listener error:",
            snapshotError
          );

          setError(
            snapshotError.message ||
              "Failed to load investors."
          );

          setLoading(false);
        }
      );
    } catch (initializationError) {
      console.error(
        "Failed to initialize investor listener:",
        initializationError
      );

      setError(
        initializationError.message ||
          "Failed to initialize investor directory."
      );

      setLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    investors,
    loading,
    error,
  };
}