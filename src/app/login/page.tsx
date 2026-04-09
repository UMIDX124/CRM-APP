"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff, ArrowRight } from "lucide-react";
import WolfLogo from "@/components/WolfLogo";

// P0-6 FIX: No passwords exposed in frontend — email-only quick-fill
const quickAccessUsers = [
  { email: "umi@digitalpointllc.com", role: "SUPER_ADMIN", name: "Umer", color: "#F59E0B" },
  { email: "faizi@digitalpointllc.com", role: "SUPER_ADMIN", name: "Faizan", color: "#3B82F6" },
  { email: "ali@digitalpointllc.com", role: "PROJECT_MANAGER", name: "Ali Hassan", color: "#22C55E" },
  { email: "client@example.com", role: "EMPLOYEE", name: "Client Demo", color: "#F59E0B" },
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
      setError("Unable to connect to server. Please try again.");
    }
    setLoading(false);
  };

  const quickFill = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,rgba(245,158,11,0.08)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center mb-5">
            <WolfLogo size="full" animated />
          </div>
          <h1 className="text-[24px] font-semibold text-[var(--foreground)] tracking-tight">Alpha Command Center</h1>
          <p className="text-[13px] text-[var(--foreground-dim)] mt-1">Enterprise CRM</p>
        </div>

        {/* Login Card */}
        <div className="animate-fade-in-up stagger-1">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/15 text-red-400 text-[13px] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="your@email.com"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Enter password"
                    className="input-field pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogin} disabled={loading}
                className="btn-primary w-full py-3 mt-1 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><LogIn className="w-4 h-4" />Sign In</>
                )}
              </button>

              <div className="flex justify-center pt-1">
                <Link
                  href="/forgot-password"
                  className="text-[12px] text-[var(--foreground-dim)] hover:text-[var(--primary)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Quick Access — email-only, no passwords. Gated behind NEXT_PUBLIC_SHOW_DEMO_LOGINS for prod safety */}
            {process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === 'true' && (
              <div className="mt-6 pt-5 border-t border-[var(--border)]">
                <p className="text-[11px] text-[var(--foreground-dim)] mb-3 font-medium">Quick Access</p>
                <div className="space-y-1">
                  {quickAccessUsers.map((user, i) => (
                    <button
                      key={i}
                      onClick={() => quickFill(user.email)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0"
                        style={{ backgroundColor: `${user.color}15`, color: user.color }}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[13px] text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] transition-colors">{user.name}</p>
                        <p className="text-[10px] text-[var(--foreground-dim)]">{user.role.replace(/_/g, " ")}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--foreground-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-[var(--foreground-dim)] mt-6 opacity-40">Alpha Command Center</p>
      </div>
    </div>
  );
}
