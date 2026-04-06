import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getSession();
    if (user) {
      await logAudit({ action: "LOGOUT", entity: "User", entityId: user.id, userId: user.id });
    }
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ ok: true });
  }
}
