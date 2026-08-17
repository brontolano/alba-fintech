import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { isRole, isUnit, isUnitType, isRetailUnit } from "@/lib/enums"

type CreateUserBody = {
  name: string
  email: string
  password?: string
  role: "Pimpinan" | "Manager" | "Staff" | "Superadmin"
  unit: string
  unitType?: string
  retailModuleEnabled?: boolean
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unit = session.user.unit

  if (role !== "Pimpinan" && role !== "Superadmin" && role !== "Manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: role === "Superadmin" || role === "Pimpinan" ? {} : { OR: [{ unit }, { unit: "All" }] },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      unit: true,
      unitType: true,
      retailModuleEnabled: true,
      createdAt: true,
    },
  })

  return NextResponse.json(users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  })))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const actorRole = session.user.role
  const actorUnit = session.user.unit

  if (actorRole !== "Pimpinan" && actorRole !== "Superadmin" && actorRole !== "Manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await req.json()) as CreateUserBody
  const { name, email, password, role, unit, unitType, retailModuleEnabled } = body

  if (!name || !email || !password || !unit || !role) {
    return NextResponse.json({ error: "Field wajib belum lengkap" }, { status: 400 })
  }
  if (!isRole(role)) {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 })
  }
  if (!isUnit(unit)) {
    return NextResponse.json({ error: "Unit tidak valid" }, { status: 400 })
  }

  // Authorization rules
  if (actorRole === "Manager") {
    if (role !== "Staff") {
      return NextResponse.json({ error: "Manager hanya bisa membuat Staff" }, { status: 403 })
    }
    if (unit !== actorUnit) {
      return NextResponse.json({ error: "Manager hanya bisa menambah Staff di unit sendiri" }, { status: 403 })
    }
  } else if (actorRole === "Pimpinan") {
    if (role === "Superadmin") {
      return NextResponse.json({ error: "Pimpinan tidak boleh membuat Superadmin" }, { status: 403 })
    }
    if (unit === "All") {
      return NextResponse.json({ error: "Manager tidak boleh unit All" }, { status: 400 })
    }
  }

  if (unitType && !isUnitType(unitType)) {
    return NextResponse.json({ error: "UnitType tidak valid" }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const finalUnitType = unitType || (isRetailUnit(unit) ? "Retail" : "Sederhana")
  const finalRetailEnabled = retailModuleEnabled === true && isRetailUnit(unit)

  const created = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      unit,
      unitType: finalUnitType,
      retailModuleEnabled: finalRetailEnabled,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      unit: true,
      unitType: true,
      retailModuleEnabled: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    ...created,
    createdAt: created.createdAt.toISOString(),
  }, { status: 201 })
}
