"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Eye, EyeOff, Crown, Shield, Zap } from "lucide-react";
import { clsx } from "clsx";

const demoUsers = [
  { email: "admin@fu-corp.com", password: "admin123", role: "SUPER_ADMIN", name: "Umer Khan" },
  { email: "pm@fu-corp.com", password: "pm123", role: "PROJECT_MANAGER", name: "Sarah Williams" },
  { email: "dev@fu-corp.com", password: "dev123", role: "EMPLOYEE", name: "John Smith" },
];

type AuthView = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const stored = localStorage.getItem("fu-crm-user");
    if (stored) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const user = demoUsers.find((u) => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem("fu-crm-user", JSON.stringify(user));
      router.push("/");
    } else {
      setError("Invalid credentials. Try the demo accounts below.");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please fill all fields");
      return;
    }
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const user = { email, password, role: "EMPLOYEE", name };
    localStorage.setItem("fu-crm-user", JSON.stringify(user));
    router.push("/");
    setLoading(false);
  };

  const quickLogin = (user: typeof demoUsers[0]) => {
    setEmail(user.email);
    setPassword(user.password);
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#D4AF37]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/[0.02] rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-[440px] animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8B6914] mb-5 shadow-2xl shadow-[#D4AF37]/20 relative">
            <span className="text-3xl font-black text-black tracking-tight">FU</span>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-[3px] border-[#050508] flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-black" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">FU Corp</h1>
          <p className="text-white/40 text-sm">Enterprise Command Center</p>
        </div>

        {/* Auth Card */}
        <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-2 mb-7">
            <button
              onClick={() => { setView("login"); setError(""); }}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                view === "login"
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#B8960F] text-black shadow-lg shadow-[#D4AF37]/20"
                  : "bg-white/5 text-white/50 hover:text-white/70 hover:bg-white/[0.08]"
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => { setView("register"); setError(""); }}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                view === "register"
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#B8960F] text-black shadow-lg shadow-[#D4AF37]/20"
                  : "bg-white/5 text-white/50 hover:text-white/70 hover:bg-white/[0.08]"
              )}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {view === "login" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="admin@fu-corp.com"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37]/30 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Enter password"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37]/30 transition-all pr-12 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960F] text-black font-semibold hover:shadow-lg hover:shadow-[#D4AF37]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960F] text-black font-semibold hover:shadow-lg hover:shadow-[#D4AF37]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Login */}
          <div className="mt-7 pt-6 border-t border-white/[0.06]">
            <p className="text-[11px] text-white/30 mb-3 text-center uppercase tracking-widest font-medium">Quick Access</p>
            <div className="space-y-2">
              {demoUsers.map((user, i) => (
                <button
                  key={i}
                  onClick={() => quickLogin(user)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.1] transition-all group"
                >
                  <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-[#D4AF37]/20 text-[#D4AF37]" : i === 1 ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                  )}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs text-white/70 group-hover:text-white/90 transition-colors">{user.name}</p>
                    <p className="text-[10px] text-white/30">{user.role.replace("_", " ")}</p>
                  </div>
                  <span className="text-[10px] text-white/20 font-mono">{user.email.split("@")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[11px] text-white/20 mt-6">
          FU Corp Command Center &bull; Enterprise CRM
        </p>
      </div>
    </div>
  );
}
