import { prisma } from '../config/db.js';
import {
  IMMUNIZATION_STATUS,
  SORT_FIELDS,
} from '../constants/immunization.constants.js';

/* =====================================================
   DATE HELPERS
===================================================== */
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/* =====================================================
   IMMUNIZATION RECORDS SERVICE
===================================================== */
export const RecordsService = {

  /* =====================================================
     IMMUNIZATION STATUSES
  ===================================================== */
  async getAllStatus() {
    return Object.values(IMMUNIZATION_STATUS).map(value => ({
      value,
      label: value.charAt(0) + value.slice(1).toLowerCase(),
    }));
  },


async generateForChildByVaccines(
  childId,
  vaccineIds,
  createdByUserId
) {
  const child = await prisma.child.findUnique({
    where: { id: childId },
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
  });

  for (const vaccine of vaccines) {
    let previousDueDate = null;

    for (const schedule of vaccine.schedules) {
      const exists = await prisma.immunizationRecord.findFirst({
        where: {
          childId,
          vaccineId: vaccine.id,
          doseNumber: schedule.doseNumber,
          isDeleted: false,
        },
      });

      if (exists) {
        previousDueDate = exists.nextDueDate;
        continue;
      }

      let nextDueDate = null;

      if (schedule.doseNumber === 1) {
        nextDueDate = addMonths(
          child.birthDate,
          schedule.recommendedAgeInMonths
        );
      } else if (schedule.intervalDays && previousDueDate) {
        nextDueDate = addDays(
          previousDueDate,
          schedule.intervalDays
        );
      }

      await prisma.immunizationRecord.create({
        data: {
          dose: schedule.doseLabel,
          doseNumber: schedule.doseNumber,
          nextDueDate,
          status: IMMUNIZATION_STATUS.PENDING,

          /* ✅ REQUIRED RELATIONS */
          child: { connect: { id: childId } },
          vaccine: { connect: { id: vaccine.id } },
          createdBy: { connect: { id: createdByUserId } },
        },
      });

      previousDueDate = nextDueDate;
    }
  }

  await this.updateSummary(childId);
}
,
  /* =====================================================
     UPDATE RECORD STATUS
  ===================================================== */
  async updateRecordStatus(recordId, payload, updatedByUserId) {
    const { status, dateGiven, remarks } = payload;

    if (!recordId) throw new Error('Record ID is required');
    if (!Object.values(IMMUNIZATION_STATUS).includes(status)) {
      throw new Error('Invalid immunization status');
    }
    if (!updatedByUserId) throw new Error('updatedByUserId is required');

    const record = await prisma.immunizationRecord.findFirst({
      where: { id: Number(recordId), isDeleted: false },
    });
    if (!record) throw new Error('Record not found');

    const data = {
      status,
      remarks: remarks ?? null,
      updatedBy: {
        connect: { id: updatedByUserId },
      },
    };

    if (status === IMMUNIZATION_STATUS.COMPLETED) {
      const given = dateGiven ? new Date(dateGiven) : new Date();
      data.dateGiven = given;
      data.isMissed = false;
      data.isLate =
        record.nextDueDate ? given > record.nextDueDate : false;
    }

    if (
      status === IMMUNIZATION_STATUS.SKIPPED ||
      status === IMMUNIZATION_STATUS.CANCELLED
    ) {
      data.isMissed = true;
      data.isLate = false;
    }

    const updated = await prisma.immunizationRecord.update({
      where: { id: record.id },
      data,
    });

    await this.updateSummary(record.childId);
    return updated;
  },

  /* =====================================================
     LIST RECORDS
  ===================================================== */
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
        { dose: { contains: search } },
        { child: { firstName: { contains: search } } },
        { child: { lastName: { contains: search } } },
        { vaccine: { name: { contains: search } } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.immunizationRecord.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          child: { select: { id: true, firstName: true, lastName: true } },
          vaccine: { select: { id: true, name: true } },
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

  /* =====================================================
     UPDATE SUMMARY
  ===================================================== */
  async updateSummary(childId) {
    const records = await prisma.immunizationRecord.findMany({
      where: { childId: Number(childId), isDeleted: false },
    });

    const totalRequired = records.length;
    const totalCompleted = records.filter(
      r => r.status === IMMUNIZATION_STATUS.COMPLETED
    ).length;
    const totalMissed = records.filter(r => r.isMissed).length;

    const completionRate =
      totalRequired === 0
        ? 0
        : Number(((totalCompleted / totalRequired) * 100).toFixed(2));

    await prisma.immunizationSummary.upsert({
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

  /* =====================================================
     GET RECORDS BY CHILD ID
  ===================================================== */
  async getRecordsByChildId({ childId }) {
    if (!childId || Number.isNaN(Number(childId))) {
      return { data: [], summary: null };
    }

    const records = await prisma.immunizationRecord.findMany({
      where: { childId: Number(childId), isDeleted: false },
      include: { vaccine: true },
      orderBy: { nextDueDate: 'asc' },
    });

    if (!records.length) {
      return { data: [], summary: null };
    }

    const summary = await prisma.immunizationSummary.findUnique({
      where: { childId: Number(childId) },
    });

    return { data: records, summary };
  },
};


