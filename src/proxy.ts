import { NextResponse, type NextRequest } from "next/server";

/**
 * Global proxy (Next.js 16 replacement for middleware.ts) —
 * defense-in-depth auth gate for `/api/*`.
 *
 * This proxy does NOT validate the session token against the database;
 * every route handler is still expected to call `requireAuth()` / `getSession()`
 * for the authoritative user lookup. This layer just cuts off anonymous
 * traffic before it ever reaches a function instance.
 *
 * Public API routes that MUST remain reachable without a session:
 *   - /api/auth/login
 *   - /api/auth/logout          (clearing a stale cookie)
 *   - /api/auth/forgot-password
 *   - /api/auth/reset-password
 *   - /api/health               (uptime monitors)
 *   - /api/push/public-key      (VAPID key for subscription)
 *   - /api/webhook/*            (inbound website leads, signed separately)
 */

const SESSION_COOKIE = "fu-crm-session";

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
  "/api/push/public-key",
  "/api/webhook/",
  // Kiosk is an unauthenticated shared device — the pin-verify route
  // has its own IP rate limit + constant-time comparison for safety.
  "/api/attendance/pin-verify",
  // Public tracking endpoints (authenticated via apiKey, not session)
  "/api/track/",
  // Gmail OAuth callback (user redirected from Google)
  "/api/gmail/callback",
  // Client portal (authenticated via portal-session cookie, not CRM session)
  "/api/portal/",
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const response = NextResponse.next();

  // Security headers on all responses
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // CORS for public webhook + tracking endpoints
  if (pathname.startsWith("/api/webhook/") || pathname.startsWith("/api/track/")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Signature");
  }

  // Cron endpoints protected by CRON_SECRET (not session cookie)
  if (pathname.startsWith("/api/cron/")) return response;

  if (!pathname.startsWith("/api/")) return response;
  if (isPublicApi(pathname)) return response;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
