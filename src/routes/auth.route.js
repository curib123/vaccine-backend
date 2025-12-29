import express from 'express';

import {
  loginUser,
  logoutUser,
  registerUser,
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/registerUser', verifyToken, registerUser);        // Register user
router.post('/loginUser', loginUser);             // Login user
router.post('/logoutUser',verifyToken,logoutUser);

export default router;