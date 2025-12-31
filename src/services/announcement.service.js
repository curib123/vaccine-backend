import { prisma } from '../config/db.js';

/* =====================================================
   ANNOUNCEMENT SERVICE
===================================================== */
export const AnnouncementService = {
  /* =========================
     CREATE
  ========================= */
  async create(data) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        message: data.message,
        isActive: data.isActive ?? true,
      },
    });
  },

  /* =========================
     GET ALL (with pagination)
  ========================= */
  async getAll({ page = 1, limit = 10, isActive }) {
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* =========================
     GET BY ID
  ========================= */
  async getById(id) {
    return prisma.announcement.findFirst({
      where: {
        id: Number(id),
        isDeleted: false,
      },
    });
  },

  /* =========================
     UPDATE
  ========================= */
  async update(id, data) {
    return prisma.announcement.update({
      where: { id: Number(id) },
      data: {
        title: data.title,
        message: data.message,
        isActive: data.isActive,
      },
    });
  },

  /* =========================
     TOGGLE ACTIVE
  ========================= */
  async toggleStatus(id) {
    const existing = await prisma.announcement.findUnique({
      where: { id: Number(id) },
    });

    if (!existing || existing.isDeleted) {
      throw new Error('Announcement not found');
    }

    return prisma.announcement.update({
      where: { id: Number(id) },
      data: {
        isActive: !existing.isActive,
      },
    });
  },

  /* =========================
     SOFT DELETE
  ========================= */
  async remove(id) {
    return prisma.announcement.update({
      where: { id: Number(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  },
};
