#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 *   node scripts/health-check.mjs                       # local
 *   node scripts/health-check.mjs https://example.com   # against prod
 *
 * Hits the public surfaces that should always respond and reports
 * pass/fail with timing. Exits non-zero if anything fails.
 */
const base = process.argv[2] || process.env.HEALTH_CHECK_URL || "http://localhost:3000";

const targets = [
  { name: "Health endpoint", path: "/api/health", expect: 200 },
  { name: "Public webhook info", path: "/api/webhook/lead", expect: 200 },
  { name: "Push public key", path: "/api/push/public-key", expect: [200, 503] },
  { name: "Robots.txt", path: "/robots.txt", expect: 200 },
  { name: "Manifest", path: "/manifest.json", expect: 200 },
  { name: "Service worker", path: "/sw.js", expect: 200 },
];

let passed = 0;
let failed = 0;

for (const t of targets) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}${t.path}`);
    const ms = Date.now() - t0;
    const expectArr = Array.isArray(t.expect) ? t.expect : [t.expect];
    const ok = expectArr.includes(res.status);
    if (ok) {
      console.log(`✓ ${t.name.padEnd(24)} ${res.status} (${ms}ms)`);
      passed++;
    } else {
      console.error(
        `✗ ${t.name.padEnd(24)} got ${res.status}, expected ${expectArr.join(" or ")} (${ms}ms)`
      );
      failed++;
    }
  } catch (err) {
    console.error(`✗ ${t.name.padEnd(24)} ERROR: ${err.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed against ${base}`);
process.exit(failed > 0 ? 1 : 0);
