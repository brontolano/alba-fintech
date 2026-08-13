import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: Number(session.user.id) },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: Number(session.user.id), read: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch {
    return NextResponse.json({ error: "Gagal mengambil notifikasi" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { notificationId, markAllRead } = await req.json()

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: Number(session.user.id), read: false },
        data: { read: true },
      })
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: Number(notificationId), userId: Number(session.user.id) },
        data: { read: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui notifikasi" }, { status: 500 })
  }
}