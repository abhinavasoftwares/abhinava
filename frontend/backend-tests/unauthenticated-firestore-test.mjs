

const PROJECT_ID = "shridhara-jewellers";

const API_KEY =
  "AIzaSyBojvahfmWCttmv4HNIFZGyRVPlzMMqZ7Q";

const COLLECTIONS = [
  "investmentInvestors",
  "investmentAccounts",
  "investmentSchemes",
  "investmentAuditLogs",
  "investmentCommunications",
  "investmentSettings",
  "crmSecurity",
];

const results = [];

function addResult(
  status,
  target,
  detail,
  latency
) {
  results.push({
    status,
    target,
    detail,
    latency,
  });

  const prefix =
    status === "PASS"
      ? "\x1b[32mPASS\x1b[0m"
      : status === "FAIL"
      ? "\x1b[31mFAIL\x1b[0m"
      : "\x1b[33mWARNING\x1b[0m";

  console.log(
    `${prefix} ${target}`
  );

  console.log(
    `      ${detail}`
  );

  if (latency !== undefined) {
    console.log(
      `      latency: ${latency} ms`
    );
  }

  console.log("");
}


async function testCollection(
  collectionName
) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=1&key=${API_KEY}`;

  const start =
    performance.now();

  try {

    const response =
      await fetch(url);

    const latency =
      Math.round(
        performance.now() - start
      );

    const body =
      await response.text();

    if (response.ok) {

      addResult(
        "FAIL",
        `${collectionName} unauthenticated READ`,
        `CRITICAL: Firestore returned HTTP ${response.status}. An unauthenticated request appears able to read this collection. Response: ${body.slice(
          0,
          300
        )}`,
        latency
      );

      return;
    }

    let parsed = null;

    try {
      parsed =
        JSON.parse(body);
    } catch {
      // Non-JSON response.
    }

    const errorStatus =
      parsed?.error?.status || "";

    const errorMessage =
      parsed?.error?.message || body;

    /*
     * Firestore may expose the denial as:
     *
     * HTTP 403
     * PERMISSION_DENIED
     *
     * That is the expected secure result.
     */

    if (
      response.status === 403 ||
      errorStatus ===
        "PERMISSION_DENIED"
    ) {

      addResult(
        "PASS",
        `${collectionName} unauthenticated READ`,
        `Firestore correctly rejected the unauthenticated request: ${errorStatus || response.status}.`,
        latency
      );

      return;
    }

    addResult(
      "WARNING",
      `${collectionName} unauthenticated READ`,
      `Request was rejected, but not with the expected PERMISSION_DENIED response. HTTP ${response.status}: ${errorMessage.slice(
        0,
        300
      )}`,
      latency
    );

  } catch (error) {

    addResult(
      "FAIL",
      `${collectionName} unauthenticated READ`,
      `Network/test error: ${
        error?.message || error
      }`
    );
  }
}


async function main() {

  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    " ABHINAVA FIRESTORE ADVERSARIAL SECURITY TEST"
  );
  console.log(
    " PHASE 1 — UNAUTHENTICATED ATTACKER"
  );
  console.log(
    "============================================================"
  );
  console.log("");

  console.log(
    `Target Firebase project: ${PROJECT_ID}`
  );

  console.log(
    "Authentication: NONE"
  );

  console.log(
    "Writes: NONE"
  );

  console.log(
    "Deletes: NONE"
  );

  console.log("");

  for (
    const collectionName
    of COLLECTIONS
  ) {
    await testCollection(
      collectionName
    );
  }

  console.log(
    "============================================================"
  );

  console.log(
    " FINAL RESULT"
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

  const warnings =
    results.filter(
      x => x.status === "WARNING"
    ).length;

  console.log(
    `PASS     : ${passed}`
  );

  console.log(
    `FAIL     : ${failed}`
  );

  console.log(
    `WARNING  : ${warnings}`
  );

  console.log("");

  if (failed > 0) {

    console.log(
      "\x1b[31mRESULT: UNAUTHENTICATED ACCESS VULNERABILITY DETECTED\x1b[0m"
    );

    process.exitCode = 1;

  } else {

    console.log(
      "\x1b[32mRESULT: UNAUTHENTICATED READS BLOCKED\x1b[0m"
    );
  }

  console.log("");
}


main().catch(
  error => {

    console.error("");
    console.error(
      "TEST RUNNER ERROR:"
    );

    console.error(
      error?.message || error
    );

    process.exitCode = 1;
  }
);

