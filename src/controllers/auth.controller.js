import { AuthService } from '../services/auth.service.js';
import { generateToken } from '../utils/jwt.util.js';

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

    // AuthService.login must return { user }
    const { user } = await AuthService.login({ email, password });

    /* =========================
       AUTH TOKEN (BEARER)
    ========================= */
    const token = generateToken(user.id);

    /* =========================
       RESPONSE
    ========================= */
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,        // 👈 use in Authorization: Bearer
      data: user,   // ✅ SAFE user data only
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};



/* =========================
   LOGOUT
========================= */
export const logoutUser = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  return res.status(200).json({ success: true, message: 'Logout successful' });
};
