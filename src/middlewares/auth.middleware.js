import jwt from 'jsonwebtoken';

import { prisma } from '../config/db.js';

/**
 * AUTH MIDDLEWARE
 * ----------------
 * Protects routes using JWT from Authorization: Bearer
 */
export const verifyToken = async (req, res, next) => {
  try {
    console.log('🔐 [AUTH] Incoming request:', {
      method: req.method,
      path: req.originalUrl,
    });

    /* =========================
       1️⃣ GET TOKEN FROM HEADER
    ========================= */
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    console.log(
      '🪪 [AUTH] Authorization header:',
      token ? 'TOKEN FOUND' : 'MISSING'
    );

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Missing Bearer token.',
      });
    }

    /* =========================
       2️⃣ VERIFY JWT
    ========================= */
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ [AUTH] JWT verified:', decoded);
    } catch (err) {
      console.error('❌ [AUTH] JWT verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    /* =========================
       3️⃣ FETCH USER FROM DB
    ========================= */
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    console.log('👤 [AUTH] User lookup result:', user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    /* =========================
       4️⃣ ATTACH USER TO REQUEST
    ========================= */
    req.user = user;
    console.log('🔓 [AUTH] Access granted for:', user.email);

    /* =========================
       5️⃣ CONTINUE
    ========================= */
    next();

  } catch (error) {
    console.error('🔥 [AUTH] Unexpected error:', error);

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
