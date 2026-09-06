import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import prompts from "prompts";

// ============================================================
// ABHINAVA / FIRESTORE SECURITY & TAMPERING TEST
// ============================================================
//
// IMPORTANT
// ---------
// This script tests the DEPLOYED Firestore Security Rules.
//
// It uses the Firebase Web SDK, exactly like the CRM frontend.
//
// Credentials are requested interactively and are NOT stored.
//
// ============================================================


// ============================================================
// SHRidhara FIREBASE PROJECT
// ============================================================

const firebaseConfig = {
  projectId: "shridhara-jewellers",

  appId:
    "1:993394495469:web:c563b2149da13aa1b3a1e4",

  storageBucket:
    "shridhara-jewellers.firebasestorage.app",

  apiKey:
    "AIzaSyBojvahfmWCttmv4HNIFZGyRVPlzMMqZ7Q",

  authDomain:
    "shridhara-jewellers.firebaseapp.com",

  messagingSenderId:
    "993394495469",
};


// ============================================================
// OPTIONAL TEST DOCUMENT IDS
// ============================================================
//
// We will NOT guess these.
//
// Set them only when you are ready.
//
// PowerShell examples:
//
// $env:TEST_INVESTOR_ID="..."
// $env:TEST_ACCOUNT_ID="..."
// $env:TEST_TRANSACTION_ID="..."
// $env:TEST_AUDIT_ID="..."
// $env:TEST_COMMUNICATION_ID="..."
//
// ============================================================

const TEST_INVESTOR_ID =
  process.env.TEST_INVESTOR_ID || null;

const TEST_ACCOUNT_ID =
  process.env.TEST_ACCOUNT_ID || null;

const TEST_TRANSACTION_ID =
  process.env.TEST_TRANSACTION_ID || null;

const TEST_AUDIT_ID =
  process.env.TEST_AUDIT_ID || null;

const TEST_COMMUNICATION_ID =
  process.env.TEST_COMMUNICATION_ID || null;


// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

const app =
  initializeApp(
    firebaseConfig,
    "abhinava-security-test"
  );

const auth =
  getAuth(app);

const db =
  getFirestore(app);


// ============================================================
// TEST RESULTS
// ============================================================

const results = [];

function record(
  status,
  name,
  detail = "",
  latency = null
) {
  results.push({
    status,
    name,
    detail,
    latency,
  });

  let prefix;

  if (status === "PASS") {
    prefix = "\x1b[32mPASS\x1b[0m";
  } else if (status === "FAIL") {
    prefix = "\x1b[31mFAIL\x1b[0m";
  } else {
    prefix = "\x1b[33mSKIP\x1b[0m";
  }

  console.log(
    `${prefix} ${name}`
  );

  if (latency !== null) {
    console.log(
      `      latency: ${latency} ms`
    );
  }

  if (detail) {
    console.log(
      `      ${detail}`
    );
  }
}


function elapsed(start) {
  return Math.round(
    performance.now() - start
  );
}


// ============================================================
// EXPECT PERMISSION DENIED
// ============================================================

async function expectDenied(
  name,
  operation
) {
  const start =
    performance.now();

  try {
    await operation();

    record(
      "FAIL",
      name,
      "Operation SUCCEEDED. This operation was expected to be denied by Firestore Security Rules.",
      elapsed(start)
    );

    return false;

  } catch (error) {

    const latency =
      elapsed(start);

    const code =
      error?.code || "";

    if (
      code === "permission-denied" ||
      code.includes("permission-denied")
    ) {
      record(
        "PASS",
        name,
        "Firestore correctly rejected the operation.",
        latency
      );

      return true;
    }

    record(
      "FAIL",
      name,
      `Unexpected error: ${code} ${error?.message || error}`,
      latency
    );

    return false;
  }
}


// ============================================================
// EXPECT SUCCESS
// ============================================================

async function expectSuccess(
  name,
  operation
) {
  const start =
    performance.now();

  try {

    await operation();

    record(
      "PASS",
      name,
      "Operation succeeded.",
      elapsed(start)
    );

    return true;

  } catch (error) {

    record(
      "FAIL",
      name,
      `${error?.code || "unknown"}: ${error?.message || error}`,
      elapsed(start)
    );

    return false;
  }
}


// ============================================================
// LOGIN PROMPT
// ============================================================

async function loginPrompt() {

  console.log("");
  console.log(
    "------------------------------------------------------------"
  );
  console.log(
    "FIREBASE AUTHENTICATION"
  );
  console.log(
    "------------------------------------------------------------"
  );

  const response =
    await prompts([
      {
        type: "text",
        name: "email",
        message: "Firebase email:",
        validate: value =>
          value.includes("@")
            ? true
            : "Enter a valid email address.",
      },
      {
        type: "password",
        name: "password",
        message: "Firebase password:",
        validate: value =>
          value.length > 0
            ? true
            : "Password cannot be empty.",
      },
    ]);

  if (
    !response.email ||
    !response.password
  ) {
    throw new Error(
      "Authentication credentials were not provided."
    );
  }

  return response;
}


// ============================================================
// MAIN
// ============================================================

async function main() {

  console.clear();

  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    " ABHINAVA FIRESTORE SECURITY TEST"
  );
  console.log(
    "============================================================"
  );
  console.log("");

  console.log(
    `Firebase project: ${firebaseConfig.projectId}`
  );

  console.log(
    "Mode: LIVE FIRESTORE SECURITY TEST"
  );

  console.log("");

  console.log(
    "\x1b[33mIMPORTANT:\x1b[0m"
  );

  console.log(
    "This script will ATTEMPT writes/deletes that should be"
  );

  console.log(
    "rejected by your Firestore Security Rules."
  );

  console.log("");

  // ==========================================================
  // LOGIN
  // ==========================================================

  const credentials =
    await loginPrompt();

  let user;

  try {

    const credential =
      await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

    user =
      credential.user;

    record(
      "PASS",
      "Firebase authentication",
      `Authenticated UID: ${user.uid}`
    );

  } catch (error) {

    record(
      "FAIL",
      "Firebase authentication",
      `${error?.code || ""}: ${error?.message || error}`
    );

    return;
  }


  // ==========================================================
  // USER INFORMATION
  // ==========================================================

  console.log("");

  console.log(
    `Authenticated email: ${user.email || "(no email)"}`
  );

  console.log(
    `Authenticated UID: ${user.uid}`
  );

  console.log("");


  // ==========================================================
  // INVESTOR SECURITY
  // ==========================================================

  if (TEST_INVESTOR_ID) {

    console.log(
      "------------------------------------------------------------"
    );

    console.log(
      "INVESTOR TAMPERING"
    );

    console.log(
      "------------------------------------------------------------"
    );

    const investorRef =
      doc(
        db,
        "investmentInvestors",
        TEST_INVESTOR_ID
      );


    await expectSuccess(
      "Read investment investor",
      () =>
        getDoc(
          investorRef
        )
    );


    await expectDenied(
      "Tamper investor fullName",
      () =>
        updateDoc(
          investorRef,
          {
            fullName:
              "__ABHINAVA_SECURITY_TEST__",
          }
        )
    );


    await expectDenied(
      "Tamper investor mobileNumber",
      () =>
        updateDoc(
          investorRef,
          {
            mobileNumber:
              "9999999999",
          }
        )
    );


    await expectDenied(
      "Delete investment investor",
      () =>
        deleteDoc(
          investorRef
        )
    );

  } else {

    record(
      "SKIP",
      "Investor tampering",
      "TEST_INVESTOR_ID was not supplied."
    );
  }


  // ==========================================================
  // INVESTMENT ACCOUNT SECURITY
  // ==========================================================

  if (TEST_ACCOUNT_ID) {

    console.log("");

    console.log(
      "------------------------------------------------------------"
    );

    console.log(
      "INVESTMENT ACCOUNT TAMPERING"
    );

    console.log(
      "------------------------------------------------------------"
    );

    const accountRef =
      doc(
        db,
        "investmentAccounts",
        TEST_ACCOUNT_ID
      );


    await expectSuccess(
      "Read investment account",
      () =>
        getDoc(
          accountRef
        )
    );


    // ----------------------------------------------------------
    // FINANCIAL TAMPERING
    // ----------------------------------------------------------

    await expectDenied(
      "Tamper totalPaid",
      () =>
        updateDoc(
          accountRef,
          {
            totalPaid:
              999999999,
          }
        )
    );


    await expectDenied(
      "Tamper totalGoldCredited",
      () =>
        updateDoc(
          accountRef,
          {
            totalGoldCredited:
              999999999,
          }
        )
    );


    await expectDenied(
      "Tamper openingBalanceAmount",
      () =>
        updateDoc(
          accountRef,
          {
            openingBalanceAmount:
              999999999,
          }
        )
    );


    await expectDenied(
      "Tamper openingBalanceGoldGrams",
      () =>
        updateDoc(
          accountRef,
          {
            openingBalanceGoldGrams:
              999999,
          }
        )
    );


    // ----------------------------------------------------------
    // IDENTITY TAMPERING
    // ----------------------------------------------------------

    await expectDenied(
      "Tamper accountNumber",
      () =>
        updateDoc(
          accountRef,
          {
            accountNumber:
              "HACKED-999",
          }
        )
    );


    await expectDenied(
      "Tamper investorId",
      () =>
        updateDoc(
          accountRef,
          {
            investorId:
              "HACKED-INVESTOR",
          }
        )
    );


    await expectDenied(
      "Tamper schemeId",
      () =>
        updateDoc(
          accountRef,
          {
            schemeId:
              "HACKED-SCHEME",
          }
        )
    );


    // ----------------------------------------------------------
    // STATUS TAMPERING
    // ----------------------------------------------------------

    await expectDenied(
      "Reopen investment account",
      () =>
        updateDoc(
          accountRef,
          {
            status:
              "ACTIVE",
          }
        )
    );


    // ----------------------------------------------------------
    // DELETE
    // ----------------------------------------------------------

    await expectDenied(
      "Delete investment account",
      () =>
        deleteDoc(
          accountRef
        )
    );

  } else {

    record(
      "SKIP",
      "Investment account tampering",
      "TEST_ACCOUNT_ID was not supplied."
    );
  }


  // ==========================================================
  // TRANSACTION IMMUTABILITY
  // ==========================================================

  if (
    TEST_ACCOUNT_ID &&
    TEST_TRANSACTION_ID
  ) {

    console.log("");

    console.log(
      "------------------------------------------------------------"
    );

    console.log(
      "TRANSACTION IMMUTABILITY"
    );

    console.log(
      "------------------------------------------------------------"
    );


    const transactionRef =
      doc(
        db,
        "investmentAccounts",
        TEST_ACCOUNT_ID,
        "transactions",
        TEST_TRANSACTION_ID
      );


    await expectSuccess(
      "Read investment transaction",
      () =>
        getDoc(
          transactionRef
        )
    );


    await expectDenied(
      "Tamper transaction amount",
      () =>
        updateDoc(
          transactionRef,
          {
            amountPaid:
              999999999,
          }
        )
    );


    await expectDenied(
      "Tamper transaction receiptNumber",
      () =>
        updateDoc(
          transactionRef,
          {
            receiptNumber:
              "HACKED-RECEIPT",
          }
        )
    );


    await expectDenied(
      "Tamper transaction passcodeVerified",
      () =>
        updateDoc(
          transactionRef,
          {
            passcodeVerified:
              false,
          }
        )
    );


    await expectDenied(
      "Delete investment transaction",
      () =>
        deleteDoc(
          transactionRef
        )
    );

  } else {

    record(
      "SKIP",
      "Transaction immutability",
      "TEST_ACCOUNT_ID and TEST_TRANSACTION_ID are required."
    );
  }


  // ==========================================================
  // AUDIT LOG
  // ==========================================================

  if (TEST_AUDIT_ID) {

    console.log("");

    console.log(
      "------------------------------------------------------------"
    );

    console.log(
      "AUDIT LOG IMMUTABILITY"
    );

    console.log(
      "------------------------------------------------------------"
    );


    const auditRef =
      doc(
        db,
        "investmentAuditLogs",
        TEST_AUDIT_ID
      );


    await expectSuccess(
      "Read investment audit log",
      () =>
        getDoc(
          auditRef
        )
    );


    await expectDenied(
      "Tamper audit description",
      () =>
        updateDoc(
          auditRef,
          {
            description:
              "__HACKED_AUDIT__",
          }
        )
    );


    await expectDenied(
      "Delete investment audit log",
      () =>
        deleteDoc(
          auditRef
        )
    );

  } else {

    record(
      "SKIP",
      "Audit log immutability",
      "TEST_AUDIT_ID was not supplied."
    );
  }


  // ==========================================================
  // COMMUNICATIONS
  // ==========================================================

  if (TEST_COMMUNICATION_ID) {

    console.log("");

    console.log(
      "------------------------------------------------------------"
    );

    console.log(
      "COMMUNICATION IMMUTABILITY"
    );

    console.log(
      "------------------------------------------------------------"
    );


    const communicationRef =
      doc(
        db,
        "investmentCommunications",
        TEST_COMMUNICATION_ID
      );


    await expectDenied(
      "Tamper investment communication",
      () =>
        updateDoc(
          communicationRef,
          {
            status:
              "__HACKED__",
          }
        )
    );


    await expectDenied(
      "Delete investment communication",
      () =>
        deleteDoc(
          communicationRef
        )
    );

  } else {

    record(
      "SKIP",
      "Communication immutability",
      "TEST_COMMUNICATION_ID was not supplied."
    );
  }


  // ==========================================================
  // FINAL SUMMARY
  // ==========================================================

  console.log("");

  console.log(
    "============================================================"
  );

  console.log(
    " FINAL SECURITY TEST RESULT"
  );

  console.log(
    "============================================================"
  );

  const passed =
    results.filter(
      x => x.status === "PASS"
    ).length;

  const failed =
    results.filter(
      x => x.status === "FAIL"
    ).length;

  const skipped =
    results.filter(
      x => x.status === "SKIP"
    ).length;


  console.log(
    `PASS  : ${passed}`
  );

  console.log(
    `FAIL  : ${failed}`
  );

  console.log(
    `SKIP  : ${skipped}`
  );

  console.log("");


  if (failed > 0) {

    console.log(
      "\x1b[31mRESULT: SECURITY TEST FAILED\x1b[0m"
    );

    console.log(
      "At least one operation was allowed unexpectedly."
    );

    process.exitCode = 1;

  } else {

    console.log(
      "\x1b[32mRESULT: NO TESTED SECURITY VIOLATIONS\x1b[0m"
    );
  }


  console.log("");

  try {
    await signOut(auth);
  } catch {
    // Nothing else to do.
  }
}


main().catch(
  error => {

    console.error("");

    console.error(
      "============================================================"
    );

    console.error(
      "TEST RUNNER ERROR"
    );

    console.error(
      "============================================================"
    );

    console.error(
      `${error?.code || ""}: ${error?.message || error}`
    );

    process.exitCode = 1;
  }
);