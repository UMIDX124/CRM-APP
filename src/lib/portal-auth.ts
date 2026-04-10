import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const PORTAL_COOKIE = "portal-session";
const SESSION_DAYS = 7;
const MAGIC_LINK_MINUTES = 30;

/** Generate a magic link token for a client */
export async function createMagicLink(clientId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_MINUTES * 60_000);

  await prisma.portalMagicLink.create({
    data: { clientId, token, expiresAt },
  });

  return token;
}

/** Validate a magic link token and create a session */
export async function validateMagicLink(token: string) {
  const link = await prisma.portalMagicLink.findUnique({ where: { token } });

  if (!link || link.used || link.expiresAt < new Date()) {
    return null;
  }

  // Mark as used
  await prisma.portalMagicLink.update({
    where: { id: link.id },
    data: { used: true },
  });

  // Verify client has portal access
  const client = await prisma.client.findUnique({
    where: { id: link.clientId },
    select: { id: true, portalAccess: true, companyName: true, contactName: true, email: true },
  });

  if (!client?.portalAccess) return null;

  // Create session
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.portalSession.create({
    data: { clientId: client.id, token: sessionToken, expiresAt },
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return client;
}

/** Get current portal session client */
export async function getPortalSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_COOKIE)?.value;
    if (!token) return null;

    const session = await prisma.portalSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.portalSession.delete({ where: { id: session.id } });
      return null;
    }

    const client = await prisma.client.findUnique({
      where: { id: session.clientId },
      select: {
        id: true, companyName: true, contactName: true, email: true,
        portalAccess: true, brandId: true, status: true,
      },
    });

    if (!client?.portalAccess) return null;
    return client;
  } catch {
    return null;
  }
}

/** Require portal auth — throws if not authenticated */
export async function requirePortalAuth() {
  const client = await getPortalSession();
  if (!client) throw new Error("PortalUnauthorized");
  return client;
}

/** Destroy portal session */
export async function destroyPortalSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_COOKIE)?.value;
    if (token) {
      await prisma.portalSession.deleteMany({ where: { token } });
      cookieStore.delete(PORTAL_COOKIE);
    }
  } catch { /* ignore */ }
}
