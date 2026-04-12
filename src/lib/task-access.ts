import { prisma } from "./db";
import { tenantWhere } from "./auth";

/**
 * Resolve tenant scope for a user id and check whether they can access a task.
 * Returns the task row (id only) on success, or null if missing/forbidden.
 */
export async function ensureTaskAccess(taskId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      brandId: true,
      brand: { select: { companyId: true } },
    },
  });
  if (!user) return null;

  const sessionUser = {
    id: user.id,
    role: user.role,
    brandId: user.brandId,
    companyId: user.brand?.companyId ?? null,
  } as Parameters<typeof tenantWhere>[0];

  return prisma.task.findFirst({
    where: { id: taskId, ...tenantWhere(sessionUser) },
    select: { id: true, title: true, status: true },
  });
}
