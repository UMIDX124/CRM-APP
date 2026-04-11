import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPortalSession } from "@/lib/portal-auth";

export async function GET() {
  const client = await getPortalSession();
  if (!client) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json(client);
}

export async function PATCH(req: Request) {
  try {
    const client = await getPortalSession();
    if (!client) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { contactName, phone, country, website } = body;

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: {
        ...(contactName !== undefined && { contactName: String(contactName).trim().slice(0, 200) }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim().slice(0, 50) : null }),
        ...(country !== undefined && { country: country ? String(country).trim().slice(0, 100) : null }),
        ...(website !== undefined && { website: website ? String(website).trim().slice(0, 300) : null }),
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        country: true,
        website: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[portal/me PATCH]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
