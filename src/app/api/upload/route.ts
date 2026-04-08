import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    // 30 uploads/min/user — generous for paste/drag, blocks abuse
    const rl = await rateLimit("upload", req, { limit: 30, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const taskId = formData.get("taskId") as string | null;
    const clientId = formData.get("clientId") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Use Vercel Blob if available, otherwise store metadata only
    let url = "";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(file.name, file, { access: "public" });
      url = blob.url;
    } else {
      url = `/uploads/${Date.now()}-${file.name}`;
    }

    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        url,
        mimeType: file.type,
        size: file.size,
        taskId,
        clientId,
        uploadedById: user.id,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
