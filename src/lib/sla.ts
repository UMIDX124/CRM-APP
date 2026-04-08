/**
 * SLA computation and breach detection.
 *
 * SLA windows by priority (per the spec):
 *   URGENT  → 4h
 *   HIGH    → 8h
 *   MEDIUM  → 24h
 *   LOW     → 72h
 *
 * `computeSlaDueAt` is called when a ticket is created or its priority
 * changes. `isBreached` is a pure function so the UI can compute it without
 * a roundtrip.
 */

export type TicketPriorityLike = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

const SLA_HOURS: Record<TicketPriorityLike, number> = {
  URGENT: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

export function slaHoursFor(priority: TicketPriorityLike): number {
  return SLA_HOURS[priority] ?? SLA_HOURS.MEDIUM;
}

export function computeSlaDueAt(
  priority: TicketPriorityLike,
  from: Date = new Date()
): Date {
  const hours = slaHoursFor(priority);
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function isBreached(
  slaDueAt: Date | string | null,
  status: string
): boolean {
  if (!slaDueAt) return false;
  if (status === "RESOLVED" || status === "CLOSED") return false;
  const due = typeof slaDueAt === "string" ? new Date(slaDueAt) : slaDueAt;
  return due.getTime() < Date.now();
}

export function timeUntilBreach(
  slaDueAt: Date | string | null
): { ms: number; label: string; breached: boolean } {
  if (!slaDueAt) return { ms: Infinity, label: "—", breached: false };
  const due = typeof slaDueAt === "string" ? new Date(slaDueAt) : slaDueAt;
  const ms = due.getTime() - Date.now();
  if (ms < 0) {
    return { ms, label: `${formatDuration(-ms)} overdue`, breached: true };
  }
  return { ms, label: `${formatDuration(ms)} left`, breached: false };
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
