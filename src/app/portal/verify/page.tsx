"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

export default function PortalVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" /></div>}>
      <PortalVerifyContent />
    </Suspense>
  );
}

function PortalVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      router.replace("/portal/login?error=no_token");
      return;
    }

    // Redirect to the API verify endpoint which will set the session cookie and redirect
    window.location.href = `/api/portal/verify?token=${encodeURIComponent(token)}`;
  }, [searchParams, router]);

  // If we're still here after 8 seconds, something went wrong
  useEffect(() => {
    const timeout = setTimeout(() => {
      setError(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

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
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        {error ? (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <AlertCircle size={22} style={{ color: "var(--danger)" }} />
            </div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 600,
                margin: "0 0 8px 0",
                color: "var(--foreground)",
              }}
            >
              Verification failed
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--foreground-muted)",
                margin: "0 0 20px 0",
                lineHeight: 1.6,
              }}
            >
              The verification is taking too long. Your link may be invalid or
              expired.
            </p>
            <button
              onClick={() => router.replace("/portal/login")}
              style={{
                padding: "10px 24px",
                borderRadius: "var(--radius)",
                border: "none",
                background: "var(--primary)",
                color: "#000",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--primary-subtle)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Loader2
                size={22}
                style={{
                  color: "var(--primary)",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 600,
                margin: "0 0 8px 0",
                color: "var(--foreground)",
              }}
            >
              Verifying your login...
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--foreground-muted)",
                margin: 0,
              }}
            >
              Please wait while we verify your credentials.
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
