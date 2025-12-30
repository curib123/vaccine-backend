import { prisma } from '../config/db.js';

export const UserService = {

/* =====================================================
   TOGGLE SOFT DELETE
===================================================== */
async toggleIsDeleted(id, deletedById = null) {
  if (!id) throw new Error('User ID is required');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');

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

/* =====================================================
   TOGGLE ACTIVE
===================================================== */
async toggleIsActive(id) {
  if (!id) throw new Error('User ID is required');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');

  return prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: {
      id: true,
      email: true,
      isActive: true,
      updatedAt: true,
    },
  });
},

/* =====================================================
   UPDATE USER
===================================================== */
async updateUserById(id, payload) {
  if (!id) throw new Error('User ID is required');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');

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

/* =====================================================
   GET USER BY ID
===================================================== */
async getUserById(id) {
  if (!id) throw new Error('User ID is required');

  return prisma.user.findFirst({
    where: { id, isDeleted: false },
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

/* =====================================================
   ✅ GET USER PERMISSIONS BY USER ID
===================================================== */
async getUserPermissionsById(userId) {
  if (!userId) throw new Error('User ID is required');

  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: {
      id: true,
      role: {
        select: {
          id: true,
          name: true,
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw new Error('User not found');

  return {
    userId: user.id,
    roleId: user.role?.id,
    roleName: user.role?.name,
    permissions: user.role?.permissions.map(p => p.permission) || [],
  };
},

/* =====================================================
   ✅ UPDATE USER PERMISSIONS (VIA ROLE)
===================================================== */
async updateUserPermissions(userId, permissionIds = []) {
  if (!userId) throw new Error('User ID is required');
  if (!Array.isArray(permissionIds)) {
    throw new Error('permissionIds must be an array');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roleId: true },
  });

  if (!user) throw new Error('User not found');

  // Validate permissions
  const valid = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });

  if (valid.length !== permissionIds.length) {
    throw new Error('One or more permissions are invalid');
  }

  // Replace role permissions
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: { roleId: user.roleId },
    }),
    prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({
        roleId: user.roleId,
        permissionId,
      })),
    }),
  ]);

  return { success: true };
},

/* =====================================================
   GET ALL USERS
===================================================== */
async getAllUsers({ page = 1, limit = 10, search, roleId, isActive }) {
  page = Number(page);
  limit = Number(limit);
  const skip = (page - 1) * limit;

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
        role: {
          select: { name: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map(u => ({
      ...u,
      roleName: u.role?.name || null,
      role: undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
},
};
