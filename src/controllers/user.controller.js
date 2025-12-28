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