import express from 'express';

import {
  generateRecordsByVaccines,
  getAllRecords,
  getAllStatus,
  getRecordsByChildId,
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
 */
router.get(
  '/',
  verifyToken,
  getAllRecords
);

/**
 * GET /api/records/child/:childId
 * - Get immunization records for a specific child
 * - Includes summary
 */
router.get(
  '/child/:childId',
  verifyToken,
  getRecordsByChildId
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
 * 🆕 POST /api/records/generate/by-vaccines
 * - Manually generate records for a child by selected vaccines
 * Body:
 *  - childId
 *  - vaccineIds[]
 */
router.post(
  '/generate/by-vaccines',
  verifyToken,
  generateRecordsByVaccines
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
