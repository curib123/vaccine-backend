import { prisma } from '../config/db.js';
import { AuditService } from './audit.service.js';
import { NotificationService } from './notification.service.js';
import { RecordsService } from './records.service.js';

const nullable = value => (value ? String(value).trim() : null);

const numberOrNull = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const requireText = (payload, field, label) => {
  const value = String(payload[field] || '').trim();

  if (!value) {
    throw new Error(`${label} is required`);
  }

  return value;
};

const requireNumber = (payload, field, label) => {
  if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
    throw new Error(`${label} is required`);
  }

  const parsed = Number(payload[field]);

  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a valid number`);
  }

  return parsed;
};

const validateChildPayload = payload => {
  if (!payload.parentId) {
    throw new Error('parentId is required');
  }

  if (!payload.birthDate) {
    throw new Error('birthDate is required');
  }

  requireText(payload, 'firstName', 'First name');
  requireText(payload, 'lastName', 'Last name');
  requireText(payload, 'gender', 'Gender');
  requireText(payload, 'birthPlace', 'Place of birth');
  requireText(payload, 'address', 'Address');
  requireText(payload, 'motherName', "Mother's name");
  requireText(payload, 'fatherName', "Father's name");
  requireText(payload, 'healthCenter', 'Health Center');
  requireText(payload, 'barangay', 'Barangay');
  requireText(payload, 'familyNumber', 'Family number');
  requireNumber(payload, 'birthHeightCm', 'Birth height');
  requireNumber(payload, 'birthWeightKg', 'Birth weight');

  const ranking = requireNumber(payload, 'ranking', 'Ranking');

  if (ranking <= 0) {
    throw new Error('Ranking must be greater than 0');
  }
};

const buildChildData = (payload, fallbackAddress) => ({
  ranking: requireNumber(payload, 'ranking', 'Ranking'),
  firstName: String(payload.firstName || '').trim(),
  middleName: nullable(payload.middleName),
  lastName: String(payload.lastName || '').trim(),
  gender: payload.gender,
  birthDate: new Date(payload.birthDate),
  birthPlace: String(payload.birthPlace || '').trim(),
  address: nullable(payload.address) || fallbackAddress || null,
  motherName: nullable(payload.motherName),
  fatherName: nullable(payload.fatherName),
  birthHeightCm: numberOrNull(payload.birthHeightCm),
  birthWeightKg: numberOrNull(payload.birthWeightKg),
  healthCenter: nullable(payload.healthCenter),
  barangay: nullable(payload.barangay),
  familyNumber: nullable(payload.familyNumber),
});

export const ChildService = {
  async createChild(payload, createdById) {
    const { parentId } = payload;
    validateChildPayload(payload);

    const parent = await prisma.user.findFirst({
      where: {
        id: Number(parentId),
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        address: true,
      },
    });

    if (!parent) {
      throw new Error('Parent not found');
    }

    const child = await prisma.child.create({
      data: {
        parentId: Number(parentId),
        ...buildChildData(payload, parent.address),
      },
    });

    await RecordsService.generateDefaultScheduleForChild(
      child.id,
      createdById
    );

    await AuditService.log({
      userId: createdById,
      action: 'CREATE_CHILD',
      entityType: 'CHILD',
      entityId: child.id,
      description: `Registered child ${child.firstName} ${child.lastName} and generated the card-based vaccine schedule.`,
      metadata: {
        parentId: child.parentId,
      },
    });

    await NotificationService.notifyChildRegistered(child);

    return this.getChildById(child.id);
  },

  async updateChildById(id, payload, updatedByUserId) {
    if (!id) throw new Error('Child ID is required');
    validateChildPayload(payload);

    const existing = await prisma.child.findFirst({
      where: {
        id: Number(id),
        isDeleted: false,
      },
      include: {
        parent: {
          select: {
            address: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error('Child not found');
    }

    const updated = await prisma.child.update({
      where: { id: Number(id) },
      data: buildChildData(payload, existing.parent?.address),
    });

    await AuditService.log({
      userId: updatedByUserId,
      action: 'UPDATE_CHILD',
      entityType: 'CHILD',
      entityId: updated.id,
      description: `Updated child information for ${updated.firstName} ${updated.lastName}.`,
    });

    return this.getChildById(updated.id);
  },

  async toggleChildIsDeleted(id, userId) {
    if (!id) throw new Error('Child ID is required');

    const child = await prisma.child.findUnique({ where: { id: Number(id) } });
    if (!child) throw new Error('Child not found');

    const updated = await prisma.child.update({
      where: { id: Number(id) },
      data: {
        isDeleted: !child.isDeleted,
        deletedAt: child.isDeleted ? null : new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isDeleted: true,
        deletedAt: true,
      },
    });

    await AuditService.log({
      userId,
      action: updated.isDeleted ? 'DELETE_CHILD' : 'RESTORE_CHILD',
      entityType: 'CHILD',
      entityId: updated.id,
      description: `${updated.isDeleted ? 'Archived' : 'Restored'} child ${updated.firstName} ${updated.lastName}.`,
    });

    return updated;
  },

  async getChildById(id) {
    if (!id) throw new Error('Child ID is required');

    return prisma.child.findFirst({
      where: { id: Number(id), isDeleted: false },
      select: {
        id: true,
        ranking: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        address: true,
        motherName: true,
        fatherName: true,
        birthHeightCm: true,
        birthWeightKg: true,
        healthCenter: true,
        barangay: true,
        familyNumber: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            address: true,
          },
        },
        summary: true,
        createdAt: true,
      },
    });
  },

  async getAllChildren({ page = 1, limit = 10, search, parentId }) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = { isDeleted: false };

    if (parentId) where.parentId = Number(parentId);

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { birthPlace: { contains: search, mode: 'insensitive' } },
        { barangay: { contains: search, mode: 'insensitive' } },
        { familyNumber: { contains: search, mode: 'insensitive' } },
        {
          parent: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [children, total] = await Promise.all([
      prisma.child.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { ranking: 'asc' },
          { createdAt: 'asc' },
        ],
        select: {
          id: true,
          ranking: true,
          firstName: true,
          middleName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          birthPlace: true,
          barangay: true,
          healthCenter: true,
          familyNumber: true,
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          summary: {
            select: {
              completionRate: true,
              totalCompleted: true,
              totalRequired: true,
            },
          },
          createdAt: true,
        },
      }),
      prisma.child.count({ where }),
    ]);

    return {
      data: children,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
