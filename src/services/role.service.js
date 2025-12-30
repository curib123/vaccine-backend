import { PermissionCode } from '@prisma/client';

import { prisma } from '../config/db.js';

/* =====================================================
   ROLE SERVICE
   - Handles CRUD for roles
   - Handles default role permissions
   - Uses SOFT DELETE only
===================================================== */

/* =========================
   ENSURE PERMISSIONS EXIST
========================= */
const ensurePermissionsSeeded = async () => {
  const count = await prisma.permission.count();

  if (count > 0) return;

  console.log('🔐 Permission table empty. Seeding permissions...');

  await prisma.permission.createMany({
    data: Object.values(PermissionCode).map((code) => ({ code })),
    skipDuplicates: true,
  });
};

/* =========================
   GET ALL PERMISSIONS
========================= */
export const getAllPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: {
      code: 'asc', // VIEW_DASHBOARD, MANAGE_USERS, etc.
    },
  });
};


/* =========================
   CREATE ROLE
   - If permissionIds is EMPTY → assign ALL permissions
========================= */
export const createRole = async ({
  name,
  description,
  permissionIds = [],
}) => {
  // 🔥 Ensure permissions exist
  await ensurePermissionsSeeded();

  return prisma.$transaction(async (tx) => {
    // 1️⃣ Create role
    const role = await tx.role.create({
      data: {
        name,
        description,
      },
    });

    let finalPermissionIds = permissionIds;

    // 2️⃣ If no permissions provided → assign ALL permissions
    if (finalPermissionIds.length === 0) {
      const allPermissions = await tx.permission.findMany({
        select: { id: true },
      });

      finalPermissionIds = allPermissions.map((p) => p.id);
    }

    // 3️⃣ Attach permissions to role
    if (finalPermissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: finalPermissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    // 4️⃣ Return role with permissions
    return tx.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
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
