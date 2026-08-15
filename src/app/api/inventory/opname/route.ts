import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { isUnit, canUseRetail } from "@/lib/enums"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const inventoryId = Number(searchParams.get("inventoryId") || 0)

  if (!inventoryId) {
    return NextResponse.json({ error: "inventoryId required" }, { status: 400 })
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: inventoryId },
    select: { id: true, unitName: true },
  })

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  const role = session.user.role
  const unit = session.user.unit
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unit, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  if (role !== "Pimpinan" && role !== "Superadmin" && item.unitName !== unit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const opnames = await prisma.stockOpname.findMany({
    where: { inventoryId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  })

  return NextResponse.json(opnames)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { inventoryId, physicalStock, note } = body

  if (!inventoryId || physicalStock == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: Number(inventoryId) },
    select: { id: true, unitName: true, stock: true },
  })

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  const role = session.user.role
  const unit = session.user.unit
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, unit, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  if (role !== "Pimpinan" && role !== "Superadmin" && item.unitName !== unit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const difference = Number(physicalStock) - item.stock

  const opname = await prisma.stockOpname.create({
    data: {
      inventoryId: Number(inventoryId),
      physicalStock: Number(physicalStock),
      difference,
      note: note || null,
      createdById: Number(session.user.id),
    },
    include: { createdBy: { select: { name: true, email: true } } },
  })

  return NextResponse.json(opname, { status: 201 })
}
