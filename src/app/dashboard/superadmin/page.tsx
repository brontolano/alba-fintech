import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SuperadminClient } from "./SuperadminClient"

export const dynamic = "force-dynamic"

export default async function SuperadminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "Superadmin") redirect("/dashboard")

  const [tenants, users, units, totalTransactions, totalAuditLogs] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, units: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { unitId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        unit: { select: { id: true, name: true, type: true, retailEnabled: true } },
        tenant: { select: { id: true, name: true, appName: true } },
      },
    }),
    prisma.unit.findMany({
      orderBy: { name: "asc" },
      include: {
        tenant: { select: { id: true, name: true, appName: true } },
        _count: { select: { users: true, transactions: true } },
      },
    }),
    prisma.transaction.count(),
    prisma.auditLog.count(),
  ])

  const serializableUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    unitName: u.unit?.name || "All",
    unitType: u.unit?.type || "Sederhana",
    retailModuleEnabled: u.unit?.retailEnabled || false,
    tenantName: u.tenant?.name || "Unknown",
  }))

  const serializableUnits = units.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    tenantName: u.tenant?.name || "Unknown",
    balance: Number(u.balance),
  }))

  const serializableTenants = tenants.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  return (
    <SuperadminClient
      initialTenants={serializableTenants}
      initialUsers={serializableUsers}
      initialUnits={serializableUnits}
      stats={{
        totalUsers: users.length,
        totalUnits: units.length,
        totalTenants: tenants.length,
        totalTransactions,
        totalAuditLogs,
      }}
    />
  )
}