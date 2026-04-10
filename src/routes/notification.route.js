import express from 'express';

import {
  getAuditLogs,
  getMyNotifications,
  markNotificationAsRead,
  syncUpcomingReminders,
} from '../controllers/notification.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/me', verifyToken, getMyNotifications);
router.patch('/:id/read', verifyToken, markNotificationAsRead);
router.post('/sync-upcoming', verifyToken, syncUpcomingReminders);
router.get('/audit-logs', verifyToken, getAuditLogs);

export default router;
