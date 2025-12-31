import express from 'express';

import {
  createVaccine,
  getAllVaccines,
  getVaccineById,
  toggleVaccineIsDeleted,
  updateVaccineById,
} from '../controllers/vaccine.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =========================
   VACCINES
========================= */

/**
 * GET ALL VACCINES
 * -----------------------------------
 * Query Params:
 *  - page        (number)  default: 1
 *  - limit       (number)  default: 10
 *  - search      (string)  optional (name, description, recommendedAge)
 *  - sortBy      (string)  createdAt | name | recommendedAge
 *  - sortOrder   (string)  asc | desc
 *
 * Example:
 * /vaccine/getAllVaccines?page=1&limit=10&search=bcg&sortBy=name&sortOrder=asc
 */
router.get(
  '/getAllVaccines',
  verifyToken,
  getAllVaccines
);

/**
 * GET VACCINE BY ID
 * -----------------------------------
 * Params:
 *  - id (number) Vaccine ID
 *
 * Example:
 * /vaccine/getVaccineById/3
 */
router.get(
  '/getVaccineById/:id',
  verifyToken,
  getVaccineById
);

/**
 * CREATE VACCINE
 * -----------------------------------
 * Body:
 * {
 *   name: string (required),
 *   description?: string,
 *   recommendedAge: string (required)
 * }
 *
 * Example:
 * POST /vaccine/create
 */
router.post(
  '/create',
  verifyToken,
  createVaccine
);

/**
 * UPDATE VACCINE
 * -----------------------------------
 * Params:
 *  - id (number) Vaccine ID
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string,
 *   recommendedAge?: string
 * }
 *
 * Example:
 * PUT /vaccine/update/5
 */
router.put(
  '/update/:id',
  verifyToken,
  updateVaccineById
);

/**
 * SOFT DELETE / RESTORE VACCINE
 * -----------------------------------
 * Params:
 *  - id (number) Vaccine ID
 *
 * Example:
 * PATCH /vaccine/toggleIsDeleted/5
 */
router.patch(
  '/toggleIsDeleted/:id',
  verifyToken,
  toggleVaccineIsDeleted
);

export default router;
