import express from 'express';

import {
  getAllUsers,
  getUserById,
} from '../controllers/user.controller.js';

const router = express.Router();

router.get('/getAllUsers', getAllUsers); // Get all users
router.get('/getUserById/:id', getUserById); // Get user by ID
export default router;