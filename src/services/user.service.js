import { prisma } from '../config/db.js';

export const UserService = {

// Toggle soft delete (isDeleted)
async toggleIsDeleted(id, deletedById = null) {
  if (!id) {
    throw new Error('User ID is required');
  }

  // 1️⃣ Find user
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 2️⃣ Toggle isDeleted
  return prisma.user.update({
    where: { id },
    data: {
      isDeleted: !user.isDeleted,
      deletedAt: user.isDeleted ? null : new Date(),
      deletedById: user.isDeleted ? null : deletedById,
    },
    select: {
      id: true,
      email: true,
      isDeleted: true,
      deletedAt: true,
      deletedById: true,
      updatedAt: true,
    },
  });
},


// Toggle user isActive status
async toggleIsActive(id) {
  if (!id) {
    throw new Error('User ID is required');
  }

  // 1️⃣ Find user
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 2️⃣ Toggle isActive
  return prisma.user.update({
    where: { id },
    data: {
      isActive: !user.isActive,
    },
    select: {
      id: true,
      email: true,
      isActive: true,
      updatedAt: true,
    },
  });
}
,

// Update user by ID
async updateUserById(id, payload) {
  if (!id) {
    throw new Error('User ID is required');
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Update user
  return prisma.user.update({
    where: { id },
    data: {
      firstName: payload.firstName,
      middleName: payload.middleName,
      lastName: payload.lastName,
      contactNo: payload.contactNo,
      address: payload.address,
      roleId: payload.roleId,
    },
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
      updatedAt: true,
    },
  });
},


// Get User By ID (only if NOT deleted)
async getUserById(id) {
  if (!id) {
    throw new Error('User ID is required');
  }

  return prisma.user.findFirst({
    where: {
      id,
      isDeleted: false, // ✅ exclude soft-deleted users
    },
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
      updatedAt: true,
    },
  });
},

    
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
    ...(roleId && { roleId: Number(roleId) }),
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
    ...(search && {
      OR: [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ],
    }),
  };

  // 3️⃣ Query users + total count
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

        // ✅ JOIN ROLE TABLE
        role: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // 4️⃣ Map role name (optional flattening)
  const formattedUsers = users.map(u => ({
    ...u,
    roleName: u.role?.name || null,
    role: undefined, // optional: hide nested object
  }));

  return {
    data: formattedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
}
