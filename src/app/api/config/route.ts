import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { logAction } from "@/lib/audit"

export async function GET() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } })
  return NextResponse.json(config || { appName: "ALBA Finance", appLogo: null })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role || (session.user.role !== "Pimpinan" && session.user.role !== "Superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { appName, appLogo } = body

  const original = await prisma.systemConfig.findUnique({ where: { id: 1 } })

  const config = await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: { appName, appLogo, updatedAt: new Date() },
    create: { id: 1, appName, appLogo, updatedAt: new Date() },
  })

  await logAction({
    actorId: Number(session.user.id),
    action: "config_change",
    entity: "SystemConfig",
    entityId: 1,
    metadata: {
      previousAppName: original?.appName,
      newAppName: appName,
      previousAppLogo: original?.appLogo,
      newAppLogo: appLogo,
    },
    ip: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  })

  return NextResponse.json(config)
}
