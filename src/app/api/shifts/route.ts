import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canUseRetail } from "@/lib/enums"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unit = session.user.unit
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unit, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  const where = role === "Pimpinan" ? {} : { unitName: unit }
  const shifts = await prisma.cashierShift.findMany({
    where,
    orderBy: { openedAt: "desc" },
    include: {
      openedByUser: { select: { name: true, email: true } },
      closedByUser: { select: { name: true, email: true } },
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
  const unit = session.user.unit
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unit, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  const body = (await req.json()) as { unitName?: string; openingCash?: number; note?: string }
  const unitName = body.unitName || unit
  const openingCash = Number(body.openingCash || 0)

  if (!unitName) {
    return NextResponse.json({ error: "unitName required" }, { status: 400 })
  }

  const shift = await prisma.cashierShift.create({
    data: {
      unitName,
      openedBy: Number(session.user.id),
      openingCash,
      note: body.note || null,
    },
    include: {
      openedByUser: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json({
    ...shift,
    openingCash: Number(shift.openingCash),
    closingCash: null,
    cashDifference: null,
  })
}