import { prisma } from '../config/db.js';

// role name from env (with fallback)
const PARENT_ROLE_NAME =
  process.env.PARENT_ROLE_NAME?.trim().toUpperCase() || 'PARENT/GUARDIAN';

export const ParentService = {

  /* =========================
     GET ALL PARENTS (PAGINATED + SEARCH + FILTER)
  ========================= */
  async getAllParents({
    page = 1,
    limit = 10,
    search = '',
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      role: {
        name: PARENT_ROLE_NAME,
      },
      ...(isActive !== undefined && {
        isActive: isActive === 'true' || isActive === true,
      }),
      ...(search && {
        OR: [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { middleName: { contains: search } },
          { lastName: { contains: search } },
          { contactNo: { contains: search } },
        ],
      }),
    };

    const orderBy = {
      [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          firstName: true,
          middleName: true,
          lastName: true,
          contactNo: true,
          address: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
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
     GET CHILDREN BY PARENT ID (PAGINATED + SEARCH + FILTER)
  ========================= */
  async getChildrenByParentId(
    parentId,
    {
      page = 1,
      limit = 10,
      search = '',
      gender,
      sortBy = 'ranking',
      sortOrder = 'asc',
    } = {}
  ) {
    if (!parentId) {
      throw new Error('Parent ID is required');
    }

    const skip = (page - 1) * limit;

    // 1️⃣ Verify parent
    const parent = await prisma.user.findFirst({
      where: {
        id: parentId,
        isDeleted: false,
        role: {
          name: PARENT_ROLE_NAME,
        },
      },
    });

    if (!parent) {
      throw new Error('Parent user not found or not a parent');
    }

    const where = {
      parentId,
      isDeleted: false,
      ...(gender && { gender }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { middleName: { contains: search } },
          { lastName: { contains: search } },
        ],
      }),
    };

    const orderBy =
      sortBy === 'ranking'
        ? [
            { ranking: sortOrder === 'desc' ? 'desc' : 'asc' },
            { createdAt: 'asc' },
          ]
        : {
            [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc',
          };

    const [data, total] = await Promise.all([
      prisma.child.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
          familyNumber: true,
          createdAt: true,
          summary: {
            select: {
              completionRate: true,
              totalCompleted: true,
              totalRequired: true,
            },
          },
        },
      }),
      prisma.child.count({ where }),
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

};
