"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Eye, EyeOff, Shield, Zap } from "lucide-react";
import { clsx } from "clsx";

const demoUsers = [
  { email: "faizi@digitalpointllc.com", password: "faizi13579", role: "SUPER_ADMIN", name: "Faizan" },
  { email: "umi@digitalpointllc.com", password: "umi84268", role: "SUPER_ADMIN", name: "Umer" },
  { email: "ali@digitalpointllc.com", password: "specialist123", role: "PROJECT_MANAGER", name: "Ali Hassan" },
  { email: "client@example.com", password: "viewer123", role: "EMPLOYEE", name: "Client Demo" },
];

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("fu-crm-user");
    if (stored) router.push("/");
  }, [router]);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      localStorage.setItem("fu-crm-user", JSON.stringify(data));
      router.push("/");
    } catch {
      // Fallback to demo auth if DB not connected
      const user = demoUsers.find((u) => u.email === email && u.password === password);
      if (user) {
        localStorage.setItem("fu-crm-user", JSON.stringify(user));
        router.push("/");
      } else {
        setError("Invalid credentials");
      }
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name || !email || !password) { setError("Fill all fields"); return; }
    setLoading(true);
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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FF6B00]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#0EA5E9]/[0.02] rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF6B00]/20 to-transparent" />
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: `linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

      <div className="relative w-full max-w-[440px] animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#C04600] mb-5 shadow-2xl shadow-[#FF6B00]/20 relative">
            <span className="text-3xl font-black text-black tracking-tight">FU</span>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-[3px] border-[#050508] flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-black" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">FU Corp</h1>
          <p className="text-white/40 text-sm">Enterprise Command Center</p>
        </div>

        <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          <div className="flex gap-2 mb-7">
            {(["login", "register"] as const).map((v) => (
              <button key={v} onClick={() => { setView(v); setError(""); }}
                className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200", view === v ? "bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black shadow-lg shadow-[#FF6B00]/20" : "bg-white/5 text-white/50 hover:text-white/70")}>
                {v === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {view === "login" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="faizi@digitalpointllc.com" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Enter password" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 pr-12 text-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold hover:shadow-lg hover:shadow-[#FF6B00]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2">
                {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><LogIn className="w-4 h-4" />Sign In</>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create password"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 text-sm" />
              </div>
              <button onClick={handleRegister} disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold hover:shadow-lg hover:shadow-[#FF6B00]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2">
                {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" />Create Account</>}
              </button>
            </div>
          )}

          <div className="mt-7 pt-6 border-t border-white/[0.06]">
            <p className="text-[11px] text-white/30 mb-3 text-center uppercase tracking-widest font-medium">Quick Access</p>
            <div className="space-y-2">
              {demoUsers.map((user, i) => (
                <button key={i} onClick={() => quickLogin(user)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.1] transition-all group">
                  <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-[#FF6B00]/20 text-[#FF6B00]" : i === 1 ? "bg-[#0EA5E9]/20 text-[#0EA5E9]" : i === 2 ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-white/10 text-white/50"
                  )}>{user.name.charAt(0)}</div>
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
        <p className="text-center text-[11px] text-white/20 mt-6">FU Corp Command Center &bull; Enterprise CRM</p>
      </div>
    </div>
  );
}
