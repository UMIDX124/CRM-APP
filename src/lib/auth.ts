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
      },
    });

    return user;
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
