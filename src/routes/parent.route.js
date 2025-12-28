import express from 'express';

import { getAllParents } from '../controllers/parent.controller.js';

const router = express.Router();

router.get('/getAllParents',getAllParents);


export default router;