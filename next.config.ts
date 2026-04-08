import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * - script-src includes 'unsafe-inline' because Next.js inlines a small
 *   bootstrap script and the SW registration. 'unsafe-eval' only in dev
 *   for fast refresh; production strips it.
 * - connect-src includes the Vercel deploy URL plus Neon for the Prisma
 *   data adapter, Groq for the AI chat tab, Resend for email, and Upstash
 *   for optional rate limiting / realtime.
 * - frame-ancestors 'none' is the modern equivalent of X-Frame-Options DENY
 *   but we send both for older browsers.
 */
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.vercel.app https://*.neon.tech wss://*.neon.tech https://api.groq.com https://api.resend.com https://*.upstash.io",
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Optimized via Vercel image pipeline. All current <Image> usages point
    // at /public assets; add entries to `remotePatterns` before referencing
    // any off-domain image hosts.
    unoptimized: false,
    remotePatterns: [],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
