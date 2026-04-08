// Seed initial deals + tickets data tied to existing brands/clients/users.
// Idempotent — uses upsert by title/subject markers so re-runs are safe.
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const adapter = new PrismaNeon({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const SEED_TAG = "[seed]";

async function main() {
  console.log("→ Seeding deals + tickets");

  // Look up existing brands, clients, users
  const brands = await prisma.brand.findMany();
  const clients = await prisma.client.findMany({ take: 20 });
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    take: 10,
  });

  if (brands.length === 0 || clients.length === 0 || users.length === 0) {
    console.error("✗ No brands/clients/users found — run main seed first");
    process.exit(1);
  }
  console.log(
    `  · ${brands.length} brands, ${clients.length} clients, ${users.length} users found`
  );

  const vcs = brands.find((b) => b.code === "VCS");
  const bsl = brands.find((b) => b.code === "BSL");
  const dpl = brands.find((b) => b.code === "DPL");

  const owner = users[0];
  const owner2 = users[1] || users[0];

  // ─── DEALS ────────────────────────────────────────────
  // Wipe seeded deals, re-create cleanly
  await prisma.dealActivity.deleteMany({
    where: { deal: { description: { contains: SEED_TAG } } },
  });
  await prisma.deal.deleteMany({
    where: { description: { contains: SEED_TAG } },
  });

  const dealSpecs = [
    {
      title: "Acme Corp — Annual Marketing Retainer",
      stage: "QUALIFICATION",
      value: 48000,
      probability: 40,
      brand: dpl,
      client: clients[0],
      owner,
      expectedClose: 30,
    },
    {
      title: "TechMart Q2 Performance Campaign",
      stage: "PROPOSAL",
      value: 15000,
      probability: 60,
      brand: bsl,
      client: clients[1],
      owner: owner2,
      expectedClose: 14,
    },
    {
      title: "SecureBank — SOC2 Compliance Bundle",
      stage: "NEGOTIATION",
      value: 75000,
      probability: 75,
      brand: bsl,
      client: clients[2],
      owner,
      expectedClose: 21,
    },
    {
      title: "DataFlow Analytics — Custom Dashboard Build",
      stage: "NEW",
      value: 22000,
      probability: 25,
      brand: vcs,
      client: clients[3],
      owner: owner2,
      expectedClose: 45,
    },
    {
      title: "DTC E-Commerce — Conversion Optimization",
      stage: "PROPOSAL",
      value: 12500,
      probability: 55,
      brand: dpl,
      client: clients[4],
      owner,
      expectedClose: 7,
    },
    {
      title: "B2B SaaS — LinkedIn Lead Gen Q3",
      stage: "QUALIFICATION",
      value: 28000,
      probability: 35,
      brand: dpl,
      client: clients[5],
      owner: owner2,
      expectedClose: 60,
    },
    {
      title: "SaaS Startup — MVP Marketing Sprint",
      stage: "CLOSED_WON",
      value: 8500,
      probability: 100,
      brand: vcs,
      client: clients[6],
      owner,
      expectedClose: -10,
    },
    {
      title: "Marketing Agency Partner — Reseller Tier",
      stage: "CLOSED_WON",
      value: 18000,
      probability: 100,
      brand: vcs,
      client: clients[7],
      owner: owner2,
      expectedClose: -5,
    },
    {
      title: "Singapore FinTech — Mobile App Build",
      stage: "CLOSED_LOST",
      value: 35000,
      probability: 0,
      brand: bsl,
      owner,
      expectedClose: -3,
      lostReason: "Budget constraints — re-engage Q3",
    },
  ];

  for (const spec of dealSpecs) {
    const deal = await prisma.deal.create({
      data: {
        title: spec.title,
        description: `${SEED_TAG} ${spec.title}`,
        value: spec.value,
        currency: "USD",
        stage: spec.stage,
        probability: spec.probability,
        expectedClose: new Date(
          Date.now() + spec.expectedClose * 24 * 60 * 60 * 1000
        ),
        actualClose:
          spec.stage === "CLOSED_WON" || spec.stage === "CLOSED_LOST"
            ? new Date(Date.now() + spec.expectedClose * 24 * 60 * 60 * 1000)
            : null,
        lostReason: spec.lostReason || null,
        brandId: spec.brand?.id ?? null,
        clientId: spec.client?.id ?? null,
        ownerId: spec.owner.id,
        source: "Direct outreach",
        tags: [],
      },
    });

    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        userId: spec.owner.id,
        type: "NOTE",
        content: `Deal seeded in stage ${spec.stage}`,
      },
    });

    if (spec.stage !== "NEW") {
      await prisma.dealActivity.create({
        data: {
          dealId: deal.id,
          userId: spec.owner.id,
          type: "STAGE_CHANGE",
          content: `Stage advanced to ${spec.stage}`,
          metadata: { from: "NEW", to: spec.stage },
        },
      });
    }
  }
  console.log(`  ✓ ${dealSpecs.length} deals seeded`);

  // ─── TICKETS ──────────────────────────────────────────
  await prisma.ticketComment.deleteMany({
    where: { ticket: { description: { contains: SEED_TAG } } },
  });
  await prisma.ticket.deleteMany({
    where: { description: { contains: SEED_TAG } },
  });

  const ticketSpecs = [
    {
      subject: "Cannot log in to dashboard after password reset",
      description:
        "User reports the password reset email arrives but the new password is rejected at login. Tried in Chrome and Safari, same result.",
      status: "OPEN",
      priority: "HIGH",
      channel: "EMAIL",
      brand: dpl,
      client: clients[0],
      requester: owner,
      assignee: owner2,
    },
    {
      subject: "Invoice #INV-2026-042 shows wrong tax rate",
      description:
        "Invoice for March services lists 18% VAT but our agreement is 5%. Please reissue.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      channel: "WEB",
      brand: bsl,
      client: clients[1],
      requester: owner,
      assignee: owner,
    },
    {
      subject: "Request: Add Spanish language support",
      description:
        "Several clients in LATAM are asking for Spanish UI. Is this on the roadmap?",
      status: "WAITING_CUSTOMER",
      priority: "MEDIUM",
      channel: "CHAT",
      brand: dpl,
      client: clients[2],
      requester: owner2,
      assignee: owner,
    },
    {
      subject: "API rate limit exceeded — need higher tier",
      description:
        "Hitting 429s on /api/leads. Currently on Standard plan, need Enterprise rate limits before EOM.",
      status: "OPEN",
      priority: "HIGH",
      channel: "API",
      brand: bsl,
      client: clients[3],
      requester: owner,
      assignee: owner2,
    },
    {
      subject: "Onboarding call this Friday at 3pm PST",
      description:
        "Confirming the kickoff meeting for the new contract. Calendar invite pending.",
      status: "RESOLVED",
      priority: "LOW",
      channel: "PHONE",
      brand: dpl,
      client: clients[4],
      requester: owner2,
      assignee: owner,
    },
    {
      subject: "Bug: Kanban drag drops cards into wrong column",
      description:
        "When I drag a deal from Proposal to Negotiation it lands in Won instead. Reproducible 100%.",
      status: "OPEN",
      priority: "HIGH",
      channel: "WEB",
      brand: vcs,
      client: clients[5],
      requester: owner,
      assignee: owner2,
    },
    {
      subject: "Question: How to export deal data to CSV?",
      description:
        "Looking for an export option for the entire deals pipeline for our quarterly board review.",
      status: "RESOLVED",
      priority: "LOW",
      channel: "EMAIL",
      brand: vcs,
      client: clients[6],
      requester: owner2,
      assignee: owner,
    },
    {
      subject: "SSL certificate expiring in 7 days",
      description:
        "Internal monitoring detected the cert for app.fu-corp.com is expiring April 15. Renew immediately.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      channel: "API",
      brand: bsl,
      requester: owner,
      assignee: owner,
    },
  ];

  for (const spec of ticketSpecs) {
    const ticket = await prisma.ticket.create({
      data: {
        subject: spec.subject,
        description: `${SEED_TAG} ${spec.description}`,
        status: spec.status,
        priority: spec.priority,
        channel: spec.channel,
        brandId: spec.brand?.id ?? null,
        clientId: spec.client?.id ?? null,
        requesterId: spec.requester.id,
        assigneeId: spec.assignee.id,
        firstResponseAt:
          spec.status !== "OPEN"
            ? new Date(Date.now() - 2 * 60 * 60 * 1000)
            : null,
        resolvedAt:
          spec.status === "RESOLVED"
            ? new Date(Date.now() - 30 * 60 * 1000)
            : null,
      },
    });

    if (spec.status !== "OPEN") {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: spec.assignee.id,
          content:
            "Thanks for reporting this — taking a look now and will update shortly.",
          isInternal: false,
        },
      });
    }
    if (spec.status === "RESOLVED") {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: spec.assignee.id,
          content: "Resolved — please reopen if you see this again.",
          isInternal: false,
        },
      });
    }
  }
  console.log(`  ✓ ${ticketSpecs.length} tickets seeded`);

  // ─── Verify ────────────────────────────────────────────
  const dealCount = await prisma.deal.count();
  const ticketCount = await prisma.ticket.count();
  const dealStageBreakdown = await prisma.deal.groupBy({
    by: ["stage"],
    _count: true,
  });
  const ticketStatusBreakdown = await prisma.ticket.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log("\n→ Final state:");
  console.log(`  deals total: ${dealCount}`);
  console.table(dealStageBreakdown);
  console.log(`  tickets total: ${ticketCount}`);
  console.table(ticketStatusBreakdown);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("✗ seed failed:", e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
