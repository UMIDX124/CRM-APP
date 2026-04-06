import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireAuth, isManager, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand");
    const department = url.searchParams.get("department");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (brand) where.brand = { code: brand };
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }
    // Non-admins only see their own brand
    if (!isManager(user.role) && user.brandId) {
      where.brandId = user.brandId;
    }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatar: true, title: true, role: true, department: true, status: true,
        brandId: true, hireDate: true, salary: true, currency: true, skills: true,
        lastLogin: true, createdAt: true,
        brand: { select: { code: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(employees);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!isManager(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, title, role, department, brandId, salary, skills, hireDate } = body;

    if (!firstName || !email) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    // Generate a random temporary password — user must change on first login
    const tempPassword = `FU-${crypto.randomUUID().slice(0, 8)}`;
    const passwordHash = await hashPassword(tempPassword);

    const employee = await prisma.user.create({
      data: {
        firstName, lastName: lastName || "", email, phone, title,
        role: role || "EMPLOYEE", department, brandId, salary,
        skills: skills || [], hireDate: hireDate ? new Date(hireDate) : new Date(),
        passwordHash, currency: "USD",
      },
    });

    await logAudit({
      action: "CREATE", entity: "User", entityId: employee.id, userId: user.id,
      changes: { employee: { old: null, new: { firstName, lastName, email, role, brandId } } },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
