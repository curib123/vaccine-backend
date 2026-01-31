import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

const PARENT_ROLE_NAME = process.env.PARENT_ROLE_NAME;

if (!PARENT_ROLE_NAME) {
  throw new Error('❌ PARENT_ROLE_NAME is missing in .env');
}

async function main() {
  console.log('🌱 Seeding auth & roles...');

  /* =========================
     PERMISSIONS
  ========================= */
  const permissionCodes = [
    'VIEW_DASHBOARD',
    'VIEW_ANNOUNCEMENT',

    'MANAGE_CHILDREN',
    'MANAGE_PARENTS',

    'MANAGE_IMMUNIZATION',
    'MANAGE_VACCINES',

    'MANAGE_USERS',
    'MANAGE_ROLES',

    'MANAGE_ADMINISTRATION',
  ];

  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code },
      })
    )
  );

  /* =========================
     ROLES
  ========================= */
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System Administrator',
    },
  });

  const healthWorkerRole = await prisma.role.upsert({
    where: { name: 'HEALTH_WORKER' },
    update: {},
    create: {
      name: 'HEALTH_WORKER',
      description: 'Nurse / Health Staff',
    },
  });

  const parentRole = await prisma.role.upsert({
    where: { name: PARENT_ROLE_NAME },
    update: {},
    create: {
      name: PARENT_ROLE_NAME,
      description: 'Parent / Guardian',
    },
  });

  console.log('✅ Roles seeded');

  /* =========================
     ROLE PERMISSIONS
  ========================= */

  // ADMIN → all permissions
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // HEALTH WORKER
  const healthWorkerPermissions = [
    'VIEW_DASHBOARD',
    'VIEW_ANNOUNCEMENT',
    'MANAGE_CHILDREN',
    'MANAGE_IMMUNIZATION',
    'MANAGE_VACCINES',
  ];

  await Promise.all(
    permissions
      .filter((p) => healthWorkerPermissions.includes(p.code))
      .map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: healthWorkerRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: healthWorkerRole.id,
            permissionId: permission.id,
          },
        })
      )
  );

  // PARENT (ENV BASED)
  const parentPermissions = [
    'VIEW_DASHBOARD',
    'VIEW_ANNOUNCEMENT',
  ];

  await Promise.all(
    permissions
      .filter((p) => parentPermissions.includes(p.code))
      .map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: parentRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: parentRole.id,
            permissionId: permission.id,
          },
        })
      )
  );

  /* =========================
     USERS
  ========================= */
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'parent@system.com' },
    update: {},
    create: {
      email: 'parent@system.com',
      password: passwordHash,
      roleId: parentRole.id,
      firstName: 'Test',
      lastName: 'Parent',
    },
  });

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
