import { prisma } from '../config/db.js';

/* =====================================================
   DATE HELPERS
===================================================== */
const startOfDay = date =>
  new Date(date.setHours(0, 0, 0, 0));

const endOfDay = date =>
  new Date(date.setHours(23, 59, 59, 999));

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* =====================================================
   DASHBOARD SERVICE
===================================================== */
export const DashboardService = {

  /* =====================================================
     MAIN DASHBOARD OVERVIEW
  ===================================================== */
  async getOverview() {
    const today = new Date();
    const weekAhead = addDays(today, 7);

    const [
      totalChildren,
      newChildrenThisMonth,
      genderStats,

      totalVaccines,

      recordCounts,
      overdueCount,
      dueToday,
      dueThisWeek,
      dueThisMonth,

      completionSummary,
      topPendingVaccines,
    ] = await Promise.all([

      /* ---------- CHILDREN ---------- */
      prisma.child.count({
        where: { isDeleted: false },
      }),

      prisma.child.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfMonth() },
        },
      }),

      prisma.child.groupBy({
        by: ['gender'],
        where: { isDeleted: false },
        _count: true,
      }),

      /* ---------- VACCINES ---------- */
      prisma.vaccine.count({
        where: { isDeleted: false },
      }),

      /* ---------- RECORD COUNTS ---------- */
      prisma.immunizationRecord.groupBy({
        by: ['status'],
        where: { isDeleted: false },
        _count: true,
      }),

      prisma.immunizationRecord.count({
        where: {
          isDeleted: false,
          status: 'PENDING',
          nextDueDate: { lt: today },
        },
      }),

      prisma.immunizationRecord.count({
        where: {
          isDeleted: false,
          status: 'PENDING',
          nextDueDate: {
            gte: startOfDay(new Date()),
            lte: endOfDay(new Date()),
          },
        },
      }),

      prisma.immunizationRecord.count({
        where: {
          isDeleted: false,
          status: 'PENDING',
          nextDueDate: {
            gte: today,
            lte: weekAhead,
          },
        },
      }),

      prisma.immunizationRecord.count({
        where: {
          isDeleted: false,
          status: 'PENDING',
          nextDueDate: {
            gte: startOfMonth(),
          },
        },
      }),

      /* ---------- COMPLETION RATE ---------- */
      prisma.immunizationSummary.aggregate({
        _avg: {
          completionRate: true,
        },
      }),

      /* ---------- TOP PENDING VACCINES ---------- */
      prisma.immunizationRecord.groupBy({
        by: ['vaccineId'],
        where: {
          isDeleted: false,
          status: 'PENDING',
        },
        _count: true,
        orderBy: {
          _count: {
            vaccineId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    /* ---------- MAP DATA ---------- */
    const statusMap = recordCounts.reduce((acc, r) => {
      acc[r.status] = r._count;
      return acc;
    }, {});

    const genderMap = genderStats.reduce((acc, g) => {
      acc[g.gender] = g._count;
      return acc;
    }, {});

    return {
      children: {
        total: totalChildren,
        newThisMonth: newChildrenThisMonth,
        gender: {
          male: genderMap.MALE || 0,
          female: genderMap.FEMALE || 0,
        },
      },

      vaccines: {
        total: totalVaccines,
      },

      immunization: {
        totalRecords:
          Object.values(statusMap).reduce((a, b) => a + b, 0),
        completed: statusMap.COMPLETED || 0,
        pending: statusMap.PENDING || 0,
        skipped: statusMap.SKIPPED || 0,
        cancelled: statusMap.CANCELLED || 0,
        overdue: overdueCount,
        completionRate:
          Number(
            completionSummary._avg.completionRate?.toFixed(2)
          ) || 0,
      },

      due: {
        today: dueToday,
        thisWeek: dueThisWeek,
        thisMonth: dueThisMonth,
      },

      topPendingVaccines,
    };
  },

  /* =====================================================
     MONTHLY TREND (FOR CHARTS)
  ===================================================== */
  async getMonthlyTrend(year = new Date().getFullYear()) {
    const records = await prisma.$queryRaw`
      SELECT 
        MONTH(createdAt) as month,
        COUNT(*) as total,
        SUM(status = 'COMPLETED') as completed
      FROM immunizationrecord
      WHERE YEAR(createdAt) = ${year}
      GROUP BY MONTH(createdAt)
      ORDER BY MONTH(createdAt)
    `;

    return records;
  },
};
