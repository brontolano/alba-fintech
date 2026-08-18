import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canUseRetail } from "@/lib/enums"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const inventoryId = Number(searchParams.get("inventoryId") || 0)
  const type = searchParams.get("type") || ""

  if (!inventoryId) {
    return NextResponse.json({ error: "inventoryId required" }, { status: 400 })
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: inventoryId },
    select: { id: true, unitId: true },
  })

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  const role = session.user.role
  const unitId = session.user.unitId
  const tenantId = session.user.tenantId
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unitId, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  if (role !== "Pimpinan" && role !== "Superadmin" && item.unitId !== unitId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const movements = await prisma.stockMovement.findMany({
    where: { inventoryId, ...(type ? { type } : {}) },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  })

  return NextResponse.json(movements)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { inventoryId, type, quantity, note } = body

  if (!inventoryId || !type || quantity == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  if (!["IN", "OUT"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }
  if (quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be > 0" }, { status: 400 })
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: Number(inventoryId) },
    select: { id: true, unitId: true, stock: true },
  })

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  const role = session.user.role
  const unitId = session.user.unitId
  const tenantId = session.user.tenantId
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unitId, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  if (role !== "Pimpinan" && role !== "Superadmin" && item.unitId !== unitId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const newStock = type === "IN" ? item.stock + quantity : item.stock - quantity
  if (newStock < 0) {
    return NextResponse.json({ error: "Stok tidak mencukupi" }, { status: 400 })
  }

  const [movement, updated] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        inventoryId: Number(inventoryId),
        type,
        quantity: Number(quantity),
        note: note || null,
        createdById: Number(session.user.id),
      },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    prisma.inventoryItem.update({
      where: { id: Number(inventoryId) },
      data: { stock: newStock },
    }),
  ])

  return NextResponse.json({ movement, currentStock: updated.stock }, { status: 201 })
}