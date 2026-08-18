import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { isUnitType } from "@/lib/enums"

type UpdateUnitBody = {
  name?: string
  type?: "Sederhana" | "Retail"
  retailEnabled?: boolean
  description?: string | null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const unitId = Number(id)
  if (!Number.isInteger(unitId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  const body = (await req.json()) as UpdateUnitBody
  const { name, type, retailEnabled, description } = body

  const target = await prisma.unit.findUnique({ where: { id: unitId } })
  if (!target) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 })
  }

  if (type && !isUnitType(type)) {
    return NextResponse.json({ error: "Tipe unit tidak valid" }, { status: 400 })
  }

  if (name && name !== target.name) {
    // Check unique per tenant
    const exists = await prisma.unit.findUnique({
      where: { tenantId_name: { tenantId: target.tenantId, name } }
    })
    if (exists) {
      return NextResponse.json({ error: "Nama unit sudah digunakan di tenant ini" }, { status: 409 })
    }
  }

  const finalType = type || target.type
  const data: Record<string, unknown> = {
    name: name || target.name,
    type: finalType,
    retailEnabled: retailEnabled ?? (finalType === "Retail"),
  }
  if (description !== undefined) data.description = description

  const updated = await prisma.unit.update({
    where: { id: unitId },
    data,
    select: {
      id: true,
      name: true,
      type: true,
      retailEnabled: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const unitId = Number(id)
  if (!Number.isInteger(unitId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  const target = await prisma.unit.findUnique({ where: { id: unitId } })
  if (!target) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 })
  }

  // Block deletion if there are users still attached to this unit
  const userCount = await prisma.user.count({ where: { unitId: target.id } })
  if (userCount > 0) {
    return NextResponse.json(
      { error: `Tidak bisa hapus: ${userCount} user masih terikat ke unit ${target.name}` },
      { status: 400 }
    )
  }

  await prisma.unit.delete({ where: { id: unitId } })
  return NextResponse.json({ ok: true })
}