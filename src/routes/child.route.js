import express from 'express';

import {
  createChild,
  getAllChildren,
  getChildById,
  toggleChildIsDeleted,
  updateChildById,
} from '../controllers/child.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =========================
   CHILDREN
========================= */

/**
 * GET ALL CHILDREN
 * Query:
 *  - page
 *  - limit
 *  - search
 *  - parentId
 */
router.get(
  '/getAllChildren',
  verifyToken,
  getAllChildren
);

/**
 * GET CHILD BY ID
 */
router.get(
  '/getChildById/:id',
  verifyToken,
  getChildById
);

/**
 * CREATE CHILD
 */
router.post(
  '/create',
  verifyToken,
  createChild
);

/**
 * UPDATE CHILD
 */
router.put(
  '/update/:id',
  verifyToken,
  updateChildById
);

/**
 * SOFT DELETE / RESTORE
 */
router.patch(
  '/toggleIsDeleted/:id',
  verifyToken,
  toggleChildIsDeleted
);

export default router;
