import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unit = session.user.unit
  const url = new URL(req.url)
  const supplierId = url.searchParams.get("supplierId")

  const where = role === "Pimpinan" ? {} : { unitName: unit }
  if (supplierId) {
    ;(where as Record<string, unknown>).supplierId = Number(supplierId)
  }

  const orders = await prisma.purchaseOrder.findMany({
    where,
    orderBy: { orderDate: "desc" },
    include: {
      supplier: true,
      createdBy: { select: { name: true, email: true } },
      items: { include: { inventory: { select: { name: true, sku: true } } } },
    },
  })

  return NextResponse.json(
    orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      items: o.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
    }))
  )
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unit = session.user.unit
  const body = (await req.json()) as {
    supplierId: number
    unitName?: string
    items: Array<{ inventoryId: number; quantity: number; unitPrice: number }>
    notes?: string
  }

  const unitName = role === "Pimpinan" ? body.unitName || unit : unit

  const supplier = await prisma.supplier.findUnique({
    where: { id: body.supplierId },
  })
  if (!supplier) {
    return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 })
  }

  const items = body.items.map((it) => ({
    inventoryId: Number(it.inventoryId),
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice),
    subtotal: Number(it.quantity) * Number(it.unitPrice),
  }))

  const totalAmount = items.reduce((acc, it) => acc + it.subtotal, 0)

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId: body.supplierId,
      unitName,
      totalAmount,
      notes: body.notes || null,
      createdById: Number(session.user.id),
      items: { create: items },
    },
    include: {
      supplier: true,
      items: { include: { inventory: true } },
    },
  })

  return NextResponse.json(
    {
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
    },
    { status: 201 }
  )
}