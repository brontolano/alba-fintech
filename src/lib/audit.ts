import { prisma } from "@/lib/prisma"

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "config_change"
  | "login"

export async function logAction(params: {
  actorId: number
  action: AuditAction
  entity: string
  entityId: number
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    })
  } catch (err) {
    console.error("Audit log gagal:", err)
  }
}