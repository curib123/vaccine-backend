import { prisma } from '../config/db.js';
import {
  IMMUNIZATION_STATUS,
  SORT_FIELDS,
} from '../constants/immunization.constants.js';
import { VACCINE_CODE_ORDER } from '../constants/vaccineCatalog.constants.js';
import { AuditService } from './audit.service.js';
import { NotificationService } from './notification.service.js';

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = value => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = value => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const startOfWeek = value => {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const endOfWeek = value => {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return endOfDay(date);
};

const startOfMonth = value => {
  const date = new Date(value);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfYear = value => {
  const date = new Date(value);
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const allowedSortFields = new Set([
  SORT_FIELDS.NEXT_DUE_DATE,
  SORT_FIELDS.CREATED_AT,
  SORT_FIELDS.STATUS,
]);

const buildRecordDrafts = ({
  childId,
  childBirthDate,
  vaccines,
  createdByUserId,
  existingKeys = new Set(),
}) => {
  const drafts = [];

  for (const vaccine of vaccines) {
    for (const schedule of vaccine.schedules) {
      const recordKey = `${vaccine.id}:${schedule.doseNumber}`;

      if (existingKeys.has(recordKey)) {
        continue;
      }

      drafts.push({
        childId: Number(childId),
        vaccineId: vaccine.id,
        dose: schedule.doseLabel,
        doseNumber: schedule.doseNumber,
        scheduleLabel: schedule.recommendedAgeLabel,
        nextDueDate: addDays(childBirthDate, schedule.dueDaysFromBirth),
        status: IMMUNIZATION_STATUS.PENDING,
        createdById: Number(createdByUserId),
      });
    }
  }

  return drafts;
};

const buildCardRows = records => {
  const grouped = new Map();

  for (const record of records) {
    if (!grouped.has(record.vaccineId)) {
      grouped.set(record.vaccineId, {
        vaccineId: record.vaccineId,
        vaccineCode: record.vaccine.code,
        vaccineName: record.vaccine.name,
        displayOrder: record.vaccine.displayOrder,
        totalDoses: record.vaccine.totalDoses,
        recommendedAge: record.vaccine.recommendedAge,
        stockQuantity: record.vaccine.stockQuantity,
        unit: record.vaccine.unit,
        reorderLevel: record.vaccine.reorderLevel,
        doses: [],
      });
    }

    grouped.get(record.vaccineId).doses.push({
      id: record.id,
      dose: record.dose,
      doseNumber: record.doseNumber,
      scheduleLabel: record.scheduleLabel,
      status: record.status,
      nextDueDate: record.nextDueDate,
      dateGiven: record.dateGiven,
      remarks: record.remarks,
      isLate: record.isLate,
      isMissed: record.isMissed,
    });
  }

  return [...grouped.values()]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(row => ({
      ...row,
      doses: row.doses.sort((a, b) => (a.doseNumber || 0) - (b.doseNumber || 0)),
    }));
};

const buildFullName = ({ firstName, middleName, lastName }) =>
  [firstName, middleName, lastName].filter(Boolean).join(' ');

const buildChildSearchText = child =>
  [
    buildFullName(child),
    child.parent ? buildFullName(child.parent) : '',
    child.barangay || '',
    child.healthCenter || '',
  ]
    .join(' ')
    .toLowerCase();

const buildChildReportRow = (child, completedRecords) => {
  const sortedCompleted = [...completedRecords].sort(
    (left, right) => new Date(right.dateGiven).getTime() - new Date(left.dateGiven).getTime()
  );

  return {
    childId: child.id,
    ranking: child.ranking,
    childName: buildFullName(child),
    gender: child.gender,
    birthDate: child.birthDate,
    barangay: child.barangay,
    healthCenter: child.healthCenter,
    parentName: child.parent ? buildFullName(child.parent) : null,
    totalCompleted: child.summary?.totalCompleted ?? completedRecords.length,
    totalRequired: child.summary?.totalRequired ?? child.immunizations.length,
    completionRate: child.summary?.completionRate ?? 0,
    lastVaccinatedAt: sortedCompleted[0]?.dateGiven || null,
  };
};

const buildVaccinationEvent = record => ({
  recordId: record.id,
  childId: record.child.id,
  childName: buildFullName(record.child),
  parentName: record.child.parent ? buildFullName(record.child.parent) : null,
  vaccineName: record.vaccine.name,
  vaccineCode: record.vaccine.code,
  dose: record.dose,
  scheduleLabel: record.scheduleLabel,
  dateGiven: record.dateGiven,
});

async function applyRecordStatus(recordId, payload, updatedByUserId) {
  const { status, dateGiven, remarks } = payload;

  if (!Object.values(IMMUNIZATION_STATUS).includes(status)) {
    throw new Error('Invalid immunization status');
  }

  const record = await prisma.immunizationRecord.findFirst({
    where: { id: Number(recordId), isDeleted: false },
    include: {
      child: {
        select: {
          id: true,
          parentId: true,
          firstName: true,
          lastName: true,
        },
      },
      vaccine: {
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          reorderLevel: true,
          unit: true,
        },
      },
    },
  });

  if (!record) {
    throw new Error('Record not found');
  }

  const previousStatus = record.status;

  if (previousStatus === IMMUNIZATION_STATUS.COMPLETED) {
    throw new Error('Completed immunization records are read-only');
  }

  const completingNow =
    previousStatus !== IMMUNIZATION_STATUS.COMPLETED &&
    status === IMMUNIZATION_STATUS.COMPLETED;
  const revertingCompletion =
    previousStatus === IMMUNIZATION_STATUS.COMPLETED &&
    status !== IMMUNIZATION_STATUS.COMPLETED;

  if (completingNow && record.vaccine.stockQuantity <= 0) {
    throw new Error(`No available stock left for ${record.vaccine.name}`);
  }

  let updatedVaccine = null;

  if (completingNow || revertingCompletion) {
    updatedVaccine = await prisma.vaccine.update({
      where: { id: record.vaccine.id },
      data: {
        stockQuantity: {
          increment: completingNow ? -1 : 1,
        },
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        reorderLevel: true,
        unit: true,
      },
    });
  }

  const givenDate =
    status === IMMUNIZATION_STATUS.COMPLETED
      ? dateGiven
        ? new Date(dateGiven)
        : new Date()
      : null;

  const updated = await prisma.immunizationRecord.update({
    where: { id: record.id },
    data: {
      status,
      dateGiven: givenDate,
      remarks: remarks ?? null,
      updatedById: updatedByUserId,
      isMissed:
        status === IMMUNIZATION_STATUS.SKIPPED ||
        status === IMMUNIZATION_STATUS.CANCELLED,
      isLate:
        status === IMMUNIZATION_STATUS.COMPLETED && record.nextDueDate
          ? givenDate > record.nextDueDate
          : false,
      statusNotificationSentAt: new Date(),
    },
    include: {
      child: {
        select: {
          id: true,
          parentId: true,
          firstName: true,
          lastName: true,
        },
      },
      vaccine: {
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          reorderLevel: true,
          unit: true,
        },
      },
    },
  });

  await RecordsService.updateSummary(record.childId);

  await AuditService.log({
    userId: updatedByUserId,
    action: 'UPDATE_IMMUNIZATION_STATUS',
    entityType: 'IMMUNIZATION_RECORD',
    entityId: updated.id,
    description: `Updated ${updated.vaccine.name} ${updated.dose} for ${updated.child.firstName} ${updated.child.lastName} to ${updated.status}.`,
    metadata: {
      previousStatus,
      nextStatus: status,
    },
  });

  const result = {
    record: updated,
    stockChanged: Boolean(updatedVaccine),
    updatedVaccine: updatedVaccine || updated.vaccine,
    previousStockQuantity: record.vaccine.stockQuantity,
  };

  await NotificationService.notifyRecordStatusChange(result.record);

  if (result.stockChanged) {
    await NotificationService.notifyStockChange(
      result.updatedVaccine,
      `changed from ${result.previousStockQuantity} to ${result.updatedVaccine.stockQuantity}`
    );
  }

  return result.record;
}

export const RecordsService = {
  async getAllStatus() {
    return Object.values(IMMUNIZATION_STATUS).map(value => ({
      value,
      label: value.charAt(0) + value.slice(1).toLowerCase(),
    }));
  },

  async generateDefaultScheduleForChild(childId, createdByUserId, tx = prisma) {
    const child = await tx.child.findUnique({
      where: { id: Number(childId) },
    });

    if (!child) throw new Error('Child not found');

    const vaccines = await tx.vaccine.findMany({
      where: {
        isDeleted: false,
        code: { in: VACCINE_CODE_ORDER },
      },
      include: {
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    const existingRecords = await tx.immunizationRecord.findMany({
      where: {
        childId: Number(childId),
        isDeleted: false,
      },
      select: {
        vaccineId: true,
        doseNumber: true,
      },
    });

    const existingKeys = new Set(
      existingRecords.map(record => `${record.vaccineId}:${record.doseNumber}`)
    );

    const recordsToCreate = buildRecordDrafts({
      childId,
      childBirthDate: child.birthDate,
      vaccines,
      createdByUserId,
      existingKeys,
    });

    if (recordsToCreate.length > 0) {
      await tx.immunizationRecord.createMany({
        data: recordsToCreate,
      });
    }

    await this.updateSummary(childId, tx);
  },

  async generateForChildByVaccines(childId, vaccineIds, createdByUserId) {
    if (!Array.isArray(vaccineIds) || vaccineIds.length === 0) {
      throw new Error('Vaccine IDs are required');
    }

    const child = await prisma.child.findFirst({
      where: { id: Number(childId), isDeleted: false },
    });

    if (!child) throw new Error('Child not found');

    const vaccines = await prisma.vaccine.findMany({
      where: {
        id: { in: vaccineIds.map(Number) },
        isDeleted: false,
      },
      include: {
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    const existingRecords = await prisma.immunizationRecord.findMany({
      where: {
        childId: Number(childId),
        vaccineId: { in: vaccineIds.map(Number) },
        isDeleted: false,
      },
      select: {
        vaccineId: true,
        doseNumber: true,
      },
    });

    const existingKeys = new Set(
      existingRecords.map(record => `${record.vaccineId}:${record.doseNumber}`)
    );

    const recordsToCreate = buildRecordDrafts({
      childId,
      childBirthDate: child.birthDate,
      vaccines,
      createdByUserId,
      existingKeys,
    });

    if (recordsToCreate.length > 0) {
      await prisma.immunizationRecord.createMany({
        data: recordsToCreate,
      });
    }

    await this.updateSummary(childId);
  },

  async updateRecordStatus(recordId, payload, updatedByUserId) {
    if (!recordId) throw new Error('Record ID is required');
    if (!updatedByUserId) throw new Error('updatedByUserId is required');

    return applyRecordStatus(recordId, payload, updatedByUserId);
  },

  async getAllRecords({
    page = 1,
    limit = 10,
    search,
    status,
    childId,
    vaccineId,
    overdue,
    missed,
    sortBy = SORT_FIELDS.NEXT_DUE_DATE,
    sortOrder = 'asc',
  }) {
    const safeSortBy = allowedSortFields.has(sortBy)
      ? sortBy
      : SORT_FIELDS.NEXT_DUE_DATE;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { isDeleted: false };

    if (childId) where.childId = Number(childId);
    if (vaccineId) where.vaccineId = Number(vaccineId);
    if (status) where.status = status;
    if (missed === 'true') where.isMissed = true;

    if (overdue === 'true') {
      where.nextDueDate = { lt: new Date() };
      where.status = IMMUNIZATION_STATUS.PENDING;
    }

    if (search) {
      where.OR = [
        { dose: { contains: search, mode: 'insensitive' } },
        { scheduleLabel: { contains: search, mode: 'insensitive' } },
        { child: { firstName: { contains: search, mode: 'insensitive' } } },
        { child: { lastName: { contains: search, mode: 'insensitive' } } },
        { vaccine: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.immunizationRecord.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [safeSortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vaccine: {
            select: {
              id: true,
              code: true,
              name: true,
              displayOrder: true,
            },
          },
        },
      }),
      prisma.immunizationRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateSummary(childId, tx = prisma) {
    const records = await tx.immunizationRecord.findMany({
      where: { childId: Number(childId), isDeleted: false },
    });

    const totalRequired = records.length;
    const totalCompleted = records.filter(
      record => record.status === IMMUNIZATION_STATUS.COMPLETED
    ).length;
    const totalMissed = records.filter(record => record.isMissed).length;

    const completionRate =
      totalRequired === 0
        ? 0
        : Number(((totalCompleted / totalRequired) * 100).toFixed(2));

    await tx.immunizationSummary.upsert({
      where: { childId: Number(childId) },
      create: {
        childId: Number(childId),
        totalRequired,
        totalCompleted,
        totalMissed,
        completionRate,
      },
      update: {
        totalRequired,
        totalCompleted,
        totalMissed,
        completionRate,
      },
    });
  },

  async getRecordsByChildId({ childId, status }) {
    if (!childId || Number.isNaN(Number(childId))) {
      return { data: [], summary: null, child: null, cardRows: [] };
    }

    const child = await prisma.child.findFirst({
      where: {
        id: Number(childId),
        isDeleted: false,
      },
      select: {
        id: true,
        parentId: true,
        ranking: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        address: true,
        motherName: true,
        fatherName: true,
        birthHeightCm: true,
        birthWeightKg: true,
        healthCenter: true,
        barangay: true,
        familyNumber: true,
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            address: true,
          },
        },
      },
    });

    if (!child) {
      return { data: [], summary: null, child: null, cardRows: [] };
    }

    const records = await prisma.immunizationRecord.findMany({
      where: {
        childId: Number(childId),
        isDeleted: false,
        ...(status ? { status } : {}),
      },
      include: {
        vaccine: {
          select: {
            id: true,
            code: true,
            name: true,
            recommendedAge: true,
            totalDoses: true,
            displayOrder: true,
            stockQuantity: true,
            unit: true,
            reorderLevel: true,
          },
        },
      },
      orderBy: [{ vaccine: { displayOrder: 'asc' } }, { doseNumber: 'asc' }],
    });

    const summary = await prisma.immunizationSummary.findUnique({
      where: { childId: Number(childId) },
    });

    return {
      child,
      data: records,
      summary,
      cardRows: buildCardRows(records),
    };
  },

  async getVaccinationReport({ search } = {}) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const query = String(search || '').trim().toLowerCase();

    const children = await prisma.child.findMany({
      where: { isDeleted: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        ranking: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        barangay: true,
        healthCenter: true,
        parent: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        summary: {
          select: {
            totalCompleted: true,
            totalRequired: true,
            completionRate: true,
          },
        },
        immunizations: {
          where: { isDeleted: false },
          select: {
            id: true,
            dose: true,
            scheduleLabel: true,
            status: true,
            dateGiven: true,
            nextDueDate: true,
            vaccine: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: [{ nextDueDate: 'asc' }, { doseNumber: 'asc' }],
        },
      },
    });

    const filteredChildren = query
      ? children.filter(child => buildChildSearchText(child).includes(query))
      : children;

    const vaccinatedChildren = [];
    const futureVaccinationChildren = [];
    const notVaccinatedChildren = [];

    for (const child of filteredChildren) {
      const completedRecords = child.immunizations.filter(
        record => record.status === IMMUNIZATION_STATUS.COMPLETED && record.dateGiven
      );
      const pendingFutureRecords = child.immunizations
        .filter(
          record =>
            record.status === IMMUNIZATION_STATUS.PENDING &&
            record.nextDueDate &&
            new Date(record.nextDueDate) >= todayStart
        )
        .sort((left, right) => new Date(left.nextDueDate).getTime() - new Date(right.nextDueDate).getTime());

      if (completedRecords.length > 0) {
        vaccinatedChildren.push(buildChildReportRow(child, completedRecords));
      }

      if (pendingFutureRecords.length > 0) {
        const nextRecord = pendingFutureRecords[0];

        futureVaccinationChildren.push({
          ...buildChildReportRow(child, completedRecords),
          pendingCount: pendingFutureRecords.length,
          nextDueDate: nextRecord.nextDueDate,
          nextVaccineName: nextRecord.vaccine.name,
          nextDose: nextRecord.dose,
          nextScheduleLabel: nextRecord.scheduleLabel,
        });
      }

      if (completedRecords.length === 0) {
        notVaccinatedChildren.push({
          ...buildChildReportRow(child, completedRecords),
          pendingCount: child.immunizations.filter(
            record => record.status === IMMUNIZATION_STATUS.PENDING
          ).length,
        });
      }
    }

    const completedVaccinations = await prisma.immunizationRecord.findMany({
      where: {
        isDeleted: false,
        status: IMMUNIZATION_STATUS.COMPLETED,
        dateGiven: {
          gte: startOfYear(now),
          lte: endOfDay(now),
        },
        child: {
          isDeleted: false,
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query, mode: 'insensitive' } },
                  { middleName: { contains: query, mode: 'insensitive' } },
                  { lastName: { contains: query, mode: 'insensitive' } },
                  {
                    parent: {
                      OR: [
                        { firstName: { contains: query, mode: 'insensitive' } },
                        { middleName: { contains: query, mode: 'insensitive' } },
                        { lastName: { contains: query, mode: 'insensitive' } },
                      ],
                    },
                  },
                  { barangay: { contains: query, mode: 'insensitive' } },
                  { healthCenter: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      orderBy: [{ dateGiven: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        dose: true,
        scheduleLabel: true,
        dateGiven: true,
        child: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            parent: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          },
        },
        vaccine: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const weekVaccinations = [];
    const monthVaccinations = [];
    const yearVaccinations = [];

    for (const record of completedVaccinations) {
      const event = buildVaccinationEvent(record);
      const givenDate = new Date(record.dateGiven);

      if (givenDate >= yearStart) {
        yearVaccinations.push(event);
      }

      if (givenDate >= monthStart) {
        monthVaccinations.push(event);
      }

      if (givenDate >= weekStart && givenDate <= endOfWeek(now)) {
        weekVaccinations.push(event);
      }
    }

    const sortByName = (left, right) => left.childName.localeCompare(right.childName);

    vaccinatedChildren.sort(sortByName);
    futureVaccinationChildren.sort((left, right) => {
      const dateDiff = new Date(left.nextDueDate).getTime() - new Date(right.nextDueDate).getTime();
      return dateDiff !== 0 ? dateDiff : left.childName.localeCompare(right.childName);
    });
    notVaccinatedChildren.sort(sortByName);

    return {
      generatedAt: now,
      summary: {
        vaccinatedChildren: vaccinatedChildren.length,
        futureVaccinationChildren: futureVaccinationChildren.length,
        notVaccinatedChildren: notVaccinatedChildren.length,
        fullyVaccinatedChildren: vaccinatedChildren.filter(
          child => child.totalRequired > 0 && child.totalCompleted === child.totalRequired
        ).length,
        vaccinationsThisWeek: weekVaccinations.length,
        vaccinationsThisMonth: monthVaccinations.length,
        vaccinationsThisYear: yearVaccinations.length,
      },
      children: {
        vaccinated: vaccinatedChildren,
        futureVaccination: futureVaccinationChildren,
        notVaccinated: notVaccinatedChildren,
      },
      vaccinations: {
        week: weekVaccinations,
        month: monthVaccinations,
        year: yearVaccinations,
      },
    };
  },
};
