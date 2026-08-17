import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SuperadminClient } from "./SuperadminClient"

export const dynamic = "force-dynamic"

export default async function SuperadminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'Superadmin') redirect('/dashboard')

  const [users, units, totalTransactions, totalAuditLogs] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { unit: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unit: true,
        unitType: true,
        retailModuleEnabled: true,
        createdAt: true,
      },
    }),
    prisma.unit.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        retailModuleEnabled: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.transaction.count(),
    prisma.auditLog.count(),
  ])

  const serializableUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  const serializableUnits = units.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }))

  return (
    <SuperadminClient
      initialUsers={serializableUsers}
      initialUnits={serializableUnits}
      stats={{
        totalUsers: users.length,
        totalUnits: units.length,
        totalTransactions,
        totalAuditLogs,
      }}
    />
  )
}
