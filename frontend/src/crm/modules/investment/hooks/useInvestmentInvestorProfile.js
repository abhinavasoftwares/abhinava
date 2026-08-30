import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import {
  getCrmFirestore,
} from "../../../firebase";

/* ============================================================
   COLLECTIONS
============================================================ */

const INVESTORS =
  "investmentInvestors";

const ACCOUNTS =
  "investmentAccounts";

const AUDIT_LOGS =
  "investmentAuditLogs";

const COMMUNICATIONS =
  "investmentCommunications";

/* ============================================================
   HELPERS
============================================================ */

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function clean(value) {
  return String(
    value ?? ""
  ).trim();
}

function number(
  value,
  fallback = 0
) {
  const result =
    Number(value);

  return Number.isFinite(
    result
  )
    ? result
    : fallback;
}

function timestamp(value) {
  try {
    if (!value) return 0;

    if (
      typeof value ===
        "object" &&
      typeof value.toDate ===
        "function"
    ) {
      return value
        .toDate()
        .getTime();
    }

    if (
      typeof value ===
        "object" &&
      value.seconds !==
        undefined
    ) {
      return (
        number(
          value.seconds
        ) * 1000
      );
    }

    const d =
      new Date(value);

    return Number.isNaN(
      d.getTime()
    )
      ? 0
      : d.getTime();
  } catch {
    return 0;
  }
}

/* ============================================================
   HOOK
============================================================ */

export function useInvestmentInvestorProfile(
  investorId
) {
  const [
    investor,
    setInvestor,
  ] = useState(null);

  const [
    accounts,
    setAccounts,
  ] = useState([]);

  const [
    transactions,
    setTransactions,
  ] = useState([]);

  const [
    auditLogs,
    setAuditLogs,
  ] = useState([]);

  const [
    communications,
    setCommunications,
  ] = useState([]);

  const [
    loadingInvestor,
    setLoadingInvestor,
  ] = useState(true);

  const [
    loadingAccounts,
    setLoadingAccounts,
  ] = useState(true);

  const [
    loadingTransactions,
    setLoadingTransactions,
  ] = useState(true);

  const [
    loadingAudit,
    setLoadingAudit,
  ] = useState(true);

  const [
    loadingCommunications,
    setLoadingCommunications,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /* ==========================================================
     INVESTOR
  ========================================================== */

  useEffect(() => {
    if (!investorId) {
      setInvestor(null);
      setLoadingInvestor(false);
      return undefined;
    }

    let db;

    try {
      db =
        getCrmFirestore();
    } catch (firebaseError) {
      console.error(
        "CRM Firestore unavailable:",
        firebaseError
      );

      setError(
        firebaseError?.message ||
          "CRM Firestore is unavailable."
      );

      setLoadingInvestor(false);

      return undefined;
    }

    const reference =
      doc(
        db,
        INVESTORS,
        investorId
      );

    const unsubscribe =
      onSnapshot(
        reference,
        (snapshot) => {
          if (
            !snapshot.exists()
          ) {
            setInvestor(null);
            setError(
              "Investor not found."
            );
          } else {
            setInvestor({
              id:
                snapshot.id,
              ...snapshot.data(),
            });

            setError("");
          }

          setLoadingInvestor(
            false
          );
        },
        (listenerError) => {
          console.error(
            "Investor listener error:",
            listenerError
          );

          setError(
            listenerError?.message ||
              "Failed to load investor."
          );

          setLoadingInvestor(
            false
          );
        }
      );

    return () =>
      unsubscribe();
  }, [investorId]);

  /* ==========================================================
     ACCOUNTS
  ========================================================== */

  useEffect(() => {
    if (!investorId) {
      setAccounts([]);
      setLoadingAccounts(false);
      return undefined;
    }

    let db;

    try {
      db =
        getCrmFirestore();
    } catch (firebaseError) {
      console.error(
        "CRM Firestore unavailable:",
        firebaseError
      );

      setAccounts([]);
      setLoadingAccounts(false);

      return undefined;
    }

    const accountsQuery =
      query(
        collection(
          db,
          ACCOUNTS
        ),
        where(
          "investorId",
          "==",
          investorId
        )
      );

    const unsubscribe =
      onSnapshot(
        accountsQuery,
        (snapshot) => {
          const data =
            snapshot.docs.map(
              (item) => ({
                id:
                  item.id,
                ...item.data(),
              })
            );

          data.sort(
            (a, b) => {
              const aActive =
                clean(
                  a.status
                ).toUpperCase() ===
                "ACTIVE";

              const bActive =
                clean(
                  b.status
                ).toUpperCase() ===
                "ACTIVE";

              if (
                aActive !==
                bActive
              ) {
                return aActive
                  ? -1
                  : 1;
              }

              return clean(
                a.accountNumber
              ).localeCompare(
                clean(
                  b.accountNumber
                )
              );
            }
          );

          setAccounts(
            data
          );

          setLoadingAccounts(
            false
          );
        },
        (listenerError) => {
          console.error(
            "Investment account listener error:",
            listenerError
          );

          setAccounts([]);
          setLoadingAccounts(
            false
          );

          setError(
            listenerError?.message ||
              "Failed to load investment accounts."
          );
        }
      );

    return () =>
      unsubscribe();
  }, [investorId]);

  /* ==========================================================
     TRANSACTIONS
  ========================================================== */

  useEffect(() => {
    if (!accounts.length) {
      setTransactions([]);
      setLoadingTransactions(false);
      return undefined;
    }

    const db =
      getCrmFirestore();

    const transactionMap =
      new Map();

    const loadedAccounts =
      new Set();

    const failedAccounts =
      new Set();

    let cancelled = false;

    setLoadingTransactions(
      true
    );

    const unsubscribers =
      [];

    const publish =
      () => {
        if (cancelled) return;

        const all =
          Array.from(
            transactionMap.values()
          );

        all.sort(
          (a, b) => {
            const monthA =
              number(
                clean(
                  a.transactionMonth
                ).replace(
                  "M",
                  ""
                )
              );

            const monthB =
              number(
                clean(
                  b.transactionMonth
                ).replace(
                  "M",
                  ""
                )
              );

            if (
              monthA !==
              monthB
            ) {
              return (
                monthA -
                monthB
              );
            }

            return (
              timestamp(
                a.transactionDate ||
                  a.createdAt
              ) -
              timestamp(
                b.transactionDate ||
                  b.createdAt
              )
            );
          }
        );

        setTransactions(
          all
        );

        const finished =
          loadedAccounts.size +
            failedAccounts.size ===
          accounts.length;

        if (finished) {
          setLoadingTransactions(
            false
          );
        }
      };

    accounts.forEach(
      (account) => {
        const accountId =
          account.id;

        const transactionsRef =
          collection(
            db,
            ACCOUNTS,
            accountId,
            "transactions"
          );

        /*
         * transactionMonthNumber exists in the current
         * transaction service and gives us the correct
         * M1 -> M2 -> M3 order.
         */
        const transactionQuery =
          query(
            transactionsRef,
            orderBy(
              "transactionMonthNumber",
              "asc"
            )
          );

        const unsubscribe =
          onSnapshot(
            transactionQuery,
            (snapshot) => {
              const prefix =
                `${accountId}:`;

              Array.from(
                transactionMap.keys()
              ).forEach(
                (key) => {
                  if (
                    key.startsWith(
                      prefix
                    )
                  ) {
                    transactionMap.delete(
                      key
                    );
                  }
                }
              );

              snapshot.docs.forEach(
                (item) => {
                  transactionMap.set(
                    `${accountId}:${item.id}`,
                    {
                      id:
                        item.id,

                      accountId,

                      accountNumber:
                        account.accountNumber ||
                        null,

                      investorId:
                        account.investorId ||
                        investorId,

                      schemeId:
                        account.schemeId ||
                        null,

                      schemeName:
                        account
                          ?.schemeSnapshot
                          ?.schemeName ||
                        null,

                      schemeType:
                        account
                          ?.schemeSnapshot
                          ?.schemeType ||
                        null,

                      ...item.data(),
                    }
                  );
                }
              );

              loadedAccounts.add(
                accountId
              );

              failedAccounts.delete(
                accountId
              );

              publish();
            },
            (listenerError) => {
              console.error(
                `Transaction listener error for account ${accountId}:`,
                listenerError
              );

              failedAccounts.add(
                accountId
              );

              loadedAccounts.delete(
                accountId
              );

              publish();
            }
          );

        unsubscribers.push(
          unsubscribe
        );
      }
    );

    return () => {
      cancelled = true;

      unsubscribers.forEach(
        (unsubscribe) =>
          unsubscribe()
      );
    };
  }, [
    accounts,
    investorId,
  ]);

  /* ==========================================================
     AUDIT
  ========================================================== */

  useEffect(() => {
    if (!investorId) {
      setAuditLogs([]);
      setLoadingAudit(false);
      return undefined;
    }

    const db =
      getCrmFirestore();

    const auditQuery =
      query(
        collection(
          db,
          AUDIT_LOGS
        ),
        where(
          "metadata.investorId",
          "==",
          investorId
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        auditQuery,
        (snapshot) => {
          const data =
            snapshot.docs.map(
              (item) => ({
                id:
                  item.id,
                ...item.data(),
              })
            );

          setAuditLogs(
            data
          );

          setLoadingAudit(
            false
          );
        },
        (listenerError) => {
          /*
           * Do not make the entire investor page unusable
           * because the audit index is still building.
           */
          console.warn(
            "Investment audit listener unavailable:",
            listenerError
          );

          setAuditLogs([]);
          setLoadingAudit(
            false
          );
        }
      );

    return () =>
      unsubscribe();
  }, [investorId]);

  /* ==========================================================
     COMMUNICATIONS
  ========================================================== */

  useEffect(() => {
    if (!investorId) {
      setCommunications([]);
      setLoadingCommunications(
        false
      );

      return undefined;
    }

    const db =
      getCrmFirestore();

    const communicationQuery =
      query(
        collection(
          db,
          COMMUNICATIONS
        ),
        where(
          "investorId",
          "==",
          investorId
        ),
        orderBy(
          "sentAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        communicationQuery,
        (snapshot) => {
          const data =
            snapshot.docs.map(
              (item) => ({
                id:
                  item.id,
                ...item.data(),
              })
            );

          setCommunications(
            data
          );

          setLoadingCommunications(
            false
          );
        },
        (listenerError) => {
          console.warn(
            "Investment communication listener unavailable:",
            listenerError
          );

          setCommunications(
            []
          );

          setLoadingCommunications(
            false
          );
        }
      );

    return () =>
      unsubscribe();
  }, [investorId]);

  /* ==========================================================
     SUMMARY
  ========================================================== */

  const summary =
    useMemo(() => {
      const active =
        accounts.filter(
          (account) =>
            clean(
              account.status
            ).toUpperCase() ===
            "ACTIVE"
        );

      const closed =
        accounts.filter(
          (account) =>
            clean(
              account.status
            ).toUpperCase() ===
            "CLOSED"
        );

      let totalAmount = 0;
      let totalGold = 0;

      active.forEach(
        (account) => {
          totalAmount +=
            number(
              account.openingBalanceAmount
            ) +
            number(
              account.totalPaid
            );

          totalGold +=
            number(
              account.openingBalanceGoldGrams
            ) +
            number(
              account.totalGoldCredited
            );
        }
      );

      return {
        totalAccounts:
          accounts.length,

        activeAccounts:
          active.length,

        closedAccounts:
          closed.length,

        totalAmount,

        totalGold,
      };
    }, [accounts]);

  /* ==========================================================
     ACCOUNT-WISE TRANSACTIONS
  ========================================================== */

  const transactionsByAccount =
    useMemo(() => {
      const result = {};

      accounts.forEach(
        (account) => {
          result[
            account.id
          ] = transactions.filter(
            (transaction) =>
              transaction.accountId ===
              account.id
          );
        }
      );

      return result;
    }, [
      accounts,
      transactions,
    ]);

  /* ==========================================================
     RETURN
  ========================================================== */

  return {
    investor,

    accounts,

    transactions,

    transactionsByAccount,

    auditLogs,

    communications,

    summary,

    loading:
      loadingInvestor ||
      loadingAccounts ||
      loadingTransactions ||
      loadingAudit ||
      loadingCommunications,

    loadingInvestor,

    loadingAccounts,

    loadingTransactions,

    loadingAudit,

    loadingCommunications,

    error,

    hasInvestor:
      Boolean(
        investor
      ),

    hasAccounts:
      accounts.length > 0,

    hasTransactions:
      transactions.length > 0,

    hasCommunications:
      communications.length > 0,

    hasAuditHistory:
      auditLogs.length > 0,
  };
}

export default useInvestmentInvestorProfile;