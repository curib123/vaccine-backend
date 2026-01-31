import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

const PARENT_ROLE_NAME = process.env.PARENT_ROLE_NAME || 'PARENT';

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  /* =========================
     PERMISSIONS
  ========================= */
  console.log('📋 Seeding permissions...');
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
  console.log(`✅ Created ${permissions.length} permissions`);

  /* =========================
     ROLES
  ========================= */
  console.log('👥 Seeding roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System Administrator with full access',
    },
  });

  const healthWorkerRole = await prisma.role.upsert({
    where: { name: 'HEALTH_WORKER' },
    update: {},
    create: {
      name: 'HEALTH_WORKER',
      description: 'Nurse / Health Staff managing immunizations',
    },
  });

  const parentRole = await prisma.role.upsert({
    where: { name: PARENT_ROLE_NAME },
    update: {},
    create: {
      name: PARENT_ROLE_NAME,
      description: 'Parent / Guardian viewing child records',
    },
  });
  console.log('✅ Created 3 roles');

  /* =========================
     ROLE PERMISSIONS
  ========================= */
  console.log('🔐 Assigning role permissions...');

  // ADMIN → ALL permissions
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

  // HEALTH WORKER permissions
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

  // PARENT permissions
  const parentPermissions = ['VIEW_DASHBOARD', 'VIEW_ANNOUNCEMENT'];

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
  console.log('✅ Role permissions assigned');

  /* =========================
     USERS
  ========================= */
  console.log('👤 Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {},
    create: {
      email: 'admin@system.com',
      password: passwordHash,
      roleId: adminRole.id,
      firstName: 'Admin',
      lastName: 'User',
      contactNo: '+63-912-345-6789',
      address: 'Admin Office, Manila',
      isActive: true,
    },
  });

  // Health Worker Users
  const healthWorker1 = await prisma.user.upsert({
    where: { email: 'nurse.maria@health.com' },
    update: {},
    create: {
      email: 'nurse.maria@health.com',
      password: passwordHash,
      roleId: healthWorkerRole.id,
      firstName: 'Maria',
      middleName: 'Santos',
      lastName: 'Cruz',
      contactNo: '+63-917-111-2222',
      address: 'Health Center, Quezon City',
      isActive: true,
    },
  });

  const healthWorker2 = await prisma.user.upsert({
    where: { email: 'nurse.jose@health.com' },
    update: {},
    create: {
      email: 'nurse.jose@health.com',
      password: passwordHash,
      roleId: healthWorkerRole.id,
      firstName: 'Jose',
      middleName: 'Reyes',
      lastName: 'Garcia',
      contactNo: '+63-917-333-4444',
      address: 'Health Center, Makati',
      isActive: true,
    },
  });

  // Parent Users
  const parent1 = await prisma.user.upsert({
    where: { email: 'parent@system.com' },
    update: {},
    create: {
      email: 'parent@system.com',
      password: passwordHash,
      roleId: parentRole.id,
      firstName: 'Juan',
      middleName: 'Dela',
      lastName: 'Cruz',
      contactNo: '+63-918-555-6666',
      address: '123 Mabini St, Manila',
      isActive: true,
    },
  });

  const parent2 = await prisma.user.upsert({
    where: { email: 'ana.santos@email.com' },
    update: {},
    create: {
      email: 'ana.santos@email.com',
      password: passwordHash,
      roleId: parentRole.id,
      firstName: 'Ana',
      middleName: 'Maria',
      lastName: 'Santos',
      contactNo: '+63-918-777-8888',
      address: '456 Rizal Ave, Quezon City',
      isActive: true,
    },
  });

  const parent3 = await prisma.user.upsert({
    where: { email: 'pedro.ramos@email.com' },
    update: {},
    create: {
      email: 'pedro.ramos@email.com',
      password: passwordHash,
      roleId: parentRole.id,
      firstName: 'Pedro',
      lastName: 'Ramos',
      contactNo: '+63-918-999-0000',
      address: '789 Luna St, Pasig',
      isActive: true,
    },
  });

  console.log('✅ Created 6 users (1 admin, 2 health workers, 3 parents)');

  /* =========================
     USER PERMISSIONS (Override)
  ========================= */
  console.log('🔑 Setting user-specific permissions...');
  
  // Give admin user explicit permission override
  const adminViewDashboard = permissions.find(p => p.code === 'VIEW_DASHBOARD');
  if (adminViewDashboard) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: adminUser.id,
          permissionId: adminViewDashboard.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        permissionId: adminViewDashboard.id,
        allowed: true,
      },
    });
  }
  console.log('✅ User-specific permissions set');

  /* =========================
     VACCINES
  ========================= */
  console.log('💉 Seeding vaccines...');
  
  const bcgVaccine = await prisma.vaccine.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'BCG',
      description: 'Bacillus Calmette-Guérin vaccine against tuberculosis',
      recommendedAge: 'At birth',
      totalDoses: 1,
      requiresBooster: false,
    },
  });

  const hepatitisBVaccine = await prisma.vaccine.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Hepatitis B',
      description: 'Hepatitis B vaccine',
      recommendedAge: 'At birth, 1-2 months, 6-18 months',
      totalDoses: 3,
      requiresBooster: false,
    },
  });

  const pentavalentVaccine = await prisma.vaccine.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Pentavalent (DPT-HepB-Hib)',
      description: 'Combined vaccine for Diphtheria, Pertussis, Tetanus, Hepatitis B, and Haemophilus influenzae type b',
      recommendedAge: '6 weeks, 10 weeks, 14 weeks',
      totalDoses: 3,
      requiresBooster: false,
    },
  });

  const opvVaccine = await prisma.vaccine.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'OPV (Oral Polio Vaccine)',
      description: 'Oral Polio Vaccine',
      recommendedAge: '6 weeks, 10 weeks, 14 weeks',
      totalDoses: 3,
      requiresBooster: false,
    },
  });

  const ipvVaccine = await prisma.vaccine.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: 'IPV (Inactivated Polio Vaccine)',
      description: 'Inactivated Polio Vaccine',
      recommendedAge: '14 weeks',
      totalDoses: 1,
      requiresBooster: false,
    },
  });

  const pcvVaccine = await prisma.vaccine.upsert({
    where: { id: 6 },
    update: {},
    create: {
      name: 'PCV (Pneumococcal Conjugate Vaccine)',
      description: 'Pneumococcal Conjugate Vaccine',
      recommendedAge: '6 weeks, 10 weeks, 14 weeks',
      totalDoses: 3,
      requiresBooster: false,
    },
  });

  const measlesVaccine = await prisma.vaccine.upsert({
    where: { id: 7 },
    update: {},
    create: {
      name: 'Measles-Mumps-Rubella (MMR)',
      description: 'Combined vaccine for Measles, Mumps, and Rubella',
      recommendedAge: '9 months, 12 months',
      totalDoses: 2,
      requiresBooster: false,
    },
  });

  console.log('✅ Created 7 vaccines');

  /* =========================
     IMMUNIZATION SCHEDULES
  ========================= */
  console.log('📅 Seeding immunization schedules...');
  
  const schedules = [
    // BCG
    { vaccineId: bcgVaccine.id, doseLabel: 'Single Dose', doseNumber: 1, recommendedAgeInMonths: 0, intervalDays: null },
    
    // Hepatitis B
    { vaccineId: hepatitisBVaccine.id, doseLabel: 'Dose 1', doseNumber: 1, recommendedAgeInMonths: 0, intervalDays: null },
    { vaccineId: hepatitisBVaccine.id, doseLabel: 'Dose 2', doseNumber: 2, recommendedAgeInMonths: 1, intervalDays: 30 },
    { vaccineId: hepatitisBVaccine.id, doseLabel: 'Dose 3', doseNumber: 3, recommendedAgeInMonths: 6, intervalDays: 150 },
    
    // Pentavalent
    { vaccineId: pentavalentVaccine.id, doseLabel: 'Dose 1', doseNumber: 1, recommendedAgeInMonths: 1.5, intervalDays: null },
    { vaccineId: pentavalentVaccine.id, doseLabel: 'Dose 2', doseNumber: 2, recommendedAgeInMonths: 2.5, intervalDays: 28 },
    { vaccineId: pentavalentVaccine.id, doseLabel: 'Dose 3', doseNumber: 3, recommendedAgeInMonths: 3.5, intervalDays: 28 },
    
    // OPV
    { vaccineId: opvVaccine.id, doseLabel: 'Dose 1', doseNumber: 1, recommendedAgeInMonths: 1.5, intervalDays: null },
    { vaccineId: opvVaccine.id, doseLabel: 'Dose 2', doseNumber: 2, recommendedAgeInMonths: 2.5, intervalDays: 28 },
    { vaccineId: opvVaccine.id, doseLabel: 'Dose 3', doseNumber: 3, recommendedAgeInMonths: 3.5, intervalDays: 28 },
    
    // IPV
    { vaccineId: ipvVaccine.id, doseLabel: 'Single Dose', doseNumber: 1, recommendedAgeInMonths: 3.5, intervalDays: null },
    
    // PCV
    { vaccineId: pcvVaccine.id, doseLabel: 'Dose 1', doseNumber: 1, recommendedAgeInMonths: 1.5, intervalDays: null },
    { vaccineId: pcvVaccine.id, doseLabel: 'Dose 2', doseNumber: 2, recommendedAgeInMonths: 2.5, intervalDays: 28 },
    { vaccineId: pcvVaccine.id, doseLabel: 'Dose 3', doseNumber: 3, recommendedAgeInMonths: 3.5, intervalDays: 28 },
    
    // MMR
    { vaccineId: measlesVaccine.id, doseLabel: 'Dose 1', doseNumber: 1, recommendedAgeInMonths: 9, intervalDays: null },
    { vaccineId: measlesVaccine.id, doseLabel: 'Dose 2', doseNumber: 2, recommendedAgeInMonths: 12, intervalDays: 90 },
  ];

  for (const schedule of schedules) {
    await prisma.immunizationSchedule.create({
      data: schedule,
    });
  }
  console.log(`✅ Created ${schedules.length} immunization schedules`);

  /* =========================
     CHILDREN
  ========================= */
  console.log('👶 Seeding children...');
  
  const child1 = await prisma.child.upsert({
    where: { id: 1 },
    update: {},
    create: {
      parentId: parent1.id,
      firstName: 'Sofia',
      middleName: 'Marie',
      lastName: 'Cruz',
      gender: 'FEMALE',
      birthDate: new Date('2024-06-15'),
      birthPlace: 'Manila Doctors Hospital, Manila',
    },
  });

  const child2 = await prisma.child.upsert({
    where: { id: 2 },
    update: {},
    create: {
      parentId: parent1.id,
      firstName: 'Miguel',
      lastName: 'Cruz',
      gender: 'MALE',
      birthDate: new Date('2023-03-20'),
      birthPlace: 'St. Lukes Medical Center, Quezon City',
    },
  });

  const child3 = await prisma.child.upsert({
    where: { id: 3 },
    update: {},
    create: {
      parentId: parent2.id,
      firstName: 'Isabella',
      middleName: 'Grace',
      lastName: 'Santos',
      gender: 'FEMALE',
      birthDate: new Date('2024-01-10'),
      birthPlace: 'Philippine General Hospital, Manila',
    },
  });

  const child4 = await prisma.child.upsert({
    where: { id: 4 },
    update: {},
    create: {
      parentId: parent2.id,
      firstName: 'Gabriel',
      lastName: 'Santos',
      gender: 'MALE',
      birthDate: new Date('2023-11-05'),
      birthPlace: 'Makati Medical Center, Makati',
    },
  });

  const child5 = await prisma.child.upsert({
    where: { id: 5 },
    update: {},
    create: {
      parentId: parent3.id,
      firstName: 'Gabriela',
      middleName: 'Rose',
      lastName: 'Ramos',
      gender: 'FEMALE',
      birthDate: new Date('2024-08-22'),
      birthPlace: 'Asian Hospital, Alabang',
    },
  });

  console.log('✅ Created 5 children');

  /* =========================
     IMMUNIZATION VISITS
  ========================= */
  console.log('🏥 Seeding immunization visits...');
  
  const visit1 = await prisma.immunizationVisit.create({
    data: {
      childId: child1.id,
      visitDate: new Date('2024-06-15'),
      location: 'Manila Health Center',
      nurseName: healthWorker1.firstName + ' ' + healthWorker1.lastName,
    },
  });

  const visit2 = await prisma.immunizationVisit.create({
    data: {
      childId: child1.id,
      visitDate: new Date('2024-07-20'),
      location: 'Manila Health Center',
      nurseName: healthWorker1.firstName + ' ' + healthWorker1.lastName,
    },
  });

  const visit3 = await prisma.immunizationVisit.create({
    data: {
      childId: child2.id,
      visitDate: new Date('2023-03-20'),
      location: 'Quezon City Health Center',
      nurseName: healthWorker2.firstName + ' ' + healthWorker2.lastName,
    },
  });

  const visit4 = await prisma.immunizationVisit.create({
    data: {
      childId: child3.id,
      visitDate: new Date('2024-01-10'),
      location: 'Quezon City Health Center',
      nurseName: healthWorker1.firstName + ' ' + healthWorker1.lastName,
    },
  });

  const visit5 = await prisma.immunizationVisit.create({
    data: {
      childId: child4.id,
      visitDate: new Date('2023-11-05'),
      location: 'Makati Health Center',
      nurseName: healthWorker2.firstName + ' ' + healthWorker2.lastName,
    },
  });

  console.log('✅ Created 5 immunization visits');

  /* =========================
     IMMUNIZATION RECORDS
  ========================= */
  console.log('📝 Seeding immunization records...');
  
  // Child 1 (Sofia) - Recent baby with some completed vaccines
  await prisma.immunizationRecord.create({
    data: {
      childId: child1.id,
      vaccineId: bcgVaccine.id,
      visitId: visit1.id,
      dose: 'Single Dose',
      doseNumber: 1,
      dateGiven: new Date('2024-06-15'),
      status: 'COMPLETED',
      administeredBy: healthWorker1.firstName + ' ' + healthWorker1.lastName,
      administeredAt: 'Manila Health Center',
      batchNumber: 'BCG-2024-001',
      manufacturer: 'Serum Institute of India',
      createdById: healthWorker1.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child1.id,
      vaccineId: hepatitisBVaccine.id,
      visitId: visit1.id,
      dose: 'Dose 1',
      doseNumber: 1,
      dateGiven: new Date('2024-06-15'),
      status: 'COMPLETED',
      administeredBy: healthWorker1.firstName + ' ' + healthWorker1.lastName,
      administeredAt: 'Manila Health Center',
      batchNumber: 'HEPB-2024-045',
      manufacturer: 'GSK',
      createdById: healthWorker1.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child1.id,
      vaccineId: hepatitisBVaccine.id,
      visitId: visit2.id,
      dose: 'Dose 2',
      doseNumber: 2,
      dateGiven: new Date('2024-07-20'),
      nextDueDate: new Date('2024-12-15'),
      status: 'COMPLETED',
      administeredBy: healthWorker1.firstName + ' ' + healthWorker1.lastName,
      administeredAt: 'Manila Health Center',
      batchNumber: 'HEPB-2024-046',
      manufacturer: 'GSK',
      createdById: healthWorker1.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child1.id,
      vaccineId: pentavalentVaccine.id,
      dose: 'Dose 1',
      doseNumber: 1,
      nextDueDate: new Date('2024-08-01'),
      status: 'PENDING',
      createdById: healthWorker1.id,
    },
  });

  // Child 2 (Miguel) - Older child with more complete records
  await prisma.immunizationRecord.create({
    data: {
      childId: child2.id,
      vaccineId: bcgVaccine.id,
      visitId: visit3.id,
      dose: 'Single Dose',
      doseNumber: 1,
      dateGiven: new Date('2023-03-20'),
      status: 'COMPLETED',
      administeredBy: healthWorker2.firstName + ' ' + healthWorker2.lastName,
      administeredAt: 'Quezon City Health Center',
      batchNumber: 'BCG-2023-089',
      manufacturer: 'Serum Institute of India',
      createdById: healthWorker2.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child2.id,
      vaccineId: hepatitisBVaccine.id,
      visitId: visit3.id,
      dose: 'Dose 1',
      doseNumber: 1,
      dateGiven: new Date('2023-03-20'),
      status: 'COMPLETED',
      administeredBy: healthWorker2.firstName + ' ' + healthWorker2.lastName,
      administeredAt: 'Quezon City Health Center',
      batchNumber: 'HEPB-2023-112',
      manufacturer: 'GSK',
      createdById: healthWorker2.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child2.id,
      vaccineId: pentavalentVaccine.id,
      dose: 'Dose 1',
      doseNumber: 1,
      dateGiven: new Date('2023-05-10'),
      status: 'COMPLETED',
      administeredBy: healthWorker2.firstName + ' ' + healthWorker2.lastName,
      administeredAt: 'Quezon City Health Center',
      batchNumber: 'PENTA-2023-056',
      manufacturer: 'Sanofi Pasteur',
      createdById: healthWorker2.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child2.id,
      vaccineId: pentavalentVaccine.id,
      dose: 'Dose 2',
      doseNumber: 2,
      dateGiven: new Date('2023-06-15'),
      status: 'COMPLETED',
      administeredBy: healthWorker2.firstName + ' ' + healthWorker2.lastName,
      administeredAt: 'Quezon City Health Center',
      batchNumber: 'PENTA-2023-057',
      manufacturer: 'Sanofi Pasteur',
      createdById: healthWorker2.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child2.id,
      vaccineId: measlesVaccine.id,
      dose: 'Dose 1',
      doseNumber: 1,
      dateGiven: new Date('2023-12-20'),
      status: 'COMPLETED',
      administeredBy: healthWorker2.firstName + ' ' + healthWorker2.lastName,
      administeredAt: 'Quezon City Health Center',
      batchNumber: 'MMR-2023-089',
      manufacturer: 'Merck',
      createdById: healthWorker2.id,
    },
  });

  // Child 3 (Isabella) - Mix of completed and pending
  await prisma.immunizationRecord.create({
    data: {
      childId: child3.id,
      vaccineId: bcgVaccine.id,
      visitId: visit4.id,
      dose: 'Single Dose',
      doseNumber: 1,
      dateGiven: new Date('2024-01-10'),
      status: 'COMPLETED',
      administeredBy: healthWorker1.firstName + ' ' + healthWorker1.lastName,
      administeredAt: 'Quezon City Health Center',
      batchNumber: 'BCG-2024-012',
      manufacturer: 'Serum Institute of India',
      createdById: healthWorker1.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child3.id,
      vaccineId: pentavalentVaccine.id,
      dose: 'Dose 1',
      doseNumber: 1,
      nextDueDate: new Date('2024-02-25'),
      status: 'PENDING',
      createdById: healthWorker1.id,
    },
  });

  // Child 4 (Gabriel) - Some missed vaccines
  await prisma.immunizationRecord.create({
    data: {
      childId: child4.id,
      vaccineId: bcgVaccine.id,
      visitId: visit5.id,
      dose: 'Single Dose',
      doseNumber: 1,
      dateGiven: new Date('2023-11-05'),
      status: 'COMPLETED',
      administeredBy: healthWorker2.firstName + ' ' + healthWorker2.lastName,
      administeredAt: 'Makati Health Center',
      batchNumber: 'BCG-2023-156',
      manufacturer: 'Serum Institute of India',
      createdById: healthWorker2.id,
    },
  });

  await prisma.immunizationRecord.create({
    data: {
      childId: child4.id,
      vaccineId: hepatitisBVaccine.id,
      dose: 'Dose 1',
      doseNumber: 1,
      nextDueDate: new Date('2023-12-05'),
      status: 'PENDING',
      isMissed: true,
      remarks: 'Parent missed appointment',
      createdById: healthWorker2.id,
    },
  });

  // Child 5 (Gabriela) - Newer baby with minimal records
  await prisma.immunizationRecord.create({
    data: {
      childId: child5.id,
      vaccineId: bcgVaccine.id,
      dose: 'Single Dose',
      doseNumber: 1,
      nextDueDate: new Date('2024-08-22'),
      status: 'PENDING',
      createdById: adminUser.id,
    },
  });

  console.log('✅ Created immunization records');

  /* =========================
     IMMUNIZATION SUMMARIES
  ========================= */
  console.log('📊 Seeding immunization summaries...');
  
  await prisma.immunizationSummary.upsert({
    where: { childId: child1.id },
    update: {},
    create: {
      childId: child1.id,
      totalRequired: 15,
      totalCompleted: 3,
      totalMissed: 0,
      completionRate: 20.0,
    },
  });

  await prisma.immunizationSummary.upsert({
    where: { childId: child2.id },
    update: {},
    create: {
      childId: child2.id,
      totalRequired: 15,
      totalCompleted: 6,
      totalMissed: 0,
      completionRate: 40.0,
    },
  });

  await prisma.immunizationSummary.upsert({
    where: { childId: child3.id },
    update: {},
    create: {
      childId: child3.id,
      totalRequired: 15,
      totalCompleted: 1,
      totalMissed: 0,
      completionRate: 6.67,
    },
  });

  await prisma.immunizationSummary.upsert({
    where: { childId: child4.id },
    update: {},
    create: {
      childId: child4.id,
      totalRequired: 15,
      totalCompleted: 1,
      totalMissed: 1,
      completionRate: 6.67,
    },
  });

  await prisma.immunizationSummary.upsert({
    where: { childId: child5.id },
    update: {},
    create: {
      childId: child5.id,
      totalRequired: 15,
      totalCompleted: 0,
      totalMissed: 0,
      completionRate: 0.0,
    },
  });

  console.log('✅ Created 5 immunization summaries');

  /* =========================
     ANNOUNCEMENTS
  ========================= */
  console.log('📢 Seeding announcements...');
  
  await prisma.announcement.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Welcome to the Immunization Management System',
      message: 'This system helps track and manage child immunization records. Parents can view their children\'s vaccination history, and health workers can update records.',
      isActive: true,
    },
  });

  await prisma.announcement.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'National Immunization Month - February 2025',
      message: 'Join us in celebrating National Immunization Month! Free vaccines available at all health centers. Bring your child\'s immunization card.',
      isActive: true,
    },
  });

  await prisma.announcement.upsert({
    where: { id: 3 },
    update: {},
    create: {
      title: 'New Vaccine Stock Arrival',
      message: 'We have received new stocks of Pentavalent and PCV vaccines. Schedule your child\'s vaccination appointment now.',
      isActive: true,
    },
  });

  await prisma.announcement.upsert({
    where: { id: 4 },
    update: {},
    create: {
      title: 'Health Center Schedule Update',
      message: 'Manila Health Center will be conducting immunization services every Monday and Wednesday from 8:00 AM to 5:00 PM.',
      isActive: true,
    },
  });

  await prisma.announcement.upsert({
    where: { id: 5 },
    update: {},
    create: {
      title: 'Archived: Previous Campaign',
      message: 'This was a previous vaccination campaign that has ended.',
      isActive: false,
    },
  });

  console.log('✅ Created 5 announcements');

  /* =========================
     SUMMARY
  ========================= */
  console.log('\n🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!\n');
  console.log('📋 Summary:');
  console.log('   ✅ 9 Permissions');
  console.log('   ✅ 3 Roles (ADMIN, HEALTH_WORKER, PARENT)');
  console.log('   ✅ Role Permissions assigned');
  console.log('   ✅ 6 Users (1 admin, 2 health workers, 3 parents)');
  console.log('   ✅ User-specific permissions');
  console.log('   ✅ 7 Vaccines');
  console.log('   ✅ 17 Immunization Schedules');
  console.log('   ✅ 5 Children');
  console.log('   ✅ 5 Immunization Visits');
  console.log('   ✅ Multiple Immunization Records (with various statuses)');
  console.log('   ✅ 5 Immunization Summaries');
  console.log('   ✅ 5 Announcements');
  console.log('\n🔐 Login Credentials (all passwords: password123):');
  console.log('   👑 Admin: admin@system.com');
  console.log('   👨‍⚕️ Health Worker 1: nurse.maria@health.com');
  console.log('   👨‍⚕️ Health Worker 2: nurse.jose@health.com');
  console.log('   👨‍👩‍👧 Parent 1: parent@system.com');
  console.log('   👨‍👩‍👧 Parent 2: ana.santos@email.com');
  console.log('   👨‍👩‍👧 Parent 3: pedro.ramos@email.com');
  console.log('\n✨ All tables are fully seeded and connected!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });