"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, Check, AlertTriangle } from "lucide-react";
import WolfLogo from "@/components/WolfLogo";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token. Request a new reset link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset failed. The link may have expired.");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,rgba(245,158,11,0.08)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center mb-5">
            <WolfLogo size="full" />
          </div>
          <h1 className="text-[24px] font-semibold text-[var(--foreground)] tracking-tight">
            Choose a new password
          </h1>
          <p className="text-[13px] text-[var(--foreground-dim)] mt-1">
            {done ? "Password updated — redirecting to sign in…" : "Enter a new password for your account"}
          </p>
        </div>

        <div className="animate-fade-in-up stagger-1">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
            {done ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-[13px] text-[var(--foreground-muted)]">Password reset successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)] pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)] pointer-events-none" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      minLength={8}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[12px] text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 disabled:opacity-60"
                >
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-[var(--border)]">
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--foreground-dim)] hover:text-[var(--primary)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-[var(--foreground-dim)] mt-6 opacity-40">Alpha Command Center</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
