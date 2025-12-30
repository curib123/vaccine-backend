import { UserService } from '../services/user.service.js';

/* =========================
   GET ALL USERS
========================= */
export const getAllUsers = async (req, res) => {
  try {
    const result = await UserService.getAllUsers(req.query);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   GET USER BY ID
========================= */
export const getUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const user = await UserService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   UPDATE USER
========================= */
export const updateUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const user = await UserService.updateUserById(id, req.body);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   TOGGLE ACTIVE STATUS
========================= */
export const toggleIsActive = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await UserService.toggleIsActive(id);

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      status: result.isActive ? 'Active' : 'Deactivated',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   TOGGLE SOFT DELETE
========================= */
export const toggleIsDeleted = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await UserService.toggleIsDeleted(id);

    res.status(200).json({
      success: true,
      message: result.isDeleted
        ? 'User deleted successfully'
        : 'User restored successfully',
      status: result.isDeleted ? 'Deleted' : 'Restored',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   ✅ GET USER PERMISSIONS
========================= */
export const getUserPermissions = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const permissions = await UserService.getUserPermissionsById(id);

    res.status(200).json({
      success: true,
      message: 'User permissions retrieved successfully',
      data: permissions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   ✅ UPDATE USER PERMISSIONS
========================= */
export const updateUserPermissions = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { permissionIds } = req.body;

    await UserService.updateUserPermissions(id, permissionIds);

    res.status(200).json({
      success: true,
      message: 'User permissions updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
