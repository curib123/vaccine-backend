import { prisma } from '../config/db.js';
import {
  IMMUNIZATION_STATUS,
  SORT_FIELDS,
} from '../constants/immunization.constants.js';

export const ParentDashboardService = {
  async getDashboard(parentId) {
    const children = await prisma.child.findMany({
      where: {
        parentId,
        isDeleted: false,
      },
      include: {
        immunizations: {
          where: { isDeleted: false },
          orderBy: {
            [SORT_FIELDS.NEXT_DUE_DATE]: 'asc',
          },
          include: {
            vaccine: true,
          },
        },
      },
    });

    const now = new Date();

    let completed = 0;
    let pending = 0;
    let missed = 0;
    let overdue = 0;
    let late = 0;

    let dueThisWeek = 0;
    let dueThisMonth = 0;

    const upcoming = [];
    const perChildSummary = [];

    const pendingVaccineMap = {};
    const missedVaccineMap = {};

    let nextDueOverall = null;

    /* =========================
       LOOP CHILDREN
    ========================= */
    for (const child of children) {
      let childCompleted = 0;
      let childPending = 0;
      let childMissed = 0;
      let childNextDue = null;

      for (const record of child.immunizations) {
        const dueDate = record.nextDueDate
          ? new Date(record.nextDueDate)
          : null;

        /* ---------- STATUS COUNTS ---------- */
        if (record.status === IMMUNIZATION_STATUS.COMPLETED) {
          completed++;
          childCompleted++;
        }

        if (record.status === IMMUNIZATION_STATUS.PENDING) {
          pending++;
          childPending++;

          pendingVaccineMap[record.vaccine.name] =
            (pendingVaccineMap[record.vaccine.name] || 0) + 1;
        }

        if (record.isMissed) {
          missed++;
          childMissed++;

          missedVaccineMap[record.vaccine.name] =
            (missedVaccineMap[record.vaccine.name] || 0) + 1;
        }

        if (record.isLate) late++;

        /* ---------- DATE LOGIC ---------- */
        if (
          record.status === IMMUNIZATION_STATUS.PENDING &&
          dueDate
        ) {
          const diffDays =
            (dueDate - now) / (1000 * 60 * 60 * 24);

          if (diffDays < 0) overdue++;

          if (diffDays >= 0 && diffDays <= 7) dueThisWeek++;

          if (diffDays >= 0 && diffDays <= 30) {
            dueThisMonth++;

            upcoming.push({
              childId: child.id,
              childName: `${child.firstName} ${child.lastName}`,
              vaccineName: record.vaccine.name,
              nextDueDate: record.nextDueDate,
            });
          }

          /* ---------- NEXT DUE (GLOBAL) ---------- */
          if (
            !nextDueOverall ||
            dueDate < new Date(nextDueOverall.nextDueDate)
          ) {
            nextDueOverall = {
              childId: child.id,
              childName: `${child.firstName} ${child.lastName}`,
              vaccineName: record.vaccine.name,
              nextDueDate: record.nextDueDate,
            };
          }

          /* ---------- NEXT DUE (PER CHILD) ---------- */
          if (
            !childNextDue ||
            dueDate < new Date(childNextDue)
          ) {
            childNextDue = record.nextDueDate;
          }
        }
      }

      const tracked = childCompleted + childPending;

      perChildSummary.push({
        childId: child.id,
        childName: `${child.firstName} ${child.lastName}`,
        completed: childCompleted,
        pending: childPending,
        missed: childMissed,
        completionRate:
          tracked === 0
            ? 0
            : Math.round((childCompleted / tracked) * 100),
        nextDueDate: childNextDue,
      });
    }

    /* =========================
       VACCINE INSIGHTS
    ========================= */
    const mostPendingVaccines = Object.entries(
      pendingVaccineMap
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const mostMissedVaccines = Object.entries(
      missedVaccineMap
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const totalTracked = completed + pending;
    const completionRate =
      totalTracked === 0
        ? 0
        : Math.round((completed / totalTracked) * 100);

    /* =========================
       FINAL RESPONSE
    ========================= */
    return {
      totalChildren: children.length,

      completed,
      pending,
      missed,
      overdue,
      late,

      dueThisWeek,
      dueThisMonth,

      completionRate,

      nextDueOverall,

      upcoming,

      perChildSummary,

      mostPendingVaccines,
      mostMissedVaccines,
    };
  },
};
