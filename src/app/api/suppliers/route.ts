import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unitId = session.user.unitId
  const tenantId = session.user.tenantId

  const where: any = {}
  if (tenantId) where.tenantId = tenantId
  if (role !== "Pimpinan" && role !== "Superadmin" && unitId) {
    where.unitId = unitId
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: { unit: { select: { id: true, name: true } } },
  })

  return NextResponse.json(suppliers)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unitId = session.user.unitId
  const tenantId = session.user.tenantId

  const body = (await req.json()) as {
    name: string
    contact?: string
    email?: string
    phone?: string
    address?: string
    unitId?: number
  }

  const targetUnitId = role === "Pimpinan" ? (body.unitId || unitId) : unitId

  if (!tenantId || !targetUnitId) {
    return NextResponse.json({ error: "tenantId & unitId required" }, { status: 400 })
  }

  const supplier = await prisma.supplier.create({
    data: {
      tenantId,
      unitId: targetUnitId,
      name: body.name,
      contact: body.contact || null,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
    },
    include: { unit: { select: { id: true, name: true } } },
  })

  return NextResponse.json(supplier, { status: 201 })
}