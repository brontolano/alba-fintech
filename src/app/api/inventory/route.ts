import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { isUnit, canUseRetail } from "@/lib/enums"

type InventoryBody = {
  name: string
  sku?: string | null
  category?: string | null
  buyPrice?: number | null
  sellPrice: number
  unit?: string
  stock?: number
  minStock?: number
  unitName: string
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
  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, category: true, buyPrice: true, sellPrice: true, unit: true, stock: true, minStock: true, unitName: true },
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
  const unit = session.user.unit
  const enabled = (session.user as { retailModuleEnabled?: boolean }).retailModuleEnabled === true

  if (!canUseRetail(role, enabled)) {
    return NextResponse.json({ error: "Retail module disabled" }, { status: 403 })
  }

  const body = (await req.json()) as InventoryBody
  const { name, sku, category, buyPrice, sellPrice, unit: itemUnit, stock, minStock, unitName } = body

  if (!name || sellPrice == null || !unitName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (!isUnit(unitName)) {
    return NextResponse.json({ error: "Invalid unitName" }, { status: 400 })
  }

  const created = await prisma.inventoryItem.create({
    data: {
      name,
      sku: sku || null,
      category: category || null,
      buyPrice: buyPrice != null ? Number(buyPrice) : null,
      sellPrice: Number(sellPrice),
      unit: itemUnit || "pcs",
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 0,
      unitName,
      createdById: Number(session.user.id),
    },
  })

  return NextResponse.json({
    ...created,
    buyPrice: created.buyPrice ? Number(created.buyPrice) : null,
    sellPrice: Number(created.sellPrice),
  }, { status: 201 })
}
