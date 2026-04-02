import { prisma } from "./db";

export async function logAudit({
  action,
  entity,
  entityId,
  userId,
  changes,
  metadata,
  ipAddress,
}: {
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT";
  entity: string;
  entityId: string;
  userId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      userId,
      changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      ipAddress,
    },
  });
}
