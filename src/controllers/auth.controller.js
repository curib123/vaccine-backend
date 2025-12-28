import { AuthService } from '../services/auth.service.js';

export const registerUser = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty',
      });
    }

    const user = await AuthService.register(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      requestBody: req.body ?? 'No Body',
    });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await AuthService.login({ email, password });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
        message: error.message,
    });
  }
};