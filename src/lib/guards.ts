import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { isUnit } from "@/lib/enums"

export async function ensureUnitAccess(session: Session | null, unit: string) {
  if (!session?.user) return { ok: false, status: 401 as const, error: "Unauthorized" }
  if (session.user.role === "Pimpinan") return { ok: true }
  if (session.user.unit !== unit || !isUnit(unit)) return { ok: false, status: 403 as const, error: "Forbidden unit" }
  return { ok: true }
}

export async function requireUnit(session: Session | null, unit: string) {
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Pimpinan" && session.user.unit !== unit) {
    return NextResponse.json({ error: "Forbidden unit" }, { status: 403 })
  }
  if (!isUnit(unit)) return NextResponse.json({ error: "Invalid unit" }, { status: 400 })
  return null
}
