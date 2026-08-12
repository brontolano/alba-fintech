import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { isRole, isUnit, isUnitType, isRetailUnit } from "@/lib/enums"

type CreateUserBody = {
  name: string
  email: string
  password: string
  unit: string
  unitType?: string
  retailModuleEnabled?: boolean
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unit = session.user.unit

  // Only Pimpinan and Manager can list users
  if (role !== "Pimpinan" && role !== "Manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const where = role === "Pimpinan" ? {} : { OR: [{ unit }, { unit: "All" }] }

  const users = await prisma.user.findMany({
    where,
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

  if (actorRole !== "Pimpinan" && actorRole !== "Manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await req.json()) as CreateUserBody
  const { name, email, password, unit, unitType, retailModuleEnabled } = body

  if (!name || !email || !password || !unit) {
    return NextResponse.json({ error: "Field wajib belum lengkap" }, { status: 400 })
  }
  if (!isUnit(unit)) {
    return NextResponse.json({ error: "Unit tidak valid" }, { status: 400 })
  }

  // Authorization: Pimpinan creates Manager with new unit; Manager creates Staff in own unit
  let targetRole: "Manager" | "Staff"
  if (actorRole === "Pimpinan") {
    targetRole = "Manager"
    if (unit === "All") {
      return NextResponse.json({ error: "Manager tidak boleh unit All" }, { status: 400 })
    }
  } else {
    targetRole = "Staff"
    if (unit !== actorUnit) {
      return NextResponse.json({ error: "Manager hanya bisa menambah Staff di unit sendiri" }, { status: 403 })
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
      role: targetRole,
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
