
import { useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  limit,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import {
  getCrmFirebaseAuth,
  getCrmFirestore,
} from "../../../firebase";

import {
  ShieldCheck,
  ShieldAlert,
  Play,
  User,
  Database,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

/*
============================================================
ABHINAVA FIRESTORE SECURITY TEST PAGE
============================================================

This page intentionally bypasses the application service layer
and talks directly to Firestore using the currently authenticated
CRM Firebase session.

Purpose:
- Test deployed Firestore Security Rules
- Test immutable collections
- Test authenticated access
- Detect sensitive document exposure
- Detect dangerous write permissions

IMPORTANT:
This page does NOT automatically modify investmentInvestors
because the current Firestore rules explicitly permit writes
there. Doing so could modify real customer data.

============================================================
*/

const TEST_COLLECTIONS = [
  "investmentInvestors",
  "investmentAccounts",
  "investmentSchemes",
  "investmentAuditLogs",
  "investmentCommunications",
  "investmentSettings",
  "crmSecurity",
];

function StatusIcon({ status }) {
  if (status === "PASS") {
    return (
      <CheckCircle2
        size={17}
        className="text-emerald-600"
      />
    );
  }

  if (status === "FAIL") {
    return (
      <XCircle
        size={17}
        className="text-rose-600"
      />
    );
  }

  if (status === "WARNING") {
    return (
      <AlertTriangle
        size={17}
        className="text-amber-600"
      />
    );
  }

  return (
    <ShieldCheck
      size={17}
      className="text-slate-400"
    />
  );
}

function ResultRow({
  status,
  title,
  detail,
  latency,
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mt-0.5 shrink-0">
        <StatusIcon status={status} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-900">
            {title}
          </p>

          <span
            className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              status === "PASS"
                ? "bg-emerald-50 text-emerald-700"
                : status === "FAIL"
                ? "bg-rose-50 text-rose-700"
                : status === "WARNING"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {status}
          </span>
        </div>

        {detail && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {detail}
          </p>
        )}

        {latency !== undefined && (
          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            {latency} ms
          </p>
        )}
      </div>
    </div>
  );
}

export default function InvestmentSecurityTestPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const [investorId, setInvestorId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [auditId, setAuditId] = useState("");
  const [communicationId, setCommunicationId] = useState("");

  const addResult = (
    next,
    status,
    title,
    detail = "",
    latency
  ) => {
    next.push({
      status,
      title,
      detail,
      latency,
    });
  };

  const runTest = async () => {
    setRunning(true);
    setResults([]);
    setError("");

    const next = [];

    try {
      const auth = getCrmFirebaseAuth();
      const db = getCrmFirestore();

      /*
      ========================================================
      1. AUTHENTICATION
      ========================================================
      */

      const user = auth.currentUser;

      if (!user) {
        addResult(
          next,
          "FAIL",
          "Authenticated Firebase session",
          "No Firebase user is currently authenticated."
        );

        setResults(next);
        return;
      }

      addResult(
        next,
        "PASS",
        "Authenticated Firebase session",
        `UID: ${user.uid} | Email: ${
          user.email || "not available"
        }`
      );

      /*
      ========================================================
      2. BASIC COLLECTION READ TEST
      ========================================================
      */

      for (const collectionName of TEST_COLLECTIONS) {
        const start = performance.now();

        try {
          const snapshot = await getDocs(
            query(
              collection(db, collectionName),
              limit(1)
            )
          );

          addResult(
            next,
            "PASS",
            `${collectionName} read access`,
            `Authenticated user can query this collection. Returned ${
              snapshot.size
            } document(s) in the test query.`,
            Math.round(performance.now() - start)
          );
        } catch (err) {
          addResult(
            next,
            "FAIL",
            `${collectionName} read access`,
            `${err?.code || "unknown"}: ${
              err?.message || err
            }`,
            Math.round(performance.now() - start)
          );
        }
      }

      /*
      ========================================================
      3. INVESTOR SECURITY
      ========================================================

      We intentionally DO NOT execute an update/delete against
      a real investor.

      Your current rules say:

          allow read, write: if request.auth != null;

      Therefore an authenticated user can currently modify
      investor documents directly.

      This is reported as a WARNING rather than actually
      modifying customer data.
      ========================================================
      */

      addResult(
        next,
        "WARNING",
        "Investment investor write authorization",
        "The current Firestore rule permits authenticated users to create, update, and delete investmentInvestors documents. No destructive tampering operation was executed against a real investor."
      );

      /*
      ========================================================
      4. INVESTMENT ACCOUNT IMMUTABILITY
      ========================================================
      */

      if (accountId.trim()) {
        const ref = doc(
          db,
          "investmentAccounts",
          accountId.trim()
        );

        const start = performance.now();

        try {
          const snapshot = await getDoc(ref);

          if (!snapshot.exists()) {
            addResult(
              next,
              "WARNING",
              "Investment account test record",
              "The supplied account ID does not exist. Tampering test was skipped."
            );
          } else {
            addResult(
              next,
              "PASS",
              "Investment account readable",
              `Account ${accountId.trim()} exists.`,
              Math.round(performance.now() - start)
            );

            /*
            ----------------------------------------------------
            UPDATE SHOULD BE DENIED
            ----------------------------------------------------
            */

            const updateStart =
              performance.now();

            try {
              await updateDoc(ref, {
                __abhinavaSecurityTest:
                  "TAMPER_ATTEMPT",
              });

              addResult(
                next,
                "FAIL",
                "Investment account update protection",
                "CRITICAL: Firestore allowed an account update that should be denied.",
                Math.round(
                  performance.now() - updateStart
                )
              );
            } catch (err) {
              if (
                err?.code ===
                "permission-denied"
              ) {
                addResult(
                  next,
                  "PASS",
                  "Investment account update protection",
                  "Firestore correctly rejected direct account tampering.",
                  Math.round(
                    performance.now() - updateStart
                  )
                );
              } else {
                addResult(
                  next,
                  "FAIL",
                  "Investment account update protection",
                  `${err?.code || "unknown"}: ${
                    err?.message || err
                  }`,
                  Math.round(
                    performance.now() - updateStart
                  )
                );
              }
            }

            /*
            ----------------------------------------------------
            DELETE SHOULD BE DENIED
            ----------------------------------------------------
            */

            const deleteStart =
              performance.now();

            try {
              await deleteDoc(ref);

              addResult(
                next,
                "FAIL",
                "Investment account deletion protection",
                "CRITICAL: Firestore allowed deletion of an investment account.",
                Math.round(
                  performance.now() - deleteStart
                )
              );
            } catch (err) {
              if (
                err?.code ===
                "permission-denied"
              ) {
                addResult(
                  next,
                  "PASS",
                  "Investment account deletion protection",
                  "Firestore correctly rejected account deletion.",
                  Math.round(
                    performance.now() - deleteStart
                  )
                );
              } else {
                addResult(
                  next,
                  "FAIL",
                  "Investment account deletion protection",
                  `${err?.code || "unknown"}: ${
                    err?.message || err
                  }`,
                  Math.round(
                    performance.now() - deleteStart
                  )
                );
              }
            }
          }
        } catch (err) {
          addResult(
            next,
            "FAIL",
            "Investment account read",
            `${err?.code || "unknown"}: ${
              err?.message || err
            }`
          );
        }
      } else {
        addResult(
          next,
          "WARNING",
          "Investment account tampering tests",
          "Enter an investment account ID to run the direct tampering tests."
        );
      }

      /*
      ========================================================
      5. TRANSACTION IMMUTABILITY
      ========================================================
      */

      if (
        accountId.trim() &&
        transactionId.trim()
      ) {
        const ref = doc(
          db,
          "investmentAccounts",
          accountId.trim(),
          "transactions",
          transactionId.trim()
        );

        const start = performance.now();

        try {
          const snapshot = await getDoc(ref);

          if (!snapshot.exists()) {
            addResult(
              next,
              "WARNING",
              "Transaction test record",
              "The supplied transaction ID does not exist."
            );
          } else {
            addResult(
              next,
              "PASS",
              "Investment transaction readable",
              `Transaction ${transactionId.trim()} exists.`,
              Math.round(performance.now() - start)
            );

            /*
            ----------------------------------------------------
            UPDATE
            ----------------------------------------------------
            */

            const updateStart =
              performance.now();

            try {
              await updateDoc(ref, {
                __abhinavaSecurityTest:
                  "TAMPER_ATTEMPT",
              });

              addResult(
                next,
                "FAIL",
                "Transaction update protection",
                "CRITICAL: Firestore allowed modification of an immutable transaction.",
                Math.round(
                  performance.now() - updateStart
                )
              );
            } catch (err) {
              if (
                err?.code ===
                "permission-denied"
              ) {
                addResult(
                  next,
                  "PASS",
                  "Transaction update protection",
                  "Firestore correctly rejected transaction modification.",
                  Math.round(
                    performance.now() - updateStart
                  )
                );
              } else {
                addResult(
                  next,
                  "FAIL",
                  "Transaction update protection",
                  `${err?.code || "unknown"}: ${
                    err?.message || err
                  }`,
                  Math.round(
                    performance.now() - updateStart
                  )
                );
              }
            }

            /*
            ----------------------------------------------------
            DELETE
            ----------------------------------------------------
            */

            const deleteStart =
              performance.now();

            try {
              await deleteDoc(ref);

              addResult(
                next,
                "FAIL",
                "Transaction deletion protection",
                "CRITICAL: Firestore allowed deletion of an immutable transaction.",
                Math.round(
                  performance.now() - deleteStart
                )
              );
            } catch (err) {
              if (
                err?.code ===
                "permission-denied"
              ) {
                addResult(
                  next,
                  "PASS",
                  "Transaction deletion protection",
                  "Firestore correctly rejected transaction deletion.",
                  Math.round(
                    performance.now() - deleteStart
                  )
                );
              } else {
                addResult(
                  next,
                  "FAIL",
                  "Transaction deletion protection",
                  `${err?.code || "unknown"}: ${
                    err?.message || err
                  }`,
                  Math.round(
                    performance.now() - deleteStart
                  )
                );
              }
            }
          }
        } catch (err) {
          addResult(
            next,
            "FAIL",
            "Transaction read",
            `${err?.code || "unknown"}: ${
              err?.message || err
            }`
          );
        }
      } else {
        addResult(
          next,
          "WARNING",
          "Transaction tampering tests",
          "Enter both account ID and transaction ID."
        );
      }

      /*
      ========================================================
      6. AUDIT LOG IMMUTABILITY
      ========================================================
      */

      if (auditId.trim()) {
        const ref = doc(
          db,
          "investmentAuditLogs",
          auditId.trim()
        );

        const start = performance.now();

        try {
          const snapshot = await getDoc(ref);

          if (!snapshot.exists()) {
            addResult(
              next,
              "WARNING",
              "Audit log test record",
              "The supplied audit log ID does not exist."
            );
          } else {
            addResult(
              next,
              "PASS",
              "Audit log readable",
              `Audit log ${auditId.trim()} exists.`,
              Math.round(performance.now() - start)
            );

            const updateStart =
              performance.now();

            try {
              await updateDoc(ref, {
                description:
                  "__ABHINAVA_TAMPER_TEST__",
              });

              addResult(
                next,
                "FAIL",
                "Audit log update protection",
                "CRITICAL: Firestore allowed modification of an audit log.",
                Math.round(
                  performance.now() - updateStart
                )
              );
            } catch (err) {
              if (
                err?.code ===
                "permission-denied"
              ) {
                addResult(
                  next,
                  "PASS",
                  "Audit log update protection",
                  "Firestore correctly rejected audit modification.",
                  Math.round(
                    performance.now() - updateStart
                  )
                );
              } else {
                addResult(
                  next,
                  "FAIL",
                  "Audit log update protection",
                  `${err?.code || "unknown"}: ${
                    err?.message || err
                  }`
                );
              }
            }

            const deleteStart =
              performance.now();

            try {
              await deleteDoc(ref);

              addResult(
                next,
                "FAIL",
                "Audit log deletion protection",
                "CRITICAL: Firestore allowed deletion of an audit log.",
                Math.round(
                  performance.now() - deleteStart
                )
              );
            } catch (err) {
              if (
                err?.code ===
                "permission-denied"
              ) {
                addResult(
                  next,
                  "PASS",
                  "Audit log deletion protection",
                  "Firestore correctly rejected audit deletion.",
                  Math.round(
                    performance.now() - deleteStart
                  )
                );
              } else {
                addResult(
                  next,
                  "FAIL",
                  "Audit log deletion protection",
                  `${err?.code || "unknown"}: ${
                    err?.message || err
                  }`
                );
              }
            }
          }
        } catch (err) {
          addResult(
            next,
            "FAIL",
            "Audit log read",
            `${err?.code || "unknown"}: ${
              err?.message || err
            }`
          );
        }
      } else {
        addResult(
          next,
          "WARNING",
          "Audit log tampering tests",
          "Enter an audit log ID."
        );
      }

      /*
      ========================================================
      7. COMMUNICATION IMMUTABILITY
      ========================================================
      */

      if (communicationId.trim()) {
        const ref = doc(
          db,
          "investmentCommunications",
          communicationId.trim()
        );

        try {
          const snapshot = await getDoc(ref);

          if (!snapshot.exists()) {
            addResult(
              next,
              "WARNING",
              "Communication test record",
              "The supplied communication ID does not exist."
            );
          } else {
            addResult(
              next,
              "PASS",
              "Investment communication readable",
              `Communication ${communicationId.trim()} exists.`
            );

            try {
              await updateDoc(ref, {
                __abhinavaSecurityTest:
                  "TAMPER_ATTEMPT",
              });

              addResult(
                next,
                "FAIL",
                "Communication update protection",
                "CRITICAL: Firestore allowed modification of an immutable communication."
              );
            } catch (err) {
              if (
                err?.code ===
                "permission-denied"
              ) {
                addResult(
                  next,
                  "PASS",
                  "Communication update protection",
                  "Firestore correctly rejected communication modification."
                );
              } else {
                addResult(
                  next,
                  "FAIL",
                  "Communication update protection",
                  `${err?.code || "unknown"}: ${
                    err?.message || err
                  }`
                );
              }
            }

            try {
              await deleteDoc(ref);

              addResult(
                next,
                "FAIL",
                "Communication deletion protection",
                "CRITICAL: Firestore allowed deletion of an immutable communication."
              );
            } catch (err) {
              if (
                err?.code ===
                "permission-denied"
              ) {
                addResult(
                  next,
                  "PASS",
                  "Communication deletion protection",
                  "Firestore correctly rejected communication deletion."
                );
              } else {
                addResult(
                  next,
                  "FAIL",
                  "Communication deletion protection",
                  `${err?.code || "unknown"}: ${
                    err?.message || err
                  }`
                );
              }
            }
          }
        } catch (err) {
          addResult(
            next,
            "FAIL",
            "Communication read",
            `${err?.code || "unknown"}: ${
              err?.message || err
            }`
          );
        }
      } else {
        addResult(
          next,
          "WARNING",
          "Communication tampering tests",
          "Enter a communication ID."
        );
      }

      /*
      ========================================================
      8. CRM SECURITY DOCUMENT EXPOSURE
      ========================================================

      READ ONLY.

      We deliberately do not modify crmSecurity.
      ========================================================
      */

      try {
        const snapshot = await getDocs(
          query(
            collection(db, "crmSecurity"),
            limit(5)
          )
        );

        if (snapshot.empty) {
          addResult(
            next,
            "WARNING",
            "crmSecurity exposure",
            "No crmSecurity documents were returned."
          );
        } else {
          const documents =
            snapshot.docs.map((item) => ({
              id: item.id,
              fields:
                Object.keys(item.data()),
            }));

          addResult(
            next,
            "FAIL",
            "crmSecurity exposure",
            `Authenticated user can read crmSecurity documents. Fields exposed: ${documents
              .map(
                (item) =>
                  `${item.id} [${item.fields.join(
                    ", "
                  )}]`
              )
              .join("; ")}`
          );
        }
      } catch (err) {
        if (
          err?.code ===
          "permission-denied"
        ) {
          addResult(
            next,
            "PASS",
            "crmSecurity exposure protection",
            "Authenticated user cannot read crmSecurity."
          );
        } else {
          addResult(
            next,
            "FAIL",
            "crmSecurity exposure test",
            `${err?.code || "unknown"}: ${
              err?.message || err
            }`
          );
        }
      }

      /*
      ========================================================
      COMPLETE
      ========================================================
      */

      setResults(next);
    } catch (err) {
      setError(
        `${err?.message || err}`
      );
    } finally {
      setRunning(false);
    }
  };

  const passed =
    results.filter(
      (item) => item.status === "PASS"
    ).length;

  const failed =
    results.filter(
      (item) => item.status === "FAIL"
    ).length;

  const warnings =
    results.filter(
      (item) => item.status === "WARNING"
    ).length;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#faf8f3] p-4 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B241E]">
              <ShieldCheck
                size={21}
                className="text-white"
              />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#87968C]">
                Abhinava Security
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-[#1B241E]">
                Firestore Security Test
              </h1>
            </div>
          </div>

          <p className="max-w-3xl text-sm font-medium leading-relaxed text-[#68786D]">
            Directly tests the deployed Firestore Security Rules
            using your currently authenticated CRM Google account.
            This bypasses the application service layer.
          </p>
        </div>

        {/* WARNING */}

        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>
            <p className="text-sm font-bold text-amber-900">
              Live tenant security test
            </p>

            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              This uses the currently logged-in Firebase
              account and the active tenant Firestore. The
              tester deliberately attempts operations that
              should be denied. It does not modify or delete
              real investor records automatically.
            </p>
          </div>
        </div>

        {/* CURRENT USER */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <User
                size={18}
                className="text-slate-600"
              />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Current Firebase session
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {getCrmFirebaseAuth()
                  .currentUser?.email ||
                  "No authenticated user"}
              </p>
            </div>
          </div>
        </div>

        {/* IDS */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Database
              size={16}
              className="text-[#345343]"
            />

            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
              Test Record IDs
            </h2>
          </div>

          <p className="mb-4 text-xs leading-relaxed text-slate-500">
            Enter existing record IDs for the immutable-record
            tests. The tester will attempt updates/deletes that
            should be rejected by your rules.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">

            <input
              value={investorId}
              onChange={(e) =>
                setInvestorId(e.target.value)
              }
              placeholder="Investor ID — informational only"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#345343]"
            />

            <input
              value={accountId}
              onChange={(e) =>
                setAccountId(e.target.value)
              }
              placeholder="Investment Account ID"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#345343]"
            />

            <input
              value={transactionId}
              onChange={(e) =>
                setTransactionId(e.target.value)
              }
              placeholder="Transaction ID"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#345343]"
            />

            <input
              value={auditId}
              onChange={(e) =>
                setAuditId(e.target.value)
              }
              placeholder="Audit Log ID"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#345343]"
            />

            <input
              value={communicationId}
              onChange={(e) =>
                setCommunicationId(e.target.value)
              }
              placeholder="Communication ID"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#345343]"
            />

          </div>
        </div>

        {/* RUN */}

        <button
          type="button"
          disabled={running}
          onClick={runTest}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1B241E] px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#345343] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />

              Running security tests...
            </>
          ) : (
            <>
              <Play
                size={17}
                fill="currentColor"
              />

              Run Firestore Security Tests
            </>
          )}
        </button>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        {results.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                Passed
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-800">
                {passed}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
                Failed
              </p>

              <p className="mt-1 text-2xl font-bold text-rose-800">
                {failed}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                Warnings
              </p>

              <p className="mt-1 text-2xl font-bold text-amber-800">
                {warnings}
              </p>
            </div>

          </div>
        )}

        {/* RESULTS */}

        {results.length > 0 && (
          <div className="space-y-2.5">

            {results.map(
              (item, index) => (
                <ResultRow
                  key={`${item.title}-${index}`}
                  status={item.status}
                  title={item.title}
                  detail={item.detail}
                  latency={item.latency}
                />
              )
            )}

          </div>
        )}

        {/* EMPTY */}

        {results.length === 0 &&
          !running && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
              <Lock
                size={28}
                className="text-slate-300"
              />

              <p className="mt-3 text-sm font-bold text-slate-700">
                Security tests have not been run yet.
              </p>

              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                Login to the CRM normally with Google, enter
                the relevant test record IDs, and run the
                security test.
              </p>
            </div>
          )}

      </div>
    </div>
  );
}

