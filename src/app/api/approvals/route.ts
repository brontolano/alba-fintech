import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  const unitId = session.user.unitId

  if (role === "Manager") {
    const where: any = { status: "Submitted" }
    if (unitId) where.unitId = unitId

    const pending = await prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true, unitId: true, image: true } },
      },
    })

    return NextResponse.json(
      pending.map((t) => ({
        ...t,
        amount: Number(t.amount),
        transactionDate: t.transactionDate.toISOString(),
        approvedAt: t.approvedAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    )
  }

  if (role === "Pimpinan") {
    const where: any = { status: "Pending" }
    if (session.user.tenantId) where.tenantId = session.user.tenantId

    const pending = await prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true, unitId: true, image: true } },
      },
    })

    return NextResponse.json(
      pending.map((t) => ({
        ...t,
        amount: Number(t.amount),
        transactionDate: t.transactionDate.toISOString(),
        approvedAt: t.approvedAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    )
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const transactionId = Number(body.transactionId)
    const action = String(body.action || "").toLowerCase()

    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 })
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const role = session.user.role
    const unitId = session.user.unitId
    const tenantId = session.user.tenantId

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        unitId: true,
        status: true,
        type: true,
        amount: true,
        category: true,
        description: true,
        method: true,
        userId: true,
        approvedById: true,
        tenantId: true,
      },
    })

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Check tenant access
    if (tenantId && tx.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (role === "Manager") {
      if (tx.status !== "Submitted") {
        return NextResponse.json({ error: "Transaction is not in Submitted state" }, { status: 409 })
      }

      if (unitId && tx.unitId !== unitId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      if (action === "reject") {
        const updated = await prisma.transaction.update({
          where: { id: transactionId, status: "Submitted" },
          data: { status: "Rejected", approvedById: Number(session.user.id), approvedAt: new Date() },
        })

        return NextResponse.json({
          success: true,
          status: updated.status,
        })
      }

      const updated = await prisma.transaction.update({
        where: { id: transactionId, status: "Submitted" },
        data: { status: "Pending", approvedById: Number(session.user.id), approvedAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        status: updated.status,
      })
    }

    if (role === "Pimpinan") {
      if (tx.status !== "Pending") {
        return NextResponse.json({ error: "Transaction is not in Pending state" }, { status: 409 })
      }

      const updated = await prisma.transaction.update({
        where: { id: transactionId, status: "Pending" },
        data: { status: "Approved", approvedById: Number(session.user.id), approvedAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        status: updated.status,
      })
    }

    return NextResponse.json({ error: "Invalid role for approval" }, { status: 403 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 })
  }
}