import { prisma } from '../config/db.js';
import { IMMUNIZATION_STATUS } from '../constants/immunization.constants.js';

export const VisitService = {
/* =========================
   CREATE VISITS (1 OR MANY CHILDREN)
   (Does NOT change records)
========================= */
async createVisits(payload, user) {
  const {
    childIds,
    visitDate,
    location,
    nurseName,
  } = payload;

  // Normalize: allow single ID or array
  const ids = Array.isArray(childIds)
    ? childIds.map(Number)
    : [Number(childIds)];

  if (!ids.length) {
    throw new Error('Child IDs are required');
  }

  // Validate children
  const children = await prisma.child.findMany({
    where: {
      id: { in: ids },
      isDeleted: false,
    },
    select: { id: true },
  });

  if (children.length !== ids.length) {
    throw new Error('One or more children not found');
  }

  const visitDateValue = visitDate
    ? new Date(visitDate)
    : new Date();

  // Create one visit PER child (single transaction)
  const visits = await prisma.$transaction(
    children.map(child =>
      prisma.immunizationVisit.create({
        data: {
          childId: child.id,
          visitDate: visitDateValue,
          location: location || null,
          nurseName: nurseName || user.fullName || null,
        },
      })
    )
  );

  return {
    createdCount: visits.length,
    visits,
  };
},

/* =========================
   ATTACH RECORDS TO VISIT
   ✅ childId REQUIRED
   ✅ STATUS COMES FROM CONSTANT
========================= */
async attachRecordsToVisit(
  visitId,
  childId,
  recordIds,
  status,
  user
) {
  if (!visitId) {
    throw new Error('Visit ID is required');
  }

  if (!childId) {
    throw new Error('Child ID is required');
  }

  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    throw new Error('Record IDs are required');
  }

  if (!status) {
    throw new Error('Status is required');
  }

  const ALLOWED_STATUSES = [
    IMMUNIZATION_STATUS.COMPLETED,
    IMMUNIZATION_STATUS.SKIPPED,
    IMMUNIZATION_STATUS.CANCELLED,
  ];

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error('Invalid immunization status');
  }

  // 🔐 Validate visit belongs to child
  const visit = await prisma.immunizationVisit.findFirst({
    where: {
      id: Number(visitId),
      childId: Number(childId),
    },
  });

  if (!visit) {
    throw new Error(
      'Visit not found or does not belong to this child'
    );
  }

  // ✅ Attach ONLY this child's records
  const result = await prisma.immunizationRecord.updateMany({
    where: {
      id: { in: recordIds.map(Number) },
      childId: Number(childId),
      visitId: null,
      status: IMMUNIZATION_STATUS.PENDING,
      isDeleted: false,
    },
    data: {
      visitId: visit.id,
      status,
      dateGiven:
        status === IMMUNIZATION_STATUS.COMPLETED
          ? new Date()
          : null,
      updatedById: user.id,
    },
  });

  if (result.count === 0) {
    throw new Error(
      'No matching records were attached for this child'
    );
  }

  return {
    visitId: visit.id,
    childId: Number(childId),
    attachedCount: result.count,
    statusApplied: status,
  };
},


  /* =========================
     DETACH RECORD FROM VISIT
     (Undo / correction)
  ========================= */
  async detachRecordFromVisit(recordId, user) {
    if (!recordId) throw new Error('Record ID is required');

    const record = await prisma.immunizationRecord.findUnique({
      where: { id: Number(recordId) },
    });

    if (!record) throw new Error('Record not found');

    if (!record.visitId) {
      throw new Error('Record is not attached to any visit');
    }

    return prisma.immunizationRecord.update({
      where: { id: record.id },
      data: {
        visitId: null,
        status: 'PENDING',
        dateGiven: null,
        updatedById: user.id,
      },
    });
  },

  /* =========================
     GET VISIT BY ID
  ========================= */
  async getVisitById(id) {
    if (!id) throw new Error('Visit ID is required');

    return prisma.immunizationVisit.findUnique({
      where: { id: Number(id) },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        records: {
          where: { isDeleted: false },
          include: {
            vaccine: true,
          },
        },
      },
    });
  },

  /* =========================
     GET VISITS BY CHILD ID
  ========================= */
  async getVisitsByChildId(childId) {
    if (!childId) throw new Error('Child ID is required');

    return prisma.immunizationVisit.findMany({
      where: { childId: Number(childId) },
      orderBy: { visitDate: 'desc' },
      include: {
        records: {
          where: { isDeleted: false },
          include: { vaccine: true },
        },
      },
    });
  },

  /* =========================
     GET ALL VISITS (PAGINATED)
  ========================= */
  async getAllVisits({
    page = 1,
    limit = 10,
    search = '',
    childId,
    sortBy = 'visitDate',
    sortOrder = 'desc',
  } = {}) {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = {
      ...(childId && { childId: Number(childId) }),
      ...(search && {
        OR: [
          { location: { contains: search } },
          { nurseName: { contains: search } },
          {
            child: {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
              ],
            },
          },
        ],
      }),
    };

    const orderBy = {
      [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [data, total] = await Promise.all([
      prisma.immunizationVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          records: {
            where: { isDeleted: false },
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.immunizationVisit.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* =========================
     UPDATE VISIT
  ========================= */
  async updateVisit(id, payload) {
    if (!id) throw new Error('Visit ID is required');

    const visit = await prisma.immunizationVisit.findUnique({
      where: { id: Number(id) },
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    return prisma.immunizationVisit.update({
      where: { id: Number(id) },
      data: {
        visitDate: payload.visitDate
          ? new Date(payload.visitDate)
          : undefined,
        location: payload.location,
        nurseName: payload.nurseName,
      },
    });
  },

  /* =========================
     DELETE VISIT
     ⚠️ BLOCK IF RECORDS EXIST
  ========================= */
  async deleteVisit(id) {
    if (!id) throw new Error('Visit ID is required');

    const visit = await prisma.immunizationVisit.findUnique({
      where: { id: Number(id) },
    });

    if (!visit) throw new Error('Visit not found');

    const recordCount = await prisma.immunizationRecord.count({
      where: { visitId: visit.id },
    });

    if (recordCount > 0) {
      throw new Error(
        'Cannot delete visit with immunization records'
      );
    }

    return prisma.immunizationVisit.delete({
      where: { id: Number(id) },
    });
  },
};
