import { prisma } from '../config/db.js';

export const AuditService = {
  async log({
    userId,
    action,
    entityType,
    entityId,
    description,
    metadata,
    tx,
  }) {
    const client = tx || prisma;

    return client.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        description,
        metadata: metadata ?? undefined,
      },
    });
  },

  async getLogs({ limit = 20 } = {}) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  },
};
