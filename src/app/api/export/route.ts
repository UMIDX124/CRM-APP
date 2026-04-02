import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const entity = url.searchParams.get("entity");

    if (!entity) return NextResponse.json({ error: "Entity required" }, { status: 400 });

    let data: Record<string, unknown>[] = [];

    switch (entity) {
      case "employees": {
        const rows = await prisma.user.findMany({
          select: { firstName: true, lastName: true, email: true, phone: true, title: true, role: true, department: true, status: true, salary: true, hireDate: true },
        });
        data = rows.map((r) => ({ ...r, hireDate: r.hireDate?.toISOString().split("T")[0] || "" }));
        break;
      }
      case "clients": {
        const rows = await prisma.client.findMany({
          select: { companyName: true, contactName: true, email: true, phone: true, country: true, status: true, mrr: true, healthScore: true },
        });
        data = rows as unknown as Record<string, unknown>[];
        break;
      }
      case "tasks": {
        const rows = await prisma.task.findMany({
          select: { title: true, status: true, priority: true, dueDate: true, timeSpent: true },
          orderBy: { createdAt: "desc" },
        });
        data = rows.map((r) => ({ ...r, dueDate: r.dueDate?.toISOString().split("T")[0] || "" }));
        break;
      }
      case "invoices": {
        const rows = await prisma.invoice.findMany({
          select: { number: true, status: true, total: true, issueDate: true, dueDate: true, paidDate: true },
          orderBy: { issueDate: "desc" },
        });
        data = rows.map((r) => ({
          ...r,
          issueDate: r.issueDate.toISOString().split("T")[0],
          dueDate: r.dueDate.toISOString().split("T")[0],
          paidDate: r.paidDate?.toISOString().split("T")[0] || "",
        }));
        break;
      }
      case "attendance": {
        const rows = await prisma.attendance.findMany({
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { date: "desc" },
          take: 500,
        });
        data = rows.map((r) => ({
          name: `${r.user.firstName} ${r.user.lastName}`,
          date: r.date.toISOString().split("T")[0],
          status: r.status,
          checkIn: r.checkIn?.toISOString() || "",
          checkOut: r.checkOut?.toISOString() || "",
          hoursWorked: r.hoursWorked,
        }));
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
    }

    await logAudit({
      action: "EXPORT", entity, entityId: "bulk", userId: user.id,
      metadata: { rowCount: data.length },
    });

    const csv = toCSV(data);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${entity}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
