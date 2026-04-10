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
    const monthStart = startOfMonth();

    const [
      totalChildren,
      newChildrenThisMonth,
      genderStats,

      totalUsers,
      activeUsers,
      parentUsers,
      staffUsers,

      totalVaccines,
      vaccineInventory,
      totalStockAggregate,

      recordCounts,
      overdueCount,
      dueToday,
      dueThisWeek,
      dueThisMonth,

      completionSummary,
      topPendingVaccines,
      topCompletedVaccines,
      recentChildren,
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

      /* ---------- USERS ---------- */
      prisma.user.count({
        where: { isDeleted: false },
      }),

      prisma.user.count({
        where: {
          isDeleted: false,
          isActive: true,
        },
      }),

      prisma.user.count({
        where: {
          isDeleted: false,
          role: {
            name: {
              contains: 'PARENT',
              mode: 'insensitive',
            },
          },
        },
      }),

      prisma.user.count({
        where: {
          isDeleted: false,
          role: {
            name: {
              in: ['ADMIN', 'NURSE'],
            },
          },
        },
      }),

      /* ---------- VACCINES ---------- */
      prisma.vaccine.count({
        where: { isDeleted: false },
      }),

      prisma.vaccine.findMany({
        where: {
          isDeleted: false,
        },
        orderBy: [{ stockQuantity: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          reorderLevel: true,
          unit: true,
        },
      }),

      prisma.vaccine.aggregate({
        _sum: {
          stockQuantity: true,
        },
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

      prisma.immunizationRecord.groupBy({
        by: ['vaccineId'],
        where: {
          isDeleted: false,
          status: 'COMPLETED',
        },
        _count: true,
        orderBy: {
          _count: {
            vaccineId: 'desc',
          },
        },
        take: 5,
      }),

      prisma.child.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          ranking: true,
          createdAt: true,
          parent: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
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

    const pendingIds = topPendingVaccines.map(item => item.vaccineId);
    const completedIds = topCompletedVaccines.map(item => item.vaccineId);
    const lowStockVaccines = vaccineInventory
      .filter(vaccine => vaccine.stockQuantity <= vaccine.reorderLevel)
      .slice(0, 5);
    const vaccineNames = await prisma.vaccine.findMany({
      where: {
        id: {
          in: [...new Set([...pendingIds, ...completedIds])],
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const vaccineNameMap = Object.fromEntries(
      vaccineNames.map(vaccine => [vaccine.id, vaccine.name])
    );

    return {
      children: {
        total: totalChildren,
        newThisMonth: newChildrenThisMonth,
        gender: {
          male: genderMap.MALE || 0,
          female: genderMap.FEMALE || 0,
        },
      },

      users: {
        total: totalUsers,
        active: activeUsers,
        parents: parentUsers,
        staff: staffUsers,
      },

      vaccines: {
        total: totalVaccines,
        lowStockCount: lowStockVaccines.length,
        totalStock: totalStockAggregate._sum.stockQuantity || 0,
        lowStockItems: lowStockVaccines,
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

      topPendingVaccines: topPendingVaccines.map(item => ({
        vaccineId: item.vaccineId,
        name: vaccineNameMap[item.vaccineId] || 'Unknown vaccine',
        pendingCount: item._count.vaccineId,
      })),

      topCompletedVaccines: topCompletedVaccines.map(item => ({
        vaccineId: item.vaccineId,
        name: vaccineNameMap[item.vaccineId] || 'Unknown vaccine',
        completedCount: item._count.vaccineId,
      })),

      recentChildren: recentChildren.map(child => ({
        id: child.id,
        fullName: `${child.firstName} ${child.lastName}`,
        gender: child.gender,
        ranking: child.ranking,
        createdAt: child.createdAt,
        parentName: `${child.parent.firstName} ${child.parent.lastName}`,
      })),
    };
  },

  /* =====================================================
     MONTHLY TREND (FOR CHARTS)
  ===================================================== */
  async getMonthlyTrend(year = new Date().getFullYear()) {
    const records = await prisma.$queryRaw`
      SELECT 
        DATE_PART('month', "createdAt") as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
      FROM "ImmunizationRecord"
      WHERE DATE_PART('year', "createdAt") = ${year}
      GROUP BY DATE_PART('month', "createdAt")
      ORDER BY DATE_PART('month', "createdAt")
    `;

    return records.map(record => ({
      month: Number(record.month),
      total: Number(record.total),
      completed: Number(record.completed),
    }));
  },
};
