import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const ACCOUNTS_COLLECTION =
  "investmentAccounts";

const MAX_INVESTORS_PER_QUERY = 10;

export function useInvestmentAccountsForInvestors(
  investorIds = []
) {
  const [accounts, setAccounts] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const normalizedIds =
    useMemo(
      () =>
        Array.from(
          new Set(
            investorIds
              .filter(Boolean)
              .slice(
                0,
                MAX_INVESTORS_PER_QUERY
              )
          )
        ).sort(),
      [investorIds]
    );

  const investorKey =
    normalizedIds.join("|");

  useEffect(() => {
    if (!normalizedIds.length) {
      setAccounts([]);
      setLoading(false);
      setError("");
      return;
    }

    let unsubscribe = null;

    setLoading(true);
    setError("");

    try {
      const firestore =
        getCrmFirestore();

      const reference =
        query(
          collection(
            firestore,
            ACCOUNTS_COLLECTION
          ),
          where(
            "investorId",
            "in",
            normalizedIds
          )
        );

      unsubscribe =
        onSnapshot(
          reference,
          (snapshot) => {
            const data =
              snapshot.docs.map(
                (item) => ({
                  id: item.id,
                  ...item.data(),
                })
              );

            setAccounts(data);
            setLoading(false);
            setError("");
          },
          (snapshotError) => {
            console.error(
              "Investment accounts listener error:",
              snapshotError
            );

            setAccounts([]);

            setError(
              snapshotError?.message ||
                "Failed to load investment accounts."
            );

            setLoading(false);
          }
        );
    } catch (initializationError) {
      console.error(
        "Failed to initialize investment accounts listener:",
        initializationError
      );

      setAccounts([]);

      setError(
        initializationError?.message ||
          "Failed to initialize investment accounts."
      );

      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [investorKey]);

  return {
    accounts,
    loading,
    error,
  };
}