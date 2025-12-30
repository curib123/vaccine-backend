import express from 'express';

import {
  getAllUsers,
  getUserById,
  getUserPermissions,
  toggleIsActive,
  toggleIsDeleted,
  updateUserById,
  updateUserPermissions,
} from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =========================
   USERS
========================= */
router.get('/getAllUsers', verifyToken, getAllUsers);              // Get all users
router.get('/getUserById/:id', verifyToken, getUserById);          // Get user by ID
router.put('/updateUserById/:id', verifyToken, updateUserById);    // Update user
router.patch('/toggleIsActive/:id/toggle-status', verifyToken, toggleIsActive); // Toggle active
router.patch('/toggleIsDeleted/:id/removing', verifyToken, toggleIsDeleted);     // Soft delete / restore

/* =========================
   USER PERMISSIONS (RBAC)
========================= */
router.get(
  '/userPermission/:id/permissions',
  verifyToken,
  getUserPermissions
); // Get permissions by user ID

router.put(
  '/userPermission/:id/permissions',
  verifyToken,
  updateUserPermissions
); // Update permissions (via role)

export default router;
