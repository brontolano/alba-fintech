import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canUseRetail } from "@/lib/enums"

type PosBody = {
  unitName: string
  paymentMethod: string
  items: Array<{ inventoryId: number; quantity: number; priceAtSale: number; subtotal: number }>
}

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
  const unit = session.user.unit
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unit, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  const body = (await req.json()) as PosBody
  const { unitName, paymentMethod, items } = body

  if (!unitName || !paymentMethod || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const total = items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0)

  const sale = await prisma.posSale.create({
    data: {
      unitName,
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
