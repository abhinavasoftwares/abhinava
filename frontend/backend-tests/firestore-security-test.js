import {
  initializeApp,
} from "firebase/app";

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
  setDoc,
  addDoc,
  collection,
} from "firebase/firestore";

// ============================================================
// CONFIGURATION
// ============================================================
//
// IMPORTANT:
// This test uses the Shridhara Firebase project.
//
// Firebase web API keys are client-side identifiers.
// DO NOT put a Firebase Admin SDK private key here.
//
// ============================================================

const FIREBASE_CONFIG = {
  projectId: "shridhara-jewellers",
  appId: "1:993394495469:web:c563b2149da13aa1b3a1e4",
  storageBucket: "shridhara-jewellers.firebasestorage.app",
  apiKey: "AIzaSyBojvahfmWCttmv4HNIFZGyRVPlzMMqZ7Q",
  authDomain: "shridhara-jewellers.firebaseapp.com",
  messagingSenderId: "993394495469",
};

// ============================================================
// TEST USER
// ============================================================
//
// DO NOT hard-code the password.
//
// PowerShell:
//   $env:TEST_EMAIL="your-test-user@example.com"
//   $env:TEST_PASSWORD="your-password"
//
// ============================================================

const TEST_EMAIL =
  process.env.TEST_EMAIL;

const TEST_PASSWORD =
  process.env.TEST_PASSWORD;

// ============================================================
// TEST DOCUMENT IDS
// ============================================================
//
// Put IDs of REAL documents you are comfortable testing.
//
// IMPORTANT:
// The tests below attempt to MODIFY/DELETE these documents.
// Use dedicated test records.
//
// ============================================================

const TEST_INVESTOR_ID =
  process.env.TEST_INVESTOR_ID;

const TEST_ACCOUNT_ID =
  process.env.TEST_ACCOUNT_ID;

const TEST_TRANSACTION_ID =
  process.env.TEST_TRANSACTION_ID;

const TEST_AUDIT_ID =
  process.env.TEST_AUDIT_ID;

// ============================================================
// FIREBASE
// ============================================================

const app =
  initializeApp(
    FIREBASE_CONFIG,
    "security-test"
  );

const auth =
  getAuth(app);

const db =
  getFirestore(app);

// ============================================================
// RESULT TRACKING
// ============================================================

const results = [];

function pass(name, detail = "") {
  results.push({
    status: "PASS",
    name,
    detail,
  });

  console.log(
    `\x1b[32mPASS\x1b[0m  ${name}`
  );

  if (detail) {
    console.log(`      ${detail}`);
  }
}

function fail(name, detail = "") {
  results.push({
    status: "FAIL",
    name,
    detail,
  });

  console.log(
    `\x1b[31mFAIL\x1b[0m  ${name}`
  );

  if (detail) {
    console.log(`      ${detail}`);
  }
}

function skip(name, detail = "") {
  results.push({
    status: "SKIP",
    name,
    detail,
  });

  console.log(
    `\x1b[33mSKIP\x1b[0m  ${name}`
  );

  if (detail) {
    console.log(`      ${detail}`);
  }
}

// ============================================================
// EXPECT PERMISSION DENIED
// ============================================================

async function expectDenied(
  name,
  operation
) {
  try {
    await operation();

    fail(
      name,
      "Operation succeeded but should have been denied."
    );

    return false;
  } catch (error) {
    const code =
      error?.code || "";

    if (
      code.includes(
        "permission-denied"
      )
    ) {
      pass(
        name,
        "Firestore correctly returned permission-denied."
      );

      return true;
    }

    fail(
      name,
      `Unexpected error: ${code} ${error?.message || error}`
    );

    return false;
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    " SHRidhara / FIRESTORE SECURITY TEST"
  );
  console.log(
    "============================================================"
  );
  console.log("");

  if (
    !TEST_EMAIL ||
    !TEST_PASSWORD
  ) {
    throw new Error(
      "Set TEST_EMAIL and TEST_PASSWORD environment variables first."
    );
  }

  if (!TEST_INVESTOR_ID) {
    console.log(
      "WARNING: TEST_INVESTOR_ID not supplied."
    );
  }

  if (!TEST_ACCOUNT_ID) {
    console.log(
      "WARNING: TEST_ACCOUNT_ID not supplied."
    );
  }

  if (!TEST_TRANSACTION_ID) {
    console.log(
      "WARNING: TEST_TRANSACTION_ID not supplied."
    );
  }

  console.log(
    `Project: ${FIREBASE_CONFIG.projectId}`
  );

  console.log(
    `Test user: ${TEST_EMAIL}`
  );

  console.log("");

  // ==========================================================
  // 1. AUTHENTICATE
  // ==========================================================

  console.log(
    "------------------------------------------------------------"
  );
  console.log(
    "AUTHENTICATION"
  );
  console.log(
    "------------------------------------------------------------"
  );

  try {
    const credential =
      await signInWithEmailAndPassword(
        auth,
        TEST_EMAIL,
        TEST_PASSWORD
      );

    if (
      credential?.user?.uid
    ) {
      pass(
        "Firebase authentication",
        `UID: ${credential.user.uid}`
      );
    } else {
      fail(
        "Firebase authentication",
        "No authenticated user returned."
      );

      return;
    }
  } catch (error) {
    fail(
      "Firebase authentication",
      `${error?.code || ""} ${error?.message || error}`
    );

    return;
  }

  // ==========================================================
  // 2. INVESTOR READ
  // ==========================================================

  if (TEST_INVESTOR_ID) {
    console.log("");
    console.log(
      "------------------------------------------------------------"
    );
    console.log(
      "INVESTOR SECURITY"
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

    try {
      const snapshot =
        await getDoc(
          investorRef
        );

      if (snapshot.exists()) {
        pass(
          "Authenticated investor read",
          `Investor ${TEST_INVESTOR_ID} is readable.`
        );
      } else {
        fail(
          "Authenticated investor read",
          "Test investor document does not exist."
        );
      }
    } catch (error) {
      fail(
        "Authenticated investor read",
        `${error?.code || ""} ${error?.message || error}`
      );
    }

    // --------------------------------------------------------
    // ATTEMPT INVESTOR TAMPERING
    // --------------------------------------------------------

    await expectDenied(
      "Investor tampering: change fullName",
      () =>
        updateDoc(
          investorRef,
          {
            fullName:
              "__SECURITY_TEST_TAMPER__",
          }
        )
    );

    // --------------------------------------------------------
    // ATTEMPT INVESTOR DELETE
    // --------------------------------------------------------

    await expectDenied(
      "Investor deletion protection",
      () =>
        deleteDoc(
          investorRef
        )
    );
  } else {
    skip(
      "Investor tampering tests",
      "TEST_INVESTOR_ID was not supplied."
    );
  }

  // ==========================================================
  // 3. ACCOUNT SECURITY
  // ==========================================================

  if (TEST_ACCOUNT_ID) {
    console.log("");
    console.log(
      "------------------------------------------------------------"
    );
    console.log(
      "INVESTMENT ACCOUNT SECURITY"
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

    try {
      const snapshot =
        await getDoc(
          accountRef
        );

      if (snapshot.exists()) {
        pass(
          "Authenticated account read",
          `Account ${TEST_ACCOUNT_ID} is readable.`
        );
      } else {
        fail(
          "Authenticated account read",
          "Test account does not exist."
        );
      }
    } catch (error) {
      fail(
        "Authenticated account read",
        `${error?.code || ""} ${error?.message || error}`
      );
    }

    // --------------------------------------------------------
    // BALANCE TAMPERING
    // --------------------------------------------------------

    await expectDenied(
      "Account tampering: totalPaid",
      () =>
        updateDoc(
          accountRef,
          {
            totalPaid:
              999999999,
          }
        )
    );

    // --------------------------------------------------------
    // GOLD TAMPERING
    // --------------------------------------------------------

    await expectDenied(
      "Account tampering: totalGoldCredited",
      () =>
        updateDoc(
          accountRef,
          {
            totalGoldCredited:
              999999999,
          }
        )
    );

    // --------------------------------------------------------
    // ACCOUNT NUMBER TAMPERING
    // --------------------------------------------------------

    await expectDenied(
      "Account tampering: accountNumber",
      () =>
        updateDoc(
          accountRef,
          {
            accountNumber:
              "SECURITY-TEST-999",
          }
        )
    );

    // --------------------------------------------------------
    // INVESTOR ID TAMPERING
    // --------------------------------------------------------

    await expectDenied(
      "Account tampering: investorId",
      () =>
        updateDoc(
          accountRef,
          {
            investorId:
              "SECURITY-TEST-INVESTOR",
          }
        )
    );

    // --------------------------------------------------------
    // SCHEME TAMPERING
    // --------------------------------------------------------

    await expectDenied(
      "Account tampering: schemeId",
      () =>
        updateDoc(
          accountRef,
          {
            schemeId:
              "SECURITY-TEST-SCHEME",
          }
        )
    );

    // --------------------------------------------------------
    // REOPEN CLOSED ACCOUNT
    // --------------------------------------------------------

    await expectDenied(
      "Account tampering: reopen account",
      () =>
        updateDoc(
          accountRef,
          {
            status:
              "ACTIVE",
          }
        )
    );

    // --------------------------------------------------------
    // DELETE ACCOUNT
    // --------------------------------------------------------

    await expectDenied(
      "Account deletion protection",
      () =>
        deleteDoc(
          accountRef
        )
    );
  } else {
    skip(
      "Investment account tampering tests",
      "TEST_ACCOUNT_ID was not supplied."
    );
  }

  // ==========================================================
  // 4. TRANSACTION SECURITY
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

    try {
      const snapshot =
        await getDoc(
          transactionRef
        );

      if (snapshot.exists()) {
        pass(
          "Transaction read",
          `Transaction ${TEST_TRANSACTION_ID} is readable.`
        );
      } else {
        fail(
          "Transaction read",
          "Test transaction does not exist."
        );
      }
    } catch (error) {
      fail(
        "Transaction read",
        `${error?.code || ""} ${error?.message || error}`
      );
    }

    await expectDenied(
      "Transaction tampering: amount",
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
      "Transaction tampering: receipt",
      () =>
        updateDoc(
          transactionRef,
          {
            receiptNumber:
              "RCP-SECURITY-TEST",
          }
        )
    );

    await expectDenied(
      "Transaction tampering: passcodeVerified",
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
      "Transaction deletion protection",
      () =>
        deleteDoc(
          transactionRef
        )
    );
  } else {
    skip(
      "Transaction immutability tests",
      "TEST_ACCOUNT_ID and TEST_TRANSACTION_ID are required."
    );
  }

  // ==========================================================
  // 5. AUDIT LOG IMMUTABILITY
  // ==========================================================

  if (TEST_AUDIT_ID) {
    console.log("");
    console.log(
      "------------------------------------------------------------"
    );
    console.log(
      "AUDIT LOG SECURITY"
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

    await expectDenied(
      "Audit log tampering",
      () =>
        updateDoc(
          auditRef,
          {
            description:
              "__SECURITY_TEST_TAMPER__",
          }
        )
    );

    await expectDenied(
      "Audit log deletion",
      () =>
        deleteDoc(
          auditRef
        )
    );
  } else {
    skip(
      "Audit log tampering tests",
      "TEST_AUDIT_ID was not supplied."
    );
  }

  // ==========================================================
  // 6. COMMUNICATION IMMUTABILITY
  // ==========================================================

  console.log("");
  console.log(
    "------------------------------------------------------------"
  );
  console.log(
    "COMMUNICATION SECURITY"
  );
  console.log(
    "------------------------------------------------------------"
  );

  // Create a deliberately invalid-looking random document ID
  // only for the purpose of checking that arbitrary updates
  // cannot be used to modify an existing communication.
  //
  // We don't know a valid communication ID here, so this test
  // is skipped unless one is supplied.

  if (
    process.env.TEST_COMMUNICATION_ID
  ) {
    const communicationRef =
      doc(
        db,
        "investmentCommunications",
        process.env.TEST_COMMUNICATION_ID
      );

    await expectDenied(
      "Communication tampering",
      () =>
        updateDoc(
          communicationRef,
          {
            status:
              "SECURITY_TEST_TAMPER",
          }
        )
    );

    await expectDenied(
      "Communication deletion",
      () =>
        deleteDoc(
          communicationRef
        )
    );
  } else {
    skip(
      "Communication tampering tests",
      "TEST_COMMUNICATION_ID not supplied."
    );
  }

  // ==========================================================
  // 7. SUMMARY
  // ==========================================================

  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    " TEST SUMMARY"
  );
  console.log(
    "============================================================"
  );

  const passed =
    results.filter(
      (item) =>
        item.status === "PASS"
    ).length;

  const failed =
    results.filter(
      (item) =>
        item.status === "FAIL"
    ).length;

  const skipped =
    results.filter(
      (item) =>
        item.status === "SKIP"
    ).length;

  console.log(
    `PASS : ${passed}`
  );

  console.log(
    `FAIL : ${failed}`
  );

  console.log(
    `SKIP : ${skipped}`
  );

  console.log("");

  if (failed > 0) {
    console.log(
      "\x1b[31mSECURITY TEST RESULT: FAIL\x1b[0m"
    );

    process.exitCode = 1;
  } else {
    console.log(
      "\x1b[32mSECURITY TEST RESULT: NO TESTED VIOLATIONS\x1b[0m"
    );
  }

  console.log("");

  await signOut(auth);
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "TEST RUNNER ERROR:"
    );
    console.error(
      error?.code || ""
    );
    console.error(
      error?.message || error
    );

    process.exitCode = 1;
  }
);