import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canUseRetail } from "@/lib/enums"

type PosBody = {
  unitId: number
  paymentMethod: string
  items: Array<{ inventoryId: number; quantity: number; priceAtSale: number; subtotal: number }>
}

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

  const sales = await prisma.posSale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { inventory: { select: { name: true, sku: true } } } } },
  })

  return NextResponse.json(sales.map((s) => ({
    ...s,
    totalAmount: Number(s.totalAmount),
    items: s.items.map((it) => ({
      ...it,
      priceAtSale: Number(it.priceAtSale),
      subtotal: Number(it.subtotal),
    })),
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

  const body = (await req.json()) as PosBody
  const { unitId: targetUnitId, paymentMethod, items } = body

  if (!targetUnitId || !paymentMethod || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 })
  }

  const total = items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0)

  const sale = await prisma.posSale.create({
    data: {
      tenantId,
      unitId: targetUnitId,
      paymentMethod,
      totalAmount: total,
      createdById: Number(session.user.id),
      items: {
        create: items.map((it) => ({
          inventoryId: Number(it.inventoryId),
          quantity: Number(it.quantity),
          priceAtSale: Number(it.priceAtSale),
          subtotal: Number(it.subtotal),
        })),
      },
    },
    include: { items: true },
  })

  // Decrease stock
  for (const it of items) {
    await prisma.inventoryItem.update({
      where: { id: Number(it.inventoryId) },
      data: { stock: { decrement: Number(it.quantity) } },
    })
  }

  return NextResponse.json({
    ...sale,
    totalAmount: Number(sale.totalAmount),
    items: sale.items.map((x) => ({ ...x, priceAtSale: Number(x.priceAtSale), subtotal: Number(x.subtotal) })),
  }, { status: 201 })
}