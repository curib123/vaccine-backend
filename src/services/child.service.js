import { prisma } from '../config/db.js';

export const ChildService = {

/* =====================================================
   CREATE CHILD
   → CHILD DATA ONLY (NO RECORD GENERATION)
===================================================== */
async createChild(payload, createdById) {
  const {
    parentId,
    birthDate,
    ...childData
  } = payload;

  /* ---------- VALIDATION ---------- */
  if (!parentId) {
    throw new Error('parentId is required');
  }

  if (!birthDate) {
    throw new Error('birthDate is required');
  }

  /* ---------- CREATE CHILD ---------- */
  const child = await prisma.child.create({
    data: {
      ...childData,
      parentId: Number(parentId),
      birthDate: new Date(birthDate),
      createdById,
    },
  });

  return child;
},

  /* =====================================================
     SOFT DELETE / RESTORE CHILD
  ===================================================== */
  async toggleChildIsDeleted(id) {
    if (!id) throw new Error('Child ID is required');

    const child = await prisma.child.findUnique({ where: { id } });
    if (!child) throw new Error('Child not found');

    return prisma.child.update({
      where: { id },
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
  },

  /* =====================================================
     GET CHILD BY ID
  ===================================================== */
  async getChildById(id) {
    if (!id) throw new Error('Child ID is required');

    return prisma.child.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdAt: true,
      },
    });
  },

  /* =====================================================
     GET ALL CHILDREN
  ===================================================== */
  async getAllChildren({ page = 1, limit = 10, search, parentId }) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = { isDeleted: false };

    if (parentId) where.parentId = Number(parentId);

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { birthPlace: { contains: search } },
      ];
    }

    const [children, total] = await Promise.all([
      prisma.child.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          gender: true,
          birthDate: true,
          birthPlace: true,
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
