import express from 'express';

import {
  generateRecordsForChild,
  getAllRecords,
  getAllStatus,
  recomputeSummary,
  updateRecordStatus,
} from '../controllers/records.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =====================================================
   IMMUNIZATION RECORD ROUTES
===================================================== */

/**
 * GET /api/records
 * - Pagination
 * - Search
 * - Filter
 * - Sort
 * - Auto-generate records if missing
 */
router.get(
  '/',
  verifyToken,
  getAllRecords
);

/**
 * GET /api/records/statuses
 * - Get all immunization statuses (for dropdowns)
 */
router.get(
  '/statuses',
  verifyToken,
  getAllStatus
);

/**
 * PATCH /api/records/:id/status
 * - Update immunization record status
 * - COMPLETED / SKIPPED / CANCELLED
 */
router.patch(
  '/:id/status',
  verifyToken,
  updateRecordStatus
);

/**
 * POST /api/records/generate/:childId
 * - Manually generate records for a child (admin/debug)
 */
router.post(
  '/generate/:childId',
  verifyToken,
  generateRecordsForChild
);

/**
 * POST /api/records/summary/recompute/:childId
 * - Recompute immunization summary
 */
router.post(
  '/summary/recompute/:childId',
  verifyToken,
  recomputeSummary
);

export default router;
