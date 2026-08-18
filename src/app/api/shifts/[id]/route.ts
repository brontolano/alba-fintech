import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canUseRetail } from "@/lib/enums"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unitId = session.user.unitId
  const tenantId = session.user.tenantId
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unitId, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  const shiftId = Number(id)
  const shift = await prisma.cashierShift.findUnique({
    where: { id: shiftId },
    include: { sales: true },
  })

  if (!shift) {
    return NextResponse.json({ error: "Shift tidak ditemukan" }, { status: 404 })
  }

  if (shift.status === "Closed") {
    return NextResponse.json({ error: "Shift sudah ditutup" }, { status: 400 })
  }

  // Check tenant access
  if (tenantId && shift.tenantId !== tenantId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const body = (await req.json()) as { closingCash?: number; note?: string }
  const closingCash = Number(body.closingCash || 0)
  const openingCash = Number(shift.openingCash)
  const cashDifference = closingCash - openingCash

  // Calculate expected cash from sales (assume all sales are cash for simplicity)
  const expectedCash = shift.sales.reduce((acc, s) => acc + Number(s.totalAmount), 0)
  const actualTotal = closingCash
  const difference = actualTotal - expectedCash

  const closed = await prisma.cashierShift.update({
    where: { id: shiftId },
    data: {
      status: "Closed",
      closedBy: Number(session.user.id),
      closedAt: new Date(),
      closingCash,
      cashDifference: difference,
      note: body.note || shift.note,
    },
    include: {
      openedByUser: { select: { name: true, email: true } },
      closedByUser: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json({
    ...closed,
    openingCash: Number(closed.openingCash),
    closingCash: Number(closed.closingCash),
    cashDifference: Number(closed.cashDifference),
  })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unitId = session.user.unitId
  const tenantId = session.user.tenantId
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unitId, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  const shiftId = Number((await params).id)
  const shift = await prisma.cashierShift.findUnique({
    where: { id: shiftId },
    include: {
      openedByUser: { select: { name: true, email: true } },
      closedByUser: { select: { name: true, email: true } },
      sales: {
        include: { items: { include: { inventory: { select: { name: true, sku: true } } } } },
      },
    },
  })

  if (!shift) {
    return NextResponse.json({ error: "Shift tidak ditemukan" }, { status: 404 })
  }

  // Check tenant access
  if (tenantId && shift.tenantId !== tenantId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  return NextResponse.json({
    ...shift,
    openingCash: Number(shift.openingCash),
    closingCash: shift.closingCash ? Number(shift.closingCash) : null,
    cashDifference: shift.cashDifference ? Number(shift.cashDifference) : null,
    sales: shift.sales.map((s) => ({
      ...s,
      totalAmount: Number(s.totalAmount),
      items: s.items.map((it) => ({
        ...it,
        priceAtSale: Number(it.priceAtSale),
        subtotal: Number(it.subtotal),
      })),
    })),
  })
}