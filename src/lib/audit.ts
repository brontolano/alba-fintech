import { prisma } from "./db";

interface LogActionParams {
  tenantId?: number | null;
  actorId: number;
  action: string;
  entity: string;
  entityId: number;
  metadata?: Record<string, unknown> | string;
  ip?: string;
  userAgent?: string;
}

export async function logAction(params: LogActionParams) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId ?? null,
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: typeof params.metadata === "object" ? JSON.stringify(params.metadata) : params.metadata,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("❌ Failed to create audit log:", error);
  }
}
