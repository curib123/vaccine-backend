import express from 'express';

import {
  createRole,
  deleteRole,
  getPermissions,
  getRoleById,
  getRoles,
  restoreRole,
  updateRole,
  updateRolePermissions,
} from '../controllers/role.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/* =========================
   ROLE ROUTES
========================= */ 

router.post('/create', verifyToken,createRole);                     // Create role
router.get('/getAllRoles',verifyToken, getRoles);                        // Get all roles
router.get('/getRole/:id',verifyToken, getRoleById);                  // Get role by ID
router.put('/updateRole/:id',verifyToken, updateRole);                   // Update role info
router.put('/updatePermission/:id/permissions',verifyToken, updateRolePermissions); // Update permissions
router.delete('/removeRole/:id',verifyToken, deleteRole);                // Soft delete role
router.patch('/restoreRole/:id/restore',verifyToken, restoreRole);        // Restore role
router.get('/getPermissions', verifyToken,getPermissions);  // get permissions

export default router;
