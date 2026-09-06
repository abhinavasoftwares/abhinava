import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

import {
  Database,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const TEST_PREFIX =
  "__ABHINAVA_LOAD_TEST__";

const TARGET_INVESTORS = 15000;
const TARGET_ACCOUNTS = 5000;

const BATCH_SIZE = 450;

async function getTestData(db) {
  const [
    investorSnapshot,
    accountSnapshot,
  ] = await Promise.all([
    getDocs(
      query(
        collection(
          db,
          "investmentInvestors"
        ),
        where(
          "__abhinavaLoadTest",
          "==",
          true
        )
      )
    ),

    getDocs(
      query(
        collection(
          db,
          "investmentAccounts"
        ),
        where(
          "__abhinavaLoadTest",
          "==",
          true
        )
      )
    ),
  ]);

  return {
    investors:
      investorSnapshot.docs,

    accounts:
      accountSnapshot.docs,
  };
}

export default function InvestmentLoadTestPage() {
  const [counts, setCounts] = useState({
    investors: 0,
    accounts: 0,
  });

  const [checking, setChecking] =
    useState(true);

  const [running, setRunning] =
    useState(false);

  const [cleaning, setCleaning] =
    useState(false);

  const [progress, setProgress] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const refreshCounts =
    async () => {
      setChecking(true);
      setError("");

      try {
        const db =
          getCrmFirestore();

        const data =
          await getTestData(db);

        setCounts({
          investors:
            data.investors.length,

          accounts:
            data.accounts.length,
        });
      } catch (err) {
        console.error(err);

        setError(
          `${err?.code || "unknown"}: ${
            err?.message || err
          }`
        );
      } finally {
        setChecking(false);
      }
    };

  useEffect(() => {
    refreshCounts();
  }, []);

  /*
  ============================================================
  CREATE / COMPLETE TARGET DATASET
  ============================================================
  */

  const createTargetDataset =
    async () => {
      setRunning(true);
      setMessage("");
      setError("");

      try {
        const db =
          getCrmFirestore();

        /*
        --------------------------------------------------------
        STEP 1
        GET EXISTING TEST INVESTORS
        --------------------------------------------------------
        */

        setProgress(
          "Checking existing test investors..."
        );

        const existing =
          await getTestData(db);

        let investorDocs =
          [...existing.investors];

        /*
        --------------------------------------------------------
        STEP 2
        CREATE MISSING INVESTORS
        --------------------------------------------------------
        */

        const investorsNeeded =
          Math.max(
            0,
            TARGET_INVESTORS -
              investorDocs.length
          );

        if (
          investorsNeeded > 0
        ) {
          setProgress(
            `Creating ${investorsNeeded.toLocaleString()} investors...`
          );

          let batch =
            writeBatch(db);

          let batchCount = 0;

          const startIndex =
            investorDocs.length + 1;

          for (
            let i = 0;
            i < investorsNeeded;
            i++
          ) {
            const index =
              startIndex + i;

            const ref = doc(
              collection(
                db,
                "investmentInvestors"
              )
            );

            batch.set(ref, {
              fullName:
                `${TEST_PREFIX}_INVESTOR_${String(
                  index
                ).padStart(5, "0")}`,

              mobileNumber:
                `9${String(
                  index
                ).padStart(9, "0")}`,

              alternateMobileNumber:
                "",

              email:
                `abhinava-loadtest-${index}@invalid.local`,

              dateOfBirth:
                "",

              gender:
                "",

              address:
                "ABHINAVA LOAD TEST DATA",

              city:
                "LOAD TEST",

              pincode:
                "000000",

              status:
                "ACTIVE",

              accountSummary: {
                totalAccounts: 0,
                activeAccounts: 0,
                closedAccounts: 0,
                activeAccountNumbers: [],
                closedAccountNumbers: [],
              },

              __abhinavaLoadTest:
                true,

              __abhinavaLoadTestPrefix:
                TEST_PREFIX,

              loadTestIndex:
                index,

              createdAt:
                new Date(),

              updatedAt:
                new Date(),
            });

            /*
            Keep local reference so the
            newly created IDs can be used
            for account generation.
            */

            investorDocs.push({
              id: ref.id,
            });

            batchCount++;

            if (
              batchCount >=
              BATCH_SIZE
            ) {
              await batch.commit();

              batch =
                writeBatch(db);

              batchCount = 0;

              setProgress(
                `Created ${Math.min(
                  i + 1,
                  investorsNeeded
                ).toLocaleString()} / ${investorsNeeded.toLocaleString()} investors...`
              );
            }
          }

          if (
            batchCount > 0
          ) {
            await batch.commit();
          }
        }

        /*
        --------------------------------------------------------
        STEP 3
        RE-READ INVESTORS
        --------------------------------------------------------
        */

        setProgress(
          "Verifying investor dataset..."
        );

        const afterInvestors =
          await getDocs(
            query(
              collection(
                db,
                "investmentInvestors"
              ),
              where(
                "__abhinavaLoadTest",
                "==",
                true
              )
            )
          );

        const finalInvestors =
          afterInvestors.docs;

        /*
        --------------------------------------------------------
        STEP 4
        GET EXISTING ACCOUNTS
        --------------------------------------------------------
        */

        const afterAccounts =
          await getDocs(
            query(
              collection(
                db,
                "investmentAccounts"
              ),
              where(
                "__abhinavaLoadTest",
                "==",
                true
              )
            )
          );

        const existingAccountCount =
          afterAccounts.size;

        const accountsNeeded =
          Math.max(
            0,
            TARGET_ACCOUNTS -
              existingAccountCount
          );

        /*
        --------------------------------------------------------
        STEP 5
        CREATE MISSING ACCOUNTS
        --------------------------------------------------------
        */

        if (
          accountsNeeded > 0
        ) {
          setProgress(
            `Creating ${accountsNeeded.toLocaleString()} accounts...`
          );

          let batch =
            writeBatch(db);

          let batchCount = 0;

          const startAccountIndex =
            existingAccountCount +
            1;

          for (
            let i = 0;
            i < accountsNeeded;
            i++
          ) {
            const accountIndex =
              startAccountIndex + i;

            /*
            Distribute accounts across
            all test investors.

            Some investors will have one
            account, some will have more.
            */

            const investor =
              finalInvestors[
                (accountIndex - 1) %
                  finalInvestors.length
              ];

            const investorId =
              investor.id;

            const ref = doc(
              collection(
                db,
                "investmentAccounts"
              )
            );

            batch.set(ref, {
              investorId,

              schemeId:
                "__ABHINAVA_LOAD_TEST_SCHEME__",

              accountNumber:
                `LOAD-${String(
                  accountIndex
                ).padStart(6, "0")}`,

              accountSequence:
                accountIndex,

              contribution: {
                unit:
                  "AMOUNT",

                value:
                  5000,
              },

              monthlyAmount:
                5000,

              monthlyGoldGrams:
                null,

              minimumRestriction: {
                enabled:
                  true,

                unit:
                  "AMOUNT",

                schemeMinimum:
                  5000,
              },

              openingBalanceAmount:
                0,

              openingBalanceGoldGrams:
                0,

              accountOrigin:
                "LOAD_TEST",

              previousAccountId:
                null,

              startDate:
                "2026-08-01",

              interestStartDate:
                "2026-08-01",

              schemeSnapshot: {
                schemeCode:
                  "LOADTEST",

                schemeName:
                  "Abhinava Load Test Scheme",

                schemeType:
                  "CASH",

                durationMonths:
                  12,

                paymentFrequency:
                  "MONTHLY",

                installmentConfig: {
                  type:
                    "FIXED",

                  amount:
                    5000,

                  unit:
                    "AMOUNT",
                },

                benefitConfig:
                  {},

                interestConfig:
                  {},

                calculationStrategyId:
                  "standard-interest",

                calculationVersion:
                  1,
              },

              status:
                "ACTIVE",

              totalPaid:
                0,

              totalInterest:
                0,

              totalGoldCredited:
                0,

              firstTransactionId:
                null,

              firstReceiptNumber:
                null,

              transferTransactionId:
                null,

              transferReceiptNumber:
                null,

              transferGoldPrice:
                null,

              createdByUid:
                null,

              createdByEmail:
                null,

              createdByName:
                "ABHINAVA LOAD TEST",

              updatedByUid:
                null,

              updatedByEmail:
                null,

              updatedByName:
                "ABHINAVA LOAD TEST",

              __abhinavaLoadTest:
                true,

              __abhinavaLoadTestPrefix:
                TEST_PREFIX,

              loadTestIndex:
                accountIndex,

              createdAt:
                new Date(),

              updatedAt:
                new Date(),
            });

            batchCount++;

            if (
              batchCount >=
              BATCH_SIZE
            ) {
              await batch.commit();

              batch =
                writeBatch(db);

              batchCount = 0;

              setProgress(
                `Created ${Math.min(
                  i + 1,
                  accountsNeeded
                ).toLocaleString()} / ${accountsNeeded.toLocaleString()} accounts...`
              );
            }
          }

          if (
            batchCount > 0
          ) {
            await batch.commit();
          }
        }

        /*
        --------------------------------------------------------
        STEP 6
        FINAL VERIFICATION
        --------------------------------------------------------
        */

        setProgress(
          "Performing final verification..."
        );

        await refreshCounts();

        setMessage(
          `Target dataset completed: ${TARGET_INVESTORS.toLocaleString()} test investors and ${TARGET_ACCOUNTS.toLocaleString()} test accounts.`
        );

        setProgress("");
      } catch (err) {
        console.error(
          "Target dataset creation failed:",
          err
        );

        setError(
          `${err?.code || "unknown"}: ${
            err?.message || err
          }`
        );

        setProgress("");
      } finally {
        setRunning(false);
      }
    };

  /*
  ============================================================
  CLEANUP
  ============================================================
  */

  const cleanup =
    async () => {
      const confirmed =
        window.confirm(
          "Delete ALL ABHINAVA load-test investors and accounts?"
        );

      if (!confirmed) {
        return;
      }

      setCleaning(true);
      setMessage("");
      setError("");

      try {
        const db =
          getCrmFirestore();

        const [
          investors,
          accounts,
        ] = await Promise.all([
          getDocs(
            query(
              collection(
                db,
                "investmentInvestors"
              ),
              where(
                "__abhinavaLoadTest",
                "==",
                true
              )
            )
          ),

          getDocs(
            query(
              collection(
                db,
                "investmentAccounts"
              ),
              where(
                "__abhinavaLoadTest",
                "==",
                true
              )
            )
          ),
        ]);

        /*
        Delete accounts first.
        */

        let batch =
          writeBatch(db);

        let batchCount = 0;

        for (
          const item of accounts.docs
        ) {
          batch.delete(item.ref);

          batchCount++;

          if (
            batchCount >=
            BATCH_SIZE
          ) {
            await batch.commit();

            batch =
              writeBatch(db);

            batchCount = 0;
          }
        }

        if (
          batchCount > 0
        ) {
          await batch.commit();
        }

        /*
        Delete investors.
        */

        batch =
          writeBatch(db);

        batchCount = 0;

        for (
          const item of investors.docs
        ) {
          batch.delete(item.ref);

          batchCount++;

          if (
            batchCount >=
            BATCH_SIZE
          ) {
            await batch.commit();

            batch =
              writeBatch(db);

            batchCount = 0;
          }
        }

        if (
          batchCount > 0
        ) {
          await batch.commit();
        }

        setCounts({
          investors: 0,
          accounts: 0,
        });

        setMessage(
          `Cleanup completed. Deleted ${accounts.size.toLocaleString()} accounts and ${investors.size.toLocaleString()} investors.`
        );
      } catch (err) {
        console.error(
          "Cleanup failed:",
          err
        );

        setError(
          `${err?.code || "unknown"}: ${
            err?.message || err
          }`
        );
      } finally {
        setCleaning(false);
      }
    };

  const targetReached =
    counts.investors >=
      TARGET_INVESTORS &&
    counts.accounts >=
      TARGET_ACCOUNTS;

  return (
    <div className="min-h-full overflow-y-auto bg-[#faf8f3] p-6">
      <div className="mx-auto max-w-4xl">

        <div className="mb-8">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B241E]">
              <Database
                size={20}
                className="text-white"
              />
            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#87968C]">
                Abhinava Performance
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-[#1B241E]">
                Investment Load Test
              </h1>

            </div>

          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#68786D]">
            Single-client stress test targeting
            15,000 investors and 5,000 accounts.
          </p>

        </div>


        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <div className="flex gap-3">

            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>

              <p className="text-sm font-bold text-amber-900">
                Controlled test data
              </p>

              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Only documents containing the
                <strong>
                  {" "}
                  __ABHINAVA_LOAD_TEST__
                </strong>
                marker are created or deleted.
                Existing client records are not modified.
              </p>

            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Current Test Dataset
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Automatically checked when this page loads.
              </p>

            </div>

            <button
              type="button"
              onClick={
                refreshCounts
              }
              disabled={
                checking ||
                running ||
                cleaning
              }
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  checking
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

          </div>


          <div className="mt-5 grid grid-cols-2 gap-4">

            <div className="rounded-xl bg-slate-50 p-5">

              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Test Investors
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {counts.investors.toLocaleString()}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Target:{" "}
                {TARGET_INVESTORS.toLocaleString()}
              </p>

            </div>


            <div className="rounded-xl bg-slate-50 p-5">

              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Test Accounts
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {counts.accounts.toLocaleString()}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Target:{" "}
                {TARGET_ACCOUNTS.toLocaleString()}
              </p>

            </div>

          </div>


          {targetReached && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

              <CheckCircle2
                size={18}
                className="text-emerald-600"
              />

              <p className="text-xs font-bold text-emerald-800">
                Target dataset reached. Do not create more
                records.
              </p>

            </div>
          )}


          <button
            type="button"
            disabled={
              checking ||
              running ||
              cleaning ||
              targetReached
            }
            onClick={
              createTargetDataset
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B241E] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#345343] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />

                Generating target dataset...
              </>
            ) : (
              <>
                <Plus size={17} />

                Generate 15,000 / 5,000 Target
              </>
            )}
          </button>


          <button
            type="button"
            disabled={
              checking ||
              running ||
              cleaning ||
              (
                counts.investors === 0 &&
                counts.accounts === 0
              )
            }
            onClick={cleanup}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cleaning ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />

                Cleaning...
              </>
            ) : (
              <>
                <Trash2 size={17} />

                Delete All Load-Test Data
              </>
            )}
          </button>

        </div>


        {progress && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">

            <div className="flex items-center gap-3">

              <Loader2
                size={17}
                className="animate-spin text-blue-600"
              />

              <p className="text-xs font-semibold text-blue-800">
                {progress}
              </p>

            </div>

          </div>
        )}


        {message && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

            <CheckCircle2
              size={18}
              className="shrink-0 text-emerald-600"
            />

            <p className="text-xs font-semibold leading-relaxed text-emerald-800">
              {message}
            </p>

          </div>
        )}


        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">

            <p className="text-xs font-semibold leading-relaxed text-rose-700">
              {error}
            </p>

          </div>
        )}

      </div>
    </div>
  );
}