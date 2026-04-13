import { PermissionCode } from '@prisma/client';

import { prisma } from '../config/db.js';

/* =====================================================
   PERMISSION SEEDER
===================================================== */
const ensurePermissionsSeeded = async () => {
  const count = await prisma.permission.count();
  if (count > 0) return;

  console.log('🔐 Permission table empty. Seeding permissions...');

  await prisma.permission.createMany({
    data: Object.values(PermissionCode).map(code => ({ code })),
    skipDuplicates: true,
  });
};

/* =========================
   GET ALL PERMISSIONS
========================= */
export const getAllPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: { code: 'asc' },
  });
};

const normalizeDescription = (value) => {
  const text = String(value || '').trim();
  return text ? text : null;
};

/* =========================
   CREATE ROLE
   - If permissionIds EMPTY → assign ALL
========================= */
export const createRole = async ({ name, description, permissionIds = [] }) => {
  if (!name || !name.trim()) {
    throw new Error('Role name is required');
  }

  const normalizedName = name.trim().toUpperCase();

  // Ensure permissions exist
  await ensurePermissionsSeeded();

  return prisma.$transaction(async (tx) => {
    /* 🔒 DUPLICATE CHECK */
    const existing = await tx.role.findFirst({
      where: {
        name: normalizedName,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new Error(`Role "${normalizedName}" already exists`);
    }

    /* ✅ VALIDATE PERMISSIONS */
    let finalPermissionIds = permissionIds;

    if (finalPermissionIds.length > 0) {
      const valid = await tx.permission.findMany({
        where: { id: { in: finalPermissionIds } },
        select: { id: true },
      });

      if (valid.length !== finalPermissionIds.length) {
        throw new Error('One or more permissions are invalid');
      }

      finalPermissionIds = valid.map(p => p.id);
    }

    /* 🧠 ASSIGN ALL IF EMPTY */
    if (finalPermissionIds.length === 0) {
      const all = await tx.permission.findMany({
        select: { id: true },
      });

      if (all.length === 0) {
        throw new Error('No permissions found in the system');
      }

      finalPermissionIds = all.map(p => p.id);
    }

    /* ➕ CREATE ROLE */
    const role = await tx.role.create({
      data: {
        name: normalizedName,
        description: normalizeDescription(description),
      },
    });

    /* 🔗 ATTACH PERMISSIONS */
    await tx.rolePermission.createMany({
      data: finalPermissionIds.map(permissionId => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });

    /* 📦 RETURN ROLE */
    return tx.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: {
          include: { permission: true },
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
    where: { isDeleted: false },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
    orderBy: { name: 'asc' },
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
        include: { permission: true },
      },
    },
  });
};

/* =========================
   UPDATE ROLE NAME
========================= */
export const updateRole = async (roleId, { name, description }) => {
  if (!name || !name.trim()) {
    throw new Error('Role name is required');
  }

  const normalizedName = name.trim().toUpperCase();

  /* 🔒 DUPLICATE CHECK */
  const existing = await prisma.role.findFirst({
    where: {
      name: normalizedName,
      id: { not: Number(roleId) },
      isDeleted: false,
    },
  });

  if (existing) {
    throw new Error(`Role "${normalizedName}" already exists`);
  }

  return prisma.role.update({
    where: { id: Number(roleId) },
    data: {
      name: normalizedName,
      description: normalizeDescription(description),
    },
  });
};

/* =========================
   UPDATE ROLE PERMISSIONS
========================= */
export const updateRolePermissions = async (roleId, permissionIds = []) => {
  if (!Array.isArray(permissionIds)) {
    throw new Error('Invalid permissions payload');
  }

  /* ✅ VALIDATE PERMISSIONS */
  const valid = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });

  if (valid.length !== permissionIds.length) {
    throw new Error('One or more permissions are invalid');
  }

  return prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: { roleId: Number(roleId) },
    }),
    prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({
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
    where: { id: Number(roleId) },
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
    where: { id: Number(roleId) },
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
