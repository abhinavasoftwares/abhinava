import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { getCrmFirestore } from "../../../firebase";

const INVESTORS_COLLECTION = "investmentInvestors";
const ACCOUNTS_COLLECTION = "investmentAccounts";

function clean(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeMobile(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function useInvestmentSearch(search = "") {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const searchValue = clean(search);

    if (!searchValue) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;

    /*
     * ------------------------------------------------------------
     * DEBOUNCE
     * ------------------------------------------------------------
     *
     * Do not search on every keystroke.
     * Wait until the user stops typing for 350ms.
     */
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const firestore = getCrmFirestore();

        /*
         * --------------------------------------------------------
         * LOAD INVESTORS
         * --------------------------------------------------------
         *
         * Search is intentionally global.
         * It is NOT restricted to the current 15-page dataset.
         */
        const investorSnapshot = await getDocs(
          collection(
            firestore,
            INVESTORS_COLLECTION
          )
        );

        if (cancelled) return;

        const investors = investorSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        const normalizedSearchMobile =
          normalizeMobile(searchValue);

        /*
         * --------------------------------------------------------
         * MATCH INVESTOR PROFILE
         * --------------------------------------------------------
         */
        const matchingInvestorIds = new Set();

        investors.forEach((investor) => {
          const name = clean(
            investor.fullName
          );

          const mobile = normalizeMobile(
            investor.mobileNumber
          );

          const alternateMobile =
            normalizeMobile(
              investor.alternateMobileNumber
            );

          const email = clean(
            investor.email
          );

          const matches =
            name.includes(searchValue) ||
            email.includes(searchValue) ||
            (
              normalizedSearchMobile &&
              mobile.includes(
                normalizedSearchMobile
              )
            ) ||
            (
              normalizedSearchMobile &&
              alternateMobile.includes(
                normalizedSearchMobile
              )
            );

          if (matches) {
            matchingInvestorIds.add(
              investor.id
            );
          }
        });

        /*
         * --------------------------------------------------------
         * SEARCH ACCOUNT NUMBERS
         * --------------------------------------------------------
         *
         * Account number search is also global.
         */
        const accountSnapshot = await getDocs(
          collection(
            firestore,
            ACCOUNTS_COLLECTION
          )
        );

        if (cancelled) return;

        accountSnapshot.docs.forEach(
          (item) => {
            const account = item.data();

            const accountNumber = clean(
              account.accountNumber
            );

            if (
              accountNumber.includes(
                searchValue
              ) &&
              account.investorId
            ) {
              matchingInvestorIds.add(
                account.investorId
              );
            }
          }
        );

        /*
         * --------------------------------------------------------
         * BUILD FINAL RESULTS
         * --------------------------------------------------------
         */
        const finalResults = investors.filter(
          (investor) =>
            matchingInvestorIds.has(
              investor.id
            )
        );

        if (cancelled) return;

        setResults(finalResults);
      } catch (searchError) {
        if (cancelled) return;

        console.error(
          "Investment global search error:",
          searchError
        );

        setError(
          searchError?.message ||
            "Failed to search investors."
        );

        setResults([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 350);

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