import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { users: true, units: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(tenants)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, appName, primaryColor, secondaryColor, subdomain, domain, activeModules } = body

  if (!name || !appName) {
    return NextResponse.json({ error: "name & appName wajib diisi" }, { status: 400 })
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      appName,
      primaryColor: primaryColor || "#1E3A5F",
      secondaryColor: secondaryColor || "#10B981",
      subdomain: subdomain || null,
      domain: domain || null,
      activeModules: activeModules || "transactions,reconciliation",
    },
  })

  return NextResponse.json(tenant, { status: 201 })
}