import { cookies } from "next/headers";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "fu-crm-session";
const SESSION_EXPIRY_DAYS = 7;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, request?: Request) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_EXPIRY_DAYS);

  const ipAddress = request?.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request?.headers.get("user-agent") || "unknown";

  await prisma.session.create({
    data: { sessionToken: token, userId, expires, ipAddress, userAgent },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });

  return token;
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
    });

    if (!session || session.expires < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, department: true, brandId: true, avatar: true,
        title: true, status: true, language: true, twoFactorEnabled: true,
        brand: { select: { companyId: true } },
      },
    });

    if (!user) return null;

    // Flatten brand.companyId so callers can reference `user.companyId`
    // directly when enforcing multi-tenant isolation on DB queries.
    // Users without a brand (unassigned) get a null companyId which every
    // tenant filter treats as "no access" — safe default.
    const { brand, ...rest } = user;
    return { ...rest, companyId: brand?.companyId ?? null };
  } catch (err) {
    console.error("getSession error:", err);
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { sessionToken: token } });
      cookieStore.delete(SESSION_COOKIE);
    }
  } catch (err) {
    console.error("destroySession error:", err);
  }
}

export async function requireAuth() {
  const user = await getSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// Role-based access
export function canAccess(userRole: string, requiredRoles: string[]) {
  return requiredRoles.includes(userRole);
}

export function isAdmin(role: string) {
  return role === "SUPER_ADMIN";
}

export function isManager(role: string) {
  return ["SUPER_ADMIN", "PROJECT_MANAGER", "DEPT_HEAD"].includes(role);
}

/**
 * Tenant scoping for Prisma `where` clauses on models that live under a
 * Brand (Client, Deal, Lead, Invoice, Ticket, Task, Webhook, …).
 *
 * Scoping rules:
 *   - SUPER_ADMIN:                      no filter (sees everything)
 *   - PROJECT_MANAGER / DEPT_HEAD:      filter by user's companyId — they
 *                                       oversee every brand under their
 *                                       parent company
 *   - everyone else (EMPLOYEE, etc.):   filter by user's brandId exactly
 *
 * Users without a brand assignment get `{ brandId: "__none__" }` — a
 * sentinel that matches nothing. This is safer than an empty filter
 * which would leak all rows.
 *
 * Usage:
 *   const where = { ...tenantWhere(user), status: "ACTIVE" };
 *   await prisma.client.findMany({ where });
 */
export type SessionUser = {
  id: string;
  role: string;
  brandId: string | null;
  companyId: string | null;
};

export function tenantWhere(user: SessionUser): Record<string, unknown> {
  if (user.role === "SUPER_ADMIN") return {};
  if (user.role === "PROJECT_MANAGER" || user.role === "DEPT_HEAD") {
    if (user.companyId) return { brand: { companyId: user.companyId } };
    // Manager without a brand assigned → lock out
    return { brandId: "__none__" };
  }
  // Regular employees: their own brand only
  return { brandId: user.brandId ?? "__none__" };
}

/**
 * Same scoping rules but for the User model itself (which has brandId but
 * no relation back to Brand named "brand" for filter purposes).
 */
export function tenantUserWhere(user: SessionUser): Record<string, unknown> {
  if (user.role === "SUPER_ADMIN") return {};
  if (user.role === "PROJECT_MANAGER" || user.role === "DEPT_HEAD") {
    if (user.companyId) return { brand: { companyId: user.companyId } };
    return { brandId: "__none__" };
  }
  return { brandId: user.brandId ?? "__none__" };
}

/**
 * Assert that a tenant-scoped row with the given id exists and is visible
 * to `user`. Use this BEFORE any mutation on a detail route to prevent
 * ID-guessing cross-tenant bypasses.
 *
 * Usage:
 *   const exists = await prisma.deal.findFirst({
 *     where: { id, ...tenantWhere(user) },
 *     select: { id: true },
 *   });
 *   if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
 *
 * We return 404 (not 403) so the endpoint doesn't leak whether the row
 * exists in another tenant's scope.
 */
export type TenantModelName =
  | "deal"
  | "ticket"
  | "invoice"
  | "client"
  | "lead"
  | "task";
