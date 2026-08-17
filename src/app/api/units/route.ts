import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { isUnitType } from "@/lib/enums"

type CreateUnitBody = {
  name: string
  type: "Sederhana" | "Retail"
  retailModuleEnabled?: boolean
  description?: string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const units = await prisma.unit.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      retailModuleEnabled: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(units.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  })))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await req.json()) as CreateUnitBody
  const { name, type, retailModuleEnabled, description } = body

  if (!name || !type) {
    return NextResponse.json({ error: "Nama dan tipe unit wajib diisi" }, { status: 400 })
  }
  if (!isUnitType(type)) {
    return NextResponse.json({ error: "Tipe unit tidak valid (Sederhana/Retail)" }, { status: 400 })
  }

  const exists = await prisma.unit.findUnique({ where: { name } })
  if (exists) {
    return NextResponse.json({ error: "Nama unit sudah digunakan" }, { status: 409 })
  }

  const created = await prisma.unit.create({
    data: {
      name,
      type,
      retailModuleEnabled: retailModuleEnabled === true && type === "Retail",
      description,
    },
    select: {
      id: true,
      name: true,
      type: true,
      retailModuleEnabled: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    ...created,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  }, { status: 201 })
}