import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const ACCOUNTS_COLLECTION =
  "investmentAccounts";


export function useInvestmentAccounts(
  investorId = null
) {
  const [accounts, setAccounts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    let unsubscribe;

    try {
      const firestore =
        getCrmFirestore();

      const collectionReference =
        collection(
          firestore,
          ACCOUNTS_COLLECTION
        );

      const reference = investorId
        ? query(
            collectionReference,
            where(
              "investorId",
              "==",
              investorId
            ),
            orderBy(
              "createdAt",
              "desc"
            )
          )
        : query(
            collectionReference,
            orderBy(
              "createdAt",
              "desc"
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
              "Investment account listener error:",
              snapshotError
            );

            setError(
              snapshotError.message ||
                "Failed to load investment accounts."
            );

            setLoading(false);
          }
        );
    } catch (initializationError) {
      console.error(
        "Failed to initialize investment account listener:",
        initializationError
      );

      setError(
        initializationError.message ||
          "Failed to initialize investment accounts."
      );

      setLoading(false);
    }


    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [investorId]);


  return {
    accounts,
    loading,
    error,
  };
}