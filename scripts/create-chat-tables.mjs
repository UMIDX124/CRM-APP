// Create Channel, ChannelMember, Message tables via Neon HTTP
// Run: node scripts/create-chat-tables.mjs

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Creating communication tables...");

  // Channels
  await sql`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'PUBLIC',
      "createdById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT channels_createdBy_fkey FOREIGN KEY ("createdById") REFERENCES users(id)
    )
  `;
  console.log("✓ channels table");

  // Channel Members
  await sql`
    CREATE TABLE IF NOT EXISTS channel_members (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "channelId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT cm_channel_fkey FOREIGN KEY ("channelId") REFERENCES channels(id) ON DELETE CASCADE,
      CONSTRAINT cm_user_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT channel_members_unique UNIQUE ("channelId", "userId")
    )
  `;
  console.log("✓ channel_members table");

  // Messages
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      content TEXT NOT NULL,
      "channelId" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'TEXT',
      metadata JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT msg_channel_fkey FOREIGN KEY ("channelId") REFERENCES channels(id) ON DELETE CASCADE,
      CONSTRAINT msg_author_fkey FOREIGN KEY ("authorId") REFERENCES users(id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS messages_channel_created ON messages ("channelId", "createdAt")`;
  console.log("✓ messages table + index");

  // Get first admin user for channel creation
  const admins = await sql`SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1`;
  const adminId = admins[0]?.id;

  if (!adminId) {
    console.log("⚠ No admin user found — skipping default channels");
    return;
  }

  // Create default channels
  const defaultChannels = [
    { name: "general", description: "Company-wide announcements and updates" },
    { name: "leads", description: "Auto-feed of new leads from all websites" },
    { name: "tasks", description: "Task assignments and status changes" },
    { name: "dpl-team", description: "Digital Point LLC team channel" },
    { name: "vcs-team", description: "Virtual Customer Solution team channel" },
    { name: "bsl-team", description: "Backup Solutions LLC team channel" },
  ];

  for (const ch of defaultChannels) {
    const existing = await sql`SELECT id FROM channels WHERE name = ${ch.name} LIMIT 1`;
    if (existing.length === 0) {
      await sql`INSERT INTO channels (id, name, description, type, "createdById", "updatedAt")
        VALUES (gen_random_uuid()::text, ${ch.name}, ${ch.description}, 'PUBLIC', ${adminId}, CURRENT_TIMESTAMP)`;
      console.log(`  + Created #${ch.name}`);
    } else {
      console.log(`  ✓ #${ch.name} already exists`);
    }
  }

  // Add all users as members of #general
  const generalChannel = await sql`SELECT id FROM channels WHERE name = 'general' LIMIT 1`;
  if (generalChannel[0]) {
    const allUsers = await sql`SELECT id FROM users WHERE status = 'ACTIVE'`;
    for (const user of allUsers) {
      await sql`INSERT INTO channel_members ("channelId", "userId", role)
        VALUES (${generalChannel[0].id}, ${user.id}, 'MEMBER')
        ON CONFLICT ("channelId", "userId") DO NOTHING`;
    }
    console.log(`  + Added ${allUsers.length} users to #general`);
  }

  console.log("\n✅ All communication tables created and seeded.");
}

main().catch(console.error);
