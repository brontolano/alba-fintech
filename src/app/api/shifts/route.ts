import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canUseRetail } from "@/lib/enums"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unitId = session.user.unitId
  const tenantId = session.user.tenantId
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unitId, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  const where: any = {}
  if (tenantId) where.tenantId = tenantId
  if (role !== "Pimpinan" && role !== "Superadmin" && unitId) {
    where.unitId = unitId
  }

  const shifts = await prisma.cashierShift.findMany({
    where,
    orderBy: { openedAt: "desc" },
    include: {
      openedByUser: { select: { name: true, email: true } },
      closedByUser: { select: { name: true, email: true } },
      unit: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(shifts.map((s) => ({
    ...s,
    openingCash: Number(s.openingCash),
    closingCash: s.closingCash ? Number(s.closingCash) : null,
    cashDifference: s.cashDifference ? Number(s.cashDifference) : null,
  })))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unitId = session.user.unitId
  const tenantId = session.user.tenantId
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unitId, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  const body = (await req.json()) as { unitId?: number; openingCash?: number; note?: string }
  const targetUnitId = body.unitId || unitId
  const openingCash = Number(body.openingCash || 0)

  if (!targetUnitId || !tenantId) {
    return NextResponse.json({ error: "unitId & tenantId required" }, { status: 400 })
  }

  const shift = await prisma.cashierShift.create({
    data: {
      tenantId,
      unitId: targetUnitId,
      openedBy: Number(session.user.id),
      openingCash,
      note: body.note || null,
    },
    include: {
      openedByUser: { select: { name: true, email: true } },
      unit: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({
    ...shift,
    openingCash: Number(shift.openingCash),
    closingCash: null,
    cashDifference: null,
  })
}