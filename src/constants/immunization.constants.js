/* =====================================================
   IMMUNIZATION CONSTANTS
===================================================== */

export const IMMUNIZATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED',
});

export const SORT_FIELDS = Object.freeze({
  NEXT_DUE_DATE: 'nextDueDate',
  CREATED_AT: 'createdAt',
  STATUS: 'status',
});
