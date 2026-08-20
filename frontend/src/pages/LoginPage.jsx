import { useState } from "react";
import { Command, ShieldCheck, Loader2, AlertCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function LoginPage() {
  const { darkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    if (!API_BASE_URL) {
      console.error("VITE_API_BASE_URL is not configured.");
      return;
    }

    setLoading(true);

    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf8f3] text-gray-900 transition-colors duration-300 dark:bg-[#050505] dark:text-white">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-500/10" />
        <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-purple-200/20 blur-3xl dark:bg-purple-500/10" />
      </div>

      {/* Theme control */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={
          darkMode
            ? "Switch to light mode"
            : "Switch to dark mode"
        }
        className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/80 text-gray-600 shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-gray-900 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white"
      >
        {darkMode ? (
          <Sun size={18} />
        ) : (
          <Moon size={18} />
        )}
      </button>

      {/* Main */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Command
                size={27}
                strokeWidth={2.4}
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
              Abhinava
            </h1>

            <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Platform Administration
            </p>
          </div>

          {/* Login card */}
          <section className="rounded-[28px] border border-gray-200/80 bg-white/90 p-7 shadow-xl shadow-gray-900/5 backdrop-blur-xl dark:border-neutral-800 dark:bg-[#101010]/90 dark:shadow-black/30 sm:p-9">
            <div className="mb-7">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                Sign in to access the Abhinava administration portal.
              </p>
            </div>

            {/* Google login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-bold text-gray-800 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  {/* Google mark */}
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.7Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.54 13.78A5.86 5.86 0 0 1 6.23 12c0-.62.11-1.22.31-1.78V7.69H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.31l3.24-2.53Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 6.19c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.27 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C7.31 7.91 9.46 6.19 12 6.19Z"
                    />
                  </svg>

                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Security notice */}
            <div className="mt-7 flex gap-3 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
              <div className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck
                  size={19}
                  strokeWidth={2}
                />
              </div>

              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Secure platform access
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-500">
                  Access is restricted to authorized Abhinava
                  platform identities.
                </p>
              </div>
            </div>

            {/* Configuration error */}
            {!API_BASE_URL && (
              <div className="mt-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-500/10">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                />

                <p className="text-xs font-semibold leading-5 text-red-700 dark:text-red-400">
                  Platform authentication is not configured.
                </p>
              </div>
            )}
          </section>

          {/* Footer */}
          <p className="mt-7 text-center text-xs font-medium text-gray-400 dark:text-gray-600">
            Abhinava Platform
          </p>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;