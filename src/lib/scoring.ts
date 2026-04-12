/**
 * Deterministic scoring helpers for leads and clients.
 *
 * These functions are intentionally pure — they take the raw inputs and
 * return an integer 0-100. The cron jobs and on-create hooks call them
 * when they need to persist a score; the UI reads the persisted value.
 */

import { prisma } from "./db";

/**
 * Compute a lead score (0-100) from signals available at creation /
 * update time. Higher = hotter prospect.
 *
 * Weights (max 100):
 *   - Source quality            0-25
 *   - Deal value                0-20
 *   - Engagement recency        0-20
 *   - Has phone number          0-10
 *   - Has services filled       0-10
 *   - Status progression        0-15
 */
export interface LeadScoreInput {
  source?: string | null;
  value?: number | null;
  phone?: string | null;
  services?: string[] | null;
  status?: string | null;
  lastContactDate?: Date | null;
  createdAt?: Date | null;
}

export function calculateLeadScore(input: LeadScoreInput): number {
  let score = 0;

  // 1) Source quality (max 25)
  const src = (input.source || "").toLowerCase();
  if (src.includes("referral")) score += 25;
  else if (src.includes("website")) score += 18;
  else if (src.includes("linkedin")) score += 15;
  else if (src.includes("conference")) score += 12;
  else if (src.includes("cold")) score += 6;
  else score += 10;

  // 2) Deal value (max 20) — logarithmic so $10k ≈ 10, $100k ≈ 20
  const value = Math.max(0, input.value ?? 0);
  if (value > 0) {
    const bucket = Math.min(20, Math.round(Math.log10(value + 1) * 5));
    score += bucket;
  }

  // 3) Engagement recency (max 20) — lastContactDate within last 7 days = full points
  if (input.lastContactDate) {
    const ageDays = (Date.now() - input.lastContactDate.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 7) score += 20;
    else if (ageDays <= 14) score += 12;
    else if (ageDays <= 30) score += 6;
    else score += 2;
  } else if (input.createdAt) {
    const ageDays = (Date.now() - input.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 3) score += 10;
    else if (ageDays <= 14) score += 5;
  }

  // 4) Has phone (max 10)
  if (input.phone && input.phone.trim().length >= 7) score += 10;

  // 5) Has services filled (max 10)
  if (input.services && input.services.length > 0) score += 10;

  // 6) Status progression (max 15)
  switch ((input.status || "NEW").toUpperCase()) {
    case "NEGOTIATION":
      score += 15;
      break;
    case "PROPOSAL_SENT":
      score += 12;
      break;
    case "QUALIFIED":
      score += 8;
      break;
    case "NEW":
      score += 3;
      break;
    default:
      break;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute a client health score (0-100) from recent activity.
 *
 * Weights (max 100):
 *   - Invoice payment timeliness (on-time ratio)   0-35
 *   - Open ticket pressure (fewer = healthier)     0-25
 *   - Task completion rate                         0-20
 *   - Recent interaction (touches in last 30d)     0-20
 */
export interface ClientHealthInput {
  invoices: Array<{ status: string; dueDate: Date; paidDate: Date | null }>;
  tickets: Array<{ status: string; createdAt: Date }>;
  tasks: Array<{ status: string }>;
  lastContactDate?: Date | null;
}

export function calculateClientHealth(input: ClientHealthInput): number {
  let score = 0;

  // 1) Invoice timeliness (max 35)
  const totalInvoices = input.invoices.length;
  if (totalInvoices === 0) {
    score += 25; // no history — neutral
  } else {
    const onTime = input.invoices.filter(
      (inv) => inv.paidDate !== null && inv.paidDate <= inv.dueDate
    ).length;
    const overdue = input.invoices.filter((inv) => inv.status === "OVERDUE").length;
    const paidLate = input.invoices.filter(
      (inv) => inv.paidDate !== null && inv.paidDate > inv.dueDate
    ).length;
    const paidCount = input.invoices.filter((inv) => inv.status === "PAID").length;

    if (paidCount > 0) {
      const onTimeRatio = onTime / Math.max(1, paidCount + paidLate);
      score += Math.round(onTimeRatio * 35);
    } else {
      score += 20;
    }
    // Active overdue is a strong red flag
    score -= Math.min(25, overdue * 10);
  }

  // 2) Open ticket pressure (max 25)
  const openTickets = input.tickets.filter(
    (t) => t.status !== "RESOLVED" && t.status !== "CLOSED"
  ).length;
  if (openTickets === 0) score += 25;
  else if (openTickets <= 2) score += 18;
  else if (openTickets <= 5) score += 10;
  else score += 0;

  // 3) Task completion rate (max 20)
  const totalTasks = input.tasks.length;
  if (totalTasks === 0) {
    score += 12;
  } else {
    const completed = input.tasks.filter((t) => t.status === "COMPLETED").length;
    const ratio = completed / totalTasks;
    score += Math.round(ratio * 20);
  }

  // 4) Recent interaction (max 20)
  if (input.lastContactDate) {
    const daysSince = (Date.now() - input.lastContactDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) score += 20;
    else if (daysSince <= 14) score += 14;
    else if (daysSince <= 30) score += 8;
    else score += 2;
  } else {
    score += 8;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Recalculate and persist health scores for every ACTIVE client in a
 * tenant (or all tenants if `where` is empty). Used by the daily cron.
 */
export async function recalcAllClientHealth(
  where: Record<string, unknown> = {}
): Promise<{ updated: number; skipped: number }> {
  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE", ...where },
    include: {
      invoices: { select: { status: true, dueDate: true, paidDate: true }, take: 50, orderBy: { createdAt: "desc" } },
      tickets: { select: { status: true, createdAt: true }, take: 50, orderBy: { createdAt: "desc" } },
      tasks: { select: { status: true }, take: 100, orderBy: { createdAt: "desc" } },
    },
  });

  let updated = 0;
  let skipped = 0;
  for (const c of clients) {
    try {
      const health = calculateClientHealth({
        invoices: c.invoices,
        tickets: c.tickets,
        tasks: c.tasks,
        lastContactDate: c.lastContactDate,
      });
      if (health !== c.healthScore) {
        await prisma.client.update({
          where: { id: c.id },
          data: { healthScore: health },
        });
        updated += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      console.error("[recalcAllClientHealth] failed for", c.id, err);
      skipped += 1;
    }
  }

  return { updated, skipped };
}
