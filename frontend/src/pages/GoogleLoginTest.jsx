import { useState } from "react";
import {
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  initializeFirebase,
} from "../firebase";

const CLIENT_ID = import.meta.env.VITE_TEST_CLIENT_ID;

function GoogleLoginTest() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      if (!CLIENT_ID) {
        throw new Error(
          "VITE_TEST_CLIENT_ID is not configured."
        );
      }

      const {
        auth,
        googleProvider,
        businessName,
        tenantId,
      } = await initializeFirebase(CLIENT_ID);

      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      setUser({
        ...result.user,
        businessName,
        tenantId,
      });
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Google sign-in failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { getFirebaseAuth } = await import(
        "../firebase"
      );

      await signOut(getFirebaseAuth());

      setUser(null);
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Sign out failed."
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-[#121212]">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Abhinava
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Tenant Authentication Test
          </p>
        </div>

        {!user ? (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
              {loading ? (
                "Loading tenant..."
              ) : (
                <>
                  <span className="text-lg font-bold">
                    G
                  </span>

                  Continue with Google
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="text-center">

            <div className="mb-4 flex justify-center">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
                  {user.displayName?.[0] ||
                    user.email?.[0] ||
                    "U"}
                </div>
              )}
            </div>

            <h2 className="font-bold text-gray-900 dark:text-white">
              {user.displayName}
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </p>

            <div className="mt-4 space-y-2 text-left text-xs text-gray-500 dark:text-gray-400">

              <div className="break-all rounded-xl bg-gray-100 p-3 dark:bg-neutral-900">
                <strong>Business:</strong>
                <br />
                {user.businessName}
              </div>

              <div className="break-all rounded-xl bg-gray-100 p-3 dark:bg-neutral-900">
                <strong>Tenant ID:</strong>
                <br />
                {user.tenantId}
              </div>

              <div className="break-all rounded-xl bg-gray-100 p-3 dark:bg-neutral-900">
                <strong>Firebase UID:</strong>
                <br />
                {user.uid}
              </div>

            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-5 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Sign out
            </button>

          </div>
        )}
      </div>
    </div>
  );
}

export default GoogleLoginTest;