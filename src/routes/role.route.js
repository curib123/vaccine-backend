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

router.post('/', createRole);                     // Create role
router.get('/', getRoles);                        // Get all roles
router.get('/:id', getRoleById);                  // Get role by ID
router.put('/:id', updateRole);                   // Update role info
router.put('/:id/permissions', updateRolePermissions); // Update permissions
router.delete('/:id', deleteRole);                // Soft delete role
router.patch('/:id/restore', restoreRole);        // Restore role

export default router;
