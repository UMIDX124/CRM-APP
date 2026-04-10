"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_or_expired: "This login link is invalid or has expired. Please request a new one.",
  no_token: "No login token was provided. Please request a new login link.",
  email_not_found: "No account found with that email address.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  server_error: "Something went wrong. Please try again later.",
};

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" /></div>}>
      <PortalLoginContent />
    </Suspense>
  );
}

function PortalLoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(ERROR_MESSAGES[errorParam] || ERROR_MESSAGES.server_error);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || ERROR_MESSAGES.server_error);
        return;
      }

      setSuccess(true);
    } catch {
      setError(ERROR_MESSAGES.server_error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-lg)",
              background:
                "linear-gradient(135deg, var(--primary), var(--primary-dark))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 22,
              color: "#000",
              marginBottom: 16,
            }}
          >
            A
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: "0 0 6px 0",
              letterSpacing: "-0.03em",
              color: "var(--foreground)",
            }}
          >
            Client Portal
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--foreground-muted)",
              margin: 0,
            }}
          >
            Sign in to access your dashboard
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: 28,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Error banner */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                borderRadius: "var(--radius)",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                marginBottom: 20,
                fontSize: 13,
                color: "#EF4444",
                lineHeight: 1.5,
              }}
            >
              <AlertCircle
                size={16}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.1)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Mail size={22} style={{ color: "var(--emerald)" }} />
              </div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: "0 0 8px 0",
                  color: "var(--foreground)",
                }}
              >
                Check your email
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--foreground-muted)",
                  margin: "0 0 20px 0",
                  lineHeight: 1.6,
                }}
              >
                We sent a login link to{" "}
                <strong style={{ color: "var(--foreground)" }}>{email}</strong>.
                Click the link in the email to sign in.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: 13,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label
                htmlFor="portal-email"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--foreground-muted)",
                  marginBottom: 6,
                }}
              >
                Email address
              </label>
              <div
                style={{
                  position: "relative",
                  marginBottom: 16,
                }}
              >
                <Mail
                  size={16}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--foreground-dim)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="portal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={loading}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.boxShadow = "var(--shadow-ring)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "var(--radius)",
                  border: "none",
                  background: loading
                    ? "var(--primary-dark)"
                    : "var(--primary)",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 0.15s ease",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: "spin 0.8s linear infinite" }}
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    Send Login Link
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: "var(--foreground-dim)",
          }}
        >
          Powered by Alpha Command Center
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
