import { prisma } from '../config/db.js';
import { VACCINE_CATALOG } from '../constants/vaccineCatalog.constants.js';
import { AuditService } from './audit.service.js';
import { NotificationService } from './notification.service.js';

const buildCatalogMap = () =>
  Object.fromEntries(VACCINE_CATALOG.map(vaccine => [vaccine.code, vaccine]));

const buildScheduleWriteData = schedules =>
  schedules.map(schedule => ({
    doseLabel: schedule.doseLabel,
    doseNumber: schedule.doseNumber,
    recommendedAgeLabel: schedule.recommendedAgeLabel,
    dueDaysFromBirth: schedule.dueDaysFromBirth,
    intervalDays: schedule.intervalDays ?? null,
    isActive: true,
  }));

const normalizeText = value => String(value ?? '').trim();

const toCodeSlug = value =>
  normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');

const ensurePositiveNumber = (value, fieldName) => {
  const next = Number(value);

  if (Number.isNaN(next) || next < 0) {
    throw new Error(`${fieldName} must be a valid positive number`);
  }

  return next;
};

const ensureSchedulePayload = schedules => {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    throw new Error('At least one dose schedule is required');
  }

  const normalized = schedules.map((schedule, index) => {
    const doseLabel = normalizeText(schedule.doseLabel);
    const recommendedAgeLabel = normalizeText(schedule.recommendedAgeLabel);
    const doseNumber =
      schedule.doseNumber !== undefined && schedule.doseNumber !== null && schedule.doseNumber !== ''
        ? Number(schedule.doseNumber)
        : index + 1;
    const dueDaysFromBirth = Number(schedule.dueDaysFromBirth);
    const intervalDays =
      schedule.intervalDays !== undefined &&
      schedule.intervalDays !== null &&
      schedule.intervalDays !== ''
        ? Number(schedule.intervalDays)
        : null;

    if (!doseLabel) {
      throw new Error(`Dose label is required for schedule ${index + 1}`);
    }

    if (!recommendedAgeLabel) {
      throw new Error(`Recommended age label is required for schedule ${index + 1}`);
    }

    if (Number.isNaN(doseNumber) || doseNumber <= 0) {
      throw new Error(`Dose number must be valid for schedule ${index + 1}`);
    }

    if (Number.isNaN(dueDaysFromBirth) || dueDaysFromBirth < 0) {
      throw new Error(`Due days from birth must be valid for schedule ${index + 1}`);
    }

    if (intervalDays !== null && (Number.isNaN(intervalDays) || intervalDays < 0)) {
      throw new Error(`Interval days must be valid for schedule ${index + 1}`);
    }

    return {
      doseLabel,
      doseNumber,
      recommendedAgeLabel,
      dueDaysFromBirth,
      intervalDays,
    };
  });

  const seenDoseNumbers = new Set();

  normalized.forEach(schedule => {
    if (seenDoseNumbers.has(schedule.doseNumber)) {
      throw new Error('Dose numbers must be unique within a vaccine schedule');
    }

    seenDoseNumbers.add(schedule.doseNumber);
  });

  return normalized.sort((left, right) => left.doseNumber - right.doseNumber);
};

const getNextDisplayOrder = async () => {
  const highest = await prisma.vaccine.findFirst({
    where: { isDeleted: false },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });

  return (highest?.displayOrder ?? 0) + 1;
};

const buildUniqueCode = async (source, excludeId = null) => {
  const baseCode = toCodeSlug(source);

  if (!baseCode) {
    throw new Error('A vaccine code or name is required');
  }

  let candidate = baseCode;
  let suffix = 2;

  while (true) {
    const existing = await prisma.vaccine.findFirst({
      where: {
        code: candidate,
        ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseCode}_${suffix}`;
    suffix += 1;
  }
};

export const VaccineService = {
  async syncCatalog() {
    const catalogMap = buildCatalogMap();

    for (const vaccine of VACCINE_CATALOG) {
      const existing = await prisma.vaccine.findUnique({
        where: { code: vaccine.code },
        select: {
          stockQuantity: true,
        },
      });

      await prisma.vaccine.upsert({
        where: { code: vaccine.code },
        update: {
          name: vaccine.name,
          description: vaccine.description,
          recommendedAge: vaccine.recommendedAge,
          totalDoses: vaccine.totalDoses,
          requiresBooster: false,
          boosterAfterMonths: null,
          reorderLevel: vaccine.reorderLevel,
          displayOrder: vaccine.displayOrder,
          unit: 'dose',
          isDeleted: false,
          deletedAt: null,
          stockQuantity: existing?.stockQuantity ?? vaccine.stockQuantity,
          schedules: {
            deleteMany: {},
            create: buildScheduleWriteData(vaccine.schedules),
          },
        },
        create: {
          code: vaccine.code,
          name: vaccine.name,
          description: vaccine.description,
          recommendedAge: vaccine.recommendedAge,
          totalDoses: vaccine.totalDoses,
          requiresBooster: false,
          boosterAfterMonths: null,
          reorderLevel: vaccine.reorderLevel,
          displayOrder: vaccine.displayOrder,
          unit: 'dose',
          stockQuantity: vaccine.stockQuantity,
          schedules: {
            create: buildScheduleWriteData(vaccine.schedules),
          },
        },
      });
    }

    return prisma.vaccine.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
    });
  },

  async createVaccine(payload = {}, createdByUserId) {
    const name = normalizeText(payload.name);
    const description = normalizeText(payload.description) || null;
    const recommendedAge = normalizeText(payload.recommendedAge);
    const unit = normalizeText(payload.unit) || 'dose';

    if (!name) {
      throw new Error('Vaccine name is required');
    }

    if (!recommendedAge) {
      throw new Error('Recommended age is required');
    }

    const code = await buildUniqueCode(payload.code || name);
    const schedules = ensureSchedulePayload(payload.schedules);
    const stockQuantity = ensurePositiveNumber(payload.stockQuantity ?? 0, 'Stock quantity');
    const reorderLevel = ensurePositiveNumber(payload.reorderLevel ?? 10, 'Reorder level');
    const totalDoses =
      payload.totalDoses !== undefined && payload.totalDoses !== null && payload.totalDoses !== ''
        ? ensurePositiveNumber(payload.totalDoses, 'Total doses')
        : schedules.length;
    const displayOrder =
      payload.displayOrder !== undefined && payload.displayOrder !== null && payload.displayOrder !== ''
        ? ensurePositiveNumber(payload.displayOrder, 'Display order')
        : await getNextDisplayOrder();

    const vaccine = await prisma.vaccine.create({
      data: {
        code,
        name,
        description,
        recommendedAge,
        totalDoses,
        requiresBooster: Boolean(payload.requiresBooster),
        boosterAfterMonths:
          payload.boosterAfterMonths !== undefined &&
          payload.boosterAfterMonths !== null &&
          payload.boosterAfterMonths !== ''
            ? ensurePositiveNumber(payload.boosterAfterMonths, 'Booster after months')
            : null,
        stockQuantity,
        reorderLevel,
        displayOrder,
        unit,
        schedules: {
          create: buildScheduleWriteData(schedules),
        },
      },
      include: {
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
    });

    await AuditService.log({
      userId: createdByUserId,
      action: 'CREATE_VACCINE',
      entityType: 'VACCINE',
      entityId: vaccine.id,
      description: `Added ${vaccine.name} to the vaccine catalog.`,
      metadata: {
        code: vaccine.code,
        stockQuantity: vaccine.stockQuantity,
        reorderLevel: vaccine.reorderLevel,
      },
    });

    await NotificationService.notifyStockChange(
      vaccine,
      'added to the vaccine catalog'
    );

    return vaccine;
  },

  async updateVaccineById(id, payload, updatedByUserId) {
    if (!id) throw new Error('Vaccine ID is required');

    const vaccine = await prisma.vaccine.findFirst({
      where: {
        id: Number(id),
        isDeleted: false,
      },
      include: {
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
    });

    if (!vaccine) {
      throw new Error('Vaccine not found');
    }

    const nextName =
      payload.name !== undefined ? normalizeText(payload.name) : vaccine.name;
    const nextRecommendedAge =
      payload.recommendedAge !== undefined
        ? normalizeText(payload.recommendedAge)
        : vaccine.recommendedAge;
    const nextDescription =
      payload.description !== undefined ? normalizeText(payload.description) || null : vaccine.description;
    const nextUnit =
      payload.unit !== undefined ? normalizeText(payload.unit) || 'dose' : vaccine.unit;

    if (!nextName) {
      throw new Error('Vaccine name is required');
    }

    if (!nextRecommendedAge) {
      throw new Error('Recommended age is required');
    }

    const nextCode =
      payload.code !== undefined
        ? await buildUniqueCode(payload.code || nextName, vaccine.id)
        : vaccine.code;
    const nextSchedules =
      payload.schedules !== undefined ? ensureSchedulePayload(payload.schedules) : vaccine.schedules;
    const nextStockQuantity =
      payload.stockQuantity !== undefined
        ? ensurePositiveNumber(payload.stockQuantity, 'Stock quantity')
        : vaccine.stockQuantity;
    const nextReorderLevel =
      payload.reorderLevel !== undefined
        ? ensurePositiveNumber(payload.reorderLevel, 'Reorder level')
        : vaccine.reorderLevel;
    const nextTotalDoses =
      payload.totalDoses !== undefined && payload.totalDoses !== null && payload.totalDoses !== ''
        ? ensurePositiveNumber(payload.totalDoses, 'Total doses')
        : payload.schedules !== undefined
          ? nextSchedules.length
          : vaccine.totalDoses;
    const nextDisplayOrder =
      payload.displayOrder !== undefined && payload.displayOrder !== null && payload.displayOrder !== ''
        ? ensurePositiveNumber(payload.displayOrder, 'Display order')
        : vaccine.displayOrder;
    const nextBoosterAfterMonths =
      payload.boosterAfterMonths !== undefined
        ? payload.boosterAfterMonths === null || payload.boosterAfterMonths === ''
          ? null
          : ensurePositiveNumber(payload.boosterAfterMonths, 'Booster after months')
        : vaccine.boosterAfterMonths;

    const updated = await prisma.vaccine.update({
      where: { id: Number(id) },
      data: {
        code: nextCode,
        name: nextName,
        description: nextDescription,
        recommendedAge: nextRecommendedAge,
        totalDoses: nextTotalDoses,
        requiresBooster:
          payload.requiresBooster !== undefined
            ? Boolean(payload.requiresBooster)
            : vaccine.requiresBooster,
        boosterAfterMonths: nextBoosterAfterMonths,
        stockQuantity: nextStockQuantity,
        reorderLevel: nextReorderLevel,
        displayOrder: nextDisplayOrder,
        unit: nextUnit,
        ...(payload.schedules !== undefined
          ? {
              schedules: {
                deleteMany: {},
                create: buildScheduleWriteData(nextSchedules),
              },
            }
          : {}),
      },
      include: {
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
    });

    await AuditService.log({
      userId: updatedByUserId,
      action: 'UPDATE_VACCINE',
      entityType: 'VACCINE',
      entityId: updated.id,
      description: `Updated vaccine ${updated.name}.`,
      metadata: {
        previousCode: vaccine.code,
        code: updated.code,
        previousStockQuantity: vaccine.stockQuantity,
        stockQuantity: updated.stockQuantity,
        reorderLevel: updated.reorderLevel,
      },
    });

    if (
      updated.stockQuantity !== vaccine.stockQuantity ||
      updated.reorderLevel !== vaccine.reorderLevel
    ) {
      await NotificationService.notifyStockChange(
        updated,
        `changed from ${vaccine.stockQuantity} to ${updated.stockQuantity}`
      );
    }

    return updated;
  },

  async toggleIsDeleted() {
    throw new Error('Vaccine deletion is disabled from this screen.');
  },

  async getVaccineById(id) {
    if (!id) throw new Error('Vaccine ID is required');

    return prisma.vaccine.findFirst({
      where: { id: Number(id), isDeleted: false },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        recommendedAge: true,
        totalDoses: true,
        stockQuantity: true,
        reorderLevel: true,
        unit: true,
        displayOrder: true,
        requiresBooster: true,
        boosterAfterMonths: true,
        createdAt: true,
        updatedAt: true,
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
    });
  },

  async getAllVaccines({
    page = 1,
    limit = 20,
    search,
  } = {}) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { recommendedAge: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vaccines, total] = await Promise.all([
      prisma.vaccine.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          recommendedAge: true,
          totalDoses: true,
          stockQuantity: true,
          reorderLevel: true,
          unit: true,
          displayOrder: true,
          requiresBooster: true,
          boosterAfterMonths: true,
          createdAt: true,
          updatedAt: true,
          schedules: {
            where: { isActive: true },
            orderBy: { doseNumber: 'asc' },
          },
        },
      }),
      prisma.vaccine.count({ where }),
    ]);

    return {
      data: vaccines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
