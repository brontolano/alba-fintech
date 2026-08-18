import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canUseRetail } from "@/lib/enums"

type InventoryBody = {
  name: string
  sku?: string | null
  category?: string | null
  imageUrl?: string | null
  buyPrice?: number | null
  sellPrice: number
  unit?: string
  stock?: number
  minStock?: number
  unitId: number
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

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, sku: true, category: true, imageUrl: true,
      buyPrice: true, sellPrice: true, unitOfMeasure: true, stock: true, minStock: true,
      unitId: true
    },
  })

  return NextResponse.json(items.map((i) => ({
    ...i,
    buyPrice: i.buyPrice ? Number(i.buyPrice) : null,
    sellPrice: Number(i.sellPrice),
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

  const body = (await req.json()) as InventoryBody
  const { name, sku, category, imageUrl, buyPrice, sellPrice, unit, stock, minStock, unitId: targetUnitId } = body

  if (!name || sellPrice == null || !targetUnitId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 })
  }

  const created = await prisma.inventoryItem.create({
    data: {
      name,
      sku: sku || null,
      category: category || null,
      imageUrl: imageUrl || null,
      buyPrice: buyPrice != null ? Number(buyPrice) : null,
      sellPrice: Number(sellPrice),
      unitOfMeasure: unit || "pcs",
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 0,
      unitId: Number(targetUnitId),
      tenantId,
      createdById: Number(session.user.id),
    },
  })

  return NextResponse.json({
    ...created,
    buyPrice: created.buyPrice ? Number(created.buyPrice) : null,
    sellPrice: Number(created.sellPrice),
  }, { status: 201 })
}