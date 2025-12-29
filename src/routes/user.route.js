import express from 'express';

import {
  getAllUsers,
  getUserById,
  toggleIsActive,
  toggleIsDeleted,
  updateUserById,
} from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/getAllUsers',verifyToken, getAllUsers); // Get all users
router.get('/getUserById/:id',verifyToken, getUserById); // Get user by ID
router.put('/updateUserById/:id',verifyToken,updateUserById); // Update user by ID
router.patch('/toggleIsActive/:id/toogle-status',verifyToken,toggleIsActive); // Toogle Status
router.patch('/toggleIsDeleted/:id/removing',verifyToken,toggleIsDeleted); // removing user

export default router;