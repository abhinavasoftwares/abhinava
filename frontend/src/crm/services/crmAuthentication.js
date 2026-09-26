import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  findEmployeeByEmail,
  findEmployeeByMobile,
  createUserAuthorization,
} from "./employeeAccess";

import {
  getCrmFirebaseAuth,
  getCrmGoogleProvider,
} from "../firebase";

/* =========================================================
   PROVIDER IDS
========================================================= */

const GOOGLE_PROVIDER = "google.com";
const PHONE_PROVIDER = "phone";

/* =========================================================
   GOOGLE LOGIN
========================================================= */

export async function loginWithGoogle() {
  const auth = getCrmFirebaseAuth();

  const provider =
    getCrmGoogleProvider() ||
    new GoogleAuthProvider();

  const result =
    await signInWithPopup(
      auth,
      provider
    );

  const user = result.user;

  const employee =
    await findEmployeeByEmail(
      user.email || ""
    );

  if (!employee) {
    await signOut(auth);

    throw new Error(
      "This Google account is not registered for this CRM."
    );
  }

  if (employee.status !== "ACTIVE") {
    await signOut(auth);

    throw new Error(
      "This employee account is disabled."
    );
  }

  if (
    !employee.loginMethods?.google
  ) {
    await signOut(auth);

    throw new Error(
      "Google login is not enabled for this employee."
    );
  }

  await createUserAuthorization({
    uid: user.uid,
    employeeId: employee.id,
    employee,
    email: user.email,
    provider: GOOGLE_PROVIDER,
  });

  return {
    user,
    employee,
  };
}

/* =========================================================
   PHONE LOGIN
========================================================= */

let recaptchaVerifier = null;

export function createPhoneRecaptcha(
  containerId = "crm-phone-recaptcha"
) {
  const auth = getCrmFirebaseAuth();

  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }

  recaptchaVerifier =
    new RecaptchaVerifier(
      auth,
      containerId,
      {
        size: "invisible",
      }
    );

  return recaptchaVerifier;
}

/* =========================================================
   SEND OTP
========================================================= */

export async function sendEmployeeOtp(
  mobile
) {
  const normalizedMobile =
    mobile.trim();

  if (!normalizedMobile) {
    throw new Error(
      "Mobile number is required."
    );
  }

  const employee =
    await findEmployeeByMobile(
      normalizedMobile
    );

  if (!employee) {
    throw new Error(
      "This mobile number is not registered for this CRM."
    );
  }

  if (employee.status !== "ACTIVE") {
    throw new Error(
      "This employee account is disabled."
    );
  }

  if (
    !employee.loginMethods?.otp
  ) {
    throw new Error(
      "OTP login is not enabled for this employee."
    );
  }

  const auth = getCrmFirebaseAuth();

  if (!recaptchaVerifier) {
    createPhoneRecaptcha();
  }

  const confirmationResult =
    await signInWithPhoneNumber(
      auth,
      normalizedMobile,
      recaptchaVerifier
    );

  return {
    confirmationResult,
    employee,
  };
}

/* =========================================================
   VERIFY OTP
========================================================= */

export async function verifyEmployeeOtp(
  confirmationResult,
  otp,
  employee
) {
  if (!confirmationResult) {
    throw new Error(
      "OTP session has expired. Please request a new OTP."
    );
  }

  const result =
    await confirmationResult.confirm(
      otp.trim()
    );

  const user = result.user;

  /*
   * Extra verification:
   * Firebase phone number must match the
   * configured employee mobile number.
   */

  const firebaseMobile =
    user.phoneNumber?.replace(
      /\s/g,
      ""
    );

  const configuredMobile =
    employee.mobile
      ?.replace(/\s/g, "");

  if (
    firebaseMobile &&
    configuredMobile &&
    firebaseMobile !== configuredMobile
  ) {
    await signOut(
      getCrmFirebaseAuth()
    );

    throw new Error(
      "The authenticated mobile number does not match this employee."
    );
  }

  await createUserAuthorization({
    uid: user.uid,
    employeeId: employee.id,
    employee,
    email: employee.email,
    provider: PHONE_PROVIDER,
  });

  return {
    user,
    employee,
  };
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logoutCrmUser() {
  const auth =
    getCrmFirebaseAuth();

  await signOut(auth);
}

/* =========================================================
   CLEANUP RECAPTCHA
========================================================= */

export function clearPhoneRecaptcha() {
  if (!recaptchaVerifier) {
    return;
  }

  try {
    recaptchaVerifier.clear();
  } catch {
    // ignore
  }

  recaptchaVerifier = null;
}