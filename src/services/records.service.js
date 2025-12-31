import { prisma } from '../config/db.js';

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
     GET ALL IMMUNIZATION STATUSES
  ===================================================== */
  async getAllStatus() {
    return [
      { value: 'PENDING', label: 'Pending' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'SKIPPED', label: 'Skipped' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ];
  },

  /* =====================================================
     ENSURE RECORDS EXIST FOR CHILD
  ===================================================== */
  async ensureGeneratedForChild(childId, createdById) {
    const count = await prisma.immunizationRecord.count({
      where: { childId, isDeleted: false },
    });

    if (count === 0) {
      await this.generateForChild(childId, createdById);
    }
  },

  /* =====================================================
     GENERATE RECORDS FOR A CHILD
  ===================================================== */
  async generateForChild(childId, createdById) {
    if (!childId) throw new Error('Child ID is required');

    const child = await prisma.child.findFirst({
      where: { id: childId, isDeleted: false },
    });

    if (!child) throw new Error('Child not found');

    const vaccines = await prisma.vaccine.findMany({
      where: { isDeleted: false },
      include: {
        schedules: {
          where: { isActive: true },
          orderBy: { doseNumber: 'asc' },
        },
      },
    });

    let createdCount = 0;

    for (const vaccine of vaccines) {
      if (!vaccine.schedules.length) continue;

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
          nextDueDate = addDays(previousDueDate, schedule.intervalDays);
        }

        const record = await prisma.immunizationRecord.create({
          data: {
            childId,
            vaccineId: vaccine.id,
            dose: schedule.doseLabel,
            doseNumber: schedule.doseNumber,
            nextDueDate,
            status: 'PENDING',
            createdById,
          },
        });

        previousDueDate = record.nextDueDate;
        createdCount++;
      }
    }

    await this.updateSummary(childId);
    return { created: createdCount };
  },

  /* =====================================================
     UPDATE RECORD STATUS
  ===================================================== */
  async updateRecordStatus(recordId, payload, updatedById) {
    const { status, dateGiven, remarks } = payload;

    if (!recordId) throw new Error('Record ID is required');
    if (!status) throw new Error('Status is required');

    const record = await prisma.immunizationRecord.findFirst({
      where: { id: recordId, isDeleted: false },
    });

    if (!record) throw new Error('Record not found');

    const updateData = {
      status,
      remarks: remarks || null,
      updatedById,
    };

    if (status === 'COMPLETED') {
      const given = dateGiven ? new Date(dateGiven) : new Date();

      updateData.dateGiven = given;
      updateData.isMissed = false;
      updateData.isLate =
        record.nextDueDate && given > record.nextDueDate;
    }

    if (status === 'SKIPPED' || status === 'CANCELLED') {
      updateData.isMissed = true;
      updateData.isLate = false;
    }

    const updated = await prisma.immunizationRecord.update({
      where: { id: recordId },
      data: updateData,
    });

    await this.updateSummary(record.childId);
    return updated;
  },

  /* =====================================================
     LIST IMMUNIZATION RECORDS
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
    sortBy = 'nextDueDate',
    sortOrder = 'asc',
    systemUserId = 1,
  }) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    if (childId) {
      await this.ensureGeneratedForChild(
        Number(childId),
        systemUserId
      );
    }

    const where = { isDeleted: false };

    if (childId) where.childId = Number(childId);
    if (vaccineId) where.vaccineId = Number(vaccineId);
    if (status) where.status = status;
    if (missed === 'true') where.isMissed = true;

    if (overdue === 'true') {
      where.nextDueDate = { lt: new Date() };
      where.status = 'PENDING';
    }

    if (search) {
      where.OR = [
        { dose: { contains: search } },
        {
          child: {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
          },
        },
        { vaccine: { name: { contains: search } } },
      ];
    }

    const allowedSort = ['nextDueDate', 'createdAt', 'status'];

    const orderBy = allowedSort.includes(sortBy)
      ? { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }
      : { nextDueDate: 'asc' };

    const [records, total] = await Promise.all([
      prisma.immunizationRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
        page,
        limit,
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
      where: { childId, isDeleted: false },
    });

    const totalRequired = records.length;
    const totalCompleted = records.filter(
      r => r.status === 'COMPLETED'
    ).length;
    const totalMissed = records.filter(r => r.isMissed).length;

    const completionRate =
      totalRequired === 0
        ? 0
        : Number(((totalCompleted / totalRequired) * 100).toFixed(2));

    await prisma.immunizationSummary.upsert({
      where: { childId },
      create: {
        childId,
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
};
