import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const where: any = {}
  if (session.user.tenantId) where.tenantId = session.user.tenantId
  if (session.user.role === "Manager" && session.user.unitId) {
    where.unitId = session.user.unitId
  } else if (session.user.role === "Staff") {
    where.userId = Number(session.user.id)
  }

  const reconciliations = await prisma.reconciliation.findMany({
    where,
    orderBy: { reconciliationDate: "desc" },
    include: { 
      user: { select: { id: true, name: true, role: true, unit: { select: { name: true } } } },
      unit: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(reconciliations.map((r) => ({
    ...r,
    physicalCash: Number(r.physicalCash),
    digitalBalance: Number(r.digitalBalance),
    difference: Number(r.difference),
    reconciliationDate: r.reconciliationDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
  })))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { unitId, physicalCash, digitalBalance, notes, reconciliationDate } = body

    if (!unitId || physicalCash == null || digitalBalance == null) {
      return NextResponse.json({ error: "Missing required fields: unitId, physicalCash, digitalBalance" }, { status: 400 })
    }

    const phys = Number(physicalCash)
    const dig = Number(digitalBalance)
    const created = await prisma.reconciliation.create({
      data: {
        tenantId: session.user.tenantId || 1,
        unitId: Number(unitId),
        userId: Number(session.user.id),
        physicalCash: phys,
        digitalBalance: dig,
        difference: phys - dig,
        notes: notes || null,
        reconciliationDate: reconciliationDate ? new Date(reconciliationDate) : new Date(),
        status: "Pending",
      },
      include: {
        user: { select: { id: true, name: true, role: true, unit: { select: { name: true } } } },
        unit: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      ...created,
      physicalCash: Number(created.physicalCash),
      digitalBalance: Number(created.digitalBalance),
      difference: Number(created.difference),
      reconciliationDate: created.reconciliationDate.toISOString(),
      createdAt: created.createdAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error("Create reconciliation error:", error)
    return NextResponse.json({ error: "Failed to create reconciliation" }, { status: 500 })
  }
}