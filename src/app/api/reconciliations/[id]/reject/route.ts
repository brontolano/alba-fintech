import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.user.role === "Staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const recId = Number(id)
  const rec = await prisma.reconciliation.findUnique({
    where: { id: recId },
  })

  if (!rec) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (rec.status !== "Pending") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 })
  }

  // Check tenant access
  if (session.user.tenantId && rec.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }
  if (session.user.role === "Manager" && session.user.unitId && rec.unitId !== session.user.unitId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const updated = await prisma.reconciliation.update({
    where: { id: recId },
    data: {
      status: "Rejected",
      approvedById: Number(session.user.id),
      approvedAt: new Date(),
    },
  })

  return NextResponse.json(updated)
}