import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const INVESTORS_COLLECTION =
  "investmentInvestors";

const ACCOUNTS_COLLECTION =
  "investmentAccounts";

const SEARCH_LIMIT = 10;

function clean(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeMobile(value) {
  return String(value ?? "")
    .replace(/\D/g, "");
}

function prefixQuery(
  collectionReference,
  field,
  value
) {
  return query(
    collectionReference,
    orderBy(field),
    where(field, ">=", value),
    where(
      field,
      "<=",
      `${value}\uf8ff`
    ),
    limit(SEARCH_LIMIT)
  );
}

export function useInvestmentSearch(search = "") {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const rawSearch = String(search || "").trim();

    if (!rawSearch) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    /*
     * Avoid useless queries for extremely short input.
     */
    if (rawSearch.length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const firestore = getCrmFirestore();

        const investorsReference = collection(
          firestore,
          INVESTORS_COLLECTION
        );

        const accountsReference = collection(
          firestore,
          ACCOUNTS_COLLECTION
        );

        const textSearch = clean(rawSearch);
        const mobileSearch =
          normalizeMobile(rawSearch);

        /*
         * ------------------------------------------------------
         * GLOBAL INVESTOR SEARCH
         * ------------------------------------------------------
         *
         * Each query is executed directly by Firestore.
         *
         * We never download the complete investor collection.
         */
        const investorQueries = [
          prefixQuery(
            investorsReference,
            "fullNameLower",
            textSearch
          ),

          prefixQuery(
            investorsReference,
            "emailSearch",
            textSearch
          ),
        ];

        /*
         * Mobile searches use digits only.
         */
        if (mobileSearch) {
          investorQueries.push(
            prefixQuery(
              investorsReference,
              "mobileNumberSearch",
              mobileSearch
            )
          );

          investorQueries.push(
            prefixQuery(
              investorsReference,
              "alternateMobileNumberSearch",
              mobileSearch
            )
          );
        }

        /*
         * Account number is also globally searchable.
         */
        const accountQuery = prefixQuery(
          accountsReference,
          "accountNumber",
          textSearch
        );

        const [
          ...investorSnapshots
        ] = await Promise.all(
          investorQueries.map((item) =>
            getDocs(item)
          )
        );

        if (cancelled) return;

        /*
         * De-duplicate investors returned by
         * multiple search fields.
         */
        const investorMap = new Map();

        investorSnapshots.forEach(
          (snapshot) => {
            snapshot.docs.forEach(
              (item) => {
                investorMap.set(
                  item.id,
                  {
                    id: item.id,
                    ...item.data(),
                  }
                );
              }
            );
          }
        );

        /*
         * ------------------------------------------------------
         * ACCOUNT NUMBER SEARCH
         * ------------------------------------------------------
         */
        const accountSnapshot =
          await getDocs(accountQuery);

        if (cancelled) return;

        const accountInvestorIds =
          new Set();

        accountSnapshot.docs.forEach(
          (item) => {
            const account = item.data();

            if (account.investorId) {
              accountInvestorIds.add(
                account.investorId
              );
            }
          }
        );

        /*
         * Fetch investors referenced by matching
         * account numbers.
         *
         * Maximum is SEARCH_LIMIT.
         */
        if (accountInvestorIds.size) {
          const accountInvestorRequests =
            Array.from(
              accountInvestorIds
            )
              .slice(0, SEARCH_LIMIT)
              .map(async (investorId) => {
                const investorSnapshot =
                  await getDoc(
                    doc(
                      firestore,
                      INVESTORS_COLLECTION,
                      investorId
                    )
                  );

                if (
                  !investorSnapshot.exists()
                ) {
                  return null;
                }

                return {
                  id:
                    investorSnapshot.id,
                  ...investorSnapshot.data(),
                };
              });

          const accountInvestors =
            await Promise.all(
              accountInvestorRequests
            );

          accountInvestors.forEach(
            (investor) => {
              if (investor) {
                investorMap.set(
                  investor.id,
                  investor
                );
              }
            }
          );
        }

        if (cancelled) return;

        /*
         * Final result is limited to 10.
         *
         * The search remains GLOBAL because it queries
         * Firestore directly rather than the current page.
         */
        setResults(
          Array.from(
            investorMap.values()
          ).slice(0, SEARCH_LIMIT)
        );
      } catch (searchError) {
        if (cancelled) return;

        console.error(
          "Investment global search error:",
          searchError
        );

        setResults([]);

        setError(
          searchError?.message ||
            "Failed to search investors."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return {
    results,
    loading,
    error,
  };
}