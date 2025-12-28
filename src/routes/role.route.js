import express from 'express';

import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  restoreRole,
  updateRole,
  updateRolePermissions,
} from '../controllers/role.controller.js';

const router = express.Router();

/* =========================
   ROLE ROUTES
========================= */

router.post('/create', createRole);                     // Create role
router.get('/getAllRoles', getRoles);                        // Get all roles
router.get('/getRole/:id', getRoleById);                  // Get role by ID
router.put('/updateRole/:id', updateRole);                   // Update role info
router.put('/updatePermission/:id/permissions', updateRolePermissions); // Update permissions
router.delete('/removeRole/:id', deleteRole);                // Soft delete role
router.patch('/restoreRole/:id/restore', restoreRole);        // Restore role

export default router;
