import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      unit: true,
      unitType: true,
      retailModuleEnabled: true,
      image: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    ...user,
    createdAt: user.createdAt.toISOString(),
  })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const file = form.get("image") as File | null

      if (!file || file.size === 0) {
        return NextResponse.json({ error: "File gambar kosong" }, { status: 400 })
      }

      const bytes = Buffer.from(await file.arrayBuffer())
      const base64 = bytes.toString("base64")
      const dataUrl = `data:${file.type};base64,${base64}`

      const updated = await prisma.user.update({
        where: { id: Number(session.user.id) },
        data: { image: dataUrl },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          unit: true,
          unitType: true,
          retailModuleEnabled: true,
          image: true,
          createdAt: true,
        },
      })

      return NextResponse.json({
        ...updated,
        createdAt: updated.createdAt?.toISOString?.() ?? null,
      })
    }

    const body = await req.json()
    const { name, image, unitType, retailModuleEnabled } = body

    const updated = await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: {
        ...(name ? { name } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(unitType ? { unitType } : {}),
        ...(retailModuleEnabled !== undefined ? { retailModuleEnabled: Boolean(retailModuleEnabled) } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unit: true,
        unitType: true,
        retailModuleEnabled: true,
        image: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt?.toISOString?.() ?? null,
    })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}