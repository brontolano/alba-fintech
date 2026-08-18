import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { logAction } from "@/lib/audit"

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { status, notes } = await req.json()
    const id = Number(params.id)

    if (!["Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const original = await prisma.transaction.findUnique({ where: { id } })
    if (!original) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Check tenant access
    if (session.user.tenantId && original.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        approvedById: Number(session.user.id),
        approvedAt: new Date(),
      },
    })

    await prisma.approval.create({
      data: {
        transactionId: id,
        approverId: Number(session.user.id),
        level: session.user.role || "Pimpinan",
        status,
        notes: notes || null,
      },
    })

    await logAction({
      actorId: Number(session.user.id),
      action: status === "Approved" ? "approve" : "reject",
      entity: "Transaction",
      entityId: id,
      metadata: {
        previousStatus: original.status,
        newStatus: status,
        amount: Number(original.amount),
        unitId: original.unitId,
        category: original.category,
      },
      ip: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    })

    return NextResponse.json({
      ...updated,
      amount: Number(updated.amount),
      transactionDate: updated.transactionDate.toISOString(),
      approvedAt: updated.approvedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error("Approve transaction error:", error)
    return NextResponse.json({ error: "Failed to approve transaction" }, { status: 500 })
  }
}