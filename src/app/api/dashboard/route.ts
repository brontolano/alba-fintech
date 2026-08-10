import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const transactions = await prisma.transaction.findMany({
    where: { status: "Approved" },
  })

  const units = ["Kantor", "Kantin", "Koperasi"]
  const byUnit: Record<string, { debit: number; kredit: number; balance: number }> = {}

  for (const u of units) {
    let debit = 0
    let kredit = 0
    for (const t of transactions) {
      if (t.unit !== u) continue
      const amt = Number(t.amount)
      if (t.type === "Debit") debit += amt
      else kredit += amt
    }
    byUnit[u] = { debit, kredit, balance: debit - kredit }
  }

  const totalDebit = transactions
    .filter((t) => t.type === "Debit")
    .reduce((acc, t) => acc + Number(t.amount), 0)
  const totalKredit = transactions
    .filter((t) => t.type === "Kredit")
    .reduce((acc, t) => acc + Number(t.amount), 0)

  const pendingCount = await prisma.transaction.count({ where: { status: "Pending" } })

  return NextResponse.json({
    totalDebit,
    totalKredit,
    totalBalance: totalDebit - totalKredit,
    pendingCount,
    byUnit,
  })
}
