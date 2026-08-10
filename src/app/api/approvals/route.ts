import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Manager sees both Submitted (from staff) and Pending (await pimpinan)
  const whereClause = session.user.role === "Manager"
    ? { OR: [{ status: "Submitted" }, { status: "Pending" }] }
    : { status: "Pending" }

  const pending = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: { transactionDate: "desc" },
    include: {
      user: { select: { id: true, name: true, role: true, unit: true, image: true } },
    },
  })

  return NextResponse.json(pending.map((t) => ({
    ...t,
    amount: Number(t.amount),
    transactionDate: t.transactionDate.toISOString(),
    approvedAt: t.approvedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  })))
}

// Approve or reject a transaction (Manager or Pimpinan)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { transactionId, action } = await req.json() // action: "approve" | "reject"
    const tx = await prisma.transaction.findUnique({ where: { id: Number(transactionId) } })
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })

    if (action === "reject") {
      await prisma.transaction.update({
        where: { id: Number(transactionId) },
        data: { status: "Rejected" },
      })
      return NextResponse.json({ success: true, status: "Rejected" })
    }

    // Approve flow based on role
    if (session.user.role === "Manager") {
      // Manager approval moves to Pending for Pimpinan
      await prisma.transaction.update({
        where: { id: Number(transactionId) },
        data: {
          status: "Pending",
          approvedById: Number(session.user.id),
          approvedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, status: "Pending" })
    } else if (session.user.role === "Pimpinan") {
      // Pimpinan final approval
      await prisma.transaction.update({
        where: { id: Number(transactionId) },
        data: {
          status: "Approved",
          approvedById: Number(session.user.id),
          approvedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, status: "Approved" })
    }

    return NextResponse.json({ error: "Invalid role for approval" }, { status: 403 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 })
  }
}

