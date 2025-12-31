import express from 'express';

import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  toggleAnnouncementStatus,
  updateAnnouncement,
} from '../controllers/announcement.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =========================
   ANNOUNCEMENT ROUTES
========================= */
router.post('/create', verifyToken, createAnnouncement);
router.get('/getAll', verifyToken, getAllAnnouncements);
router.get('/get/:id', verifyToken, getAnnouncementById);
router.put('/update/:id', verifyToken, updateAnnouncement);
router.patch(
  '/toggle-status/:id',
  verifyToken,
  toggleAnnouncementStatus
);
router.delete('/remove/:id', verifyToken, deleteAnnouncement);

export default router;
