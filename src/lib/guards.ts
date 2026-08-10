import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { isUnit } from "@/lib/enums"

export async function ensureUnitAccess(session: Awaited<ReturnType<typeof getServerSession>>, unit: string) {
  if (!session?.user) return { ok: false, status: 401 as const, error: "Unauthorized" }
  if (session.user.role === "Pimpinan") return { ok: true }
  if (session.user.unit !== unit || !isUnit(unit)) return { ok: false, status: 403 as const, error: "Forbidden unit" }
  return { ok: true }
}

export async function requireUnit(session: Awaited<ReturnType<typeof getServerSession>>, unit: string) {
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Pimpinan" && session.user.unit !== unit) {
    return NextResponse.json({ error: "Forbidden unit" }, { status: 403 })
  }
  if (!isUnit(unit)) return NextResponse.json({ error: "Invalid unit" }, { status: 400 })
  return null
}
