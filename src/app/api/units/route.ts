import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get("tenantId")

  const where = tenantId ? { tenantId: Number(tenantId) } : {}

  const units = await prisma.unit.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true, appName: true } },
      _count: { select: { users: true, transactions: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(units)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { tenantId, name, type, retailEnabled, description } = body

  if (!tenantId || !name) {
    return NextResponse.json({ error: "tenantId & name wajib diisi" }, { status: 400 })
  }

  const unit = await prisma.unit.create({
    data: {
      tenantId: Number(tenantId),
      name,
      type: type || "Sederhana",
      retailEnabled: retailEnabled || false,
      description,
    },
  })

  return NextResponse.json(unit, { status: 201 })
}