import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";

export async function GET() {
  const client = await getPortalSession();
  if (!client) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json(client);
}
