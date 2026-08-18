import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { id: Number(id) },
    include: {
      _count: { select: { users: true, units: true } },
      users: { select: { id: true, email: true, name: true, role: true, unitId: true, isActive: true } },
      units: { select: { id: true, name: true, type: true, retailEnabled: true, balance: true } },
    },
  })

  if (!tenant) {
    return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 })
  }

  return NextResponse.json(tenant)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, appName, primaryColor, secondaryColor, subdomain, domain, activeModules, isActive } = body

  const tenant = await prisma.tenant.update({
    where: { id: Number(id) },
    data: {
      name,
      appName,
      primaryColor,
      secondaryColor,
      subdomain,
      domain,
      activeModules,
      isActive,
    },
  })

  return NextResponse.json(tenant)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await prisma.tenant.delete({ where: { id: Number(id) } })
  return NextResponse.json({ success: true })
}