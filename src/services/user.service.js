import { prisma } from '../config/db.js';

export const UserService = {

 // Get User By ID
  async getUserById(id) {
    return prisma.user.findUnique({
        where: { id },
    });
    },
    
    // GET ALL USERS WITH PAGINATION & FILTERS
    //sample query: ?page=1&limit=10&search=john&roleId=2&isActive=true

  async getAllUsers({
    page = 1,
    limit = 10,
    search,
    roleId,
    isActive,
  }) {
    // 1️⃣ Normalize pagination
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    // 2️⃣ Build WHERE filter dynamically
    const where = {
      isDeleted: false,
      ...(roleId && { roleId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      }),
    };

    // 3️⃣ Query users + total count (parallel)
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          middleName: true,
          lastName: true,
          contactNo: true,
          address: true,
          roleId: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    // 4️⃣ Return paginated response
    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

};
