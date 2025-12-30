import jwt from 'jsonwebtoken';

/**
 * Generate JWT token for Authorization: Bearer
 */
export const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  console.log('✅ [JWT] Token generated for user:', userId);

  return token;
};
