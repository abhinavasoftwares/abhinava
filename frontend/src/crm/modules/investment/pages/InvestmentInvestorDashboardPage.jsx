import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import {
  getCrmFirebaseAuth,
  getCrmFirestore,
} from "../../../firebase";

import {
  IndianRupee,
  Wallet,
  CalendarDays,
  ShieldCheck,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
} from "lucide-react";


/* ============================================================
   COLLECTIONS
============================================================ */

const USERS_COLLECTION =
  "users";

const INVESTORS_COLLECTION =
  "investmentInvestors";

const ACCOUNTS_COLLECTION =
  "investmentAccounts";

const TRANSACTIONS_COLLECTION =
  "transactions";


/* ============================================================
   HELPERS
============================================================ */

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

  return Number.isFinite(result)
    ? result
    : fallback;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    number(value)
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    if (
      typeof value === "object" &&
      typeof value.toDate === "function"
    ) {
      return value
        .toDate()
        .toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "—";
  }
}

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  try {
    if (
      typeof value === "object" &&
      typeof value.toDate === "function"
    ) {
      return value
        .toDate()
        .getTime();
    }

    if (
      typeof value === "object" &&
      value.seconds !== undefined
    ) {
      return (
        number(value.seconds) *
        1000
      );
    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? 0
      : date.getTime();
  } catch {
    return 0;
  }
}

function getAccountBalance(account) {
  return number(
    account?.totalPaid ??
      account?.totalInvested ??
      account?.balance ??
      0
  );
}

function getTransactionAmount(transaction) {
  return number(
    transaction?.amountPaid ??
      transaction?.amount ??
      transaction?.paidAmount ??
      0
  );
}

function getTransactionDate(transaction) {
  return (
    transaction?.transactionDate ||
    transaction?.paymentDate ||
    transaction?.createdAt ||
    null
  );
}


/* ============================================================
   PAGE
============================================================ */

export default function InvestmentInvestorDashboardPage() {

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    investorId,
    setInvestorId,
  ] = useState("");

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


  /* ==========================================================
     AUTHENTICATED USER
  ========================================================== */

  useEffect(() => {

    let cancelled = false;

    async function loadInvestorIdentity() {

      try {

        setLoading(true);
        setError("");

        const auth =
          getCrmFirebaseAuth();

        const user =
          auth.currentUser;

        if (!user) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        const db =
          getCrmFirestore();

        /*
         * IMPORTANT:
         *
         * We do NOT take investorId from:
         *
         *   URL
         *   query parameter
         *   localStorage
         *   React state
         *   user input
         *
         * We obtain it from the trusted users/{uid}
         * authorization document.
         */

        const userReference =
          doc(
            db,
            USERS_COLLECTION,
            user.uid
          );

        const userSnapshot =
          await getDoc(
            userReference
          );

        if (
          !userSnapshot.exists()
        ) {
          throw new Error(
            "Your CRM authorization profile was not found."
          );
        }

        const userData =
          userSnapshot.data();

        if (
          clean(userData.role)
            .toUpperCase() !==
          "INVESTOR"
        ) {
          throw new Error(
            "This page is available only to investor accounts."
          );
        }

        if (
          clean(userData.status)
            .toUpperCase() !==
          "ACTIVE"
        ) {
          throw new Error(
            "Your investor account is currently inactive."
          );
        }

        const resolvedInvestorId =
          clean(
            userData.investorId
          );

        if (!resolvedInvestorId) {
          throw new Error(
            "Your investor profile is not linked yet."
          );
        }

        if (cancelled) {
          return;
        }

        setInvestorId(
          resolvedInvestorId
        );

      } catch (identityError) {

        console.error(
          "Failed to resolve investor identity:",
          identityError
        );

        if (!cancelled) {
          setError(
            identityError?.message ||
              "Unable to load your investor account."
          );

          setLoading(false);
        }

      }
    }

    loadInvestorIdentity();

    return () => {
      cancelled = true;
    };

  }, []);


  /* ==========================================================
     INVESTOR PROFILE
  ========================================================== */

  useEffect(() => {

    if (!investorId) {
      return undefined;
    }

    const db =
      getCrmFirestore();

    const investorReference =
      doc(
        db,
        INVESTORS_COLLECTION,
        investorId
      );

    const unsubscribe =
      onSnapshot(
        investorReference,
        (snapshot) => {

          if (
            !snapshot.exists()
          ) {
            setError(
              "Your investment profile could not be found."
            );

            setInvestor(null);
            setLoading(false);
            return;
          }

          setInvestor({
            id:
              snapshot.id,
            ...snapshot.data(),
          });

          setLoading(false);
        },
        (snapshotError) => {

          console.error(
            "Investor profile listener failed:",
            snapshotError
          );

          setError(
            snapshotError?.message ||
              "Unable to load investor profile."
          );

          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };

  }, [investorId]);


  /* ==========================================================
     INVESTMENT ACCOUNTS
  ========================================================== */

  useEffect(() => {

    if (!investorId) {
      setAccounts([]);
      return undefined;
    }

    const db =
      getCrmFirestore();

    const accountsQuery =
      query(
        collection(
          db,
          ACCOUNTS_COLLECTION
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

          const nextAccounts =
            snapshot.docs.map(
              (item) => ({
                id:
                  item.id,

                ...item.data(),
              })
            );

          nextAccounts.sort(
            (a, b) =>
              clean(
                a.accountNumber
              ).localeCompare(
                clean(
                  b.accountNumber
                )
              )
          );

          setAccounts(
            nextAccounts
          );
        },
        (snapshotError) => {

          console.error(
            "Investor accounts listener failed:",
            snapshotError
          );

          setError(
            snapshotError?.message ||
              "Unable to load investment accounts."
          );
        }
      );

    return () => {
      unsubscribe();
    };

  }, [investorId]);


  /* ==========================================================
     TRANSACTIONS
     
     We intentionally listen only to transactions belonging to
     accounts already resolved using the authenticated investorId.
  ========================================================== */

  useEffect(() => {

    if (!accounts.length) {
      setTransactions([]);
      return undefined;
    }

    const db =
      getCrmFirestore();

    const unsubscribers = [];

    const transactionMap =
      new Map();

    accounts.forEach(
      (account) => {

        const transactionsReference =
          collection(
            db,
            ACCOUNTS_COLLECTION,
            account.id,
            TRANSACTIONS_COLLECTION
          );

        const transactionsQuery =
          query(
            transactionsReference,
            orderBy(
              "transactionMonthNumber",
              "asc"
            )
          );

        const unsubscribe =
          onSnapshot(
            transactionsQuery,
            (snapshot) => {

              const prefix =
                `${account.id}:`;

              /*
               * Remove previous transactions
               * belonging to this account.
               */
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
                    `${account.id}:${item.id}`,
                    {
                      id:
                        item.id,

                      accountId:
                        account.id,

                      accountNumber:
                        account.accountNumber ||
                        account.id,

                      ...item.data(),
                    }
                  );
                }
              );

              const nextTransactions =
                Array.from(
                  transactionMap.values()
                );

              nextTransactions.sort(
                (a, b) =>
                  getTimestamp(
                    getTransactionDate(b)
                  ) -
                  getTimestamp(
                    getTransactionDate(a)
                  )
              );

              setTransactions(
                nextTransactions
              );
            },
            (snapshotError) => {

              console.error(
                "Investor transactions listener failed:",
                snapshotError
              );

              setError(
                snapshotError?.message ||
                  "Unable to load investment transactions."
              );
            }
          );

        unsubscribers.push(
          unsubscribe
        );
      }
    );

    return () => {

      unsubscribers.forEach(
        (unsubscribe) =>
          unsubscribe()
      );

    };

  }, [accounts]);


  /* ==========================================================
     SUMMARY
  ========================================================== */

  const summary =
    useMemo(() => {

      const totalInvested =
        accounts.reduce(
          (
            total,
            account
          ) =>
            total +
            getAccountBalance(
              account
            ),
          0
        );

      const totalTransactions =
        transactions.length;

      const activeAccounts =
        accounts.filter(
          (account) =>
            clean(
              account.status
            ).toUpperCase() ===
            "ACTIVE"
        ).length;

      const latestTransaction =
        transactions[0] ||
        null;

      return {
        totalInvested,
        totalTransactions,
        activeAccounts,
        latestTransaction,
      };

    }, [
      accounts,
      transactions,
    ]);


  /* ==========================================================
     REFRESH
  ========================================================== */

  function handleRefresh() {

    /*
     * Firestore listeners already provide realtime updates.
     *
     * This button simply gives the investor visible feedback.
     */
    setRefreshing(true);

    window.setTimeout(
      () => {
        setRefreshing(false);
      },
      500
    );
  }


  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">

        <div className="flex flex-col items-center">

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">

            <RefreshCw
              size={22}
              className="animate-spin text-slate-700"
            />

          </div>

          <p className="text-sm font-semibold text-slate-600">
            Loading your investment account...
          </p>

        </div>

      </div>
    );
  }


  /* ==========================================================
     ERROR
  ========================================================== */

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">

        <div className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">

            <CircleAlert
              size={28}
              className="text-rose-500"
            />

          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Investment account unavailable
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

        </div>

      </div>
    );
  }


  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <ShieldCheck
                size={16}
                className="text-emerald-600"
              />

              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                Secure Investor Portal
              </span>

            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Welcome{investor?.fullName
                ? `, ${investor.fullName}`
                : ""}
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500">
              View your investment accounts and transaction history.
            </p>

          </div>


          <button
            type="button"
            onClick={
              handleRefresh
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >

            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh

          </button>

        </div>


        {/* ======================================================
            SUMMARY CARDS
        ====================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            icon={IndianRupee}
            label="Total Invested"
            value={formatCurrency(
              summary.totalInvested
            )}
          />

          <SummaryCard
            icon={Wallet}
            label="Investment Accounts"
            value={String(
              accounts.length
            )}
          />

          <SummaryCard
            icon={CheckCircle2}
            label="Active Accounts"
            value={String(
              summary.activeAccounts
            )}
          />

          <SummaryCard
            icon={CalendarDays}
            label="Transactions"
            value={String(
              summary.totalTransactions
            )}
          />

        </div>


        {/* ======================================================
            ACCOUNTS
        ====================================================== */}

        <section className="mt-6">

          <div className="mb-3 flex items-center justify-between">

            <div>

              <h2 className="text-base font-bold text-slate-900">
                My Investment Accounts
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Accounts linked to your investor profile.
              </p>

            </div>

          </div>


          {accounts.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">

              <Wallet
                size={28}
                className="mx-auto mb-3 text-slate-300"
              />

              <p className="text-sm font-bold text-slate-700">
                No investment accounts found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Please contact the business if you believe this is incorrect.
              </p>

            </div>

          ) : (

            <div className="grid gap-4 lg:grid-cols-2">

              {accounts.map(
                (account) => {

                  const accountTransactions =
                    transactions.filter(
                      (transaction) =>
                        transaction.accountId ===
                        account.id
                    );

                  const accountTotal =
                    accountTransactions.reduce(
                      (
                        total,
                        transaction
                      ) =>
                        total +
                        getTransactionAmount(
                          transaction
                        ),
                      0
                    );

                  const status =
                    clean(
                      account.status ||
                      "ACTIVE"
                    ).toUpperCase();

                  return (
                    <div
                      key={account.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Account Number
                          </p>

                          <p className="mt-1 font-mono text-sm font-black text-slate-900">
                            {account.accountNumber ||
                              account.id}
                          </p>

                        </div>


                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {status}
                        </span>

                      </div>


                      <div className="mt-5 grid grid-cols-2 gap-3">

                        <div className="rounded-xl bg-slate-50 p-3">

                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Scheme
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-800">
                            {account
                              ?.schemeSnapshot
                              ?.name ||
                              account.schemeName ||
                              "Investment Scheme"}
                          </p>

                        </div>


                        <div className="rounded-xl bg-slate-50 p-3">

                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Transactions
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-800">
                            {
                              accountTransactions.length
                            }
                          </p>

                        </div>

                      </div>


                      <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">

                        <div className="flex items-center justify-between">

                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Recorded Contributions
                          </span>

                          <span className="text-sm font-black text-slate-900">
                            {formatCurrency(
                              accountTotal
                            )}
                          </span>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>


        {/* ======================================================
            TRANSACTIONS
        ====================================================== */}

        <section className="mt-6">

          <div className="mb-3 flex items-center justify-between">

            <div>

              <h2 className="text-base font-bold text-slate-900">
                Transaction History
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Read-only record of transactions posted to your accounts.
              </p>

            </div>

          </div>


          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {transactions.length === 0 ? (

              <div className="p-10 text-center">

                <Clock3
                  size={26}
                  className="mx-auto mb-3 text-slate-300"
                />

                <p className="text-sm font-bold text-slate-700">
                  No transactions recorded yet
                </p>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="min-w-[850px] w-full border-collapse">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Account
                      </th>

                      <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Month
                      </th>

                      <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Date
                      </th>

                      <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Mode
                      </th>

                      <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Reference
                      </th>

                      <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Amount
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {transactions.map(
                      (transaction) => (

                        <tr
                          key={`${transaction.accountId}:${transaction.id}`}
                          className="border-b border-slate-100 last:border-0"
                        >

                          <td className="px-4 py-3">

                            <span className="font-mono text-xs font-bold text-slate-800">
                              {transaction.accountNumber}
                            </span>

                          </td>


                          <td className="px-4 py-3">

                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">
                              {transaction.transactionMonth ||
                                transaction.month ||
                                "—"}
                            </span>

                          </td>


                          <td className="px-4 py-3 text-xs font-medium text-slate-600">
                            {formatDate(
                              getTransactionDate(
                                transaction
                              )
                            )}
                          </td>


                          <td className="px-4 py-3 text-xs font-bold text-slate-700">
                            {transaction.paymentMode ||
                              transaction.transactionMode ||
                              "—"}
                          </td>


                          <td className="px-4 py-3">

                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-700">

                              {transaction.transactionReference ||
                                transaction.referenceNumber ||
                                transaction.receiptNumber ||
                                "—"}

                              {transaction.receiptNumber && (
                                <ArrowUpRight
                                  size={11}
                                  className="text-slate-400"
                                />
                              )}

                            </span>

                          </td>


                          <td className="px-4 py-3 text-right">

                            <span className="text-sm font-black text-slate-900">
                              {formatCurrency(
                                getTransactionAmount(
                                  transaction
                                )
                              )}
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>


        {/* ======================================================
            SECURITY NOTICE
        ====================================================== */}

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">

          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <div>

            <p className="text-xs font-black text-emerald-900">
              Read-only investment access
            </p>

            <p className="mt-1 text-[11px] leading-5 text-emerald-800">
              Your investment records are displayed from your
              authenticated investor profile. Financial transaction
              records cannot be edited or deleted from this portal.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}


/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon: Icon,
  label,
  value,
}) {

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">

          <Icon
            size={18}
            className="text-slate-700"
          />

        </div>

        <div className="min-w-0">

          <p className="truncate text-[9px] font-black uppercase tracking-widest text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-lg font-black tracking-tight text-slate-900">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}