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
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (isPublicApi(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
