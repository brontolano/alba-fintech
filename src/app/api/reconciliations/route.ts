import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const reconciliations = await prisma.reconciliation.findMany({
    orderBy: { reconciliationDate: "desc" },
    include: { user: { select: { id: true, name: true, role: true, unit: true } } },
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
    const { unit, physicalCash, digitalBalance, notes } = body

    if (!unit || physicalCash == null || digitalBalance == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const phys = Number(physicalCash)
    const dig = Number(digitalBalance)
    const created = await prisma.reconciliation.create({
      data: {
        userId: Number(session.user.id),
        unit,
        physicalCash: phys,
        digitalBalance: dig,
        difference: phys - dig,
        notes: notes || null,
        reconciliationDate: new Date(),
        status: "Pending",
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
