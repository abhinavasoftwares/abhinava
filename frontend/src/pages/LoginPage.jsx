import { useState } from "react";
import { Loader2, AlertCircle, ArrowUpRight, ShieldCheck, CheckCircle2, Quote } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function LoginPage() {
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
    <div className="min-h-screen w-full flex bg-slate-50 font-sans antialiased selection:bg-slate-900 selection:text-white">
      
      {/* -------------------------------------------------------------
          LEFT PANEL: Authentication Flow
      ------------------------------------------------------------- */}
      <div className="w-full lg:w-[55%] flex flex-col justify-between bg-white relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] px-6 sm:px-12 md:px-20 py-10">
        
        {/* Header */}
        <header className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <img
              src="/src/assets/favicon.png"
              alt="Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                e.target.style.display = 'none'; // Fallback if image is missing
              }}
            />
            <span className="text-sm font-bold tracking-widest uppercase text-slate-950">
              Abhinava Softwares
            </span>
          </div>
          <a
            href="http://abhinava.site/"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider"
          >
            <span>Visit Site</span>
            <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </header>

        {/* Main Auth Container */}
        <main className="w-full max-w-md mx-auto flex flex-col justify-center py-12">
          
          <div className="mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono font-medium text-slate-600 uppercase tracking-widest mb-4">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Administrative Desk</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
              Welcome back
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
              Log in to your workspace to manage deployments, access operator tools, and monitor system health.
            </p>
          </div>

          <div className="space-y-6">
            {/* Enterprise Single Sign-On Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-white border border-slate-200 px-6 py-4 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                    <span className="text-slate-600 font-semibold">Authenticating via SSO...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                      <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
                      <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.7Z" />
                      <path fill="#FBBC05" d="M6.54 13.78A5.86 5.86 0 0 1 6.23 12c0-.62.11-1.22.31-1.78V7.69H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.31l3.24-2.53Z" />
                      <path fill="#EA4335" d="M12 6.19c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.27 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C7.31 7.91 9.46 6.19 12 6.19Z" />
                    </svg>
                    <span className="font-semibold">Continue with Google Workspace</span>
                  </>
                )}
              </div>
            </button>

            {/* Micro-copy & Security Notice */}
            <div className="flex flex-col items-center gap-4 mt-6">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <span>Identity Scope:</span>
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  @abhinava.site
                </span>
              </div>
              
              {!API_BASE_URL && (
                <div className="w-full flex items-center justify-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-4 py-3 rounded-lg animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>VITE_API_BASE_URL is unconfigured. Login unavailable.</span>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-slate-400">
          <span>© {new Date().getFullYear()} Abhinava Softwares</span>
          <a href="#" className="hover:text-slate-600 transition-colors hidden sm:block">Privacy & Terms</a>
        </footer>
      </div>

      {/* -------------------------------------------------------------
          RIGHT PANEL: Enterprise Branding & Social Proof
      ------------------------------------------------------------- */}
      <div className="hidden lg:flex lg:w-[45%] bg-slate-950 relative flex-col justify-between p-12 overflow-hidden">
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900 to-transparent" />
          {/* Subtle Grid Pattern */}
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="relative z-10">
          {/* Feature Highlight List */}
          <div className="space-y-6 mt-12">
            <h2 className="text-white text-xl font-medium mb-8">Enterprise Capabilities</h2>
            
            {[
              "End-to-end encrypted administrative channels",
              "Real-time telemetry and infrastructure monitoring",
              "Role-based access control (RBAC) with granular permissions",
              "Automated SOC2 compliance reporting"
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-blue-400 shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial / Social Proof */}
        <div className="relative z-10 mt-auto bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <Quote size={24} className="text-blue-400 mb-4 opacity-50" />
          <p className="text-slate-200 text-sm leading-relaxed italic mb-6">
            "Abhinava Softwares provided us with the exact infrastructure tooling we needed. The restricted operator access ensures our core systems remain impenetrable while remaining highly available to our dev team."
          </p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              JD
            </div>
            <div>
              <div className="text-white text-sm font-semibold">John Doe</div>
              <div className="text-slate-400 text-xs">CTO, Enterprise Tech Corp</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}