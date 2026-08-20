import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import bcrypt from "bcryptjs";

const UserSchema = z.object({
  tenantId: z.number().nullable().optional(),
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter").optional(),
  name: z.string().min(2),
  role: z.enum(["Superadmin", "Pimpinan", "Manager", "Staff"]),
  unitId: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
});

const UserUpdateSchema = UserSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const role = searchParams.get("role");
  const unitId = searchParams.get("unitId");

  try {
    const users = await prisma.user.findMany({
      where: {
        ...(tenantId ? { tenantId: parseInt(tenantId) } : { tenantId: null }),
        ...(role ? { role } : {}),
        ...(unitId ? { unitId: parseInt(unitId) } : {}),
      },
      include: {
        tenant: { select: { id: true, name: true, appName: true } },
        unit: { select: { id: true, name: true, type: true, retailEnabled: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        ...u,
        passwordHash: undefined,
      }))
    );
  } catch (error) {
    console.error("GET users error:", error);
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
    const parsed = UserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { password, ...data } = parsed.data;
    const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash("password123", 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
      },
      include: {
        tenant: { select: { id: true, name: true, appName: true } },
        unit: { select: { id: true, name: true, type: true, retailEnabled: true } },
      },
    });

    await logAction({
      tenantId: user.tenantId,
      actorId: Number(session.user.id),
      action: "create",
      entity: "user",
      entityId: user.id,
      metadata: { email: user.email, role: user.role, unitId: user.unitId },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("POST user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
