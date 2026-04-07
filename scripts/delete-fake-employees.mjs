// Delete fake/demo employees from the original seed.
// Keeps only: Faizan (u1), Umer (u2), and the 23 real employees from the salary sheet.
//
// Safely handles FK references by:
//   - Reassigning required FKs (audit_logs, comments, notes, attachments, messages,
//     tasks.creatorId) to Faizan (u1) so history is preserved
//   - Nulling optional FKs (tasks.assigneeId, leads.salesRepId)
//   - Cascade-deleting child rows where the schema allows
//
// Run: node scripts/delete-fake-employees.mjs

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL);

// Fake user IDs from the original seed (everything with "u" prefix except u1, u2)
const FAKE_IDS = ["u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10", "u11", "u12", "u13", "u14"];

// All edits will be reassigned to Faizan (real founder, will always exist)
const SYSTEM_USER = "u1"; // Faizan

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Deleting fake/demo employees");
  console.log("═══════════════════════════════════════\n");

  // Sanity check: confirm Faizan exists as fallback
  const faizan = await sql`SELECT id, email FROM users WHERE id = ${SYSTEM_USER}`;
  if (faizan.length === 0) throw new Error("Faizan (u1) not found — refusing to proceed");
  console.log(`✓ Fallback user: ${faizan[0].email}\n`);

  // Show what we're about to delete
  const fakes = await sql`
    SELECT id, email, "firstName", "lastName"
    FROM users
    WHERE id = ANY(${FAKE_IDS}::text[])
    ORDER BY id
  `;
  console.log(`Found ${fakes.length} fake users to delete:`);
  fakes.forEach((u) => console.log(`  - ${u.id.padEnd(5)} ${u.email.padEnd(35)} ${u.firstName} ${u.lastName}`));
  console.log("");

  if (fakes.length === 0) {
    console.log("Nothing to delete. Exiting.");
    return;
  }

  // ─── STEP 1: Reassign / null FK references ─────────────

  console.log("Reassigning FK references to Faizan...");

  // tasks.assigneeId is nullable → null it
  const r1 = await sql`
    UPDATE tasks SET "assigneeId" = NULL
    WHERE "assigneeId" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ tasks.assigneeId nulled: ${r1.length || "ok"}`);

  // tasks.creatorId is required → reassign to Faizan
  await sql`
    UPDATE tasks SET "creatorId" = ${SYSTEM_USER}
    WHERE "creatorId" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ tasks.creatorId reassigned`);

  // leads.salesRepId is nullable → null it
  await sql`
    UPDATE leads SET "salesRepId" = NULL
    WHERE "salesRepId" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ leads.salesRepId nulled`);

  // audit_logs.userId is required → reassign
  await sql`
    UPDATE audit_logs SET "userId" = ${SYSTEM_USER}
    WHERE "userId" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ audit_logs.userId reassigned`);

  // comments.authorId is required → reassign
  await sql`
    UPDATE comments SET "authorId" = ${SYSTEM_USER}
    WHERE "authorId" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ comments.authorId reassigned`);

  // notes.authorId is required → reassign
  await sql`
    UPDATE notes SET "authorId" = ${SYSTEM_USER}
    WHERE "authorId" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ notes.authorId reassigned`);

  // attachments.uploadedById is required → reassign
  await sql`
    UPDATE attachments SET "uploadedById" = ${SYSTEM_USER}
    WHERE "uploadedById" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ attachments.uploadedById reassigned`);

  // messages.authorId is required → reassign
  await sql`
    UPDATE messages SET "authorId" = ${SYSTEM_USER}
    WHERE "authorId" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ messages.authorId reassigned`);

  // users.managerId — fakes can't be managers anymore
  await sql`
    UPDATE users SET "managerId" = NULL
    WHERE "managerId" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ users.managerId nulled`);

  // channels.createdById is required → reassign
  await sql`
    UPDATE channels SET "createdById" = ${SYSTEM_USER}
    WHERE "createdById" = ANY(${FAKE_IDS}::text[])
  `;
  console.log(`  ✓ channels.createdById reassigned`);

  // ─── STEP 2: Delete cascade-able child rows ─────────────

  console.log("\nCleaning cascade-able child rows...");

  // notifications, attendance, channel_members all have ON DELETE CASCADE — they go automatically
  // But explicitly clean them first to be safe
  await sql`DELETE FROM channel_members WHERE "userId" = ANY(${FAKE_IDS}::text[])`;
  console.log(`  ✓ channel_members removed`);

  await sql`DELETE FROM notifications WHERE "userId" = ANY(${FAKE_IDS}::text[])`;
  console.log(`  ✓ notifications removed`);

  await sql`DELETE FROM attendance WHERE "userId" = ANY(${FAKE_IDS}::text[])`;
  console.log(`  ✓ attendance removed`);

  await sql`DELETE FROM sessions WHERE "userId" = ANY(${FAKE_IDS}::text[])`;
  console.log(`  ✓ sessions removed`);

  // ─── STEP 3: Finally delete the fake users ─────────────

  console.log("\nDeleting fake users...");
  const deleted = await sql`
    DELETE FROM users
    WHERE id = ANY(${FAKE_IDS}::text[])
    RETURNING email
  `;
  console.log(`  ✓ Deleted ${deleted.length} users:`);
  deleted.forEach((u) => console.log(`    - ${u.email}`));

  // ─── Final report ─────────────────────────────────────
  const remaining = await sql`SELECT COUNT(*)::int as count FROM users`;
  console.log(`\n✅ Cleanup complete. Remaining users: ${remaining[0].count}`);
}

main().catch((err) => {
  console.error("\n❌ Cleanup failed:", err.message);
  process.exit(1);
});
