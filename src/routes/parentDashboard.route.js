import express from 'express';

import {
  ParentDashboardController,
} from '../controllers/parentDashboard.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get(
  '/',
    verifyToken,
  ParentDashboardController.getDashboard
);

export default router;
