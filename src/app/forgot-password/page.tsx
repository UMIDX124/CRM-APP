"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Check } from "lucide-react";
import WolfLogo from "@/components/WolfLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Always show success to prevent enumeration
    } finally {
      setSubmitted(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.08)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center mb-5">
            <WolfLogo size="full" />
          </div>
          <h1 className="text-[24px] font-semibold text-[var(--foreground)] tracking-tight">Reset password</h1>
          <p className="text-[13px] text-[var(--foreground-dim)] mt-1">
            {submitted ? "Check your email for reset instructions" : "Enter your email to receive a reset link"}
          </p>
        </div>

        <div className="animate-fade-in-up stagger-1">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
            {submitted ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-[13px] text-[var(--foreground-muted)] mb-1">Reset link sent</p>
                <p className="text-[11px] text-[var(--foreground-dim)]">
                  If an account exists for <span className="text-[var(--foreground-muted)]">{email}</span>,
                  you&apos;ll receive an email with instructions.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)] pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
                  {loading ? "Sending..." : "Send reset link"}
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
