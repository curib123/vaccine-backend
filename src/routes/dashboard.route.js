import express from 'express';

import {
  getDashboardOverview,
  getMonthlyTrend,
} from '../controllers/dashboard.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =====================================================
   DASHBOARD ROUTES
===================================================== */

/**
 * GET /api/dashboard
 * - Main dashboard analytics
 * - Counts, overdue, completion rate, workload
 */
router.get(
  '/',
  verifyToken,
  getDashboardOverview
);

/**
 * GET /api/dashboard/trend
 * - Monthly immunization trend
 * - Query: ?year=2025 (optional)
 */
router.get(
  '/trend',
  verifyToken,
  getMonthlyTrend
);

export default router;
