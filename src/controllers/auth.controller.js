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

    // AuthService now returns { token, user }
    const { token, user } = await AuthService.login({ email, password });

    // Set JWT in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,                           // 🔒 prevents XSS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',                       // 🛡 CSRF protection
      maxAge: 60 * 60 * 1000,                   // 1 hour
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      session_token : token  ,
      data: user,        
                           // ✅ return SAFE user data only
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};
