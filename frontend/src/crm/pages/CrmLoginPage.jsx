import { useTenant } from "../context/TenantContext";
import { useCrmAuth } from "../context/CrmAuthContext";

// A soothing, luxury Rose-Mocha accent color
const ACCENT = "#B08968";

export default function CrmLoginPage() {
  const { tenant, loading: tenantLoading, error: tenantError } =
    useTenant();

  const {
    user,
    loading: authLoading,
    signingIn,
    error: authError,
    loginWithGoogle,
  } = useCrmAuth();

  const loading = tenantLoading || authLoading;
  const error = tenantError || authError;

  // =========================================================
  // 1. LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#F0EDE6] overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#B08968]/20 border-t-[#B08968] animate-spin" />
            <div className="h-2 w-2 rounded-full bg-[#B08968] animate-pulse" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-[#8A7B6E] animate-pulse">
            Opening Boutique...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // 2. ERROR STATE
  // =========================================================

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0EDE6] px-6">
        <div className="w-full max-w-sm rounded-[2.5rem] bg-white p-10 text-center shadow-[0_20px_50px_-12px_rgba(176,137,104,0.2)] animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-400 text-2xl font-serif italic">
            !
          </div>

          <h1 className="text-xl font-bold text-[#2C2926]">
            Access Unavailable
          </h1>

          <p className="mt-3 text-sm font-medium text-[#8A7B6E] leading-relaxed">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  // =========================================================
  // 3. MAIN LOGIN VIEW
  // =========================================================

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F0EDE6] px-6 py-12 overflow-hidden selection:bg-[#B08968]/20">

      {/* -----------------------------------------------------
          BACKGROUND ACCENTS
      ----------------------------------------------------- */}

      <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-[#B08968]/[0.04] blur-[120px] pointer-events-none" />

      <div className="absolute -bottom-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-white/60 blur-[120px] pointer-events-none" />


      {/* -----------------------------------------------------
          LOGIN CARD
      ----------------------------------------------------- */}

      <div className="relative z-10 w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">

        <div className="rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-[0_25px_60px_-15px_rgba(176,137,104,0.25)]">

          {/* -------------------------------------------------
              BRANDING
          ------------------------------------------------- */}

          <div className="text-center">

            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.business_name}
                className="mx-auto mb-8 h-20 w-auto object-contain drop-shadow-sm transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#FCFAF7] border border-[#B08968]/15 shadow-[inset_0_2px_10px_rgba(176,137,104,0.03),0_4px_10px_-4px_rgba(176,137,104,0.15)] relative transition-transform duration-700 hover:scale-105">
                <span className="text-4xl font-serif text-[#B08968] relative z-10">
                  {tenant.business_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <h1 className="text-[26px] font-bold tracking-tight text-[#2C2926] sm:text-3xl">
              {tenant.business_name}
            </h1>

            <p className="mt-3 text-[13px] font-medium tracking-wide text-[#8A7B6E]">
              CRM Login
            </p>
          </div>


          {/* -------------------------------------------------
              AUTHENTICATED USER
          ------------------------------------------------- */}

          {user ? (
            <div className="mt-10 space-y-4">

              <div className="rounded-[1.25rem] border border-[#EBE6DC] bg-[#FCFAF7] p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#A3978C]">
                  Signed in as
                </p>

                <p className="mt-2 text-sm font-bold text-[#2C2926]">
                  {user.displayName ||
                    user.email ||
                    "Authenticated User"}
                </p>

                {user.email && (
                  <p className="mt-1 text-xs text-[#8A7B6E]">
                    {user.email}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/crm/dashboard";
                }}
                className="w-full rounded-[1.25rem] bg-[#2C2926] px-5 py-4 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#3A3530] hover:shadow-[0_12px_25px_-8px_rgba(44,41,38,0.35)] active:translate-y-0"
              >
                Enter CRM
              </button>
            </div>
          ) : (
            /* -------------------------------------------------
               GOOGLE LOGIN
            ------------------------------------------------- */

            <div className="mt-10">

              <button
                type="button"
                onClick={loginWithGoogle}
                disabled={signingIn}
                className="group relative flex w-full items-center justify-center gap-3.5 rounded-[1.25rem] bg-[#FCFAF7] border border-[#EBE6DC] px-5 py-4 text-[14px] font-bold text-[#2C2926] transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_12px_25px_-8px_rgba(176,137,104,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >

                {/* Highlight border on hover */}

                <div className="absolute inset-0 rounded-[1.25rem] border border-[#B08968]/0 transition-colors duration-300 group-hover:border-[#B08968]/30" />

                {signingIn ? (
                  <div className="relative z-10 h-5 w-5 rounded-full border-2 border-[#B08968]/20 border-t-[#B08968] animate-spin" />
                ) : (
                  <svg
                    className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:scale-110"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />

                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />

                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />

                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}

                <span className="relative z-10">
                  {signingIn
                    ? "Signing in..."
                    : "Continue with Google"}
                </span>

              </button>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-[#A3978C]">
                Sign in using your authorized
                {tenant.business_name
                  ? ` ${tenant.business_name}`
                  : ""}{" "}
                Google account.
              </p>

            </div>
          )}


          {/* -------------------------------------------------
              ABHINAVA FOOTER
          ------------------------------------------------- */}

          <div className="mt-12 flex flex-col items-center justify-center text-center opacity-80 transition-opacity duration-300 hover:opacity-100">

            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A3978C]">
              Secure Portal By
            </p>

            <a
              href="https://elv8.works"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[#2C2926] transition-colors hover:text-[#B08968]"
            >

              <svg
                className="h-3 w-3 text-[#B08968]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>

              ABHINAVA SOFTWARES

            </a>
          </div>

        </div>
      </div>
    </div>
  );
}