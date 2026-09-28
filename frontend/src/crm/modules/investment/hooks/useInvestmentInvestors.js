import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const INVESTORS_COLLECTION = "investmentInvestors";
const PAGE_SIZE = 10;

export function useInvestmentInvestors() {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  /*
   * Page cursor cache.
   *
   * Example:
   * {
   *   1: null,
   *   2: <last document from page 1>,
   *   3: <last document from page 2>
   * }
   */
  const pageCursorsRef = useRef({
    1: null,
  });

  const loadPage = useCallback(async (page, { showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    try {
      const firestore = getCrmFirestore();

      const collectionReference = collection(
        firestore,
        INVESTORS_COLLECTION
      );

      const cursor =
        pageCursorsRef.current[page] || null;

      const reference = cursor
        ? query(
            collectionReference,
            orderBy("createdAt", "desc"),
            startAfter(cursor),
            limit(PAGE_SIZE)
          )
        : query(
            collectionReference,
            orderBy("createdAt", "desc"),
            limit(PAGE_SIZE)
          );

      const snapshot = await getDocs(reference);

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setInvestors(data);

      setHasNextPage(
        snapshot.docs.length === PAGE_SIZE
      );

      /*
       * Cache cursor for the NEXT page.
       */
      if (snapshot.docs.length > 0) {
        pageCursorsRef.current[page + 1] =
          snapshot.docs[snapshot.docs.length - 1];
      }
    } catch (loadError) {
      console.error(
        "Investment investor pagination error:",
        loadError
      );

      setInvestors([]);

      setError(
        loadError?.message ||
          "Failed to load investors."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const firestore = getCrmFirestore();

        const collectionReference = collection(
          firestore,
          INVESTORS_COLLECTION
        );

        const cursor =
          pageCursorsRef.current[currentPage] || null;

        const reference = cursor
          ? query(
              collectionReference,
              orderBy("createdAt", "desc"),
              startAfter(cursor),
              limit(PAGE_SIZE)
            )
          : query(
              collectionReference,
              orderBy("createdAt", "desc"),
              limit(PAGE_SIZE)
            );

        const snapshot = await getDocs(reference);

        if (cancelled) return;

        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setInvestors(data);

        setHasNextPage(
          snapshot.docs.length === PAGE_SIZE
        );

        if (snapshot.docs.length > 0) {
          pageCursorsRef.current[currentPage + 1] =
            snapshot.docs[snapshot.docs.length - 1];
        }
      } catch (loadError) {
        if (cancelled) return;

        console.error(
          "Investment investor pagination error:",
          loadError
        );

        setInvestors([]);

        setError(
          loadError?.message ||
            "Failed to load investors."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  /*
   * Refresh the CURRENT page.
   *
   * Important:
   * We preserve the current page number and its previous-page cursor.
   * This means creating a new investor while on page 1 immediately
   * shows the new investor without forcing the user to leave the page.
   */
  const refreshInvestors = useCallback(async () => {
    await loadPage(currentPage, {
      showLoading: false,
    });
  }, [currentPage, loadPage]);

  /*
   * Reset pagination and return to page 1.
   *
   * Useful after creating a new investor because the newest investor
   * is ordered first by createdAt.
   */
  const refreshFromFirstPage = useCallback(async () => {
    pageCursorsRef.current = {
      1: null,
    };

    setCurrentPage(1);

    /*
     * currentPage state may already be 1, in which case React will not
     * trigger the useEffect again. Therefore explicitly load page 1.
     */
    if (currentPage === 1) {
      await loadPage(1);
    }
  }, [currentPage, loadPage]);

  function nextPage() {
    if (loading || !hasNextPage) return;

    setCurrentPage((page) => page + 1);
  }

  function previousPage() {
    if (loading || currentPage <= 1) return;

    setCurrentPage((page) =>
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
    hasPreviousPage: currentPage > 1,

    nextPage,
    previousPage,

    refreshInvestors,
    refreshFromFirstPage,
  };
}