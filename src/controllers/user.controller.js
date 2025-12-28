import { UserService } from '../services/user.service.js';

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

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserService.getUserById(Number(id));
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

export const toggleIsActive = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = await UserService.toggleIsActive(id);

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      status : status.isActive ? "Active" : "Deactivated",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleIsDeleted = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = await UserService.toggleIsDeleted(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      status : status.isDeleted ? "Deleted" : "Restore",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};