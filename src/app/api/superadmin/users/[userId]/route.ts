import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import bcrypt from "bcryptjs";

const UserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, "Password minimal 8 karakter").optional(),
  role: z.enum(["Superadmin", "Pimpinan", "Manager", "Staff"]).optional(),
  unitId: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        tenant: { select: { id: true, name: true, appName: true } },
        unit: { select: { id: true, name: true, type: true, retailEnabled: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const userIdNum = parseInt(userId);

  try {
    const body = await req.json();
    const parsed = UserUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { password, ...data } = parsed.data;
    const updateData: Record<string, unknown> = { ...data };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userIdNum },
      data: updateData,
      include: {
        tenant: { select: { id: true, name: true, appName: true } },
        unit: { select: { id: true, name: true, type: true, retailEnabled: true } },
      },
    });

    await logAction({
      tenantId: user.tenantId,
      actorId: Number(session.user.id),
      action: "update",
      entity: "user",
      entityId: userIdNum,
      metadata: data,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const userIdNum = parseInt(userId);

  try {
    const user = await prisma.user.findUnique({ where: { id: userIdNum } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: userIdNum } });

    await logAction({
      tenantId: user.tenantId,
      actorId: Number(session.user.id),
      action: "delete",
      entity: "user",
      entityId: userIdNum,
      metadata: { email: user.email, role: user.role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
