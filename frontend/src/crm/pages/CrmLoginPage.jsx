import React, { useState, useEffect, useRef } from "react";
import { useTenant } from "../context/TenantContext";
import { useCrmAuth } from "../context/CrmAuthContext";
import { crmPath } from "../utils/crmRoutes";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
  CheckCircle2,
  ExternalLink,
  Crown,
  Smartphone,
  Mail,
  ArrowLeft,
} from "lucide-react";

export default function CrmLoginPage() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();

  const {
    user,
    loading: authLoading,
    signingIn,
    error: authError,
    loginWithGoogle,
    sendLoginOtp,
    verifyLoginOtp,
  } = useCrmAuth();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [loginMode, setLoginMode] = useState("selection");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [localError, setLocalError] = useState("");

  const recaptchaContainerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;

      setMousePos({
        x: (clientX / window.innerWidth - 0.5) * 40,
        y: (clientY / window.innerHeight - 0.5) * 40,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * TENANT LOGIN CONFIGURATION
   * ---------------------------------------------------------
   *
   * Employee Access settings should eventually expose these
   * methods from the backend/tenant authorization layer.
   *
   * We intentionally DO NOT assume that Google/OTP is enabled
   * merely because the tenant exists.
   *
   * The authentication service is still responsible for the
   * final employee-level authorization check.
   */

  const authenticationMethods =
    tenant?.authentication_methods ||
    tenant?.authenticationMethods ||
    tenant?.login_methods ||
    tenant?.loginMethods ||
    {};

  const googleEnabled =
    authenticationMethods.google !== false &&
    authenticationMethods.googleLogin !== false;

  const otpEnabled =
    authenticationMethods.otp !== false &&
    authenticationMethods.mobileOtp !== false;

  /*
   * ---------------------------------------------------------
   * NORMALIZE MOBILE NUMBER
   * ---------------------------------------------------------
   */

  const normalizeMobile = (value) => {
    return value.replace(/\D/g, "");
  };

  const formattedMobile = normalizeMobile(mobileNumber);

  /*
   * ---------------------------------------------------------
   * GOOGLE LOGIN
   * ---------------------------------------------------------
   */

  const handleGoogleLogin = async () => {
    setLocalError("");

    if (!googleEnabled) {
      setLocalError(
        "Google login is not enabled for this organization."
      );
      return;
    }

    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);

      setLocalError(
        error?.message ||
          "Google authentication failed. Please contact your administrator."
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * MOBILE OTP - SEND
   * ---------------------------------------------------------
   */

  const handleSendOtp = async () => {
    setLocalError("");

    if (!otpEnabled) {
      setLocalError(
        "Mobile OTP login is not enabled for this organization."
      );
      return;
    }

    if (!formattedMobile) {
      setLocalError("Please enter your mobile number.");
      return;
    }

    if (formattedMobile.length !== 10) {
      setLocalError("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      setOtpSending(true);

      await sendLoginOtp(
        `+91${formattedMobile}`
      );

      setOtpSent(true);
      setLoginMode("otp");

    } catch (error) {
      console.error("OTP send failed:", error);

      setLocalError(
        error?.message ||
          "Unable to send OTP. Please verify your mobile number or contact your administrator."
      );
    } finally {
      setOtpSending(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * MOBILE OTP - VERIFY
   * ---------------------------------------------------------
   */

  const handleVerifyOtp = async () => {
    setLocalError("");

    if (!otp) {
      setLocalError("Please enter the OTP.");
      return;
    }

    if (otp.length !== 6) {
      setLocalError("Please enter the 6-digit OTP.");
      return;
    }

    if (!loginWithMobileOtp) {
      setLocalError(
        "Mobile OTP authentication is not configured yet."
      );
      return;
    }

    try {
      setOtpVerifying(true);

      await verifyLoginOtp(
        otp
      );

    } catch (error) {
      console.error("OTP verification failed:", error);

      setLocalError(
        error?.message ||
          "Invalid or expired OTP. Please try again."
      );
    } finally {
      setOtpVerifying(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * RESET OTP FLOW
   * ---------------------------------------------------------
   */

  const resetOtpFlow = () => {
    setLoginMode("selection");
    setMobileNumber("");
    setOtp("");
    setOtpSent(false);
    setLocalError("");
  };

  /*
   * ---------------------------------------------------------
   * COMBINED STATE
   * ---------------------------------------------------------
   */

  const loading = tenantLoading || authLoading;

  const error =
    localError ||
    tenantError ||
    authError;

  /*
   * ---------------------------------------------------------
   * 1. LOADING STATE
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#FAF8F5] overflow-hidden select-none font-sans">
        <div className="absolute h-96 w-96 rounded-full bg-[#C59B27]/10 blur-[100px] animate-pulse" />

        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#C59B27]/20 border-t-[#C59B27] animate-spin" />

            <div className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center border border-[#C59B27]/30">
              <Crown className="w-5 h-5 text-[#C59B27] animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-[#8C827A]">
              Connecting Workspace
            </p>

            <p className="text-xs font-serif italic text-slate-400">
              Initializing cryptographic session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * 2. TENANT ERROR
   * ---------------------------------------------------------
   */

  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-6 select-none font-sans">
        <div className="w-full max-w-md rounded-3xl border border-rose-200/80 bg-white/90 p-8 sm:p-10 text-center shadow-xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100">
            <Lock size={24} />
          </div>

          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Portal Access Restricted
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-500 font-mono">
            {tenantError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-black shadow-sm"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  /*
   * ---------------------------------------------------------
   * 3. MAIN CLIENT LOGIN
   * ---------------------------------------------------------
   */

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#F7F4EE] px-4 sm:px-6 lg:px-8 py-10 overflow-hidden font-sans selection:bg-[#C59B27]/20 select-none">

      {/* Dynamic Cursor Light Follower */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[650px] w-[650px] rounded-full bg-gradient-to-br from-[#C59B27]/15 to-[#B08968]/5 blur-[120px] transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)`,
        }}
      />

      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[650px] w-[650px] rounded-full bg-gradient-to-tl from-[#D4AF37]/15 to-transparent blur-[140px] transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)`,
        }}
      />

      {/* Subtle Background Luxury Watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.025] overflow-hidden">
        <span className="text-[28vw] font-serif font-black tracking-tighter text-slate-950 uppercase">
          {tenant.business_name?.split(" ")[0] || "WORKSPACE"}
        </span>
      </div>

      {/* Main Architectural Stage */}
      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-[#E8E2D5] bg-white/70 shadow-[0_30px_90px_-20px_rgba(140,110,65,0.18)] backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-700">

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">

          {/* =================================================
              LEFT CLIENT BRAND COLUMN
          ================================================= */}

          <div className="relative lg:col-span-6 bg-gradient-to-b from-[#FAF8F5]/90 to-[#F2EDE2]/80 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E8E2D5]/80 overflow-hidden">

            {/* Security & Tenant Telemetry */}
            <div className="flex items-center justify-between gap-3">

              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B27]/30 bg-[#C59B27]/10 px-3 py-1 text-[10.5px] font-mono font-bold tracking-wider text-[#916F17]">
                <ShieldCheck size={13} className="text-[#C59B27]" />
                <span>TENANT NODE VERIFIED</span>
              </div>

              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest hidden sm:inline">
                ID #{tenant.id || "001"}
              </span>

            </div>

            {/* Brand Showcase */}
            <div className="my-10 space-y-5">

              {tenant.logo_url ? (
                <div className="inline-block p-3 rounded-2xl bg-white border border-[#E8E2D5] shadow-xs">
                  <img
                    src={tenant.logo_url}
                    alt={tenant.business_name}
                    className="h-16 w-auto max-w-[220px] object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#F5EFE3] border border-[#C59B27]/30 shadow-sm text-2xl font-serif font-black text-[#A67C1E]">
                  {tenant.business_name?.charAt(0)?.toUpperCase() || "A"}
                </div>
              )}

              <div>

                <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-[#24211D]">
                  {tenant.business_name}
                </h1>

                <p className="mt-2 text-xs font-medium leading-relaxed text-[#7D7368] max-w-sm">
                  {tenant.welcome_message ||
                    `Welcome to the enterprise executive portal for ${tenant.business_name}. Manage sales, bullion inventory, and operations with cryptographic isolation.`}
                </p>

              </div>

              {/* Capability Pills */}
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono text-[#6E655C]">

                <div className="flex items-center gap-1.5 rounded-lg border border-[#E0D8CB] bg-white/70 px-2.5 py-1">
                  <CheckCircle2 size={12} className="text-[#A67C1E]" />
                  <span>Cloud Ledger 256-bit</span>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg border border-[#E0D8CB] bg-white/70 px-2.5 py-1">
                  <Sparkles size={12} className="text-[#A67C1E]" />
                  <span>Realtime Inventory</span>
                </div>

              </div>
            </div>

            {/* Abhinava Footer */}
            <div className="pt-6 border-t border-[#E8E2D5]/70 flex items-center justify-between text-xs">

              <div>

                <p className="text-[9px] font-mono font-bold tracking-[0.22em] text-[#A3998F] uppercase">
                  Engineered & Powered by
                </p>

                <a
                  href="https://elv8.works"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#2B2723] hover:text-[#C59B27] transition-colors"
                >
                  <span className="font-mono tracking-wider font-extrabold">
                    ABHINAVA SOFTWARES
                  </span>

                  <ExternalLink
                    size={11}
                    className="text-[#C59B27] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>

              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-[#E8E2D5] text-[#C59B27] shadow-2xs">
                <Crown size={15} />
              </div>

            </div>

          </div>

          {/* =================================================
              RIGHT LOGIN PANE
          ================================================= */}

          <div className="relative lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between bg-white/95">

            {/* Heading */}
            <div className="space-y-2">

              <div className="inline-flex items-center gap-2 text-[10.5px] font-mono text-[#9C9287] uppercase tracking-widest">
                <Lock size={12} className="text-[#C59B27]" />
                <span>Authorized Staff Gate</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Staff Authentication
              </h2>

              <p className="text-xs text-slate-500 leading-relaxed">
                Sign in using the authentication method enabled for your
                employee account.
              </p>

            </div>

            {/* =================================================
                AUTH INTERACTION ZONE
            ================================================= */}

            <div className="my-10 space-y-4">

              {/* Authenticated State */}
              {user ? (
                <div className="space-y-4 animate-in fade-in duration-300">

                  <div className="rounded-2xl border border-[#EAE4D8] bg-[#FAF8F5] p-4 text-center space-y-1">

                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-[#9C9287]">
                      Active Identity Session
                    </span>

                    <p className="text-sm font-bold text-slate-900 truncate">
                      {user.displayName ||
                        user.email ||
                        user.phoneNumber ||
                        "Authorized Member"}
                    </p>

                    {user.email && (
                      <p className="text-xs font-mono text-slate-500 truncate">
                        {user.email}
                      </p>
                    )}

                    {!user.email && user.phoneNumber && (
                      <p className="text-xs font-mono text-slate-500 truncate">
                        {user.phoneNumber}
                      </p>
                    )}

                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = crmPath("dashboard");
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-black hover:shadow-lg active:scale-[0.99]"
                  >
                    <span>Proceed into Console</span>
                    <ArrowRight size={14} />
                  </button>

                </div>
              ) : loginMode === "selection" ? (

                /* =================================================
                   LOGIN METHOD SELECTION
                ================================================= */

                <div className="space-y-3">

                  {/* Google */}
                  {googleEnabled && (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={signingIn}
                      className="group relative flex w-full items-center justify-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:border-[#C59B27]/50 hover:bg-[#FAF8F5] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      {signingIn ? (
                        <div className="h-4 w-4 rounded-full border-2 border-[#C59B27]/20 border-t-[#C59B27] animate-spin" />
                      ) : (
                        <svg
                          className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
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

                      <span className="font-semibold tracking-wide">
                        {signingIn
                          ? "Verifying Credentials..."
                          : "Continue with Organization Google"}
                      </span>

                    </button>
                  )}

                  {/* Mobile OTP */}
                  {otpEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalError("");
                        setLoginMode("mobile");
                      }}
                      className="group flex w-full items-center justify-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:border-[#C59B27]/50 hover:bg-[#FAF8F5] hover:shadow-md active:scale-[0.99]"
                    >
                      <Smartphone
                        size={17}
                        className="text-[#A67C1E] transition-transform group-hover:scale-110"
                      />

                      <span className="font-semibold tracking-wide">
                        Continue with Mobile OTP
                      </span>
                    </button>
                  )}

                  {/* No configured methods */}
                  {!googleEnabled && !otpEnabled && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                      <Lock
                        size={18}
                        className="mx-auto mb-2 text-amber-600"
                      />

                      <p className="text-xs font-semibold text-amber-900">
                        No login method is enabled
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                        Please contact your organization administrator to
                        enable a login method for your employee account.
                      </p>
                    </div>
                  )}

                  {(googleEnabled || otpEnabled) && (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <ShieldCheck
                        size={12}
                        className="text-emerald-600"
                      />

                      <span>
                        Authentication Policy Enforced
                      </span>
                    </div>
                  )}

                </div>

              ) : (

                /* =================================================
                   MOBILE OTP FLOW
                ================================================= */

                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">

                  {/* Back */}
                  <button
                    type="button"
                    onClick={resetOtpFlow}
                    className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    <ArrowLeft size={11} />
                    Back to login methods
                  </button>

                  {!otpSent ? (

                    /* MOBILE NUMBER */
                    <div className="space-y-3">

                      <div className="rounded-2xl border border-[#EAE4D8] bg-[#FAF8F5] p-4">

                        <div className="mb-3 flex items-center gap-2">

                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[#E8E2D5]">
                            <Smartphone
                              size={15}
                              className="text-[#A67C1E]"
                            />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              Mobile verification
                            </p>

                            <p className="text-[10px] text-slate-500">
                              Use the mobile number registered with your
                              organization.
                            </p>
                          </div>

                        </div>

                        <div className="relative">

                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                            +91
                          </span>

                          <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength={10}
                            value={mobileNumber}
                            onChange={(e) => {
                              const value = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 10);

                              setMobileNumber(value);
                              setLocalError("");
                            }}
                            placeholder="Mobile number"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-3 text-sm font-mono text-slate-900 outline-none transition focus:border-[#C59B27] focus:ring-2 focus:ring-[#C59B27]/10"
                          />

                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={
                          otpSending ||
                          formattedMobile.length !== 10
                        }
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {otpSending ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                            <span>Checking Employee Access...</span>
                          </>
                        ) : (
                          <>
                            <Smartphone size={14} />
                            <span>Send Secure OTP</span>
                          </>
                        )}

                      </button>

                    </div>

                  ) : (

                    /* OTP */
                    <div className="space-y-3">

                      <div className="rounded-2xl border border-[#EAE4D8] bg-[#FAF8F5] p-4">

                        <div className="mb-3 flex items-center gap-2">

                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[#E8E2D5]">
                            <ShieldCheck
                              size={15}
                              className="text-emerald-600"
                            />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              Enter verification code
                            </p>

                            <p className="text-[10px] text-slate-500">
                              OTP sent to +91 {mobileNumber}
                            </p>
                          </div>

                        </div>

                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6);

                            setOtp(value);
                            setLocalError("");
                          }}
                          placeholder="6-digit OTP"
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-lg font-mono font-bold tracking-[0.45em] text-slate-900 outline-none transition focus:border-[#C59B27] focus:ring-2 focus:ring-[#C59B27]/10"
                        />

                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={
                          otpVerifying ||
                          otp.length !== 6
                        }
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {otpVerifying ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                            <span>Verifying OTP...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Verify & Continue</span>
                          </>
                        )}

                      </button>

                      <div className="flex items-center justify-between px-1">

                        <button
                          type="button"
                          onClick={() => {
                            setOtp("");
                            setOtpSent(false);
                            setLocalError("");
                          }}
                          className="text-[10px] font-mono font-semibold text-slate-400 hover:text-slate-800"
                        >
                          Change number
                        </button>

                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpSending}
                          className="text-[10px] font-mono font-semibold text-[#A67C1E] hover:text-[#7C5C13] disabled:opacity-50"
                        >
                          Resend OTP
                        </button>

                      </div>

                    </div>

                  )}

                </div>
              )}

              {/* Authentication Error */}
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] leading-relaxed text-rose-700">
                  <div className="flex items-start gap-2">
                    <Lock
                      size={13}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {typeof error === "string"
                        ? error
                        : error?.message ||
                          "Authentication failed. Please contact your administrator."}
                    </span>
                  </div>
                </div>
              )}

              {/* Hidden reCAPTCHA container */}
              <div
                ref={recaptchaContainerRef}
                id="crm-recaptcha-container"
              />

            </div>

            {/* Bottom Security Assurance */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[10.5px] font-mono text-slate-400">

              <span>ZERO_TRUST_AUTH</span>

              <span className="text-slate-500 font-semibold">
                SSL 256-BIT ENCRYPTED
              </span>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}