import express from 'express';

import {
  getAllParents,
  getChildrenByParentId,
} from '../controllers/parent.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =========================
   PARENTS
========================= */
router.get(
  '/getAllParents',
  verifyToken,
  getAllParents
);

/* =========================
   CHILDREN
========================= */
router.get(
  '/:parentId/children',
  verifyToken,
  getChildrenByParentId
);

export default router;
