import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId || 1
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  })

  return NextResponse.json({
    appName: tenant?.appName || "ALBA Finance",
    logoUrl: tenant?.logo || null,
    themeColor: tenant?.primaryColor || "#022448",
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { appName, logoUrl, themeColor } = body

    const tenantId = session.user.tenantId || 1
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(appName ? { appName } : {}),
        ...(logoUrl !== undefined ? { logo: logoUrl } : {}),
        ...(themeColor ? { primaryColor: themeColor } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update config error:", error)
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }
}