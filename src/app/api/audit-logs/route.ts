import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role

  if (role !== "Pimpinan" && role !== "Superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        actor: {
          select: { id: true, name: true, role: true, unit: true }
        }
      }
    })

    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: "Gagal mengambil audit log" }, { status: 500 })
  }
}