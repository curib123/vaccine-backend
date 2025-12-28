import express from 'express';

import {
  loginUser,
  registerUser,
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/registerUser', registerUser);        // Register user
router.post('/loginUser', loginUser);             // Login user

export default router;