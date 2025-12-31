import { prisma } from '../config/db.js';

export const VaccineService = {

  /* =====================================================
     CREATE VACCINE (+ OPTIONAL SCHEDULES)
  ===================================================== */
  async createVaccine(payload) {
    if (!payload?.name) {
      throw new Error('Vaccine name is required');
    }

    const {
      name,
      description,
      recommendedAge,
      totalDoses,
      requiresBooster,
      boosterAfterMonths,
      schedules = [], // optional
    } = payload;

    return prisma.vaccine.create({
      data: {
        name,
        description: description || null,
        recommendedAge,
        totalDoses: totalDoses ?? null,
        requiresBooster: requiresBooster ?? false,
        boosterAfterMonths: boosterAfterMonths ?? null,

        schedules: schedules.length
          ? {
              create: schedules.map(s => ({
                doseLabel: s.doseLabel,
                doseNumber: s.doseNumber,
                recommendedAgeInMonths: s.recommendedAgeInMonths,
                intervalDays: s.intervalDays ?? null,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        description: true,
        recommendedAge: true,
        totalDoses: true,
        requiresBooster: true,
        boosterAfterMonths: true,
        createdAt: true,
        schedules: true,
      },
    });
  },

  /* =====================================================
     UPDATE VACCINE (+ OPTIONAL SCHEDULE RESET)
  ===================================================== */
  async updateVaccineById(id, payload) {
    if (!id) throw new Error('Vaccine ID is required');

    const vaccine = await prisma.vaccine.findFirst({
      where: { id, isDeleted: false },
    });

    if (!vaccine) throw new Error('Vaccine not found');

    const {
      name,
      description,
      recommendedAge,
      totalDoses,
      requiresBooster,
      boosterAfterMonths,
      schedules,
    } = payload;

    return prisma.$transaction(async tx => {
      // Optional: reset schedules if provided
      if (Array.isArray(schedules)) {
        await tx.immunizationSchedule.deleteMany({
          where: { vaccineId: id },
        });

        if (schedules.length) {
          await tx.immunizationSchedule.createMany({
            data: schedules.map(s => ({
              vaccineId: id,
              doseLabel: s.doseLabel,
              doseNumber: s.doseNumber,
              recommendedAgeInMonths: s.recommendedAgeInMonths,
              intervalDays: s.intervalDays ?? null,
            })),
          });
        }
      }

      return tx.vaccine.update({
        where: { id },
        data: {
          name: name ?? undefined,
          description: description ?? undefined,
          recommendedAge: recommendedAge ?? undefined,
          totalDoses: totalDoses ?? undefined,
          requiresBooster: requiresBooster ?? undefined,
          boosterAfterMonths: boosterAfterMonths ?? undefined,
        },
        select: {
          id: true,
          name: true,
          description: true,
          recommendedAge: true,
          totalDoses: true,
          requiresBooster: true,
          boosterAfterMonths: true,
          createdAt: true,
          schedules: true,
        },
      });
    });
  },

  /* =====================================================
     SOFT DELETE / RESTORE VACCINE
  ===================================================== */
  async toggleIsDeleted(id) {
    if (!id) throw new Error('Vaccine ID is required');

    const vaccine = await prisma.vaccine.findUnique({ where: { id } });
    if (!vaccine) throw new Error('Vaccine not found');

    return prisma.vaccine.update({
      where: { id },
      data: {
        isDeleted: !vaccine.isDeleted,
        deletedAt: vaccine.isDeleted ? null : new Date(),
      },
      select: {
        id: true,
        name: true,
        isDeleted: true,
        deletedAt: true,
      },
    });
  },

  /* =====================================================
     GET VACCINE BY ID (WITH SCHEDULES)
  ===================================================== */
  async getVaccineById(id) {
    if (!id) throw new Error('Vaccine ID is required');

    return prisma.vaccine.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        name: true,
        description: true,
        recommendedAge: true,
        totalDoses: true,
        requiresBooster: true,
        boosterAfterMonths: true,
        createdAt: true,
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
    });
  },

  /* =====================================================
     GET ALL VACCINES (SEARCH + SORT + PAGINATION)
  ===================================================== */
  async getAllVaccines({
    page = 1,
    limit = 10,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const allowedSortFields = [
      'createdAt',
      'name',
      'recommendedAge',
      'totalDoses',
    ];

    const orderBy = allowedSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
      : { createdAt: 'desc' };

    const where = { isDeleted: false };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { recommendedAge: { contains: search } },
      ];
    }

    const [vaccines, total] = await Promise.all([
      prisma.vaccine.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          description: true,
          recommendedAge: true,
          totalDoses: true,
          requiresBooster: true,
          boosterAfterMonths: true,
          createdAt: true,
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
