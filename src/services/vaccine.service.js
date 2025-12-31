import { prisma } from '../config/db.js';

export const VaccineService = {

  /* =====================================================
     CREATE VACCINE
  ===================================================== */
  async createVaccine(payload, createdById = null) {
    if (!payload?.name) {
      throw new Error('Vaccine name is required');
    }

    return prisma.vaccine.create({
      data: {
        name: payload.name,
        description: payload.description || null,
        recommendedAge: payload.recommendedAge,
      },
      select: {
        id: true,
        name: true,
        description: true,
        recommendedAge: true,
        createdAt: true,
      },
    });
  },

  /* =====================================================
     UPDATE VACCINE
  ===================================================== */
  async updateVaccineById(id, payload) {
    if (!id) throw new Error('Vaccine ID is required');

    const vaccine = await prisma.vaccine.findFirst({
      where: { id, isDeleted: false },
    });

    if (!vaccine) throw new Error('Vaccine not found');

    return prisma.vaccine.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        recommendedAge: payload.recommendedAge,
      },
      select: {
        id: true,
        name: true,
        description: true,
        recommendedAge: true,
        createdAt: true,
      },
    });
  },

  /* =====================================================
     SOFT DELETE / RESTORE VACCINE
  ===================================================== */
  async toggleIsDeleted(id) {
    if (!id) throw new Error('Vaccine ID is required');

    const vaccine = await prisma.vaccine.findUnique({
      where: { id },
    });

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
     GET VACCINE BY ID
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
        createdAt: true,
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

    /* ================= SAFE SORT ================= */
    const allowedSortFields = [
      'createdAt',
      'name',
      'recommendedAge',
    ];

    const orderBy = allowedSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
      : { createdAt: 'desc' };

    /* ================= WHERE ================= */
    const where = { isDeleted: false };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { recommendedAge: { contains: search } },
      ];
    }

    /* ================= QUERY ================= */
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
          createdAt: true,
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
