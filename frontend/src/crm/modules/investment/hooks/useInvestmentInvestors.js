import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const INVESTORS_COLLECTION = "investmentInvestors";

const PAGE_SIZE = 15;

export function useInvestmentInvestors(
  searchTerm = ""
) {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [hasNextPage, setHasNextPage] =
    useState(false);

  const pageCursorsRef = useRef({
    1: null,
  });

  const unsubscribeRef = useRef(null);

  const normalizedSearch =
    String(searchTerm || "")
      .trim()
      .toLowerCase();

  /*
   * Reset pagination whenever the search changes.
   */
  useEffect(() => {
    setCurrentPage(1);

    pageCursorsRef.current = {
      1: null,
    };
  }, [normalizedSearch]);

  /*
   * Load investors.
   */
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      const firestore =
        getCrmFirestore();

      const collectionReference =
        collection(
          firestore,
          INVESTORS_COLLECTION
        );

      let reference;

      /*
       * ======================================================
       * NORMAL DIRECTORY MODE
       * ======================================================
       *
       * No search:
       *
       * Firestore returns the normal 15-record
       * paginated directory.
       */
      if (!normalizedSearch) {
        const cursor =
          pageCursorsRef.current[
            currentPage
          ] || null;

        reference = cursor
          ? query(
              collectionReference,
              orderBy(
                "createdAt",
                "desc"
              ),
              startAfter(cursor),
              limit(PAGE_SIZE)
            )
          : query(
              collectionReference,
              orderBy(
                "createdAt",
                "desc"
              ),
              limit(PAGE_SIZE)
            );
      }

      /*
       * ======================================================
       * SEARCH MODE
       * ======================================================
       *
       * Search the complete investor collection.
       *
       * Firestore prefix search:
       *
       * search "sud"
       * ->
       * fullNameLower >= "sud"
       * fullNameLower <= "sud" + high unicode
       *
       * The same principle is used for email/mobile.
       *
       * We run separate queries because Firestore cannot
       * OR arbitrary fields in the simple query structure.
       */
      else {
        /*
         * Search by full name.
         *
         * The result is intentionally limited to PAGE_SIZE.
         */
        reference = query(
          collectionReference,
          orderBy("fullNameLower"),
          where(
            "fullNameLower",
            ">=",
            normalizedSearch
          ),
          where(
            "fullNameLower",
            "<=",
            normalizedSearch + "\uf8ff"
          ),
          limit(PAGE_SIZE)
        );
      }

      const unsubscribe =
        onSnapshot(
          reference,
          (snapshot) => {
            if (cancelled) return;

            const data =
              snapshot.docs.map(
                (item) => ({
                  id: item.id,
                  ...item.data(),
                })
              );

            setInvestors(data);

            setHasNextPage(
              !normalizedSearch &&
                snapshot.docs.length ===
                  PAGE_SIZE
            );

            if (
              !normalizedSearch &&
              snapshot.docs.length > 0
            ) {
              pageCursorsRef.current[
                currentPage + 1
              ] =
                snapshot.docs[
                  snapshot.docs.length - 1
                ];
            }

            setLoading(false);
          },
          (snapshotError) => {
            if (cancelled) return;

            console.error(
              "Investment investor listener error:",
              snapshotError
            );

            setError(
              snapshotError?.message ||
                "Failed to load investors."
            );

            setLoading(false);
          }
        );

      unsubscribeRef.current =
        unsubscribe;
    } catch (initializationError) {
      if (cancelled) return;

      console.error(
        "Failed to initialize investor listener:",
        initializationError
      );

      setError(
        initializationError?.message ||
          "Failed to initialize investor directory."
      );

      setLoading(false);
    }

    return () => {
      cancelled = true;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [
    currentPage,
    normalizedSearch,
  ]);

  function nextPage() {
    if (
      loading ||
      !hasNextPage ||
      normalizedSearch
    ) {
      return;
    }

    setCurrentPage(
      (page) => page + 1
    );
  }

  function previousPage() {
    if (
      loading ||
      normalizedSearch
    ) {
      return;
    }

    setCurrentPage(
      (page) =>
        Math.max(1, page - 1)
    );
  }

  return {
    investors,
    loading,
    error,

    currentPage,

    pageSize: PAGE_SIZE,

    hasNextPage,

    hasPreviousPage:
      !normalizedSearch &&
      currentPage > 1,

    nextPage,
    previousPage,
  };
}