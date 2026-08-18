import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = session.user.tenantId
  const where: any = {}
  if (tenantId) where.tenantId = tenantId

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { transactionDate: "desc" },
    include: { unit: { select: { id: true, name: true } } },
  })

  const approved = transactions.filter((t) => t.status === "Approved")
  const totalDebit = approved.filter((t) => t.type === "Debit").reduce((acc, t) => acc + Number(t.amount), 0)
  const totalKredit = approved.filter((t) => t.type === "Kredit").reduce((acc, t) => acc + Number(t.amount), 0)

  return NextResponse.json({
    totalDebit,
    totalKredit,
    totalBalance: totalDebit - totalKredit,
    totalTransactions: transactions.length,
    pendingTransactions: transactions.filter((t) => t.status === "Pending").length,
  })
}