"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff, Zap, ArrowRight } from "lucide-react";

const demoUsers = [
  { email: "umi@digitalpointllc.com", password: "umi84268", role: "SUPER_ADMIN", name: "Umer" },
  { email: "faizi@digitalpointllc.com", password: "faizi13579", role: "SUPER_ADMIN", name: "Faizan" },
  { email: "ali@digitalpointllc.com", password: "specialist123", role: "PROJECT_MANAGER", name: "Ali Hassan" },
  { email: "client@example.com", password: "viewer123", role: "EMPLOYEE", name: "Client Demo" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("fu-crm-user");
    if (stored) router.push("/");
  }, [router]);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Enter email and password"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); setLoading(false); return; }
      localStorage.setItem("fu-crm-user", JSON.stringify(data));
      router.push("/");
    } catch {
      const user = demoUsers.find((u) => u.email === email && u.password === password);
      if (user) { localStorage.setItem("fu-crm-user", JSON.stringify(user)); router.push("/"); }
      else { setError("Invalid credentials"); }
    }
    setLoading(false);
  };

  const quickLogin = (user: typeof demoUsers[0]) => {
    setEmail(user.email);
    setPassword(user.password);
  };

  return (
    <div className="min-h-screen bg-[#040408] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cyberpunk city background — visible, not hidden */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          backgroundImage: "url('/cybercity-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          opacity: 0.25,
          filter: "saturate(1.5) brightness(0.7) hue-rotate(40deg)",
        }}
      />
      {/* Dark vignette overlay */}
      <div className="absolute inset-0 hidden lg:block" style={{
        background: "radial-gradient(ellipse at center, rgba(4,4,8,0.3) 0%, rgba(4,4,8,0.7) 60%, rgba(4,4,8,0.9) 100%)"
      }} />
      {/* Mobile — color-matched glow (no image) */}
      <div className="absolute inset-0 lg:hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#F59E0B]/[0.2] to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-[#06D6E0]/[0.1] to-transparent" />
      </div>
      {/* Top neon line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#06D6E0]/60 to-transparent z-10" />

      <div className="relative w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] rounded-xl sm:rounded-2xl mb-4 sm:mb-6 relative" style={{
            background: "linear-gradient(135deg, #FF6B00 0%, #E05500 100%)",
            boxShadow: "0 8px 32px rgba(255,107,0,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset"
          }}>
            <span className="text-[22px] sm:text-[28px] font-black text-black tracking-tighter">FU</span>
            <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-400 rounded-full border-2 sm:border-[3px] border-[#040408] flex items-center justify-center" style={{ boxShadow: "0 0 12px rgba(16,185,129,0.5)" }}>
              <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-black" />
            </div>
          </div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-white tracking-tight mb-0.5">FU Corp</h1>
          <p className="text-[12px] sm:text-[13px] text-white/35">Enterprise Command Center</p>
        </div>

        {/* Login Card */}
        <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="relative rounded-2xl overflow-hidden">
            {/* Gradient border glow */}
            <div className="absolute inset-0 rounded-2xl p-px" style={{
              background: "linear-gradient(180deg, rgba(6,214,224,0.5) 0%, rgba(245,158,11,0.2) 30%, rgba(255,255,255,0.03) 100%)"
            }}>
              <div className="w-full h-full rounded-[15px] bg-[#0A0A0E]" />
            </div>

            <div className="relative p-5 sm:p-8">
              {error && (
                <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 text-[13px] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-white/40 mb-2 font-medium uppercase tracking-[0.1em]">Email</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="your@email.com"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder:text-white/15 focus:outline-none focus:border-[#FF6B00]/40 focus:ring-2 focus:ring-[#FF6B00]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/40 mb-2 font-medium uppercase tracking-[0.1em]">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder="Enter password"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder:text-white/15 focus:outline-none focus:border-[#FF6B00]/40 focus:ring-2 focus:ring-[#FF6B00]/10 pr-12 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleLogin} disabled={loading}
                  className="w-full py-3.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-50 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #FF6B00 0%, #E05500 100%)",
                    boxShadow: "0 4px 20px rgba(255,107,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                    color: "#000",
                  }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <><LogIn className="w-4 h-4" />Sign In</>
                  )}
                </button>
              </div>

              {/* Quick Access */}
              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <p className="text-[10px] text-white/25 mb-3 uppercase tracking-[0.15em] font-medium">Quick Access</p>
                <div className="space-y-1.5">
                  {demoUsers.map((user, i) => {
                    const colors = ["#FF6B00", "#3B82F6", "#22C55E", "#F59E0B"];
                    const c = colors[i];
                    return (
                      <button
                        key={i}
                        onClick={() => quickLogin(user)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.1] transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: `${c}15`, color: c }}>
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[13px] text-white/60 group-hover:text-white/90 transition-colors font-medium">{user.name}</p>
                          <p className="text-[10px] text-white/25">{user.role.replace(/_/g, " ")}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-all group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/15 mt-8 tracking-wide">FU Corp &middot; Enterprise Command Center</p>
      </div>
    </div>
  );
}
