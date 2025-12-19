import * as RoleService from '../services/role.service.js';

/* =====================================================
   CREATE ROLE
   POST /roles
===================================================== */
export const createRole = async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required',
      });
    }

    const role = await RoleService.createRole({
      name,
      description,
      permissionIds,
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role,
    });
  } catch (error) {
    console.error('❌ Create Role Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
    });
  }
};

/* =====================================================
   GET ALL ROLES (ACTIVE)
   GET /roles
===================================================== */
export const getRoles = async (req, res) => {
  try {
    const roles = await RoleService.getRoles();

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('❌ Get Roles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
    });
  }
};

/* =====================================================
   GET ROLE BY ID
   GET /roles/:id
===================================================== */
export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await RoleService.getRoleById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('❌ Get Role Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role',
    });
  }
};

/* =====================================================
   UPDATE ROLE INFO
   PUT /roles/:id
===================================================== */
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await RoleService.updateRole(id, req.body);

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: role,
    });
  } catch (error) {
    console.error('❌ Update Role Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
    });
  }
};

/* =====================================================
   UPDATE ROLE PERMISSIONS
   PUT /roles/:id/permissions
===================================================== */
export const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    await RoleService.updateRolePermissions(id, permissionIds);

    res.json({
      success: true,
      message: 'Role permissions updated successfully',
    });
  } catch (error) {
    console.error('❌ Update Role Permissions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role permissions',
    });
  }
};

/* =====================================================
   SOFT DELETE ROLE
   DELETE /roles/:id
===================================================== */
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const inUse = await RoleService.isRoleInUse(id);
    if (inUse) {
      return res.status(400).json({
        success: false,
        message: 'Role is currently assigned to users and cannot be deleted',
      });
    }

    await RoleService.deleteRole(id);

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete Role Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
    });
  }
};

/* =====================================================
   RESTORE ROLE
   PATCH /roles/:id/restore
===================================================== */
export const restoreRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await RoleService.restoreRole(id);

    res.json({
      success: true,
      message: 'Role restored successfully',
      data: role,
    });
  } catch (error) {
    console.error('❌ Restore Role Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore role',
    });
  }
};
