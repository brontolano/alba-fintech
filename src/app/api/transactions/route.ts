import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isManager = session.user.role === "Manager"
  const isStaff = session.user.role === "Staff"
  const userId = Number(session.user.id)
  const userUnitId = session.user.unitId
  const userTenantId = session.user.tenantId

  // Build where clause based on role and tenant scoping
  let whereClause: any = {}
  
  if (userTenantId) {
    whereClause.tenantId = userTenantId
  }

  if (isManager && userUnitId) {
    whereClause.unitId = userUnitId
  } else if (isStaff) {
    whereClause.userId = userId
  }
  // Pimpinan & Superadmin see all within tenant

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: { transactionDate: "desc" },
    include: {
      user: { select: { id: true, name: true, role: true, unitId: true, image: true, unit: { select: { name: true } } } },
      approvedBy: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(transactions.map(serializeTransaction))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { unitId, type, method, category, amount, description, photoUrl, transactionDate } = body

    if (!unitId || !type || !method || !category || !amount) {
      return NextResponse.json({ error: "Missing required fields: unitId, type, method, category, amount" }, { status: 400 })
    }

    const created = await prisma.transaction.create({
      data: {
        tenantId: session.user.tenantId || 1,
        unitId: Number(unitId),
        userId: Number(session.user.id),
        type,
        method,
        category,
        amount: Number(amount),
        description: description || null,
        photoUrl: photoUrl || null,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        // Status workflow: Staff -> Submitted, Manager/Pimpinan handle approvals
        status: session.user.role === "Staff" ? "Submitted" : (session.user.role === "Pimpinan" ? "Approved" : "Pending"),
        approvedById: session.user.role === "Pimpinan" ? Number(session.user.id) : null,
        approvedAt: session.user.role === "Pimpinan" ? new Date() : null,
      },
      include: {
        user: { select: { id: true, name: true, role: true, unit: { select: { name: true } } } },
        approvedBy: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(serializeTransaction(created), { status: 201 })
  } catch (error) {
    console.error("Create transaction error:", error)
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}

function serializeTransaction(t: any) {
  return {
    ...t,
    amount: t.amount ? Number(t.amount) : 0,
    transactionDate: t.transactionDate instanceof Date ? t.transactionDate.toISOString() : t.transactionDate,
    approvedAt: t.approvedAt instanceof Date ? t.approvedAt.toISOString() : t.approvedAt,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  }
}