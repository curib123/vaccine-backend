import express from 'express';

import {
  getAllUsers,
  getUserById,
  toggleIsActive,
  toggleIsDeleted,
  updateUserById,
} from '../controllers/user.controller.js';

const router = express.Router();

router.get('/getAllUsers', getAllUsers); // Get all users
router.get('/getUserById/:id', getUserById); // Get user by ID
router.put('/updateUserById/:id',updateUserById); // Update user by ID
router.patch('/toggleIsActive/:id/toogle-status',toggleIsActive); // Toogle Status
router.patch('/toggleIsDeleted/:id/removing',toggleIsDeleted); // removing user

export default router;