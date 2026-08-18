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

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { transactionDate: "desc" },
    include: { unit: { select: { name: true } } },
  })

  let totalDebit = 0
  let totalKredit = 0
  let countApproved = 0
  let countPending = 0
  let countRejected = 0
  const byUnit: Record<string, { debit: number; kredit: number }> = {}

  for (const t of transactions) {
    const amt = Number(t.amount)
    if (t.type === "Debit") totalDebit += amt
    else totalKredit += amt

    const unitName = t.unit?.name || "Unknown"
    if (!byUnit[unitName]) byUnit[unitName] = { debit: 0, kredit: 0 }
    if (t.type === "Debit") byUnit[unitName].debit += amt
    else byUnit[unitName].kredit += amt

    if (t.status === "Approved") countApproved++
    else if (t.status === "Pending" || t.status === "Submitted") countPending++
    else if (t.status === "Rejected") countRejected++
  }

  return NextResponse.json({
    totalDebit,
    totalKredit,
    netBalance: totalDebit - totalKredit,
    countApproved,
    countPending,
    countRejected,
    byUnit,
  })
}