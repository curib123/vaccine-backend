import 'dotenv/config';

import bcrypt from 'bcryptjs';
import {
  Gender,
  ImmunizationStatus,
  PermissionCode,
  PrismaClient,
} from '@prisma/client';

import { VACCINE_CATALOG } from '../src/constants/vaccineCatalog.constants.js';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Password123!';
const parentRoleName =
  process.env.PARENT_ROLE_NAME?.trim().toUpperCase() || 'PARENT/GUARDIAN';

const rolePermissionMap = {
  ADMIN: Object.values(PermissionCode),
  NURSE: [
    PermissionCode.VIEW_DASHBOARD,
    PermissionCode.VIEW_ANNOUNCEMENT,
    PermissionCode.MANAGE_CHILDREN,
    PermissionCode.MANAGE_PARENTS,
    PermissionCode.MANAGE_IMMUNIZATION,
    PermissionCode.MANAGE_VACCINES,
  ],
  [parentRoleName]: [
    PermissionCode.VIEW_DASHBOARD,
    PermissionCode.VIEW_ANNOUNCEMENT,
  ],
};

const announcements = [
  {
    title: 'Bring the immunization card',
    message: 'Present the child immunization card on every immunization update for proper dose tracking.',
    isActive: true,
  },
  {
    title: 'Upcoming dose reminders',
    message: 'Parents will receive email reminders before scheduled vaccines become due.',
    isActive: true,
  },
];

const childSeeds = [
  {
    key: 'child-1',
    ranking: 1,
    firstName: 'Liam',
    middleName: '',
    lastName: 'Dela Cruz',
    gender: Gender.MALE,
    birthDate: new Date('2025-08-01T00:00:00.000Z'),
    birthPlace: 'City General Hospital',
    motherName: 'Maria Dela Cruz',
    fatherName: 'Paolo Dela Cruz',
    birthHeightCm: 50,
    birthWeightKg: 3.2,
    healthCenter: 'Barangay Health Center',
    barangay: 'Barangay Central',
    familyNumber: 'FC-001',
  },
  {
    key: 'child-2',
    ranking: 2,
    firstName: 'Sofia',
    middleName: 'M',
    lastName: 'Reyes',
    gender: Gender.FEMALE,
    birthDate: new Date('2025-06-15T00:00:00.000Z'),
    birthPlace: 'Community Birthing Clinic',
    motherName: 'Ana Reyes',
    fatherName: 'Juan Reyes',
    birthHeightCm: 48,
    birthWeightKg: 2.9,
    healthCenter: 'Barangay Health Center',
    barangay: 'Barangay North',
    familyNumber: 'FC-002',
  },
];

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function summarize(records) {
  const totalRequired = records.length;
  const totalCompleted = records.filter(record => record.status === ImmunizationStatus.COMPLETED).length;
  const totalMissed = records.filter(record => record.isMissed).length;

  return {
    totalRequired,
    totalCompleted,
    totalMissed,
    completionRate:
      totalRequired === 0
        ? 0
        : Number(((totalCompleted / totalRequired) * 100).toFixed(2)),
  };
}

async function main() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.immunizationRecord.deleteMany();
  await prisma.immunizationSummary.deleteMany();
  await prisma.immunizationSchedule.deleteMany();
  await prisma.child.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.vaccine.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  await prisma.permission.createMany({
    data: Object.values(PermissionCode).map(code => ({ code })),
  });

  const permissions = await prisma.permission.findMany();
  const permissionByCode = Object.fromEntries(
    permissions.map(permission => [permission.code, permission])
  );

  const roles = {};
  for (const roleName of Object.keys(rolePermissionMap)) {
    roles[roleName] = await prisma.role.create({
      data: { name: roleName },
    });
  }

  await prisma.rolePermission.createMany({
    data: Object.entries(rolePermissionMap).flatMap(([roleName, codes]) =>
      codes.map(code => ({
        roleId: roles[roleName].id,
        permissionId: permissionByCode[code].id,
      }))
    ),
  });

  const userSeeds = [
    {
      key: 'admin',
      email: 'admin@healthcenter.local',
      roleId: roles.ADMIN.id,
      firstName: 'System',
      middleName: '',
      lastName: 'Administrator',
      contactNo: '09170000001',
      address: 'Health Center Office',
    },
    {
      key: 'nurse',
      email: 'nurse@healthcenter.local',
      roleId: roles.NURSE.id,
      firstName: 'Joy',
      middleName: 'A',
      lastName: 'Santos',
      contactNo: '09170000002',
      address: 'Barangay Health Center',
    },
    {
      key: 'parent-1',
      email: 'maria.parent@healthcenter.local',
      roleId: roles[parentRoleName].id,
      firstName: 'Maria',
      middleName: '',
      lastName: 'Dela Cruz',
      contactNo: '09170000003',
      address: 'Purok 1, Barangay Central',
    },
    {
      key: 'parent-2',
      email: 'juan.parent@healthcenter.local',
      roleId: roles[parentRoleName].id,
      firstName: 'Juan',
      middleName: 'P',
      lastName: 'Reyes',
      contactNo: '09170000004',
      address: 'Purok 2, Barangay North',
    },
  ];

  const users = {};
  for (const seed of userSeeds) {
    users[seed.key] = await prisma.user.create({
      data: {
        email: seed.email,
        password: hashedPassword,
        roleId: seed.roleId,
        firstName: seed.firstName,
        middleName: seed.middleName || null,
        lastName: seed.lastName,
        contactNo: seed.contactNo,
        address: seed.address,
      },
    });
  }

  await prisma.userPermission.createMany({
    data: userSeeds.flatMap(seed =>
      rolePermissionMap[
        Object.keys(roles).find(roleName => roles[roleName].id === seed.roleId)
      ].map(code => ({
        userId: users[seed.key].id,
        permissionId: permissionByCode[code].id,
        allowed: true,
      }))
    ),
  });

  const vaccines = {};
  for (const vaccineSeed of VACCINE_CATALOG) {
    vaccines[vaccineSeed.code] = await prisma.vaccine.create({
      data: {
        code: vaccineSeed.code,
        name: vaccineSeed.name,
        description: vaccineSeed.description,
        recommendedAge: vaccineSeed.recommendedAge,
        totalDoses: vaccineSeed.totalDoses,
        reorderLevel: vaccineSeed.reorderLevel,
        stockQuantity: vaccineSeed.stockQuantity,
        displayOrder: vaccineSeed.displayOrder,
        unit: 'dose',
        schedules: {
          create: vaccineSeed.schedules.map(schedule => ({
            doseLabel: schedule.doseLabel,
            doseNumber: schedule.doseNumber,
            recommendedAgeLabel: schedule.recommendedAgeLabel,
            dueDaysFromBirth: schedule.dueDaysFromBirth,
            isActive: true,
          })),
        },
      },
    });
  }

  await prisma.announcement.createMany({
    data: announcements,
  });

  const children = {};
  for (const seed of childSeeds) {
    const parentKey = seed.key === 'child-1' ? 'parent-1' : 'parent-2';
    children[seed.key] = await prisma.child.create({
      data: {
        parentId: users[parentKey].id,
        ranking: seed.ranking,
        firstName: seed.firstName,
        middleName: seed.middleName || null,
        lastName: seed.lastName,
        gender: seed.gender,
        birthDate: seed.birthDate,
        birthPlace: seed.birthPlace,
        address: users[parentKey].address,
        motherName: seed.motherName,
        fatherName: seed.fatherName,
        birthHeightCm: seed.birthHeightCm,
        birthWeightKg: seed.birthWeightKg,
        healthCenter: seed.healthCenter,
        barangay: seed.barangay,
        familyNumber: seed.familyNumber,
      },
    });
  }

  const completedDoseMap = {
    'child-1': new Set(['BCG-1', 'HEPATITIS_B-1', 'PENTAVALENT-1', 'OPV-1']),
    'child-2': new Set([
      'BCG-1',
      'HEPATITIS_B-1',
      'PENTAVALENT-1',
      'PENTAVALENT-2',
      'OPV-1',
      'OPV-2',
      'PCV-1',
      'PCV-2',
    ]),
  };

  const stockConsumption = new Map();

  for (const childSeed of childSeeds) {
    const child = children[childSeed.key];
    const records = [];

    for (const vaccineSeed of VACCINE_CATALOG) {
      const vaccine = vaccines[vaccineSeed.code];

      for (const schedule of vaccineSeed.schedules) {
        const doseKey = `${vaccineSeed.code}-${schedule.doseNumber}`;
        const isCompleted = completedDoseMap[childSeed.key].has(doseKey);

        let dateGiven = null;

        if (isCompleted) {
          dateGiven = addDays(child.birthDate, schedule.dueDaysFromBirth);
          stockConsumption.set(
            vaccine.id,
            (stockConsumption.get(vaccine.id) || 0) + 1
          );
        }

        const record = await prisma.immunizationRecord.create({
          data: {
            childId: child.id,
            vaccineId: vaccine.id,
            dose: schedule.doseLabel,
            doseNumber: schedule.doseNumber,
            scheduleLabel: schedule.recommendedAgeLabel,
            dateGiven,
            nextDueDate: addDays(child.birthDate, schedule.dueDaysFromBirth),
            status: isCompleted ? ImmunizationStatus.COMPLETED : ImmunizationStatus.PENDING,
            administeredBy: isCompleted ? 'Nurse Joy Santos' : null,
            administeredAt: isCompleted ? child.healthCenter : null,
            batchNumber: isCompleted ? `${vaccineSeed.code}-${schedule.doseNumber}-2026` : null,
            manufacturer: isCompleted ? 'Healthy Pilipinas Biologics' : null,
            remarks: isCompleted ? 'Recorded from seed data.' : 'Awaiting scheduled dose.',
            isMissed: false,
            isLate: false,
            createdById: users.admin.id,
            updatedById: isCompleted ? users.nurse.id : null,
          },
        });

        records.push(record);
      }
    }

    await prisma.immunizationSummary.create({
      data: {
        childId: child.id,
        ...summarize(records),
      },
    });
  }

  for (const [vaccineId, used] of stockConsumption.entries()) {
    await prisma.vaccine.update({
      where: { id: vaccineId },
      data: {
        stockQuantity: {
          decrement: used,
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Default user password: ${DEFAULT_PASSWORD}`);
  console.log(`Parent role: ${parentRoleName}`);
}

main()
  .catch(async error => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
