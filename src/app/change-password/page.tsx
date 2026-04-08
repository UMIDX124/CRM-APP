"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { WolfIcon } from "@/components/WolfLogo";

/**
 * Standalone /change-password page used both as a regular self-service
 * password change and as the forced-reset target when login returns
 * `mustChangePassword: true`. Lives outside the (dashboard) group so the
 * sidebar isn't rendered.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Strength heuristic — purely client-side guidance
  const strength = (() => {
    let s = 0;
    if (next.length >= 8) s++;
    if (next.length >= 12) s++;
    if (/[A-Z]/.test(next) && /[a-z]/.test(next)) s++;
    if (/\d/.test(next)) s++;
    if (/[^A-Za-z0-9]/.test(next)) s++;
    return s; // 0..5
  })();
  const strengthLabel = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"][strength];
  const strengthColor = ["#27272a", "#EF4444", "#F59E0B", "#F59E0B", "#10B981", "#10B981"][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("New passwords don't match");
      return;
    }
    if (next.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to change password");
      }
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-[20px] font-semibold text-[var(--foreground)]">
            Password updated
          </h1>
          <p className="text-[13px] text-[var(--foreground-dim)] mt-2">
            Redirecting to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div
            className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border-2 border-[var(--primary)]/30 flex items-center justify-center overflow-hidden"
          >
            <WolfIcon size={36} />
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-[var(--primary)]" />
            <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
              Change password
            </h1>
          </div>
          <p className="text-[12px] text-[var(--foreground-dim)] mb-6">
            Pick a strong password that you haven&apos;t used elsewhere.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="input-field w-full text-[13px] pr-10"
                  required
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--foreground-dim)] p-1"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNext ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className="input-field w-full text-[13px] pr-10"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNext((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--foreground-dim)] p-1"
                  aria-label={showNext ? "Hide password" : "Show password"}
                >
                  {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {next && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-[var(--surface-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(strength / 5) * 100}%`,
                        backgroundColor: strengthColor,
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: strengthColor }}
                  >
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
                Confirm new password
              </label>
              <input
                type={showNext ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-field w-full text-[13px]"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="text-[11px] text-[var(--danger)] bg-red-500/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full text-[13px]"
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
