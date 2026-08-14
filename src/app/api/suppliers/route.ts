import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unit = session.user.unit

  const where = role === "Pimpinan" ? {} : { unitName: unit }
  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(suppliers)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  const unit = session.user.unit
  const body = (await req.json()) as {
    name: string
    contact?: string
    email?: string
    phone?: string
    address?: string
    unitName?: string
  }

  const unitName = role === "Pimpinan" ? body.unitName || unit : unit

  const supplier = await prisma.supplier.create({
    data: {
      name: body.name,
      contact: body.contact || null,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      unitName,
    },
  })

  return NextResponse.json(supplier, { status: 201 })
}