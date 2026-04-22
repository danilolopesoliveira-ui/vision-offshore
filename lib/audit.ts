import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

interface LogAuditParams {
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
  diff?: Prisma.InputJsonValue;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const hdrs = await headers();
    const ipAddress =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;
    const userAgent = hdrs.get("user-agent") ?? null;

    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        diff: params.diff,
        ipAddress,
        userAgent,
      },
    });
  } catch {
    // Audit failures must never break the main flow — log to console only
    console.error("[audit] Failed to write audit log:", params);
  }
}

type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface WithAuditOptions {
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
}

// Wraps a server action and logs after success.
export async function withAudit<T>(
  opts: WithAuditOptions,
  handler: () => Promise<T>,
  getDiff?: (result: T) => Prisma.InputJsonValue
): Promise<ServerActionResult<T>> {
  try {
    const result = await handler();
    await logAudit({
      userId: opts.userId,
      entityType: opts.entityType,
      entityId: opts.entityId,
      action: opts.action,
      diff: getDiff ? getDiff(result) : undefined,
    });
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return { success: false, error: message };
  }
}
