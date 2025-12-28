import express from 'express';

import {
  getAllParents,
  getChildrenByParentId,
} from '../controllers/parent.controller.js';

const router = express.Router();

router.get('/getAllParents',getAllParents);
router.get('/getChildrenByParentId/:parentId',getChildrenByParentId);

export default router;