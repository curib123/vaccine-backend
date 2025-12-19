import { prisma } from '../config/db.js';

/* =====================================================
   ROLE SERVICE
   - Handles CRUD for roles
   - Handles default role permissions
   - Uses SOFT DELETE only
===================================================== */

/* =========================
   CREATE ROLE
========================= */
export const createRole = async ({
  name,
  description,
  permissionIds = [], // array of permission IDs
}) => {
  return prisma.role.create({
    data: {
      name,
      description,
      permissions: {
        create: permissionIds.map((permissionId) => ({
          permissionId,
        })),
      },
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
};

/* =========================
   GET ALL ROLES (ACTIVE)
========================= */
export const getRoles = async () => {
  return prisma.role.findMany({
    where: {
      isDeleted: false,
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};

/* =========================
   GET ROLE BY ID
========================= */
export const getRoleById = async (roleId) => {
  return prisma.role.findFirst({
    where: {
      id: Number(roleId),
      isDeleted: false,
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
};

/* =========================
   UPDATE ROLE INFO
========================= */
export const updateRole = async (roleId, data) => {
  const { name, description } = data;

  return prisma.role.update({
    where: {
      id: Number(roleId),
    },
    data: {
      name,
      description,
    },
  });
};

/* =========================
   UPDATE ROLE PERMISSIONS
   (REPLACE DEFAULT PERMISSIONS)
========================= */
export const updateRolePermissions = async (roleId, permissionIds = []) => {
  return prisma.$transaction([
    // Remove old permissions
    prisma.rolePermission.deleteMany({
      where: { roleId: Number(roleId) },
    }),

    // Add new permissions
    prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: Number(roleId),
        permissionId,
      })),
    }),
  ]);
};

/* =========================
   SOFT DELETE ROLE
========================= */
export const deleteRole = async (roleId) => {
  return prisma.role.update({
    where: {
      id: Number(roleId),
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
};

/* =========================
   RESTORE ROLE
========================= */
export const restoreRole = async (roleId) => {
  return prisma.role.update({
    where: {
      id: Number(roleId),
    },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });
};

/* =========================
   CHECK IF ROLE IS IN USE
========================= */
export const isRoleInUse = async (roleId) => {
  const count = await prisma.user.count({
    where: {
      roleId: Number(roleId),
      isDeleted: false,
    },
  });

  return count > 0;
};
