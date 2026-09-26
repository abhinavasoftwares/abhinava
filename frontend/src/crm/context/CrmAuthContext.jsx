import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  initializeCrmFirebase,
} from "../firebase";

import {
  resolveCrmAuthorization,
  getCrmModulePermission,
  getCrmUserRole,
} from "../services/crmAuthorization";


const CrmAuthContext =
  createContext(null);


export function CrmAuthProvider({
  children,
}) {
  const [auth, setAuth] =
    useState(null);

  const [googleProvider, setGoogleProvider] =
    useState(null);

  const [user, setUser] =
    useState(null);

  const [authorization, setAuthorization] =
    useState(null);

  const [firebaseTenant, setFirebaseTenant] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [signingIn, setSigningIn] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    otpConfirmation,
    setOtpConfirmation,
  ] = useState(null);

  const [otpPhone, setOtpPhone] =
    useState("");

  const recaptchaRef =
    useRef(null);


  /* =========================================================
     FIREBASE INITIALIZATION
  ========================================================= */

  useEffect(() => {
    let unsubscribe = null;

    let mounted = true;


    const initialize =
      async () => {
        try {
          setLoading(true);
          setError("");

          const result =
            await initializeCrmFirebase();

          if (!mounted) {
            return;
          }

          setAuth(
            result.auth
          );

          setGoogleProvider(
            result.googleProvider
          );

          const businessName =
            result.businessName ||
            "Abhinava Softwares";

          const logoUrl =
            result.logoUrl || "/favicon.png";

          /*
          * Update browser tab title
          */
          document.title = businessName;

          /*
          * Update browser tab favicon
          */
          let favicon =
            document.getElementById("app-favicon");

          if (!favicon) {
            favicon = document.createElement("link");
            favicon.id = "app-favicon";
            favicon.rel = "icon";
            favicon.type = "image/png";
            document.head.appendChild(favicon);
          }

          favicon.href = logoUrl;

          setFirebaseTenant({
            tenantId:
              result.tenantId,

            clientId:
              result.clientId,

            crmSlug:
              result.crmSlug,

            businessName:
              businessName,

            logoUrl:
              result.logoUrl,

            modules:
              result.modules ||
              [],
          });


          unsubscribe =
            onAuthStateChanged(
              result.auth,
              async (
                currentUser
              ) => {
                if (!mounted) {
                  return;
                }


                /* ------------------------------------------------
                   NO USER
                ------------------------------------------------ */

                if (!currentUser) {
                  setUser(null);
                  setAuthorization(null);
                  setLoading(false);

                  return;
                }


                try {
                  const authz =
                    await resolveCrmAuthorization(
                      currentUser
                  );

                  if (!mounted) {
                    return;
                  }
                  setUser(
                    currentUser
                  );
                  setAuthorization(
                    authz
                  );
                  setError("");
                } catch (
                  authzError
                ) {
                  console.error(
                    "CRM authorization failed:",
                    authzError
                  );


                  /*
                   * Authentication may have succeeded,
                   * but CRM authorization failed.
                   *
                   * Immediately sign out.
                   */

                  try {
                    await signOut(
                      result.auth
                    );
                  } catch (
                    signOutError
                  ) {
                    console.error(
                      "Failed to sign out unauthorized user:",
                      signOutError
                    );
                  }


                  if (!mounted) {
                    return;
                  }

                  setUser(null);

                  setAuthorization(
                    null
                  );

                  setError(
                    authzError?.message ||
                      "You are not authorized to access this CRM."
                  );

                } finally {
                  if (mounted) {
                    setLoading(
                      false
                    );
                  }
                }
              }
            );

        } catch (
          initializeError
        ) {
          console.error(
            "Failed to initialize CRM authentication:",
            initializeError
          );

          if (!mounted) {
            return;
          }

          setError(
            initializeError?.message ||
              "Unable to initialize CRM authentication."
          );

          setLoading(false);
        }
      };


    initialize();


    return () => {
      mounted = false;


      if (unsubscribe) {
        unsubscribe();
      }


      if (
        recaptchaRef.current
      ) {
        try {
          recaptchaRef.current.clear();
        } catch {
          // Ignore cleanup errors.
        }

        recaptchaRef.current =
          null;
      }
    };
  }, []);

  


  /* =========================================================
     GOOGLE LOGIN
  ========================================================= */

  const loginWithGoogle =
    async () => {
      if (
        !auth ||
        !googleProvider
      ) {
        throw new Error(
          "CRM authentication is not ready."
        );
      }

      try {
        setSigningIn(true);
        setError("");

        const result =
          await signInWithPopup(
            auth,
            googleProvider
          );

        return result.user;

      } catch (
        loginError
      ) {
        console.error(
          "CRM Google sign-in failed:",
          loginError
        );

        setError(
          loginError?.message ||
            "Google sign-in failed."
        );

        throw loginError;

      } finally {
        setSigningIn(false);
      }
    };


  /* =========================================================
     RECAPTCHA
  ========================================================= */

  const getRecaptchaVerifier =
    () => {
      if (!auth) {
        throw new Error(
          "CRM authentication is not ready."
        );
      }


      if (
        recaptchaRef.current
      ) {
        return recaptchaRef.current;
      }


      const container =
        document.getElementById(
          "crm-recaptcha-container"
        );


      if (!container) {
        throw new Error(
          "OTP verification container is missing."
        );
      }


      recaptchaRef.current =
        new RecaptchaVerifier(
          auth,
          "crm-recaptcha-container",
          {
            size: "invisible",

            callback: () => {
              // Firebase handles
              // successful reCAPTCHA.
            },

            "expired-callback":
              () => {
                if (
                  recaptchaRef.current
                ) {
                  try {
                    recaptchaRef.current.clear();
                  } catch {
                    // Ignore.
                  }

                  recaptchaRef.current =
                    null;
                }
              },
          }
        );


      return recaptchaRef.current;
    };


  /* =========================================================
     SEND OTP
  ========================================================= */

  const sendLoginOtp =
    async (
      phoneNumber
    ) => {
      if (!auth) {
        throw new Error(
          "CRM authentication is not ready."
        );
      }

      if (!phoneNumber) {
        throw new Error(
          "Please enter your mobile number."
        );
      }


      try {
        setSigningIn(true);
        setError("");

        const verifier =
          getRecaptchaVerifier();


        const confirmation =
          await signInWithPhoneNumber(
            auth,
            phoneNumber,
            verifier
          );


        setOtpConfirmation(
          confirmation
        );

        setOtpPhone(
          phoneNumber
        );

        return confirmation;

      } catch (
        otpError
      ) {
        console.error(
          "CRM OTP request failed:",
          otpError
        );


        if (
          recaptchaRef.current
        ) {
          try {
            recaptchaRef.current.clear();
          } catch {
            // Ignore.
          }

          recaptchaRef.current =
            null;
        }


        setError(
          otpError?.message ||
            "Unable to send OTP."
        );

        throw otpError;

      } finally {
        setSigningIn(false);
      }
    };


  /* =========================================================
     VERIFY OTP
  ========================================================= */

  const verifyLoginOtp =
    async (
      otp
    ) => {
      if (
        !otpConfirmation
      ) {
        throw new Error(
          "Please request an OTP first."
        );
      }

      if (!otp) {
        throw new Error(
          "Please enter the OTP."
        );
      }


      try {
        setSigningIn(true);
        setError("");

        const result =
          await otpConfirmation.confirm(
            otp
          );


        /*
         * onAuthStateChanged will:
         *
         * 1. Send Firebase identity to backend
         * 2. Bind the employee UID
         * 3. Read users/{uid}
         * 4. Authorize CRM
         */

        setOtpConfirmation(
          null
        );

        return result.user;

      } catch (
        otpError
      ) {
        console.error(
          "CRM OTP verification failed:",
          otpError
        );

        setError(
          otpError?.message ||
            "Invalid OTP."
        );

        throw otpError;

      } finally {
        setSigningIn(false);
      }
    };


  /* =========================================================
     RESET OTP
  ========================================================= */

  const resetOtp =
    () => {
      setOtpConfirmation(
        null
      );

      setOtpPhone("");

      setError("");


      if (
        recaptchaRef.current
      ) {
        try {
          recaptchaRef.current.clear();
        } catch {
          // Ignore.
        }

        recaptchaRef.current =
          null;
      }
    };


  /* =========================================================
     LOGOUT
  ========================================================= */

  const logout =
    async () => {
      if (!auth) {
        return;
      }

      try {
        await signOut(
          auth
        );

        setUser(null);

        setAuthorization(
          null
        );

        resetOtp();

      } catch (
        logoutError
      ) {
        console.error(
          "CRM logout failed:",
          logoutError
        );

        setError(
          logoutError?.message ||
            "Unable to sign out."
        );

        throw logoutError;
      }
    };


  /* =========================================================
     AUTHORIZATION HELPERS
  ========================================================= */

  const role =
    getCrmUserRole(
      authorization
    );


  const isAdmin =
    role ===
    "ADMIN_OWNER";


  const hasModuleAccess =
    (
      moduleKey,
      permission = "read"
    ) => {
      return getCrmModulePermission(
        authorization,
        moduleKey,
        permission
      );
    };

    const activityActor = {
  uid:
    user?.uid ||
    authorization?.uid ||
    null,

  employeeId:
    authorization?.employeeId ||
    authorization?.employee?.id ||
    null,

  name:
    authorization?.name ||
    authorization?.user?.name ||
    user?.displayName ||
    null,

  email:
    authorization?.email ||
    authorization?.user?.email ||
    user?.email ||
    null,

  role:
    role || null,
};
  /* =========================================================
     CONTEXT
  ========================================================= */

  return (
    <CrmAuthContext.Provider
      value={{
        user,

        auth,

        firebaseTenant,

        authorization,

        role,

        isAdmin,

        loading,

        signingIn,

        error,

        isAuthenticated:
          Boolean(
            user &&
            authorization
          ),

        loginWithGoogle,

        sendLoginOtp,

        verifyLoginOtp,

        resetOtp,

        otpPhone,

        otpPending:
          Boolean(
            otpConfirmation
          ),

        logout,

        hasModuleAccess,
      }}
    >
      {children}
    </CrmAuthContext.Provider>
  );
}


export function useCrmAuth() {
  const context =
    useContext(
      CrmAuthContext
    );

  if (!context) {
    throw new Error(
      "useCrmAuth must be used inside CrmAuthProvider"
    );
  }

  return context;
}