import express from 'express';

import {
  getAllParents,
  getChildrenByParentId,
} from '../controllers/parent.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/getAllParents',verifyToken,getAllParents);
router.get('/getChildrenByParentId/:parentId',verifyToken,getChildrenByParentId);

export default router;