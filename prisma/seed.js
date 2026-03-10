import 'dotenv/config';

import bcrypt from 'bcryptjs';
import {
  Gender,
  ImmunizationStatus,
  PermissionCode,
  PrismaClient,
} from '@prisma/client';

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

const vaccineSeeds = [
  {
    name: 'BCG',
    description: 'Tuberculosis vaccine given at birth.',
    recommendedAge: 'At birth',
    totalDoses: 1,
    requiresBooster: false,
    boosterAfterMonths: null,
    schedules: [
      { doseLabel: 'Dose 1', doseNumber: 1, recommendedAgeInMonths: 0, intervalDays: null },
    ],
  },
  {
    name: 'Pentavalent',
    description: 'Protects against DTP, Hep B, and Hib.',
    recommendedAge: '6, 10, and 14 weeks',
    totalDoses: 3,
    requiresBooster: false,
    boosterAfterMonths: null,
    schedules: [
      { doseLabel: 'Dose 1', doseNumber: 1, recommendedAgeInMonths: 2, intervalDays: null },
      { doseLabel: 'Dose 2', doseNumber: 2, recommendedAgeInMonths: 3, intervalDays: 28 },
      { doseLabel: 'Dose 3', doseNumber: 3, recommendedAgeInMonths: 4, intervalDays: 28 },
    ],
  },
  {
    name: 'MMR',
    description: 'Measles, mumps, and rubella vaccine.',
    recommendedAge: '9 months and booster',
    totalDoses: 2,
    requiresBooster: true,
    boosterAfterMonths: 6,
    schedules: [
      { doseLabel: 'Dose 1', doseNumber: 1, recommendedAgeInMonths: 9, intervalDays: null },
      { doseLabel: 'Dose 2', doseNumber: 2, recommendedAgeInMonths: 15, intervalDays: 180 },
    ],
  },
];

const announcementSeeds = [
  {
    title: 'Monthly Immunization Drive',
    message: 'Bring immunization cards every first Monday of the month.',
    isActive: true,
  },
  {
    title: 'Cold Chain Reminder',
    message: 'Vaccines are available from 8:00 AM to 4:00 PM on weekdays.',
    isActive: true,
  },
];

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function createRecordPlan(child, vaccineByName) {
  const bcg = vaccineByName.BCG;
  const pentavalent = vaccineByName.Pentavalent;
  const mmr = vaccineByName.MMR;

  return [
    {
      childKey: child.key,
      vaccineId: bcg.id,
      dose: 'Dose 1',
      doseNumber: 1,
      nextDueDate: addMonths(child.birthDate, 0),
      status: ImmunizationStatus.COMPLETED,
      dateGiven: addDays(child.birthDate, 1),
      remarks: 'Administered after delivery clearance.',
      batchNumber: 'BCG-2026-001',
      manufacturer: 'BioVax',
      administeredBy: 'Nurse Joy',
      administeredAt: 'Health Center Room 1',
      visitKey: `${child.key}-visit-1`,
    },
    {
      childKey: child.key,
      vaccineId: pentavalent.id,
      dose: 'Dose 1',
      doseNumber: 1,
      nextDueDate: addMonths(child.birthDate, 2),
      status: ImmunizationStatus.COMPLETED,
      dateGiven: addMonths(child.birthDate, 2),
      remarks: 'No adverse events observed.',
      batchNumber: 'PENTA-2026-101',
      manufacturer: 'HealthPharm',
      administeredBy: 'Nurse Joy',
      administeredAt: 'Barangay Health Center',
      visitKey: `${child.key}-visit-2`,
    },
    {
      childKey: child.key,
      vaccineId: pentavalent.id,
      dose: 'Dose 2',
      doseNumber: 2,
      nextDueDate: addDays(addMonths(child.birthDate, 2), 28),
      status:
        child.key === 'child-1'
          ? ImmunizationStatus.PENDING
          : ImmunizationStatus.COMPLETED,
      dateGiven:
        child.key === 'child-1'
          ? null
          : addDays(addMonths(child.birthDate, 3), 2),
      remarks:
        child.key === 'child-1'
          ? 'Scheduled for next visit.'
          : 'Completed with mild fever monitoring advised.',
      batchNumber: child.key === 'child-1' ? null : 'PENTA-2026-102',
      manufacturer: child.key === 'child-1' ? null : 'HealthPharm',
      administeredBy: child.key === 'child-1' ? null : 'Nurse Joy',
      administeredAt: child.key === 'child-1' ? null : 'Barangay Health Center',
      visitKey: child.key === 'child-1' ? null : `${child.key}-visit-3`,
    },
    {
      childKey: child.key,
      vaccineId: mmr.id,
      dose: 'Dose 1',
      doseNumber: 1,
      nextDueDate: addMonths(child.birthDate, 9),
      status:
        child.key === 'child-2'
          ? ImmunizationStatus.SKIPPED
          : ImmunizationStatus.PENDING,
      dateGiven: null,
      remarks:
        child.key === 'child-2'
          ? 'Deferred due to temporary fever.'
          : 'Pending age eligibility.',
      batchNumber: null,
      manufacturer: null,
      administeredBy: null,
      administeredAt: null,
      visitKey: null,
    },
  ];
}

function summarize(records) {
  const totalRequired = records.length;
  const totalCompleted = records.filter(
    (record) => record.status === ImmunizationStatus.COMPLETED
  ).length;
  const totalMissed = records.filter((record) => record.isMissed).length;

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

  await prisma.immunizationRecord.deleteMany();
  await prisma.immunizationSummary.deleteMany();
  await prisma.immunizationVisit.deleteMany();
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
    data: Object.values(PermissionCode).map((code) => ({ code })),
  });

  const permissions = await prisma.permission.findMany();
  const permissionByCode = Object.fromEntries(
    permissions.map((permission) => [permission.code, permission])
  );

  const roles = {};
  for (const roleName of Object.keys(rolePermissionMap)) {
    roles[roleName] = await prisma.role.create({
      data: { name: roleName },
    });
  }

  await prisma.rolePermission.createMany({
    data: Object.entries(rolePermissionMap).flatMap(([roleName, codes]) =>
      codes.map((code) => ({
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
      middleName: null,
      lastName: 'Administrator',
      contactNo: '09170000001',
      address: 'Health Center Office',
    },
    {
      key: 'nurse',
      email: 'nurse@healthcenter.local',
      roleId: roles.NURSE.id,
      firstName: 'Joy',
      middleName: 'A.',
      lastName: 'Santos',
      contactNo: '09170000002',
      address: 'Health Center Clinic',
    },
    {
      key: 'parent-1',
      email: 'maria.parent@healthcenter.local',
      roleId: roles[parentRoleName].id,
      firstName: 'Maria',
      middleName: null,
      lastName: 'Dela Cruz',
      contactNo: '09170000003',
      address: 'Purok 1, Barangay Central',
    },
    {
      key: 'parent-2',
      email: 'juan.parent@healthcenter.local',
      roleId: roles[parentRoleName].id,
      firstName: 'Juan',
      middleName: 'P.',
      lastName: 'Reyes',
      contactNo: '09170000004',
      address: 'Purok 2, Barangay Central',
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
        middleName: seed.middleName,
        lastName: seed.lastName,
        contactNo: seed.contactNo,
        address: seed.address,
      },
    });
  }

  await prisma.userPermission.createMany({
    data: userSeeds.flatMap((seed) =>
      rolePermissionMap[
        Object.keys(roles).find((roleName) => roles[roleName].id === seed.roleId)
      ].map((code) => ({
        userId: users[seed.key].id,
        permissionId: permissionByCode[code].id,
        allowed: true,
      }))
    ),
  });

  const vaccines = {};
  for (const vaccineSeed of vaccineSeeds) {
    const vaccine = await prisma.vaccine.create({
      data: {
        name: vaccineSeed.name,
        description: vaccineSeed.description,
        recommendedAge: vaccineSeed.recommendedAge,
        totalDoses: vaccineSeed.totalDoses,
        requiresBooster: vaccineSeed.requiresBooster,
        boosterAfterMonths: vaccineSeed.boosterAfterMonths,
      },
    });

    vaccines[vaccine.name] = vaccine;

    await prisma.immunizationSchedule.createMany({
      data: vaccineSeed.schedules.map((schedule) => ({
        vaccineId: vaccine.id,
        doseLabel: schedule.doseLabel,
        doseNumber: schedule.doseNumber,
        recommendedAgeInMonths: schedule.recommendedAgeInMonths,
        intervalDays: schedule.intervalDays,
        isActive: true,
      })),
    });
  }

  await prisma.announcement.createMany({
    data: announcementSeeds,
  });

  const childSeeds = [
    {
      key: 'child-1',
      parentId: users['parent-1'].id,
      firstName: 'Liam',
      middleName: null,
      lastName: 'Dela Cruz',
      gender: Gender.MALE,
      birthDate: new Date('2025-04-15T00:00:00.000Z'),
      birthPlace: 'City General Hospital',
    },
    {
      key: 'child-2',
      parentId: users['parent-2'].id,
      firstName: 'Sofia',
      middleName: 'M.',
      lastName: 'Reyes',
      gender: Gender.FEMALE,
      birthDate: new Date('2025-02-10T00:00:00.000Z'),
      birthPlace: 'Community Birthing Clinic',
    },
  ];

  const children = {};
  for (const seed of childSeeds) {
    children[seed.key] = await prisma.child.create({
      data: {
        parentId: seed.parentId,
        firstName: seed.firstName,
        middleName: seed.middleName,
        lastName: seed.lastName,
        gender: seed.gender,
        birthDate: seed.birthDate,
        birthPlace: seed.birthPlace,
      },
    });
  }

  const visitSeeds = [
    {
      key: 'child-1-visit-1',
      childId: children['child-1'].id,
      visitDate: new Date('2025-04-16T09:00:00.000Z'),
      location: 'City General Hospital',
      nurseName: 'Nurse Joy',
    },
    {
      key: 'child-1-visit-2',
      childId: children['child-1'].id,
      visitDate: new Date('2025-06-15T09:00:00.000Z'),
      location: 'Barangay Health Center',
      nurseName: 'Nurse Joy',
    },
    {
      key: 'child-2-visit-1',
      childId: children['child-2'].id,
      visitDate: new Date('2025-02-11T09:00:00.000Z'),
      location: 'Community Birthing Clinic',
      nurseName: 'Nurse Joy',
    },
    {
      key: 'child-2-visit-2',
      childId: children['child-2'].id,
      visitDate: new Date('2025-04-10T09:00:00.000Z'),
      location: 'Barangay Health Center',
      nurseName: 'Nurse Joy',
    },
    {
      key: 'child-2-visit-3',
      childId: children['child-2'].id,
      visitDate: new Date('2025-05-12T09:30:00.000Z'),
      location: 'Barangay Health Center',
      nurseName: 'Nurse Joy',
    },
  ];

  const visits = {};
  for (const seed of visitSeeds) {
    visits[seed.key] = await prisma.immunizationVisit.create({
      data: {
        childId: seed.childId,
        visitDate: seed.visitDate,
        location: seed.location,
        nurseName: seed.nurseName,
      },
    });
  }

  for (const childSeed of childSeeds) {
    const recordsPlan = createRecordPlan(childSeed, vaccines);
    const createdRecords = [];

    for (const plan of recordsPlan) {
      const isMissed =
        plan.status === ImmunizationStatus.SKIPPED ||
        plan.status === ImmunizationStatus.CANCELLED;
      const isLate =
        plan.status === ImmunizationStatus.COMPLETED &&
        plan.dateGiven &&
        plan.nextDueDate
          ? plan.dateGiven > plan.nextDueDate
          : false;

      const record = await prisma.immunizationRecord.create({
        data: {
          childId: children[plan.childKey].id,
          vaccineId: plan.vaccineId,
          visitId: plan.visitKey ? visits[plan.visitKey].id : null,
          dose: plan.dose,
          doseNumber: plan.doseNumber,
          dateGiven: plan.dateGiven,
          nextDueDate: plan.nextDueDate,
          status: plan.status,
          administeredBy: plan.administeredBy,
          administeredAt: plan.administeredAt,
          batchNumber: plan.batchNumber,
          manufacturer: plan.manufacturer,
          remarks: plan.remarks,
          isMissed,
          isLate,
          createdById: users.admin.id,
          updatedById: plan.status === ImmunizationStatus.COMPLETED ? users.nurse.id : null,
        },
      });

      createdRecords.push(record);
    }

    await prisma.immunizationSummary.create({
      data: {
        childId: children[childSeed.key].id,
        ...summarize(createdRecords),
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Default user password: ${DEFAULT_PASSWORD}`);
  console.log(`Parent role: ${parentRoleName}`);
}

main()
  .catch(async (error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
