import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get("tenantId")

  const where = tenantId ? { tenantId: Number(tenantId) } : {}

  const users = await prisma.user.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true, appName: true } },
      unit: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { tenantId, email, password, name, role, unitId } = body

  if (!tenantId || !email || !password || !name || !role) {
    return NextResponse.json({ error: "tenantId, email, password, name, role wajib diisi" }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      tenantId: Number(tenantId),
      email,
      passwordHash,
      name,
      role,
      unitId: unitId ? Number(unitId) : null,
    },
  })

  return NextResponse.json({ ...user, passwordHash: undefined }, { status: 201 })
}