import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, tenantWhere, tenantUserWhere } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
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
    // 10 exports/min/user — exports are heavy DB scans
    const rl = await rateLimit("export", req, { limit: 10, windowSec: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many exports" }, { status: 429 });
    }
    const url = new URL(req.url);
    const entity = url.searchParams.get("entity");

    if (!entity) return NextResponse.json({ error: "Entity required" }, { status: 400 });

    let data: Record<string, unknown>[] = [];

    // Every entity is tenant-scoped so a manager can't export data from
    // brands outside their own company and an employee can't export
    // anything outside their own brand.
    const tenant = tenantWhere(user);
    const userTenant = tenantUserWhere(user);

    switch (entity) {
      case "employees": {
        const rows = await prisma.user.findMany({
          where: userTenant,
          select: { firstName: true, lastName: true, email: true, phone: true, title: true, role: true, department: true, status: true, salary: true, hireDate: true },
        });
        data = rows.map((r) => ({ ...r, hireDate: r.hireDate?.toISOString().split("T")[0] || "" }));
        break;
      }
      case "clients": {
        const rows = await prisma.client.findMany({
          where: tenant,
          select: { companyName: true, contactName: true, email: true, phone: true, country: true, status: true, mrr: true, healthScore: true },
        });
        data = rows as unknown as Record<string, unknown>[];
        break;
      }
      case "tasks": {
        const rows = await prisma.task.findMany({
          where: tenant,
          select: { title: true, status: true, priority: true, dueDate: true, timeSpent: true },
          orderBy: { createdAt: "desc" },
        });
        data = rows.map((r) => ({ ...r, dueDate: r.dueDate?.toISOString().split("T")[0] || "" }));
        break;
      }
      case "invoices": {
        const rows = await prisma.invoice.findMany({
          where: tenant,
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
        // Attendance is user-scoped, so we constrain via the `user` relation
        // with the same multi-tenant rules that apply to the users list.
        const rows = await prisma.attendance.findMany({
          where: { user: userTenant },
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
