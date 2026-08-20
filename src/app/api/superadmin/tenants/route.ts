import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { z } from "zod";

const TenantSchema = z.object({
  name: z.string().min(2, "Nama tenant minimal 2 karakter"),
  appName: z.string().min(2, "Nama aplikasi minimal 2 karakter"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Warna tidak valid").default("#1E3A5F"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Warna tidak valid").default("#10B981"),
  subdomain: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  activeModules: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true, units: true, transactions: true },
        },
      },
    });
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("GET tenants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = TenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const tenant = await prisma.tenant.create({
      data: {
        ...parsed.data,
        activeModules: parsed.data.activeModules?.join(",") || "transactions,reconciliation",
      },
    });

    await logAction({
      actorId: Number(session.user.id),
      action: "create",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { name: tenant.name, appName: tenant.appName },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("POST tenant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}