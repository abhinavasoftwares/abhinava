import { useState } from "react";
import { Command, ShieldCheck, Loader2, AlertCircle, LayoutGrid, Lock, Sparkles } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function LoginPage() {
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
    <div className="flex h-screen w-full overflow-hidden bg-[#faf8f3] font-sans text-slate-900">
      
      {/* Left Panel: Abhinava Softwares Marketing */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-12 lg:flex">
        {/* Subtle Champagne Atmospheric Glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-[#d4af37]/10 blur-[100px]" />
          <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#d4af37]/5 blur-[100px]" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center gap-3 text-[#e6cda3]">
          <Command size={32} strokeWidth={2} />
          <span className="text-2xl font-semibold tracking-wide">
            Abhinava Softwares
          </span>
        </div>

        {/* Main Marketing Copy */}
        <div className="relative z-10 max-w-lg">
          <h2 className="mb-6 text-4xl font-bold leading-tight text-white lg:text-5xl">
            Flawless Management.<br />
            <span className="text-[#e6cda3]">Crafted for Jewelers.</span>
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-slate-400">
            Specially designed to manage your jewelry business seamlessly. Streamline inventory, client relations, and sales with a secure, highly tailored CRM.
          </p>

          {/* Feature Bullets */}
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800/80 text-[#e6cda3]">
                <Sparkles size={18} strokeWidth={2} />
              </div>
              <p className="text-sm font-medium text-slate-300">Seamless sales & client lifecycle tracking</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800/80 text-[#e6cda3]">
                <LayoutGrid size={18} strokeWidth={2} />
              </div>
              <p className="text-sm font-medium text-slate-300">Intuitive, high-contrast inventory dashboards</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800/80 text-[#e6cda3]">
                <Lock size={18} strokeWidth={2} />
              </div>
              <p className="text-sm font-medium text-slate-300">Enterprise-grade security for sensitive data</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-slate-500">
          © {new Date().getFullYear()} Abhinava Softwares. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Login Interface */}
      <div className="relative flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2">
        
        {/* Mobile Logo (Visible only on small screens) */}
        <div className="absolute left-6 top-6 flex items-center gap-2 text-slate-900 lg:hidden">
          <Command size={24} strokeWidth={2.5} className="text-slate-700" />
          <span className="text-lg font-bold tracking-tight">Abhinava</span>
        </div>

        <div className="w-full max-w-md">
          {/* Form Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Platform Portal
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Authenticate to access your Jewelry CRM dashboard.
            </p>
          </div>

          {/* Login Card */}
          <div className="rounded-[24px] border border-slate-200/60 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            
            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={19} className="animate-spin text-slate-400" />
                  <span>Establishing secure connection...</span>
                </>
              ) : (
                <>
                  <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
                    <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.7Z" />
                    <path fill="#FBBC05" d="M6.54 13.78A5.86 5.86 0 0 1 6.23 12c0-.62.11-1.22.31-1.78V7.69H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.31l3.24-2.53Z" />
                    <path fill="#EA4335" d="M12 6.19c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.27 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C7.31 7.91 9.46 6.19 12 6.19Z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="mx-4 text-xs font-medium text-slate-400">Secure Environment</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* Security Notice */}
            <div className="flex gap-4 rounded-xl border border-slate-100 bg-[#faf8f3]/50 p-4">
              <div className="mt-0.5 shrink-0 text-slate-700">
                <ShieldCheck size={20} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Restricted Access
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  This portal utilizes strict access controls. Only authorized staff identities may enter the CRM administration layer.
                </p>
              </div>
            </div>

            {/* Configuration Error */}
            {!API_BASE_URL && (
              <div className="mt-4 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                <p className="text-xs font-semibold leading-5 text-red-700">
                  Authentication gateway is currently unconfigured. Please check environment variables.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default LoginPage;