import { NextResponse } from "next/server"
import type { Session } from "next-auth"

export async function ensureUnitAccess(session: Session | null, unitId: number | null) {
  if (!session?.user) return { ok: false, status: 401 as const, error: "Unauthorized" }
  if (session.user.role === "Pimpinan" || session.user.role === "Superadmin") return { ok: true }
  if (session.user.unitId !== unitId || !unitId) return { ok: false, status: 403 as const, error: "Forbidden unit" }
  return { ok: true }
}

export async function requireUnit(session: Session | null, unitId: number | null) {
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Pimpinan" && session.user.role !== "Superadmin" && session.user.unitId !== unitId) {
    return NextResponse.json({ error: "Forbidden unit" }, { status: 403 })
  }
  if (!unitId) return NextResponse.json({ error: "Invalid unit" }, { status: 400 })
  return null
}