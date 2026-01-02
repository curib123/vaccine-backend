import express from 'express';

import { VisitController } from '../controllers/visit.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =========================
   IMMUNIZATION VISITS
========================= */

/**
 * CREATE VISIT
 * Clinic-side only (nurse / admin)
 */
router.post(
  '/createVisit',
  verifyToken,
  VisitController.createVisit
);

/**
 * GET VISIT BY ID
 */
router.get(
  '/getVisitById/:id',
  verifyToken,
  VisitController.getVisitById
);

/**
 * GET ALL VISITS (PAGINATED)
 * Admin / Nurse dashboard
 */
router.get(
  '/getAllVisits',
  verifyToken,
  VisitController.getAllVisits
);

/**
 * GET ALL VISITS BY CHILD ID
 */
router.get(
  '/getVisitsByChildId/:childId',
  verifyToken,
  VisitController.getVisitsByChildId
);

/**
 * ATTACH IMMUNIZATION RECORDS TO VISIT
 * ✅ Updates record status (COMPLETED / SKIPPED / CANCELLED)
 */
router.post(
  '/attachRecordsToVisit',
  verifyToken,
  VisitController.attachRecordsToVisit
);

/**
 * UPDATE VISIT
 */
router.put(
  '/updateVisitById/:id',
  verifyToken,
  VisitController.updateVisitById
);

/**
 * DELETE VISIT
 * ⚠️ Blocked if records exist
 */
router.delete(
  '/deleteVisitById/:id',
  verifyToken,
  VisitController.deleteVisitById
);

export default router;
