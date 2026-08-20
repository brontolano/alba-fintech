import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { z } from "zod";

const TenantUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  appName: z.string().min(2).optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  subdomain: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  activeModules: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) },
      include: {
        units: { select: { id: true, name: true, type: true, retailEnabled: true, balance: true } },
        _count: {
          select: { users: true, transactions: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("GET tenant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantIdNum = parseInt(id);

  try {
    const body = await req.json();
    const parsed = TenantUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantIdNum },
      data: {
        ...parsed.data,
        activeModules: parsed.data.activeModules ? { set: parsed.data.activeModules.join(",") } : undefined,
      },
    });

    await logAction({
      tenantId: tenantIdNum,
      actorId: Number(session.user.id),
      action: "update",
      entity: "tenant",
      entityId: tenantIdNum,
      metadata: parsed.data,
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("PATCH tenant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantIdNum = parseInt(id);

  try {
    await prisma.tenant.delete({
      where: { id: tenantIdNum },
    });

    await logAction({
      actorId: Number(session.user.id),
      action: "delete",
      entity: "tenant",
      entityId: tenantIdNum,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE tenant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}