import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } })
  return NextResponse.json(config || { appName: "ALBA Finance", appLogo: null })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Pimpinan") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { appName, appLogo } = body

  const config = await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: { appName, appLogo, updatedAt: new Date() },
    create: { id: 1, appName, appLogo, updatedAt: new Date() },
  })

  return NextResponse.json(config)
}
