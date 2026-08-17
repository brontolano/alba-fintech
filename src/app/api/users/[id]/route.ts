import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { isRole, isUnit, isUnitType, isRetailUnit } from "@/lib/enums"

type UpdateUserBody = {
  name?: string
  password?: string
  role?: "Pimpinan" | "Manager" | "Staff" | "Superadmin"
  unit?: string
  unitType?: string
  retailModuleEnabled?: boolean
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const actorRole = session.user.role
  if (actorRole !== "Superadmin" && actorRole !== "Pimpinan") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const userId = Number(id)
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  const body = (await req.json()) as UpdateUserBody
  const { name, password, role, unit, unitType, retailModuleEnabled } = body

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
  }

  // Pimpinan cannot modify Superadmin
  if (actorRole === "Pimpinan" && target.role === "Superadmin") {
    return NextResponse.json({ error: "Pimpinan tidak boleh mengubah Superadmin" }, { status: 403 })
  }
  if (actorRole === "Pimpinan" && role === "Superadmin") {
    return NextResponse.json({ error: "Pimpinan tidak boleh mengubah role ke Superadmin" }, { status: 403 })
  }

  if (role && !isRole(role)) {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 })
  }
  if (unit && !isUnit(unit)) {
    return NextResponse.json({ error: "Unit tidak valid" }, { status: 400 })
  }
  if (unitType && !isUnitType(unitType)) {
    return NextResponse.json({ error: "UnitType tidak valid" }, { status: 400 })
  }

  const finalRole = role || target.role
  const finalUnit = unit || target.unit
  const finalUnitType = unitType || (isRetailUnit(finalUnit) ? "Retail" : target.unitType)
  const finalRetailEnabled =
    finalUnitType === "Retail" && (retailModuleEnabled ?? target.retailModuleEnabled)

  const data: Record<string, unknown> = {
    name: name || target.name,
    role: finalRole,
    unit: finalUnit,
    unitType: finalUnitType,
    retailModuleEnabled: finalRetailEnabled,
  }

  if (password && password.length >= 6) {
    data.passwordHash = await bcrypt.hash(password, 10)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
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
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Hanya Superadmin yang boleh menghapus user" }, { status: 403 })
  }

  const { id } = await params
  const userId = Number(id)
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  if (userId === Number(session.user.id)) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
  }

  // Cascading constraints: cascade-delete related records first via transaction
  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId } })
    await tx.auditLog.deleteMany({ where: { actorId: userId } })
    await tx.approval.deleteMany({ where: { approverId: userId } })
    await tx.posSaleItem.deleteMany({ where: { posSale: { createdById: userId } } })
    await tx.posSale.deleteMany({ where: { createdById: userId } })
    await tx.stockMovement.deleteMany({ where: { createdById: userId } })
    await tx.stockOpname.deleteMany({ where: { createdById: userId } })
    await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { createdById: userId } } })
    await tx.purchaseOrder.deleteMany({ where: { createdById: userId } })
    await tx.inventoryItem.deleteMany({ where: { createdById: userId } })
    await tx.reconciliation.deleteMany({ where: { userId } })
    await tx.transaction.deleteMany({ where: { userId } })
    await tx.cashierShift.deleteMany({ where: { OR: [{ openedBy: userId }, { closedBy: userId }] } })
    await tx.user.delete({ where: { id: userId } })
  })

  return NextResponse.json({ ok: true })
}